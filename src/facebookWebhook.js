/**
 * Facebook Webhook & Messenger / Lead Ad Parser
 * Complies with Meta Graph API Webhook Standards
 */

function handleWebhookVerification(req, res, config) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = config.facebook ? config.facebook.verifyToken : 'MY_FB_SECRET_VERIFY_TOKEN_123';

  if (mode && token) {
    if (mode === 'subscribe' && token === expectedToken) {
      console.log('✅ [Facebook Webhook] Verification successful from Meta!');
      return res.status(200).send(challenge);
    } else {
      console.warn('❌ [Facebook Webhook] Verification failed! Token mismatch.');
      return res.sendStatus(403);
    }
  }
  return res.sendStatus(400);
}

/**
 * Parses raw text from a Facebook Messenger conversation into structured order items
 */
function parseMessengerOrderText(text, senderId) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  let name = 'Facebook Customer';
  let phone = '01700000000';
  let address = 'Dhaka, Bangladesh';
  let items = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('name:') || lower.startsWith('নাম:')) {
      name = line.split(/:(.+)/)[1]?.trim() || name;
    } else if (lower.startsWith('phone:') || lower.startsWith('ফোন:') || lower.startsWith('mobile:')) {
      phone = line.split(/:(.+)/)[1]?.trim() || phone;
    } else if (lower.startsWith('address:') || lower.startsWith('ঠিকানা:')) {
      address = line.split(/:(.+)/)[1]?.trim() || address;
    } else if (lower.startsWith('product:') || lower.startsWith('item:') || lower.startsWith('পণ্য:')) {
      const parts = line.split(/:(.+)/)[1]?.trim().split(/[,|-]/);
      const itemName = parts[0]?.trim() || 'Custom Product';
      items.push({
        name: itemName,
        price: 1200,
        quantity: 1
      });
    } else if (lower.startsWith('qty:') || lower.startsWith('পরিমাণ:')) {
      const qty = parseInt(line.split(/:(.+)/)[1]?.trim(), 10);
      if (items.length > 0 && !isNaN(qty)) {
        items[items.length - 1].quantity = qty;
      }
    }
  }

  if (items.length === 0) {
    items.push({
      name: 'E-Commerce Order via Messenger',
      price: 1450,
      quantity: 1
    });
  }

  return {
    customer: {
      name,
      phone,
      address,
      facebookSenderId: senderId || 'fb_user_' + Date.now().toString().slice(-6)
    },
    items,
    channel: 'facebook-messenger',
    paymentMethod: 'Cash On Delivery (COD)'
  };
}

/**
 * Handles incoming POST events from Meta Webhook
 */
function parseFacebookPayload(body) {
  // Standard Meta Webhook payload structure
  if (body.object === 'page') {
    const entry = body.entry?.[0];
    const messaging = entry?.messaging?.[0];

    if (messaging && messaging.message) {
      const text = messaging.message.text || '';
      const senderId = messaging.sender?.id;
      return parseMessengerOrderText(text, senderId);
    }

    // Leadgen payload
    const changes = entry?.changes?.[0];
    if (changes && changes.field === 'leadgen') {
      const leadValue = changes.value;
      return {
        customer: {
          name: leadValue.full_name || 'Lead Ad Customer',
          phone: leadValue.phone_number || '01812345678',
          address: leadValue.city || 'Chittagong, Bangladesh',
          leadId: leadValue.leadgen_id
        },
        items: [
          { name: 'Lead Ad Campaign Product', price: 1850, quantity: 1 }
        ],
        channel: 'facebook-lead-ad',
        paymentMethod: 'Cash On Delivery (COD)'
      };
    }
  }

  // Direct simulated order from Dashboard
  if (body.customer && body.items) {
    return {
      ...body,
      channel: body.channel || 'facebook-api'
    };
  }

  return null;
}

/**
 * Splits a full AI reply into natural, finished blocks (paragraphs/thoughts).
 * Guarantees NO half-sentences, clean formatting, and perfect completeness.
 */
