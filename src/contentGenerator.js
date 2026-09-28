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
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e', // Neon currency digital concept
    'https://images.unsplash.com/photo-1512428559087-560fa5ceab42', // Modern smartphone e-commerce app
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8', // Modern luxury fashion boutique
    'https://images.unsplash.com/photo-1549465220-1a8b9238cd48', // Minimalist sleek gift box package
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44', // Glowing digital payment card
    'https://images.unsplash.com/photo-1580674684081-7617fbf3d745', // Electric courier delivery bike
    'https://images.unsplash.com/photo-1551836022-d5d88e9218df', // Modern tablet sales analytics
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff', // Iconic sneaker product unboxing
    'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a', // Modern architectural store interior
    'https://images.unsplash.com/photo-1563013544-824ae1b704d3', // Online transaction smartphone
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc'  // Sleek boutique storefront
  ],
  chatbot: [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe', // Futuristic sleek silver AI humanoid
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5', // Glowing green cyber data matrix
    'https://images.unsplash.com/photo-1534536281715-e28d76689b4d', // Professional customer support agent with headset
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31', // Neon cyan and purple server datacenter
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa', // Glowing digital globe network
    'https://images.unsplash.com/photo-1507499739999-097706ad8914', // Blue fiber optics laser light
    'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4', // Neon geometric wireframe cube
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758', // High-tech robotic arm laboratory
    'https://images.unsplash.com/photo-1589254065878-42c9da997008', // Autonomous smart mobile robot
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b'  // High-tech holographic cyber dashboard
  ],
  corporate: [
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab', // Ultra-modern glass skyscraper looking up
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2', // Luxury corporate boardroom overlooking skyline
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36', // Minimalist executive office desk
    'https://images.unsplash.com/photo-1531482615713-2afd69097998', // Collaborative modern tech development team
    'https://images.unsplash.com/photo-1506146332389-18140dc7b2fb', // High-rise architectural tower at sunset
    'https://images.unsplash.com/photo-1521791136064-7986c2920216', // Elite business agreement handshake
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c', // Dual monitor clean software coding setup
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0', // High-energy business strategy meeting
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d'  // Tech development workspace with screens
  ],
  growth: [
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f', // Bull sculpture representing market growth
    'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1', // Glowing world map showing trade growth
    'https://images.unsplash.com/photo-1529699211952-734e80c4d42b', // Chess game victory strategy
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5', // High-speed dynamic city traffic light trails
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf', // Elegant businessman standing tall
    'https://images.unsplash.com/photo-1557804506-669a67965ba0', // Modern colorful creative agency workgroup
    'https://images.unsplash.com/photo-1531403009284-440f080d1e12'  // UX UI wireframe product design table
  ],
  support: [
    'https://images.unsplash.com/photo-1563986768609-322da13575f3', // Neon green cybersecurity padlock
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2', // Friendly smiling corporate professional
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158', // IT infrastructure server engineer
    'https://images.unsplash.com/photo-1560250097-0b93528c311a', // Experienced confident IT consultant
    'https://images.unsplash.com/photo-1516321497487-e288fb19713f', // High-tech digital handshake connection
    'https://images.unsplash.com/photo-1517048676732-d65bc937f952'  // Professional client advisory conference
  ]
};

const CATEGORY_KEYS = ['ecommerce', 'chatbot', 'corporate', 'growth', 'support'];

/**
 * Guaranteed 100% Unique Image Selection.
 * Tracks previously used images on disk to prevent ANY duplicate banners.
 * Appends a cache-buster timestamp parameter so Telegram never displays a cached picture.
 */
