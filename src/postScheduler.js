const https = require('https');
const { generatePostDraft, CONTENT_PILLARS } = require('./contentGenerator');
const { publishToFacebook } = require('./postPublisher');

class PostSchedulerService {
  constructor(telegramPollingService, config) {
    this.tg = telegramPollingService;
    this.config = config;
    this.currentTopicIndex = 0;
    this.pendingDraft = null;
    this.timer = null;
  }

  start() {
    console.log('📅 [Social Media AI Scheduler] Activated. Auto-scheduling at Bangladesh peak times.');
    // Check every 15 minutes for BD peak times
    this.lastTriggeredHour = -1;
    this.timer = setInterval(() => this.checkSchedule(), 15 * 60 * 1000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  checkSchedule() {
    // Get Bangladesh Time (Asia/Dhaka)
    const bdTimeStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Dhaka',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    }).format(new Date());

    const [hour, minute] = bdTimeStr.split(':').map(Number);
    
    // 5 Strategic Bangladesh Peak Engagement Hours:
    // 1. 09:00 AM - Morning Catch-up
    // 2. 01:15 PM - Lunch Break & Mid-day Rest
    // 3. 05:45 PM - Evening Commute & Tea Time
    // 4. 08:45 PM - Prime Family/Social Peak
    // 5. 10:45 PM - Bedtime Browsing Peak
    const isTargetTime = 
      (hour === 9 && minute < 15) ||
      (hour === 13 && minute >= 15 && minute < 30) ||
      (hour === 17 && minute >= 45) ||
      (hour === 20 && minute >= 45) ||
      (hour === 22 && minute >= 45);

    if (isTargetTime && this.lastTriggeredHour !== hour) {
      this.lastTriggeredHour = hour;
      console.log(`⏰ [Social Media AI] BD Peak Time reached (${bdTimeStr}). Drafting new post...`);
      this.triggerNewDraft();
    }
  }

  async triggerNewDraft(feedback = null) {
    const ownerChatId = this.tg.ownerChatId || this.config.telegram?.chatId;
    if (!ownerChatId) {
      console.warn('⚠️ [Social Media AI] No owner Telegram Chat ID registered yet.');
      return null;
    }

    const apiKey = this.config.geminiApiKey || process.env.GEMINI_API_KEY;

    try {
      this.tg.sendMessage(ownerChatId, '🤖 *স্যার, আমি WebPulse Automation-এর জন্য একটি নতুন পোস্ট ড্রাফট করছি...* এক মুহূর্ত অনুগ্রহ করে অপেক্ষা করুন।');

      const draft = await generatePostDraft(
        this.currentTopicIndex,
        feedback,
        this.pendingDraft ? this.pendingDraft.caption : null,
        apiKey
      );

      this.pendingDraft = draft;
      this.currentTopicIndex = (this.currentTopicIndex + 1) % CONTENT_PILLARS.length;

      await this.sendDraftToOwner(ownerChatId, draft);
      return draft;
    } catch (err) {
      console.error('❌ [Social Media AI] Failed to generate post draft:', err.message);
      this.tg.sendMessage(ownerChatId, `⚠️ স্যার, পোস্ট তৈরিতে একটু সমস্যা হয়েছে: ${err.message}`);
      return null;
    }
  }

  async sendDraftToOwner(chatId, draft) {
    const previewHeader = 
      `📢 *[নতুন ফেসবুক পোস্ট ড্রাফট]* 🚀\n` +
      `📌 *বিষয়:* ${draft.topic}\n\n` +
      `📝 *প্রস্তাবিত ক্যাপশন:*\n${draft.caption}\n\n` +
      `────────────────────────\n` +
      `স্যার, এই ছবি ও ক্যাপশন দিয়ে পেজে পোস্ট কি করব? কোনো পরিবর্তন চাইলে শুধু লিখে জানান।`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '🚀 পেজে পোস্ট করো', callback_data: `post_approve_${draft.id}` },
          { text: '🔄 নতুন ক্যাপশন লেখো', callback_data: `post_regen_${draft.id}` }
        ],
        [
          { text: '❌ বাতিল', callback_data: `post_cancel_${draft.id}` }
        ]
      ]
    };

    // Send Photo first
    await this.sendPhoto(chatId, draft.imageUrl, `🖼️ প্রস্তাবিত পোস্ট ব্যানার (WebPulse Automation)`);

    // Send Caption & Approval buttons
    await this.sendMessageWithButtons(chatId, previewHeader, inlineKeyboard);
  }

  async handleApproval(draftId, action) {
    const ownerChatId = this.tg.ownerChatId || this.config.telegram?.chatId;

    if (!this.pendingDraft || this.pendingDraft.id !== draftId) {
      this.tg.sendMessage(ownerChatId, '⚠️ স্যার, এই ড্রাফটটির মেয়াদ শেষ হয়ে গেছে। নতুন ড্রাফট পেতে লিখুন: "/post"');
      return;
    }

    if (action === 'approve') {
      this.tg.sendMessage(ownerChatId, '⏳ স্যার, পোস্টটি WebPulse Automation ফেসবুক পেজে পাবলিশ করা হচ্ছে...');

      const result = await publishToFacebook(this.pendingDraft.caption, this.pendingDraft.imageUrl, this.config);

      if (result.success) {
        this.tg.sendMessage(
          ownerChatId,
          `🎉 *অভিনন্দন স্যার!* পোস্টটি সফলভাবে পেজে পাবলিশ হয়েছে!\n\n🔗 পোস্ট লিংক: ${result.postUrl || 'Facebook Page Wall'}`
        );
        this.pendingDraft = null;
      } else {
        if (result.requiresPermission) {
          this.tg.sendMessage(
            ownerChatId,
            `⚠️ *স্যার, ফেসবুক পারমিশন আপডেট প্রয়োজন:*\nফেসবুক পেজে পোস্ট করার জন্য 'pages_manage_posts' পারমিশন প্রয়োজন।\n\nতবে আপনার পোস্ট ক্যাপশনটি সম্পূর্ণ তৈরি আছে, আপনি চাইলে সরাসরি কপি করে পেজে দিয়ে দিতে পারেন:\n\n${this.pendingDraft.caption}`
          );
        } else {
          this.tg.sendMessage(ownerChatId, `⚠️ স্যার, ফেসবুকে পোস্ট করতে ত্রুটি হয়েছে: ${result.message}`);
        }
      }
    } else if (action === 'regen') {
      await this.triggerNewDraft('Generate a different, exciting angle for this post');
    } else if (action === 'cancel') {
      this.pendingDraft = null;
      this.tg.sendMessage(ownerChatId, '❌ স্যার, প্রস্তাবিত পোস্ট ড্রাফটটি বাতিল করা হয়েছে। পরবর্তী শিডিউল অনুযায়ী নতুন ড্রাফট পাঠানো হবে।');
    }
  }

  sendPhoto(chatId, photoUrl, caption) {
    return new Promise((resolve) => {
      const data = JSON.stringify({ chat_id: chatId, photo: photoUrl, caption: caption });
      const req = https.request({
        hostname: 'api.telegram.org',
        path: `/bot${this.tg.token}/sendPhoto`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
      }, (res) => {
        res.on('data', () => {});
        res.on('end', () => resolve(true));
      });
      req.on('error', () => resolve(false));
      req.write(data);
      req.end();
    });
  }

  sendMessageWithButtons(chatId, text, replyMarkup) {
    return new Promise((resolve) => {
      const data = JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown', reply_markup: replyMarkup });
      const req = https.request({
        hostname: 'api.telegram.org',
        path: `/bot${this.tg.token}/sendMessage`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
      }, (res) => {
        res.on('data', () => {});
        res.on('end', () => resolve(true));
      });
      req.on('error', () => resolve(false));
      req.write(data);
      req.end();
    });
  }
}

module.exports = { PostSchedulerService };
