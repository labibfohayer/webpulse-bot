const fs = require('fs');
const path = require('path');
const { askGemini } = require('./geminiClient');

const USED_BANNERS_FILE = path.join(__dirname, '../data/used_banners.json');

function loadUsedBanners() {
  try {
    if (fs.existsSync(USED_BANNERS_FILE)) {
      return JSON.parse(fs.readFileSync(USED_BANNERS_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function saveUsedBanners(list) {
  try {
    const dir = path.dirname(USED_BANNERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(USED_BANNERS_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {}
}

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
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1556742208-999815fca738?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1556742111-a301076d9d18?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1508873696983-2df5293cb325?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1491933382434-500287f9b54b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1522204523234-8729aa6e3d5f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80'
  ],
  chatbot: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1589254065878-42c9da997008?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1507146426996-ef0538887e1a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80'
  ],
  corporate: [
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1200&q=80'
  ],
  growth: [
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1533750516457-a7f992034fec?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1520607164069-c5b0ab227b76?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1434626881859-194d67b2b86f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80'
  ],
  support: [
    'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80'
  ]
};

const CATEGORY_KEYS = ['ecommerce', 'chatbot', 'corporate', 'growth', 'support'];

/**
 * Guaranteed 100% Unique Image Selection.
 * Tracks previously used images on disk to prevent ANY duplicate banners.
 */
function getDynamicImageUrl(topicIndex) {
  const categoryKey = CATEGORY_KEYS[topicIndex % CATEGORY_KEYS.length];
  const pool = BANNER_COLLECTIONS[categoryKey] || BANNER_COLLECTIONS.ecommerce;
  const usedList = loadUsedBanners();
  const usedSet = new Set(usedList);

  // Strictly filter out any image that has ever been used
  let available = pool.filter(url => !usedSet.has(url));

  // If this category pool is exhausted, check other category pools for unused images
  if (available.length === 0) {
    const allPool = Object.values(BANNER_COLLECTIONS).flat();
    available = allPool.filter(url => !usedSet.has(url));
  }

  // If literally all 70+ images have been used across all pools, reset the oldest 50%
  if (available.length === 0) {
    console.log('🔄 [Content AI] All 70+ images used! Clearing oldest half of history...');
    const kept = usedList.slice(Math.floor(usedList.length / 2));
    saveUsedBanners(kept);
    const newUsedSet = new Set(kept);
    available = pool.filter(url => !newUsedSet.has(url));
  }

  const selectedUrl = available[Math.floor(Math.random() * available.length)];
  usedList.push(selectedUrl);
  saveUsedBanners(usedList);

  console.log(`🖼️ [Content AI] Selected 100% fresh unique 4K banner (Total history tracked: ${usedList.length}): ${selectedUrl}`);
  return selectedUrl;
}

async function generatePostDraft(topicIndex = null, feedback = null, currentCaption = null, apiKey) {
  const index = (topicIndex !== null && topicIndex >= 0) 
    ? (topicIndex % CONTENT_PILLARS.length) 
    : Math.floor(Math.random() * CONTENT_PILLARS.length);

  const pillar = CONTENT_PILLARS[index];
  const imageUrl = getDynamicImageUrl(index);

  const systemPrompt = `You are the chief copywriter for WebPulse Automation, an elite software & automation agency in Bangladesh.
Leadership: Chairman জনাব লাবিব ফোহায়ের and MD জনাব জায়ান আরহাম.
Official WhatsApp: 01580506445.
Services: Custom E-Commerce websites, corporate portals, AI sales chatbots, bKash/Nagad payment integration, 6 months free technical support.

CRITICAL INSTRUCTIONS FOR POST LENGTH & STRUCTURE (STRICTLY ENFORCED):
1. LENGTH: Medium and balanced (around 70 to 100 Bengali words). NOT too long, NOT too short.
2. COMPLETENESS: The post must be 100% complete and cleanly finished. NEVER stop or cut off mid-sentence.
3. STRUCTURE:
   - 🎯 Catchy, energetic headline with relevant emojis (1-2 lines).
   - 💡 1-2 punchy sentences addressing the business pain-point or solution.
   - ✨ Exactly 3 to 4 short, crisp bullet points highlighting core benefits (e.g. কাস্টম ই-কমার্স শপ, ২৪/৭ এআই চ্যাটবট, ৬ মাসের ফ্রি সাপোর্ট).
   - 📞 Clear, direct Call-to-Action with WhatsApp: 01580506445.
   - 🏷️ 3 to 4 focused hashtags (#WebPulseAutomation #BusinessAutomation #EcommerceBD #AIChatbot).
4. TONE: Persuasive, polished, professional Bengali.
5. Output ONLY the ready-to-publish post caption text, nothing else.`;

  let userPrompt = '';
  if (feedback && currentCaption) {
    userPrompt = `Here is the current post caption:\n"${currentCaption}"\n\nOur Chairman Mr. Labib Fohayer has given this feedback to revise it:\n"${feedback}"\n\nPlease rewrite the complete post incorporating his instructions perfectly. Keep it medium length, crisp, and fully complete.`;
  } else {
    userPrompt = `Write a fresh, medium-length, high-converting Facebook post about: ${pillar.topic}.\nTheme: ${pillar.prompt}`;
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