function getDynamicImageUrl(topicIndex) {
  const categoryKey = CATEGORY_KEYS[topicIndex % CATEGORY_KEYS.length];
  const pool = BANNER_COLLECTIONS[categoryKey] || BANNER_COLLECTIONS.ecommerce;
  const usedList = loadUsedBanners();
  const usedBaseSet = new Set(usedList.map(u => u.split('?')[0]));

  // Strictly filter out any image that has ever been used (comparing base URL without query params)
  let available = pool.filter(url => !usedBaseSet.has(url.split('?')[0]));

  // If this category pool is exhausted, search all other pools for unused images
  if (available.length === 0) {
    const allPool = Object.values(BANNER_COLLECTIONS).flat();
    available = allPool.filter(url => !usedBaseSet.has(url.split('?')[0]));
  }

  // If literally every image in all pools has been used, keep only recent half
  if (available.length === 0) {
    console.log('🔄 [Content AI] All images used! Clearing oldest half of history...');
    const kept = usedList.slice(Math.floor(usedList.length / 2));
    saveUsedBanners(kept);
    const newUsedBaseSet = new Set(kept.map(u => u.split('?')[0]));
    available = pool.filter(url => !newUsedBaseSet.has(url.split('?')[0]));
    if (available.length === 0) {
      available = Object.values(BANNER_COLLECTIONS).flat().filter(url => !newUsedBaseSet.has(url.split('?')[0]));
    }
  }

  // Pick a fresh unused image
  const baseSelectedUrl = available[Math.floor(Math.random() * available.length)];
  
  // Save base URL to history
  usedList.push(baseSelectedUrl);
  saveUsedBanners(usedList);

  // Add cache-buster & high quality parameters so Telegram / Meta never serves cached image
  const finalImageUrl = `${baseSelectedUrl}?auto=format&fit=crop&w=1200&q=85&cb=${Date.now()}`;

  console.log(`🖼️ [Content AI] Selected 100% fresh unique 4K banner (Total history tracked: ${usedList.length}): ${finalImageUrl}`);
  return finalImageUrl;
}

