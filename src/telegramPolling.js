const https = require('https');
const fs = require('fs');
const path = require('path');

class TelegramPollingService {
  constructor(token, negotiatorEngine, configPath) {
    this.token = token;
    this.negotiatorEngine = negotiatorEngine;
    this.configPath = configPath;
    this.offset = 0;
    this.ownerChatId = null;
    this.isPolling = false;

    this.bossChatHistory = [];
    this.postScheduler = null;

    // Load saved owner chatId if exists
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg.telegram && cfg.telegram.chatId) {
        this.ownerChatId = cfg.telegram.chatId;
        console.log(`📱 [Telegram Polling] Loaded saved owner Chat ID: ${this.ownerChatId}`);
      }
    } catch (e) {}
  }

  setPostScheduler(postScheduler) {
    this.postScheduler = postScheduler;
  }

  start() {
    if (this.isPolling) return;
    this.isPolling = true;
    console.log('🤖 [Telegram Polling] Active and listening for incoming messages & button taps from your phone...');
    this.poll();
  }

  stop() {
    this.isPolling = false;
  }

  async poll() {
    if (!this.isPolling) return;

    try {
      const updates = await this.getUpdates(this.offset);
      for (const update of updates) {
        this.offset = update.update_id + 1;
        await this.handleUpdate(update);
      }
    } catch (err) {
      // Ignore network timeouts in long polling
    }

    // Schedule next poll
    setTimeout(() => this.poll(), 400);
  }

  getUpdates(offset) {
    return new Promise((resolve) => {
      const url = `https://api.telegram.org/bot${this.token}/getUpdates?offset=${offset}&timeout=20`;
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.result || []);
          } catch (e) {
            resolve([]);
          }
        });
      }).on('error', () => resolve([]));
    });
  }

  async handleUpdate(update) {
    // 1. User clicked an Inline Button in Telegram
    if (update.callback_query) {
      const query = update.callback_query;
      const callbackData = query.data; // e.g. deal_accept_PROP-12345 or deal_counter_PROP-12345_21500
      const chatId = query.message.chat.id;

      // Acknowledge click on Telegram phone
      this.answerCallbackQuery(query.id, '✅ সিদ্ধান্ত গৃহীত হয়েছে!');

      console.log(`📲 [Telegram] Owner tapped button on phone: ${callbackData}`);

      // 1.1 Post Approval Callback (Social Media Auto-Poster)
      if (callbackData.startsWith('post_')) {
        const parts = callbackData.split('_');
        const postAction = parts[1]; // approve | regen | cancel
        const draftId = parts.slice(2).join('_'); // Preserves full ID like vid_1789545298454_3n0m3
        if (this.postScheduler) {
          await this.postScheduler.handleApproval(draftId, postAction);
        }
        return;
      }

      // 1.2 Deal Approval Callback
      const parts = callbackData.split('_');
      // deal, action, proposalId, (counterPrice)
      const action = parts[1]; // accept | counter | reject
      const proposalId = parts[2];
      const counterPrice = parts[3] ? parseInt(parts[3], 10) : null;

      // Forward owner's phone decision to AI negotiator engine
      await this.negotiatorEngine.handleOwnerResponse(proposalId, action, { counterPrice });

      // Send confirmation to Telegram chat
      let confirmText = '';
      if (action === 'accept') confirmText = `✅ আপনি ক্লায়েন্টের অফার অনুমোদন করেছেন। মেসেঞ্জারে ক্লায়েন্টকে কনফার্মেশন পাঠানো হয়েছে!`;
      if (action === 'counter') confirmText = `💬 আপনি ৳${counterPrice ? counterPrice.toLocaleString() : ''} টাকার পাল্টা অফার পাঠিয়েছেন। মেসেঞ্জারে পাঠানো হয়েছে!`;
      if (action === 'reject') confirmText = `❌ আপনি ডিল বাতিল করেছেন। ক্লায়েন্টকে জানানো হয়েছে।`;

      this.sendMessage(chatId, confirmText);
      return;
    }

    // 2. User sent or edited a direct text message on Telegram
    const msg = update.message || update.edited_message;
    if (msg && msg.text) {
      const chatId = msg.chat.id;
      const text = msg.text.trim();

      // If user sends /start, register their chatId
      if (text === '/start') {
        this.ownerChatId = chatId;
        this.saveChatId(chatId);

        const welcome = 
          `👋 *সালাম বস!* আমি আপনার সার্বক্ষণিক এআই সেলস ও সোশ্যাল মিডিয়া ম্যানেজার *@LabibFohayerBot*।\n\n` +
          `✅ আপনার ফোনের সাথে সিস্টেম সফলভাবে যুক্ত হয়েছে!\n\n` +
          `📌 *প্রধান কমান্ডসমূহ:*\n` +
          `1. 🖼️ \`/post\` — নতুন ৪K ব্যানার পোস্ট তৈরি করুন\n` +
          `2. 🎬 \`/video\` — ৩০-৪০ সেকেন্ডের বাংলা এআই ভিডিও তৈরি করুন\n` +
          `3. 🤝 ক্লায়েন্টের দামাদামির বাটন এপ্রুভাল (Accept/Counter/Reject)\n` +
          `4. 💬 আমার সাথে যেকোনো ব্যবসায়িক পরামর্শ ও নির্দেশনা! 🚀`;

        this.sendMessage(chatId, welcome);
        console.log(`🎉 [Telegram] Owner Phone REGISTERED! Chat ID: ${chatId}`);
        return;
      }

      // On-demand Social Media Video Generator Command
      const isVideoCmd = 
        lower === '/video' || lower === '/vedio' || lower === '/vdo' ||
        lower === 'video' || lower === 'vedio' || lower === 'vdo' ||
        lower === 'ভিডিও' ||
        lower.startsWith('/video ') || lower.startsWith('/vedio ') || lower.startsWith('/vdo ') ||
        text.includes('ভিডিও বানাও') || text.includes('ভিডিও তৈরি করো') || text.includes('নতুন ভিডিও');

      if (isVideoCmd) {
        if (this.postScheduler) {
          await this.postScheduler.triggerNewDraft(null, true);
        }
        return;
      }

      // On-demand Social Media Post Generator Command
      const isPostCmd = 
        lower === '/post' || lower === 'post' ||
        lower.startsWith('/post ') ||
        text.includes('পোস্ট বানাও') || text.includes('পোস্ট তৈরি করো') || text.includes('নতুন পোস্ট');

      if (isPostCmd) {
        if (this.postScheduler) {
          await this.postScheduler.triggerNewDraft(null, false);
        }
        return;
      }

      // Feedback on active post draft
      if (this.postScheduler?.pendingDraft && (text.includes('ক্যাপশন') || text.includes('পোস্ট') || text.includes('ছাড়') || text.includes('ডিসকাউন্ট') || text.startsWith('না'))) {
        console.log(`📱 [Telegram] Boss provided feedback on post draft: "${text}"`);
        await this.postScheduler.triggerNewDraft(text);
        return;
      }

      // 1. If owner explicitly asks to send a message to the client
      const isClientCommand = text.startsWith('/send ') || text.startsWith('/say ') || text.startsWith('/client ') || text.startsWith('ক্লায়েন্টকে বলো');
      if (isClientCommand) {
        const clientInstruction = text.replace(/^(\/send|\/say|\/client|ক্লায়েন্টকে বলো[:\s]*)/i, '').trim();
        if (this.negotiatorEngine) {
          console.log(`📲 [Telegram] Owner directed message to client: "${clientInstruction}"`);
          await this.negotiatorEngine.handleOwnerResponse(null, 'custom', { customText: clientInstruction });
          this.sendMessage(chatId, `✅ আপনার নির্দেশনা ক্লায়েন্টের মেসেঞ্জারে পাঠানো হয়েছে:\n"${clientInstruction}"`);
        }
        return;
      }

      // 2. Otherwise: PRIVATE CONVERSATION BETWEEN OWNER (BOSS) AND AI ASSISTANT!
      // NEVER forward private owner chat to client!
      try {
        const { askGemini } = require('./geminiClient');
        const cfg = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        const apiKey = cfg.geminiApiKey || process.env.GEMINI_API_KEY;

        const bossPrompt = `You are the personal, loyal, and highly intelligent AI Executive Assistant to Chairman জনাব লাবিব ফোহায়ের (your boss).
You are talking PRIVATELY with your boss on Telegram.
Company: WebPulse Automation.
Boss Name: জনাব লাবিব ফোহায়ের (Chairman).
MD: জনাব জায়ান আরহাম.

Instructions:
1. Always address him with deep respect as 'বস' or 'স্যার'.
2. You are talking directly with your boss (not a customer). He can ask you anything, give you feedback, scold you, or check on business.
3. Understand Bengali, English, Banglish, and informal language effortlessly like Google Gemini.
4. Answer his exact points intelligently, naturally, and contextually. If he asks about deals or numbers, explain or discuss with him directly.
5. If he is angry or scolds you ("tui age amr loge kotha bol", "kno eita hoise"), apologize respectfully, calm him down, and converse with him like a trusted right-hand executive.
6. DO NOT repeat canned/fixed robotic templates. Always generate a fresh, relevant response.
7. Keep responses concise and natural (2 to 4 sentences).`;

        this.bossChatHistory.push({ sender: 'client', text: text });
        if (this.bossChatHistory.length > 20) {
          this.bossChatHistory = this.bossChatHistory.slice(-20);
        }

        console.log(`📱 [Telegram Private Chat] Boss said: "${text}". Querying Gemini...`);
        const botReply = await askGemini(this.bossChatHistory, bossPrompt, apiKey);
        this.bossChatHistory.push({ sender: 'bot', text: botReply });

        console.log(`🤖 [Telegram Private Chat] AI replied: "${botReply}"`);
        this.sendMessage(chatId, botReply);
      } catch (err) {
        console.error('❌ [Telegram Boss Chat Error]:', err.message);
        this.sendMessage(chatId, `জি বস! আমি আপনার সাথে কথা বলছি। একটু নেটওয়ার্ক সমস্যার কারণে দেরি হয়েছিল। আপনি কী জানতে চাচ্ছিলেন বলুন, আমি শুনছি।`);
      }
    }
  }

  saveChatId(chatId) {
    try {
      const cfg = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      if (!cfg.telegram) cfg.telegram = {};
      cfg.telegram.chatId = chatId.toString();
      fs.writeFileSync(this.configPath, JSON.stringify(cfg, null, 2), 'utf8');
      console.log(`💾 Saved owner Telegram Chat ID to config.json`);
    } catch (e) {
      console.error('Failed to save chatId:', e.message);
    }
  }

  sendMessage(chatId, text, inlineButtons = null) {
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown'
    };
    if (inlineButtons) {
      payload.reply_markup = { inline_keyboard: inlineButtons };
    }

    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${this.token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    });
    req.on('error', (err) => console.error('[Telegram API] Send Error:', err.message));
    req.write(body);
    req.end();
  }

  answerCallbackQuery(queryId, text) {
    const body = JSON.stringify({ callback_query_id: queryId, text });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${this.token}/answerCallbackQuery`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    });
    req.on('error', () => {});
    req.write(body);
    req.end();
  }
}

module.exports = { TelegramPollingService };