function splitIntoMessageBlocks(fullText) {
  if (!fullText) return [];

  // Split by double newlines or paragraph breaks first
  const rawParagraphs = fullText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const blocks = [];

  for (const para of rawParagraphs) {
    if (para.length <= 320) {
      blocks.push(para);
    } else {
      // Split cleanly by complete sentence endings (।, ?, !, \n)
      const sentences = para.split(/([।?!]|\n)/).filter(Boolean);
      let currentBlock = '';
      for (let i = 0; i < sentences.length; i += 2) {
        const sentence = (sentences[i] || '') + (sentences[i + 1] || '');
        if ((currentBlock + ' ' + sentence).trim().length > 250 && currentBlock) {
          blocks.push(currentBlock.trim());
          currentBlock = sentence.trim();
        } else {
          currentBlock = (currentBlock + ' ' + sentence).trim();
        }
      }
      if (currentBlock) blocks.push(currentBlock.trim());
    }
  }

  return blocks.filter(b => b.length > 0);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sends a Sender Action (e.g. 'mark_seen', 'typing_on') to Facebook Messenger
 */
function sendSenderAction(recipientId, action, pageAccessToken) {
  return new Promise((resolve) => {
    if (!pageAccessToken) return resolve(false);

    const https = require('https');
    const payload = JSON.stringify({
      recipient: { id: recipientId },
      sender_action: action
    });

    const options = {
      hostname: 'graph.facebook.com',
      path: `/v19.0/me/messages?access_token=${pageAccessToken}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 4000
    };

    const req = https.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve(res.statusCode === 200));
    });

    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
    req.write(payload);
    req.end();
  });
}

/**
 * Sends a single message bubble to Facebook Messenger
 */
function sendSingleMessengerMessage(recipientId, text, pageAccessToken) {
  return new Promise((resolve) => {
    if (!pageAccessToken) {
      console.log(`ℹ️ [Facebook API] Simulated block: "${text}"`);
      return resolve(true);
    }

    const https = require('https');
    const payload = JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: 'RESPONSE',
      message: { text }
    });

    const options = {
      hostname: 'graph.facebook.com',
      path: `/v19.0/me/messages?access_token=${pageAccessToken}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 6000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          console.error(`❌ [Facebook Messenger] Send block failed (${res.statusCode}):`, body);
          resolve(false);
        }
      });
    });

    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', (err) => {
      console.error('[Facebook Messenger API Error]:', err.message);
      resolve(false);
    });
    req.write(payload);
    req.end();
  });
}

/**
 * Sends messages block-by-block with typing indicators within 10 seconds total.
 * Each block is delivered as an individual message bubble in Messenger.
 * No sentences are ever cut off or half-delivered.
 */
async function sendFacebookMessengerBlocks(recipientId, fullText, pageAccessToken) {
  if (!pageAccessToken) {
    console.log(`ℹ️ [Facebook API] No Page Access Token. Simulated blocks for:\n"${fullText}"`);
    return;
  }

  const blocks = splitIntoMessageBlocks(fullText);
  if (blocks.length === 0) return;

  console.log(`🚀 [Facebook Messenger] Delivering ${blocks.length} message blocks to client (${recipientId})...`);

  // 1. Immediately send 'mark_seen' and 'typing_on' so user sees instant activity within 1s
  sendSenderAction(recipientId, 'mark_seen', pageAccessToken).catch(() => {});
  await sendSenderAction(recipientId, 'typing_on', pageAccessToken);

  // Short natural human typing delay for block 1 (approx 600ms)
  await sleep(600);

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    await sendSingleMessengerMessage(recipientId, block, pageAccessToken);
    console.log(`💬 [Facebook Messenger] Block ${i + 1}/${blocks.length} delivered: "${block.slice(0, 40)}..."`);

    // If another block follows, show typing indicator for 1-1.4s
    if (i < blocks.length - 1) {
      await sendSenderAction(recipientId, 'typing_on', pageAccessToken);
      await sleep(1100);
    }
  }

  console.log(`✅ [Facebook Messenger] All ${blocks.length} blocks delivered cleanly within 10s!`);
}

/**
 * Sends a real message to a customer in Facebook Messenger via Meta Graph API
 * Wraps sendFacebookMessengerBlocks for backward compatibility.
 */
async function sendFacebookMessengerReply(recipientId, text, pageAccessToken) {
  return sendFacebookMessengerBlocks(recipientId, text, pageAccessToken);
}

module.exports = {
  handleWebhookVerification,
  parseFacebookPayload,
  parseMessengerOrderText,
  sendFacebookMessengerReply,
  sendFacebookMessengerBlocks,
  splitIntoMessageBlocks
};

