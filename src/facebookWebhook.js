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
 * Sends a real message to a customer in Facebook Messenger via Meta Graph API
 */
function sendFacebookMessengerReply(recipientId, text, pageAccessToken) {
  if (!pageAccessToken) {
    console.log(`ℹ️ [Facebook API] No Page Access Token configured yet. Simulated reply: "${text}"`);
    return;
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
    }
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`✅ [Facebook Messenger] Message successfully delivered to customer (${recipientId})!`);
      } else {
        console.error(`❌ [Facebook Messenger] Send failed (${res.statusCode}):`, body);
      }
    });
  });

  req.on('error', (err) => console.error('[Facebook Messenger API Error]:', err.message));
  req.write(payload);
  req.end();
}

module.exports = {
  handleWebhookVerification,
  parseFacebookPayload,
  parseMessengerOrderText,
  sendFacebookMessengerReply
};