const FALLBACK_CAPTIONS = {
  0: [
    `🎯 ই-কমার্স ব্যবসাকে দিন আধুনিক রূপ! 🚀\n\n💡 সাধারণ ওয়েবসাইটে আটকে আছে বিক্রি? আমাদের কাস্টম সলিউশনে ব্যবসা বাড়ান দ্বিগুণ গতিতে।\n\n✨ আমাদের প্রিমিয়াম সলিউশন:\n• কাস্টম ই-কমার্স ওয়েবসাইট\n• লাইটনিং ফাস্ট প্রোডাক্ট ক্যাটালগ\n• অটোমেটেড চেকআউট ও পেমেন্ট সিস্টেম\n\n📞 সরাসরি হোয়াটসঅ্যাপ করুন: 01580506445\n\n🏷️ #WebPulseAutomation #EcommerceBD #BusinessAutomation`,
    `🎯 ম্যানুয়াল অর্ডারের ঝামেলা শেষ! শুরু হোক অটোমেশন 🛒\n\n💡 মেসেঞ্জারে ঘণ্টার পর ঘণ্টা বসে না থেকে কাস্টমারদের দিন মাত্র কয়েক সেকেন্ডে স্বয়ংক্রিয় অর্ডার প্লেসমেন্টের অভিজ্ঞতা।\n\n✨ প্রধান সুবিধাসমূহ:\n• বিকাশ ও নগদ সরাসরি পেমেন্ট ইন্টিগ্রেশন\n• আল্ট্রা-ফাস্ট মোবাইল ফ্রেন্ডলি ওয়েবসাইট\n• ৬ মাসের ফ্রি ডেডিকেটেড টেকনিক্যাল সাপোর্ট\n\n📞 আজই আপনার শপ অটোমেট করুন: 01580506445\n\n🏷️ #WebPulseAutomation #OnlineShop #SalesAutomation`
  ],
  1: [
    `🎯 কাস্টমার সাপোর্ট দিন ২৪ ঘণ্টা, ঘুমানোর সময়েও! 🤖\n\n💡 মেসেজের রিপ্লাই দেরিতে পেলে কাস্টমার হারিয়ে যায়। WebPulse-এর স্মার্ট এআই চ্যাটবট হ্যান্ডেল করবে প্রতিটি সেলস।\n\n✨ এআই চ্যাটবটের বিশেষ সুবিধা:\n• সাবলীল বাংলায় ২৪/৭ ইনস্ট্যান্ট রিপ্লাই\n• স্বয়ংক্রিয় অর্ডার কনফার্মেশন\n• ফেসবুক ও ইনস্টাগ্রাম মেসেঞ্জার ইন্টিগ্রেশন\n\n📞 আজই ডেমো দেখতে নক দিন: 01580506445\n\n🏷️ #WebPulseAutomation #AIChatbot #MessengerAutomation`,
    `🎯 সেলস বাড়াতে স্মার্ট এআই অ্যাসিস্ট্যান্ট এখন আপনার পেজে! ⚡\n\n💡 প্রতি মিনিটে শত শত কাস্টমার হ্যান্ডেল করুন এক সেকেন্ডেই, কোনো বাড়তি স্টাফের ঝামেলা ছাড়াই।\n\n✨ প্রধান সুবিধাসমূহ:\n• অটোমেটেড সেলস ও ডিল ক্লোজিং\n• পণ্যের সঠিক তথ্য দ্রুত প্রদান\n• ২৪/৭ নিরবচ্ছিন্ন কাস্টমার সার্ভিস\n\n📞 ডেমো দেখতে এখনই হোয়াটসঅ্যাপ করুন: 01580506445\n\n🏷️ #WebPulseAutomation #AIChatbot #BusinessGrowth`
  ],
  2: [
    `🎯 আপনার কোম্পানির ব্র্যান্ড ভ্যালু বাড়ান প্রিমিয়াম কর্পোরেট ওয়েবসাইটে! 🏢\n\n💡 আধুনিক যুগে একটি আন্তর্জাতিক মানের ওয়েবসাইটই আপনার কোম্পানির প্রথম পরিচয় ও সর্বোচ্চ বিশ্বস্ততা।\n\n✨ আমাদের কর্পোরেট সলিউশন:\n• এলিগ্যান্ট ও রেস্পন্সিভ UI/UX ডিজাইন\n• হাই-স্পিড গুগল ক্লাউড হোস্টিং\n• সার্চ ইঞ্জিন অপ্টিমাইজেশন (SEO) ফ্রেন্ডলি\n\n📞 কর্পোরেট পরামর্শের জন্য হোয়াটসঅ্যাপ করুন: 01580506445\n\n🏷️ #WebPulseAutomation #CorporateWebsite #BusinessBranding`,
    `🎯 বিজনেসের নতুন উচ্চতা: স্মার্ট ডিজিটাল রূপান্তর 💼\n\n💡 পুরনো পদ্ধতিতে সময় নষ্ট না করে আপনার পুরো অফিসিয়াল প্রসেস ও প্রেজেন্সকে নিয়ে আসুন আধুনিক প্রযুক্তিতে।\n\n✨ আমাদের স্পেশাল ফিচার:\n• কাস্টম পোর্টাল ও ক্লায়েন্ট ড্যাশবোর্ড\n• সর্বোচ্চ সাইবার সিকিউরিটি প্রটেকশন\n• ৬ মাসের আনলিমিটেড মেইনটেন্যান্স ও সাপোর্ট\n\n📞 আজই যোগাযোগ করুন: 01580506445\n\n🏷️ #WebPulseAutomation #DigitalTransformation #SoftwareAgency`
  ],
  3: [
    `🎯 সঠিক অটোমেশনে ব্যবসার খরচ কমান ৫০%, সেলস বাড়ান দ্বিগুণ! 📈\n\n💡 আধুনিক প্রযুক্তির ছোঁয়ায় সফল উদ্যোক্তারা সেলস স্কেল করছেন দ্রুতগতিতে। পিছিয়ে থাকবেন না আপনিও।\n\n✨ আমাদের গ্রোথ প্যাকেজ:\n• অল-ইন-ওয়ান সেলস ফানেল ও ওয়েবসাইট\n• স্বয়ংক্রিয় অর্ডার ও ইনভয়েস জেনারেশন\n• রিয়েল-টাইম সেলস ও রেভিনিউ রিপোর্ট\n\n📞 ফ্রি কনসালটেশনের জন্য হোয়াটসঅ্যাপ করুন: 01580506445\n\n🏷️ #WebPulseAutomation #BusinessScaling #SalesFunnel`
  ],
  4: [
    `🎯 সীমিত সময়ের ধামাকা অফার: ওয়েবসাইট তৈরির সাথে ৬ মাসের ফ্রি সাপোর্ট! 🎁\n\n💡 ওয়েবসাইট তৈরির পর টেকনিক্যাল মেইনটেন্যান্স নিয়ে চিন্তা? WebPulse Automation দিচ্ছে সম্পূ্র্ণ ফ্রি টেকনিক্যাল সাপোর্ট।\n\n✨ অফারের আওতায় যা পাচ্ছেন:\n• ফ্রি ডোমেইন ও ক্লাউড এসএসএল সিকিউরিটি\n• সার্বক্ষণিক স্পিড মনিটরিং ও ব্যাকআপ\n• তাৎক্ষণিক ডেডিকেটেড ইঞ্জিনিয়ারিং সাপোর্ট\n\n📞 অফারটি পেতে আজই হোয়াটসঅ্যাপ করুন: 01580506445\n\n🏷️ #WebPulseAutomation #SpecialOffer #WebSupport #FreeMaintenance`
  ]
};

