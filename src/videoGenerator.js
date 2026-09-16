const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFile } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const googleTTS = require('google-tts-api');
const { askGemini } = require('./geminiClient');
const { CONTENT_PILLARS, BANNER_COLLECTIONS, CATEGORY_KEYS } = require('./contentGenerator');

const MEDIA_DIR = path.join(__dirname, '../public/media');
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

function cleanOldMedia() {
  try {
    const files = fs.readdirSync(MEDIA_DIR);
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(MEDIA_DIR, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > 24 * 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (e) {
    console.warn('⚠️ Media cleanup warning:', e.message);
  }
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(destPath);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function synthesizeBengaliAudio(scriptText, outputPath) {
  const cleanedText = scriptText
    .replace(/[#*_\n\r]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const chunks = await googleTTS.getAllAudioBase64(cleanedText, {
    lang: 'bn',
    slow: false,
    timeout: 10000
  });

  const audioBuffer = Buffer.concat(chunks.map(c => Buffer.from(c.base64, 'base64')));
  fs.writeFileSync(outputPath, audioBuffer);
  return outputPath;
}

function renderVideo(imagePath, audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-loop', '1',
      '-i', imagePath,
      '-i', audioPath,
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v', 'libx264',
      '-tune', 'stillimage',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-pix_fmt', 'yuv420p',
      '-shortest',
      outputPath
    ];

    execFile(ffmpeg, args, (err) => {
      if (err) return reject(err);
      resolve(outputPath);
    });
  });
}

async function generateVideoDraft(topicIndex = null, feedback = null, apiKey) {
  cleanOldMedia();

  const index = (topicIndex !== null && topicIndex >= 0)
    ? (topicIndex % CONTENT_PILLARS.length)
    : Math.floor(Math.random() * CONTENT_PILLARS.length);

  const pillar = CONTENT_PILLARS[index];
  const draftId = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const categoryKey = CATEGORY_KEYS[index % CATEGORY_KEYS.length];
  const pool = BANNER_COLLECTIONS[categoryKey] || BANNER_COLLECTIONS.ecommerce;
  const bannerUrl = pool[Math.floor(Math.random() * pool.length)];

  const systemPrompt = `You are the creative director and Bengali voiceover scriptwriter for WebPulse Automation, an elite software agency in Bangladesh.
Leadership: Chairman জনাব লাবিব ফোহায়ের and MD জনাব জায়ান আরহাম.
Official WhatsApp: 01580506445.
Services: E-Commerce websites, AI Sales Chatbots, Corporate portals, 6 months unlimited free support.

You need to output a JSON object with EXACTLY two fields:
{
  "voiceoverScript": "A concise, rhythmic, highly compelling Bengali voiceover script of 45-60 words that takes 30-40 seconds to speak. Hook -> Business Value -> WhatsApp Call to Action: ০১৫৮০৫০৬৪৪৫",
  "facebookCaption": "Full, polished Bengali Facebook caption with emojis, headline, bullet points, WhatsApp contact, and trending hashtags."
}
CRITICAL: Return ONLY valid JSON, nothing else.`;

  let userPrompt = `Topic: ${pillar.topic}\nContext: ${pillar.prompt}`;
  if (feedback) {
    userPrompt += `\nSpecial instructions from Chairman: "${feedback}"`;
  }

  console.log(`🎬 [Video AI] Generating Bengali Voiceover & Caption for "${pillar.topic}"...`);
  let voiceoverScript = 'ব্যবসায় বিক্রি বাড়াতে চান? ম্যানুয়াল অর্ডারের ঝামেলা ভুলে এবার চালু করুন স্মার্ট ই-কমার্স ও এআই সেলস চ্যাটবট। আপনার ব্যবসা চলবে ২৪ ঘণ্টা নিরবচ্ছিন্নভাবে। ৬ মাসের ফ্রি টেকনিক্যাল সাপোর্ট সহ সেরা সফটওয়্যার ও ওয়েবসাইট সল্যুশন দিচ্ছে WebPulse Automation। বিস্তারিত জানতে আজই যোগাযোগ করুন আমাদের অফিশিয়াল হোয়াটসঅ্যাপে: ০১৫৮০৫০৬৪৪৫।';
  let facebookCaption = `🎬 *[ভিডিও প্রেজেন্টেশন]* আপনার ব্যবসাকে দিন আধুনিক অটোমেশনের ছোঁয়া! 🚀\n\nবর্তমান প্রতিযোগিতামূলক বাজারে কাস্টমার ড্রপ আটকাতে এবং সেলস দ্বিগুণ করতে WebPulse Automation নিয়ে এলো পূর্ণাঙ্গ অটোমেশন সল্যুশন।\n\n✨ আমাদের বিশেষ সুবিধাসমূহ:\n• কাস্টম ই-কমার্স ওয়েবসাইট ও লাইভ চেকআউট\n• ২৪/৭ ফেসবুক ও ইনস্টাগ্রাম এআই চ্যাটবট\n• bKash ও অনলাইন পেমেন্ট গেটওয়ে গেটওয়ে ইন্টিগ্রেশন\n• ৬ মাসের আনলিমিটেড ফ্রি টেকনিক্যাল সাপোর্ট\n\n📞 সরাসরি অর্ডার বা পরামর্শের জন্য ইনবক্স করুন অথবা হোয়াটসঅ্যাপে নক দিন: 01580506445\n\n#WebPulseAutomation #BusinessGrowth #VideoReels #Ecommerce #AIAutomation #DigitalBangladesh`;

  try {
    const rawResponse = await askGemini([{ sender: 'client', text: userPrompt }], systemPrompt, apiKey);
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedData = JSON.parse(jsonMatch[0]);
      if (parsedData.voiceoverScript) voiceoverScript = parsedData.voiceoverScript;
      if (parsedData.facebookCaption) facebookCaption = parsedData.facebookCaption;
    }
  } catch (e) {
    console.warn('⚠️ Gemini script parsing warning, using fallback script:', e.message);
  }

  const tempImgPath = path.join(MEDIA_DIR, `temp_img_${draftId}.jpg`);
  const tempAudioPath = path.join(MEDIA_DIR, `temp_audio_${draftId}.mp3`);
  const finalVideoPath = path.join(MEDIA_DIR, `${draftId}.mp4`);

  try {
    console.log(`🎙️ [Video AI] Synthesizing Bengali Voiceover Audio...`);
    await synthesizeBengaliAudio(voiceoverScript, tempAudioPath);

    console.log(`🖼️ [Video AI] Downloading visual banner...`);
    await downloadFile(bannerUrl, tempImgPath);

    console.log(`🎞️ [Video AI] Rendering MP4 Video with FFmpeg...`);
    await renderVideo(tempImgPath, tempAudioPath, finalVideoPath);

    if (fs.existsSync(tempImgPath)) fs.unlinkSync(tempImgPath);
    if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);

    console.log(`✅ [Video AI] Video generated successfully: ${finalVideoPath}`);

    return {
      id: draftId,
      isVideo: true,
      topic: pillar.topic,
      voiceoverScript: voiceoverScript,
      caption: facebookCaption,
      videoPath: finalVideoPath,
      videoFileName: `${draftId}.mp4`,
      imageUrl: bannerUrl
    };
  } catch (err) {
    if (fs.existsSync(tempImgPath)) fs.unlinkSync(tempImgPath);
    if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
    if (fs.existsSync(finalVideoPath)) fs.unlinkSync(finalVideoPath);
    throw err;
  }
}

module.exports = { generateVideoDraft };
