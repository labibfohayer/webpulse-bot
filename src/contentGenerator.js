const { askGemini } = require('./geminiClient');

const CONTENT_PILLARS = [
  {
    topic: 'ই-কমার্স ওয়েবসাইট ও সেলস অটোমেশন',
    prompt: 'Create an engaging, persuasive, and professional Facebook promotional post for WebPulse Automation focusing on Custom E-Commerce Websites, lightning-fast product catalogs, and automated checkout.'
  },
  {
    topic: 'এআই চ্যাটবট ও ২৪/৭ কাস্টমার সাপোর্ট',
    prompt: 'Create an engaging Facebook promotional post for WebPulse Automation focusing on AI Chatbot Automation that talks to customers 24/7 in fluent Bengali and closes deals even while the owner sleeps.'
  },
  {
    topic: 'কর্পোরেট বিজনেসের ডিজিটাল রূপান্তর',
    prompt: 'Create a high-impact Facebook post for WebPulse Automation focusing on Corporate Websites, modern branding, professional UI/UX, and establishing authority in the Bangladesh market.'
  },
  {
    topic: 'উদ্যোক্তাদের জন্য প্রবৃদ্ধির বিশেষ পরামর্শ',
    prompt: 'Create an insightful and motivational Facebook post for entrepreneurs from WebPulse Automation about why manual customer handling loses 40% sales and how modern automation solves it.'
  },
  {
    topic: 'স্পেশাল ডিসকাউন্ট ও ৬ মাসের ফ্রি সাপোর্ট',
    prompt: 'Create an exciting Facebook promotional offer post for WebPulse Automation announcing limited-time special package pricing, free Google SEO setup, and 6 months of dedicated free technical support.'
  }
];

const IMAGE_PROMPTS = [
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80'
];

async function generatePostDraft(topicIndex = null, feedback = null, currentCaption = null, apiKey) {
  const index = (topicIndex !== null && topicIndex >= 0) 
    ? (topicIndex % CONTENT_PILLARS.length) 
    : Math.floor(Math.random() * CONTENT_PILLARS.length);

  const pillar = CONTENT_PILLARS[index];
  const imageUrl = IMAGE_PROMPTS[index];

  const systemPrompt = `You are the lead social media strategist and copywriter for WebPulse Automation, an elite software and digital automation agency in Bangladesh.
Company details:
- Company Name: WebPulse Automation
- Chairman: জনাব লাবিব ফোহায়ের (Labib Fohayer)
- Managing Director: জনাব জায়ান আরহাম (Zayan Arham)
- Services: Custom E-Commerce websites, AI chatbots, corporate business websites, sales automation, CRM & custom software.
- Benefits: 100% responsive, bKash/Nagad/Card integration, SEO setup, 6 months unlimited free support.
- Office: Dhaka, Bangladesh.
- Contact: Inbox page or WhatsApp: +8801700000000.

Guidelines:
1. Write in compelling, high-converting, professional Bengali (বাংলা).
2. Include an attention-grabbing hook at the beginning.
3. Use clean emojis and bullet points for readability.
4. End with a strong Call-to-Action (CTA) encouraging clients to inbox the page.
5. Include 4-5 relevant hashtags (e.g. #WebPulseAutomation #BusinessGrowth #EcommerceWebsite #AutomationBD #DigitalBangladesh).
6. Output ONLY the ready-to-publish post caption text, nothing else (no explanations).`;

  let userPrompt = '';
  if (feedback && currentCaption) {
    userPrompt = `Here is the current post caption:\n"${currentCaption}"\n\nOur Chairman Mr. Labib Fohayer has given this feedback to revise it:\n"${feedback}"\n\nPlease rewrite the complete post incorporating his instructions perfectly.`;
  } else {
    userPrompt = `Write a fresh, powerful Facebook post about: ${pillar.topic}.\nTheme: ${pillar.prompt}`;
  }

  const messages = [{ sender: 'client', text: userPrompt }];
  const caption = await askGemini(messages, systemPrompt, apiKey);

  return {
    id: 'DRAFT-' + Date.now().toString().slice(-6),
    topicIndex: index,
    topic: pillar.topic,
    caption: caption.trim(),
    imageUrl: imageUrl
  };
}

module.exports = { generatePostDraft, CONTENT_PILLARS };
