const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { AutomationPipeline } = require('./pipeline');
const { startFolderWatcher } = require('./watcher');
const { handleWebhookVerification, parseFacebookPayload } = require('./facebookWebhook');
const { TelegramNotifier } = require('./telegramNotifier');
const { NegotiatorEngine } = require('./negotiatorEngine');
const { TelegramPollingService } = require('./telegramPolling');

const app = express();
const PORT = process.env.PORT || 3000;

// Load config
const configPath = path.join(__dirname, '..', 'config.json');
let config = {};
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  config = {
    businessName: "Smart Agency Bangladesh",
    currency: "BDT",
    telegram: { botToken: "8746325618:AAHLKzCLFHCEbSU9KzehZC3o4gcGeusXmvU", chatId: "" }
  };
}

// 1. Initialize Core Engines
const pipeline = new AutomationPipeline(config);
startFolderWatcher(pipeline);

const telegramNotifier = new TelegramNotifier(config);
const negotiatorEngine = new NegotiatorEngine(config, pipeline, telegramNotifier);

// 2. Start Real-time Telegram Phone Polling
const tgToken = config.telegram?.botToken || '8746325618:AAHLKzCLFHCEbSU9KzehZC3o4gcGeusXmvU';
const tgPolling = new TelegramPollingService(tgToken, negotiatorEngine, configPath);
tgPolling.start();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve generated PDFs
app.use('/invoices', express.static(path.join(__dirname, '..', 'output', 'invoices')));

// Real-time Event Streaming via Server-Sent Events (SSE)
const sseClients = [];
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);
  req.on('close', () => {
    const index = sseClients.indexOf(res);
    if (index !== -1) sseClients.splice(index, 1);
  });
});

function broadcast(event, data) {
  sseClients.forEach(client => {
    client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  });
}

// Forward events to SSE
pipeline.on('step', (stepData) => {
  broadcast('pipeline_step', stepData);
});

negotiatorEngine.on('message', (msgData) => {
  broadcast('chat_message', msgData);
});

negotiatorEngine.on('owner_approval_requested', (proposal) => {
  broadcast('approval_requested', proposal);
});

negotiatorEngine.on('owner_decision_applied', (data) => {
  broadcast('owner_decision_applied', data);
  if (data.session && data.session.id && data.reply) {
    sendFacebookMessengerReply(data.session.id, data.reply, config.facebook?.pageAccessToken);
  }
});

telegramNotifier.on('telegram_message', (tgMsg) => {
  broadcast('telegram_message', tgMsg);
});

// --- AI Negotiator Chat Endpoints ---

// Client sends message to AI
app.post('/api/chat/message', async (req, res) => {
  const { clientId = 'default_client', text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  const response = await negotiatorEngine.handleClientMessage(clientId, text);
  res.json({ success: true, response });
});

// Owner responds via Telegram Simulator or API
app.post('/api/telegram/respond', async (req, res) => {
  const { proposalId, action, counterPrice, customText } = req.body;
  const result = await negotiatorEngine.handleOwnerResponse(proposalId, action, { counterPrice, customText });
  res.json(result);
});

// Get current session state
app.get('/api/chat/session', (req, res) => {
  const session = negotiatorEngine.getSession('default_client');
  res.json({
    state: session.state,
    clientName: session.clientName,
    requirement: session.requirement,
    standardPrice: session.standardPrice,
    clientOffer: session.clientOffer,
    agreedPrice: session.agreedPrice,
    pendingProposal: session.pendingProposal,
    messages: session.messages
  });
});

// Reset session for a new demo
app.post('/api/chat/reset', (req, res) => {
  negotiatorEngine.sessions.delete('default_client');
  const freshSession = negotiatorEngine.getSession('default_client');
  broadcast('session_reset', { state: freshSession.state });
  res.json({ success: true, message: 'Session reset successfully' });
});

// --- Facebook Webhook Routes ---
app.get('/api/webhook/facebook', (req, res) => {
  return handleWebhookVerification(req, res, config);
});

const { sendFacebookMessengerReply } = require('./facebookWebhook');

app.post('/api/webhook/facebook', async (req, res) => {
  try {
    const body = req.body;
    if (body.object === 'page') {
      const entry = body.entry?.[0];
      const messaging = entry?.messaging?.[0];

      if (messaging && messaging.message && !messaging.message.is_echo) {
        const senderId = messaging.sender?.id;
        const text = messaging.message.text;

        console.log(`💬 [Facebook Messenger] New message from ${senderId}: "${text}"`);

        // Send to Negotiator Engine
        const result = await negotiatorEngine.handleClientMessage(senderId, text);

        // Send AI reply back to customer in Messenger
        if (result && result.text) {
          sendFacebookMessengerReply(senderId, result.text, config.facebook?.pageAccessToken);
        }
      }
    }
    return res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    console.error('❌ [Facebook Webhook Error]:', err);
    return res.status(500).send('SERVER_ERROR');
  }
});

// --- General API Routes ---
app.get('/api/config', (req, res) => {
  res.json(config);
});

app.post('/api/config', (req, res) => {
  config = { ...config, ...req.body };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  telegramNotifier.botToken = config.telegram?.botToken || '';
  telegramNotifier.chatId = config.telegram?.chatId || '';
  res.json({ success: true, config });
});

app.get('/api/orders', (req, res) => {
  res.json({
    orders: pipeline.processedOrders,
    totalSales: pipeline.processedOrders.reduce((sum, o) => sum + o.pricing.grandTotal, 0),
    totalOrders: pipeline.processedOrders.length
  });
});

app.listen(PORT, () => {
  console.log(`\n================================================================`);
  console.log(`🚀 AI DEAL NEGOTIATOR & TELEGRAM HUMAN-IN-THE-LOOP BOT IS LIVE!`);
  console.log(`🌐 Control Center & Dual Simulator: http://localhost:${PORT}`);
  console.log(`📱 Telegram Bot Mode: Ready for real token or screen simulator`);
  console.log(`================================================================\n`);
});
