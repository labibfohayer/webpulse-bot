const EventEmitter = require('events');
const https = require('https');

class TelegramNotifier extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.botToken = config.telegram?.botToken || process.env.TELEGRAM_BOT_TOKEN || '';
    this.chatId = config.telegram?.chatId || process.env.TELEGRAM_CHAT_ID || '';
    this.lastProposal = null;

    if (this.botToken && this.chatId) {
      console.log('🤖 [Telegram] Real Telegram Bot integration ENABLED.');
    } else {
      console.log('📱 [Telegram] Running in Interactive UI Simulator mode (Ready for live token anytime).');
    }
  }

  /**
   * Sends deal approval request with interactive buttons
   */
  async sendDealApprovalRequest(proposal) {
    this.lastProposal = proposal;
    const messageText = 
      `🚨 *[নতুন ক্লায়েন্ট ডিল অ্যালার্ট]*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 *ক্লায়েন্ট:* ${proposal.clientName}\n` +
      `📌 *রিকোয়ারমেন্ট:* ${proposal.requirement}\n` +
      `🏷️ *স্ট্যান্ডার্ড রেগুলার মূল্য:* ৳${proposal.standardPrice.toLocaleString('en-US')}\n` +
      `💰 *ক্লায়েন্টের বাজেট অফার:* ৳${proposal.clientOffer.toLocaleString('en-US')}\n` +
      `🔻 *পার্থক্য/ডিসকাউন্ট:* ৳${proposal.difference.toLocaleString('en-US')}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `বস! ক্লায়েন্টের এই বাজেটে কি ডিল ফাইনাল করব? নিচের যেকোনো বাটনে ট্যাপ করুন:`;

    const buttons = [
      [
        { text: `✅ ৳${proposal.clientOffer} এপ্রুভ করো`, callback_data: `deal_accept_${proposal.proposalId}` },
        { text: `💬 পাল্টা অফার: ৳${proposal.suggestedCounter}`, callback_data: `deal_counter_${proposal.proposalId}_${proposal.suggestedCounter}` }
      ],
      [
        { text: `❌ ডিল রিজেক্ট করো`, callback_data: `deal_reject_${proposal.proposalId}` }
      ]
    ];

    // Emit event for the on-screen Telegram Smartphone Simulator
    this.emit('telegram_message', {
      type: 'approval_request',
      text: messageText,
      buttons,
      proposal,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    // If real Telegram credentials exist, send to real Telegram app via HTTPS
    if (this.botToken && this.chatId) {
      this.sendTelegramHttps(this.chatId, messageText, buttons);
    }
  }

  /**
   * Notifies Telegram that deal has been successfully closed & invoice created
   */
  async notifyDealClosed(order) {
    const text = 
      `🎉 *[অভিনন্দন বস! ডিল সম্পন্ন হয়েছে]*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📜 *ডিল আইডি:* #${order.orderId}\n` +
      `👤 *ক্লায়েন্ট:* ${order.customer.name} (${order.customer.phone})\n` +
      `💰 *চূড়ান্ত মূল্য:* ৳${order.pricing.grandTotal.toLocaleString('en-US')}\n` +
      `📄 ডিজিটাল মেমো ও ইনভয়েস স্বয়ংক্রিয়ভাবে প্রস্তুত করা হয়েছে।\n` +
      `🚀 টিমকে কাজ শুরু করার নির্দেশনা দেওয়া হয়েছে!`;

    this.emit('telegram_message', {
      type: 'deal_closed',
      text,
      order,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    if (this.botToken && this.chatId) {
      this.sendTelegramHttps(this.chatId, text);
    }
  }

  sendTelegramHttps(chatId, text, inlineButtons = null) {
    try {
      const payload = {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown'
      };

      if (inlineButtons) {
        payload.reply_markup = {
          inline_keyboard: inlineButtons
        };
      }

      const body = JSON.stringify(payload);
      const options = {
        hostname: 'api.telegram.org',
        path: `/bot${this.botToken}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      };

      const req = https.request(options, (res) => {
        if (res.statusCode !== 200) {
          console.warn(`[Telegram API] HTTP ${res.statusCode} response`);
        }
      });
      req.on('error', (err) => console.error('[Telegram API] Error:', err.message));
      req.write(body);
      req.end();
    } catch (e) {
      console.error('[Telegram API] Failed to send:', e.message);
    }
  }
}

module.exports = { TelegramNotifier };
