const https = require('https');
const fs = require('fs');
const path = require('path');
const { generatePostDraft, CONTENT_PILLARS } = require('./contentGenerator');
const { generateVideoDraft } = require('./videoGenerator');
const { publishToFacebook } = require('./postPublisher');

const DRAFT_FILE = path.join(__dirname, '../data/pending_draft.json');

function savePendingDraft(draft) {
  try {
    const dir = path.dirname(DRAFT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (draft) {
      fs.writeFileSync(DRAFT_FILE, JSON.stringify(draft, null, 2), 'utf8');
    } else if (fs.existsSync(DRAFT_FILE)) {
      fs.unlinkSync(DRAFT_FILE);
    }
  } catch (e) {
    console.warn('⚠️ Draft persistence error:', e.message);
  }
}

function loadPendingDraft() {
  try {
    if (fs.existsSync(DRAFT_FILE)) {
      return JSON.parse(fs.readFileSync(DRAFT_FILE, 'utf8'));
    }
  } catch (e) {}
  return null;
}

class PostSchedulerService {
  constructor(telegramPollingService, config) {
    this.tg = telegramPollingService;
    this.config = config;
    this.currentTopicIndex = 0;
    this.pendingDraft = loadPendingDraft();
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
    // 1. 09:00 AM - Morning Catch-up (4K Photo Banner)
    // 2. 01:15 PM - Lunch Break Video/Reels (30-45s AI Bengali Video)
    // 3. 05:45 PM - Evening Commute & Tea Time (4K Photo Banner)
    // 4. 08:45 PM - Prime Evening Video/Reels (30-45s AI Bengali Video)
    // 5. 10:45 PM - Bedtime Browsing (4K Photo Banner)
    const isTargetTime = 
      (hour === 9 && minute < 15) ||
      (hour === 13 && minute >= 15 && minute < 30) ||
      (hour === 17 && minute >= 45) ||
      (hour === 20 && minute >= 45) ||
      (hour === 22 && minute >= 45);

    if (isTargetTime && this.lastTriggeredHour !== hour) {
      this.lastTriggeredHour = hour;
      const isVideoTime = (hour === 13 || hour === 20);
      console.log(`⏰ [Social Media AI] BD Peak Time reached (${bdTimeStr}). Drafting new ${isVideoTime ? 'VIDEO' : 'POST'}...`);
      this.triggerNewDraft(null, isVideoTime);
    }
  }

  async triggerNewDraft(feedback = null, forceVideo = false) {
    const ownerChatId = this.tg.ownerChatId || this.config.telegram?.chatId;
    if (!ownerChatId) {
      console.warn('⚠️ [Social Media AI] No owner Telegram Chat ID registered yet.');
      return null;
    }

    const apiKey = this.config.geminiApiKey || process.env.GEMINI_API_KEY;

    try {
      if (forceVideo) {
        this.tg.sendMessage(ownerChatId, '🎬 *স্যার, আমি WebPulse Automation-এর জন্য একটি নতুন ৩০-৪০ সেকেন্ডের বাংলা ভিডিও তৈরি করছি...*\n\n🎙️ এআই ভয়েসওভার ও অডিও সিঙ্ক হচ্ছে, অনুগ্রহ করে ২০-৩০ সেকেন্ড অপেক্ষা করুন।');
        const draft = await generateVideoDraft(this.currentTopicIndex, feedback, apiKey);
        this.pendingDraft = draft;
        savePendingDraft(draft);
        this.currentTopicIndex = (this.currentTopicIndex + 1) % CONTENT_PILLARS.length;
        await this.sendDraftToOwner(ownerChatId, draft);
        return draft;
      } else {
        this.tg.sendMessage(ownerChatId, '🤖 *স্যার, আমি WebPulse Automation-এর জন্য একটি নতুন পোস্ট ড্রাফট করছি...* এক মুহূর্ত অনুগ্রহ করে অপেক্ষা করুন।');
        const draft = await generatePostDraft(
          this.currentTopicIndex,
          feedback,
          this.pendingDraft ? this.pendingDraft.caption : null,
          apiKey
        );
        this.pendingDraft = draft;
        savePendingDraft(draft);
        this.currentTopicIndex = (this.currentTopicIndex + 1) % CONTENT_PILLARS.length;
        await this.sendDraftToOwner(ownerChatId, draft);
        return draft;
      }
    } catch (err) {
      console.error('❌ [Social Media AI] Failed to generate post/video draft:', err.message);
      this.tg.sendMessage(ownerChatId, `⚠️ স্যার, ড্রাফট তৈরিতে একটু সমস্যা হয়েছে: ${err.message}`);
      return null;
    }
  }

  async sendDraftToOwner(chatId, draft) {
    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '🚀 পেজে পোস্ট করো', callback_data: `post_approve_${draft.id}` },
          { text: draft.isVideo ? '🔄 নতুন ভিডিও বানাও' : '🔄 নতুন ক্যাপশন লেখো', callback_data: `post_regen_${draft.id}` }
        ],
        [
          { text: '❌ বাতিল', callback_data: `post_cancel_${draft.id}` }
        ]
      ]
    };

    if (draft.isVideo) {
      console.log(`📲 [Telegram] Sending video draft to Owner (${draft.videoPath})...`);

      const fullVideoCaption = 
        `🎬 *[নতুন ফেসবুক এআই ভিডিও ড্রাফট]* 🚀\n` +
        `📌 *বিষয়:* ${draft.topic}\n\n` +
        `📝 *প্রস্তাবিত ফেসবুক ক্যাপশন:*\n${draft.caption}\n\n` +
        `────────────────────────\n` +
        `স্যার, ভিডিওটি প্লে করে শুনুন এবং ওপরের ক্যাপশনটি দেখুন। পেজে পোস্ট করতে নিচের বাটনে চাপুন:`;

      // Send the playable video
      await this.sendVideo(chatId, draft.videoPath, `🎬 ${draft.topic} (WebPulse Automation Video)`);

      // Send the Full Caption with Action Buttons
      await this.sendMessageWithButtons(chatId, fullVideoCaption, inlineKeyboard);
    } else {
      const previewHeader = 
        `📢 *[নতুন ফেসবুক পোস্ট ড্রাফট]* 🚀\n` +
        `📌 *বিষয়:* ${draft.topic}\n\n` +
        `📝 *প্রস্তাবিত ক্যাপশন:*\n${draft.caption}\n\n` +
        `────────────────────────\n` +
        `স্যার, এই ছবি ও ক্যাপশন দিয়ে পেজে পোস্ট কি করব? কোনো পরিবর্তন চাইলে শুধু লিখে জানান।`;

      // Send Photo first
      await this.sendPhoto(chatId, draft.imageUrl, `🖼️ প্রস্তাবিত পোস্ট ব্যানার (WebPulse Automation)`);
      // Send Caption & Approval buttons
      await this.sendMessageWithButtons(chatId, previewHeader, inlineKeyboard);
    }
  }

  async handleApproval(draftId, action) {
    const ownerChatId = this.tg.ownerChatId || this.config.telegram?.chatId;
    if (!this.pendingDraft) {
      this.pendingDraft = loadPendingDraft();
    }

    const draft = this.pendingDraft;
    if (!draft) {
      this.tg.sendMessage(ownerChatId, '⚠️ স্যার, কোনো ড্রাফট সক্রিয় নেই। নতুন ড্রাফটের জন্য লিখুন: "/post" বা "/video"');
      return;
    }

    if (action === 'approve') {
      const isVideo = !!draft.isVideo;
      this.tg.sendMessage(ownerChatId, `⏳ বস, ${isVideo ? 'ভিডিওটি' : 'পোস্টটি'} WebPulse Automation ফেসবুক পেজে পাবলিশ করা হচ্ছে...`);

      let mediaUrl = draft.imageUrl;
      if (isVideo) {
        mediaUrl = `https://webpulse-bot.onrender.com/media/${draft.videoFileName}`;
      }

      console.log(`🚀 [Social Media AI] Publishing ${isVideo ? 'VIDEO' : 'PHOTO'} to Facebook...`);
      const result = await publishToFacebook(draft.caption, mediaUrl, this.config, isVideo, draft.videoPath);

      if (result.success) {
        this.tg.sendMessage(
          ownerChatId,
          `🎉 *অভিনন্দন বস!* ${isVideo ? 'ভিডিওটি' : 'পোস্টটি'} সফলভাবে পেজে পাবলিশ হয়েছে!\n\n🔗 পোস্ট লিংক: ${result.postUrl || 'Facebook Page Wall'}`
        );
        this.pendingDraft = null;
        savePendingDraft(null);
      } else {
        const isAuthError = result.error === 190 || result.error === 102 ||
          (result.message && (
            result.message.includes('Session has expired') ||
            result.message.includes('validating access token') ||
            result.message.includes('must be granted') ||
            result.message.includes('permission') ||
            result.message.includes('impersonating')
          ));

        if (isAuthError) {
          this.tg.sendMessage(
            ownerChatId,
            `⚠️ *বস, ফেসবুক টোকেনের পারমিশন বা সেশন রিনিউ প্রয়োজন:*\n\n_${result.message.trim()}_\n\n📌 *সহজ সমাধান (১ মিনিট):*\n১.developers.facebook.com এর গ্রাফ এপিআই এক্সপ্লোরারে যান\n২. *User or Page* ড্রপডাউনে *"WebPulse Automation"* পেইজ সিলেক্ট করুন\n৩. *Generate Access Token* চাপুন\n৪. নতুন টোকেনটি (EAA...) সরাসরি এই চ্যাটে পাঠিয়ে দিন—আমি সাথে সাথে আপডেট করে দেব!\n\n📋 *আপনার রেডি ক্যাপশন:*`
          );
          this.tg.sendMessage(ownerChatId, draft.caption);
        } else {
          this.tg.sendMessage(ownerChatId, `⚠️ বস, ফেসবুকে পোস্ট করতে সমস্যা হয়েছে: ${result.message}`);
        }
      }
    } else if (action === 'regen') {
      const isVideo = !!draft.isVideo;
      await this.triggerNewDraft('Generate a different, exciting angle for this post', isVideo);
    } else if (action === 'cancel') {
      this.pendingDraft = null;
      savePendingDraft(null);
      this.tg.sendMessage(ownerChatId, '❌ স্যার, প্রস্তাবিত পোস্ট ড্রাফটটি বাতিল করা হয়েছে। পরবর্তী শিডিউল অনুযায়ী নতুন ড্রাফট পাঠানো হবে।');
    }
  }

  sendPhoto(chatId, photoUrl, caption) {
    return new Promise((resolve) => {
      const sendReq = (urlToUse, isRetry = false) => {
        const data = JSON.stringify({ chat_id: chatId, photo: urlToUse, caption: caption });
        const req = https.request({
          hostname: 'api.telegram.org',
          path: `/bot${this.tg.token}/sendPhoto`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        }, (res) => {
          let respData = '';
          res.on('data', chunk => respData += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(respData);
              if (!parsed.ok && !isRetry) {
                console.warn('⚠️ [Telegram] sendPhoto dynamic failed, retrying with high-res backup:', parsed.description);
                const backupUrl = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80';
                sendReq(backupUrl, true);
                return;
              }
            } catch (e) {}
            resolve(true);
          });
        });
        req.on('error', (err) => {
          if (!isRetry) {
            const backupUrl = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80';
            sendReq(backupUrl, true);
          } else {
            resolve(false);
          }
        });
        req.write(data);
        req.end();
      };
      sendReq(photoUrl, false);
    });
  }

  sendMessageWithButtons(chatId, text, replyMarkup) {
    return new Promise((resolve) => {
      const sendReq = (useMarkdown) => {
        const payload = { chat_id: chatId, text: text };
        if (replyMarkup) payload.reply_markup = replyMarkup;
        if (useMarkdown) payload.parse_mode = 'Markdown';
        const data = JSON.stringify(payload);
        const req = https.request({
          hostname: 'api.telegram.org',
          path: `/bot${this.tg.token}/sendMessage`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        }, (res) => {
          let respData = '';
          res.on('data', chunk => respData += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(respData);
              if (!parsed.ok && useMarkdown) {
                console.warn('⚠️ [Telegram] Markdown parse failed, retrying plain text:', parsed.description);
                sendReq(false);
                return;
              }
            } catch (e) {}
            resolve(true);
          });
        });
        req.on('error', () => resolve(false));
        req.write(data);
        req.end();
      };
      sendReq(true);
    });
  }

  sendVideo(chatId, videoPath, caption, replyMarkup) {
    return new Promise((resolve) => {
      const fs = require('fs');
      if (!fs.existsSync(videoPath)) {
        return resolve(false);
      }
      const fileBuffer = fs.readFileSync(videoPath);
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const CRLF = '\r\n';

      let bodyHeader = '--' + boundary + CRLF + 'Content-Disposition: form-data; name="chat_id"' + CRLF + CRLF + chatId + CRLF;
      if (caption) {
        bodyHeader += '--' + boundary + CRLF + 'Content-Disposition: form-data; name="caption"' + CRLF + CRLF + caption.substring(0, 1000) + CRLF;
      }
      if (replyMarkup) {
        bodyHeader += '--' + boundary + CRLF + 'Content-Disposition: form-data; name="reply_markup"' + CRLF + CRLF + JSON.stringify(replyMarkup) + CRLF;
      }
      bodyHeader += '--' + boundary + CRLF + 'Content-Disposition: form-data; name="video"; filename="presentation.mp4"' + CRLF + 'Content-Type: video/mp4' + CRLF + CRLF;

      const bodyFooter = CRLF + '--' + boundary + '--' + CRLF;
      const totalLen = Buffer.byteLength(bodyHeader) + fileBuffer.length + Buffer.byteLength(bodyFooter);

      const req = https.request({
        hostname: 'api.telegram.org',
        path: `/bot${this.tg.token}/sendVideo`,
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data; boundary=' + boundary,
          'Content-Length': totalLen
        }
      }, (res) => {
        let respData = '';
        res.on('data', chunk => respData += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(respData);
            if (parsed.ok) {
              resolve(true);
            } else {
              console.warn('⚠️ [Telegram] sendVideo multipart error:', parsed.description);
              resolve(false);
            }
          } catch (e) {
            resolve(false);
          }
        });
      });
      req.on('error', (err) => {
        console.warn('⚠️ [Telegram] sendVideo network error:', err.message);
        resolve(false);
      });
      req.write(Buffer.from(bodyHeader));
      req.write(fileBuffer);
      req.write(Buffer.from(bodyFooter));
      req.end();
    });
  }
}

module.exports = { PostSchedulerService };