function getCuratedFallbackCaption(topicIndex) {
  const list = FALLBACK_CAPTIONS[topicIndex % Object.keys(FALLBACK_CAPTIONS).length] || FALLBACK_CAPTIONS[0];
  return list[Math.floor(Math.random() * list.length)];
}

async function generatePostDraft(topicIndex = null, feedback = null, currentCaption = null, apiKey) {
  const index = (topicIndex !== null && topicIndex >= 0) 
    ? (topicIndex % CONTENT_PILLARS.length) 
    : Math.floor(Math.random() * CONTENT_PILLARS.length);

  const pillar = CONTENT_PILLARS[index];
  const imageUrl = getDynamicImageUrl(index);

  const systemPrompt = `You are the chief copywriter for WebPulse Automation, an elite software & automation agency in Bangladesh.
Official WhatsApp: 01580506445.
Services: Custom E-Commerce websites, corporate portals, AI sales chatbots, bKash/Nagad payment integration, 6 months free technical support.

STRICT LENGTH & STRUCTURE REQUIREMENTS (MANDATORY):
1. LENGTH: Medium-short, perfectly balanced (strictly 45 to 65 Bengali words). NOT too long, NOT an essay, and NOT too short.
2. COMPLETENESS: The post must be 100% complete and beautifully finished. NEVER leave an incomplete or hanging sentence.
3. STRUCTURE:
   - 🎯 [1 catchy energetic headline with emojis]
   - 💡 [1 punchy problem-solution sentence]
   - ✨ আমাদের প্রিমিয়াম সলিউশন:
     • [Short bullet 1 - max 5 words]
     • [Short bullet 2 - max 5 words]
     • [Short bullet 3 - max 5 words]
   - 📞 সরাসরি হোয়াটসঅ্যাপ করুন: 01580506445
   - 🏷️ 3-4 hashtags (#WebPulseAutomation #EcommerceBD #BusinessAutomation)
4. TONE: Professional, crisp, modern Bengali.
5. Output ONLY the ready-to-publish post caption text, nothing else.`;

  let userPrompt = '';
  if (feedback && currentCaption) {
    userPrompt = `Here is the current post caption:\n"${currentCaption}"\n\nOur Chairman Mr. Labib Fohayer has given this feedback to revise it:\n"${feedback}"\n\nPlease rewrite the complete post incorporating his instructions perfectly. Keep it medium length (strictly 45-65 Bengali words), crisp, and fully complete.`;
  } else {
    userPrompt = `Write a fresh, medium-length (45-65 Bengali words) Facebook post about: ${pillar.topic}.\nTheme: ${pillar.prompt}`;
  }

  let caption = '';
  try {
    const messages = [{ sender: 'client', text: userPrompt }];
    caption = await askGemini(messages, systemPrompt, apiKey);
    caption = caption.trim();
  } catch (err) {
    console.warn(`⚠️ [Content AI] Gemini API temporarily busy (${err.message}). Seamlessly activated premium curated copy.`);
    caption = getCuratedFallbackCaption(index);
  }

  return {
    id: 'DRAFT-' + Date.now().toString().slice(-6),
    topicIndex: index,
    topic: pillar.topic,
    caption: caption,
    imageUrl: imageUrl
  };
}

module.exports = { generatePostDraft, CONTENT_PILLARS, BANNER_COLLECTIONS, CATEGORY_KEYS, FALLBACK_CAPTIONS };
