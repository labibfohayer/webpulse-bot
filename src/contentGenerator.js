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

const BANNER_COLLECTIONS = {
  ecommerce: [
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80'
  ],
  chatbot: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80'
  ],
  corporate: [
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80'
  ],
  growth: [
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80'
  ],
  support: [
    'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80'
  ]
};

const CATEGORY_KEYS = ['ecommerce', 'chatbot', 'corporate', 'growth', 'support'];
const recentlyUsedImages = new Set();

function getDynamicImageUrl(topicIndex) {
  const categoryKey = CATEGORY_KEYS[topicIndex % CATEGORY_KEYS.length];
  const pool = BANNER_COLLECTIONS[categoryKey] || BANNER_COLLECTIONS.ecommerce;
  
  // Filter out recently used images to guarantee fresh photos
  const available = pool.filter(url => !recentlyUsedImages.has(url));
  const chosenPool = available.length > 0 ? available : pool;
  
  const selectedUrl = chosenPool[Math.floor(Math.random() * chosenPool.length)];
  recentlyUsedImages.add(selectedUrl);
  if (recentlyUsedImages.size > 15) {
    const firstAdded = recentlyUsedImages.values().next().value;
    recentlyUsedImages.delete(firstAdded);
  }

  return selectedUrl;
}

async function generatePostDraft(topicIndex = null, feedback = null, currentCaption = null, apiKey) {
  const index = (topicIndex !== null && topicIndex >= 0) 
    ? (topicIndex % CONTENT_PILLARS.length) 
    : Math.floor(Math.random() * CONTENT_PILLARS.length);

  const pillar = CONTENT_PILLARS[index];
  const imageUrl = getDynamicImageUrl(index);

  const systemPrompt = `You are the lead social media strategist and copywriter for WebPulse Automation, an elite software and digital automation agency in Bangladesh.
Company details:
- Company Name: WebPulse Automation
- Chairman: জনাব লাবিব ফোহায়ের (Labib Fohayer)
- Managing Director: জনাব জায়ান আরহাম (Zayan Arham)
- Services: Custom E-Commerce websites, AI chatbots, corporate business websites, sales automation, CRM & custom software.
- Benefits: 100% responsive, bKash/Nagad/Card integration, SEO setup, 6 months unlimited free support.
- Office: Dhaka, Bangladesh.
- Official WhatsApp: 01580506445 (বা +8801580506445).

Guidelines:
1. Write in rich, highly engaging, polished, and comprehensive Bengali (বাংলা).
2. Structure of the post:
   - 🎯 Powerful hook / attention-grabbing headline with emojis
   - 💡 Compelling business storytelling about growth, sales, or customer experience
   - ✨ 4 to 6 clear bullet points detailing key features, benefits, speed & free support guarantees
   - 🤝 Mention leadership (মাননীয় চেয়ারম্যান জনাব লাবিব ফোহায়ের এবং ম্যানেজিং ডিরেক্টর জনাব জায়ান আরহাম) if relevant to special offers or vision
   - 🎁 Special offer or limited-time consultation call-out
   - 📞 Clear Call to Action (ইনবক্স করুন অথবা হোয়াটসঅ্যাপে যোগাযোগ করুন: 01580506445)
   - 🏷️ 5-6 trending hashtags (#WebPulseAutomation #BusinessGrowth #EcommerceWebsite #AIAutomation #DigitalBangladesh)
3. CRITICAL: NEVER cut off or stop mid-sentence. The post must be fully completed and well-rounded from headline to hashtags.
4. Output ONLY the complete, ready-to-publish post caption text, nothing else (no introductory or conversational remarks).`;

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

module.exports = { generatePostDraft, CONTENT_PILLARS, BANNER_COLLECTIONS, CATEGORY_KEYS };
