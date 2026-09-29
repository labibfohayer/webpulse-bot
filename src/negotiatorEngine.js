const EventEmitter = require('events');
const https = require('https');

class NegotiatorEngine extends EventEmitter {
  constructor(config, pipeline, telegramNotifier) {
    super();
    this.config = config;
    this.pipeline = pipeline;
    this.telegramNotifier = telegramNotifier;
    this.geminiApiKey = config.geminiApiKey || process.env.GEMINI_API_KEY || '';

    // Active client sessions by ID
    this.sessions = new Map();
  }

  getSession(clientId = 'default_client') {
    if (!this.sessions.has(clientId)) {
      this.sessions.set(clientId, {
        id: clientId,
        clientName: 'Client',
        clientPhone: '',
        clientAddress: '',
        state: 'greeting', // greeting, discussing_requirements, waiting_for_owner, negotiating, finalized
        requirement: 'কাস্টম ই-কমার্স ওয়েবসাইট ও বিজনেস অটোমেশন',
        standardPrice: 25000,
        clientOffer: 0,
        agreedPrice: 0,
        messages: [],
        pendingProposal: null
      });
    }
    return this.sessions.get(clientId);
  }

  async askGeminiWithFastTimeout(messages, systemPrompt, apiKey, maxMs = 3500) {
    const { askGemini } = require('./geminiClient');
    return Promise.race([
      askGemini(messages, systemPrompt, apiKey),
      new Promise((_, reject) => setTimeout(() => reject(new Error('AI fast response timeout (exceeded 3.5s)')), maxMs))
    ]);
  }

  /**
   * Main AI message handler for incoming client messages
   */
  async handleClientMessage(clientId, text) {
    const session = this.getSession(clientId);
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    // Log client message
    session.messages.push({ sender: 'client', text: trimmed, time: new Date().toISOString() });
    this.emit('message', { clientId, sender: 'client', text: trimmed });

    // 1. If currently waiting for owner decision via Telegram
    if (session.state === 'waiting_for_owner') {
      const busyMsg = 'আপনার অফারটি আমাদের ওনারের অনুমোদনের জন্য অলরেডি পাঠানো হয়েছে। ওনারের সংকেত পেলেই আমি আপনাকে বিস্তারিত জানিয়ে দিচ্ছি! একটু ধৈর্য ধরুন... ⏳';
      session.messages.push({ sender: 'bot', text: busyMsg, time: new Date().toISOString() });
      this.emit('message', { clientId, sender: 'bot', text: busyMsg });
      return { status: 'waiting_for_owner', text: busyMsg };
    }

    // 2. Check if client is providing contact details (finalizing order)
    const hasPhoneNumber = /\d{7,}/.test(trimmed) || /[০-৯]{7,}/.test(trimmed);
    if (session.state === 'finalizing' || (hasPhoneNumber && (session.state === 'negotiating' || session.clientOffer > 0))) {
      return this.handleFinalizingDetails(session, trimmed);
    }

    // 3. Detect Budget Offer or Price Bargaining (e.g. ১৮০০০, ২০,০০০, বাজেট, টাকা, ডিসকাউন্ট)
    const budgetMatch = trimmed.match(/(\d{2,6})\s*(হাজার|টাকা|tk|bdt)?/i) || trimmed.match(/([০-৯]{2,6})\s*(হাজার|টাকা|tk|bdt)?/i);
    const hasNegotiationKeywords = lower.includes('বাজেট') || lower.includes('টাকা') || lower.includes('টাকায়') ||
                                   lower.includes('হবে কি') || lower.includes('ডিসকাউন্ট') || lower.includes('কমান') ||
                                   lower.includes('অফার') || lower.includes('কম') || lower.includes('রাখেন') ||
                                   lower.includes('budget') || lower.includes('price') || lower.includes('discount');

    if (budgetMatch || hasNegotiationKeywords) {
      let offeredAmount = 0;
      if (budgetMatch) {
        const bnToEn = str => str.replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d));
        let num = parseInt(bnToEn(budgetMatch[1]), 10);
        if (trimmed.includes('হাজার') && num < 1000) num *= 1000;
        offeredAmount = num;
      } else {
        offeredAmount = Math.round(session.standardPrice * 0.75); // assumption
      }

      session.clientOffer = offeredAmount;
      session.state = 'waiting_for_owner';

      const interimMsg = `ধন্যবাদ আপনার চমৎকার অফারের জন্য! আপনি ৳${offeredAmount.toLocaleString('en-US')} বাজেট প্রস্তাব করেছেন (আমাদের রেগুলার অফিশিয়াল প্যাকেজ ৳${session.standardPrice.toLocaleString('en-US')})।\n\nযেহেতু এটি একটি বিশেষ ডিসকাউন্ট প্রস্তাব, তাই আমি সরাসরি আমাদের ওনারের (Boss) কাছে অনুমোদনের জন্য পাঠাচ্ছি। ওনার সংকেত দিলে এখনই কনফার্ম করছি, অনুগ্রহ করে এক মিনিট অপেক্ষা করুন... ⏳`;
      
      session.messages.push({ sender: 'bot', text: interimMsg, time: new Date().toISOString() });
      this.emit('message', { clientId, sender: 'bot', text: interimMsg });

      const proposal = {
        proposalId: `PROP-${Date.now().toString().slice(-5)}`,
        clientId: session.id,
        clientName: session.clientName,
        requirement: session.requirement,
        standardPrice: session.standardPrice,
        clientOffer: offeredAmount,
        difference: session.standardPrice - offeredAmount,
        suggestedCounter: Math.round((session.standardPrice + offeredAmount) / 2 / 500) * 500
      };

      session.pendingProposal = proposal;

      if (this.telegramNotifier) {
        await this.telegramNotifier.sendDealApprovalRequest(proposal);
      }
      this.emit('owner_approval_requested', proposal);

      return { status: 'approval_requested', proposal, text: interimMsg };
    }

    const { askGemini } = require('./geminiClient');

    // If Gemini API Key is configured, use Google Gemini for ultra-smart human-like dialogue!
    if (this.geminiApiKey) {
      try {
        const systemPrompt = `You are a warm, highly intelligent, and charismatic senior sales consultant for "WebPulse Automation", an elite IT & software agency in Bangladesh.
Company details:
- Company Name: WebPulse Automation
- Chairman: জনাব লাবিব ফোহায়ের (Labib Fohayer)
- Managing Director: জনাব জায়ান আরহাম (Zayan Arham)
- Official WhatsApp: 01580506445
- Services: Custom E-Commerce websites, corporate business websites, sales automation bots, mobile apps, CRM & custom software.
- Key benefits: 100% custom responsive design, lightning speed, bKash/Nagad/Card payment gateways, Google SEO setup, 6 months unlimited free technical support.
- Standard package price: 25,000 BDT.
- Delivery timeline: 3-5 days for landing pages, 7-10 days for full e-commerce, 15-20 days for custom software.
- Office: Dhaka, Bangladesh.

CRITICAL FORMATTING & STRUCTURE (STRICTLY ENFORCED):
1. BLOCK-BY-BLOCK FORMAT: Always organize your reply into 2 or 3 distinct short paragraphs (blocks) separated by a blank line (\\n\\n).
   - Block 1: Warm direct greeting or direct 1-sentence answer.
   - Block 2: 2-3 short, crisp benefit/feature points or key details.
   - Block 3: 1 friendly follow-up question or call-to-action.
2. COMPLETENESS: Every sentence must be 100% complete and finished. NEVER leave any half-finished sentence or cut off thought.
3. CONCISENESS: Do NOT write giant walls of text. Keep each block crisp and easy to read on mobile Messenger.
4. TONE: Natural, polite, persuasive Bengali (বাংলা).
5. Do not repeat greeting ("সালাম/হ্যালো") if the user is asking a question in an ongoing conversation.`;

        const geminiReply = await this.askGeminiWithFastTimeout(session.messages, systemPrompt, this.geminiApiKey, 3500);
        return this.sendBotReply(session, geminiReply, 'discussing_requirements');
      } catch (err) {
        console.warn('⚠️ Fast AI timed out or failed, instantly using knowledge base:', err.message);
      }
    }

    // 4. Intent: Benefits & Value Proposition (সুবিধা ও লাভ)
    if (lower.includes('সুবিধা') || lower.includes('লাভ') || lower.includes('কেন নেব') || lower.includes('benefit') || lower.includes('feature') || lower.includes('বৈশিষ্ট্য')) {
      const reply = `WebPulse Automation থেকে কাজ করালে আপনি যে যে বিশেষ সুবিধাসমূহ পাবেন: 🌟\n\n` +
        `১. ১০০% কাস্টম ও প্রিমিয়াম ডিজাইন (মোবাইল ও পিসিতে দ্রুত লোড হবে)।\n` +
        `২. স্বয়ংক্রিয় সেলস ও ইনভয়েস অটোমেশন সিস্টেম।\n` +
        `৩. পেমেন্ট গেটওয়ে (বিকাশ, নগদ, কার্ড) ও কুরিয়ার ট্র্যাকিং ইন্টিগ্রেশন।\n` +
        `৪. ফুল এসইও (Google SEO) ফ্রেন্ডলি সেটআপ।\n` +
        `৫. ৬ মাসের সম্পূর্ণ ফ্রি টেকনিক্যাল সাপোর্ট ও লাইভ মেইনটেন্যান্স।\n\n` +
        `আপনার নির্দিষ্ট প্রজেক্ট বা বিজনেস আইডিয়া থাকলে জানান, আমরা সবচেয়ে মানানসই প্যাকেজটি সাজিয়ে দেব!`;
      return this.sendBotReply(session, reply, 'discussing_requirements');
    }

    // 5. Intent: Services Offered (কী কী সার্ভিস বা কাজ দেন)
    if (lower.includes('কী কী') || lower.includes('কি কি') || lower.includes('সার্ভিস') || lower.includes('সেবা') || lower.includes('কাজ করেন') || lower.includes('service') || lower.includes('কাজ')) {
      const reply = `আমরা WebPulse Automation টিম মূলত এই সার্ভিসগুলো দিয়ে থাকি: 🚀\n\n` +
        `• ই-কমার্স ও অনলাইন শপ ওয়েবসাইট\n` +
        `• কর্পোরেট ও বিজনেস ওয়েবসাইট\n` +
        `• ফেসবুক মেসেঞ্জার ও সেলস অটোমেশন বট\n` +
        `• কাস্টম সফটওয়্যার ও ম্যানেজমেন্ট সিস্টেম\n` +
        `• ডিজিটাল মার্কেটিং ও ফানেল অপ্টিমাইজেশন\n\n` +
        `আপনি কোন ধরনের সার্ভিসটি দিয়ে আপনার ব্যবসা শুরু বা বড় করতে চান?`;
      return this.sendBotReply(session, reply, 'discussing_requirements');
    }

    // 6. Intent: Delivery Timeline & Duration (কতদিন সময় লাগবে)
    if (lower.includes('সময়') || lower.includes('কতদিন') || lower.includes('কবে') || lower.includes('দিন লাগবে') || lower.includes('duration') || lower.includes('timeline') || lower.includes('delivery')) {
      const reply = `আমাদের সাধারণ ডেলিভারি সময়সীমা: ⏱️\n\n` +
        `• সিঙ্গেল পেজ বা ল্যান্ডিং পেজ: ৩ থেকে ৫ দিন।\n` +
        `• ফুল ই-কমার্স বা বিজনেস ওয়েবসাইট: ৭ থেকে ১০ দিন।\n` +
        `• কাস্টম সফটওয়্যার বা বড় প্রজেক্ট: ১৫ থেকে ২০ দিন।\n\n` +
        `আপনার কি কোনো আর্জেন্ট বা নির্দিষ্ট ডেডলাইন আছে? আমরা প্রয়োজনে ফাস্ট-ট্র্যাক সার্ভিসের ব্যবস্থা করতে পারি।`;
      return this.sendBotReply(session, reply, 'discussing_requirements');
    }

    // 7. Intent: Support & Guarantee (আফটার সেলস সাপোর্ট)
    if (lower.includes('সাপোর্ট') || lower.includes('গ্যারান্টি') || lower.includes('ওয়ারেন্টি') || lower.includes('সমস্যা হলে') || lower.includes('নষ্ট হলে') || lower.includes('support')) {
      const reply = `নিশ্চিন্ত থাকুন! আমাদের প্রতিটি প্রজেক্টের সাথেই পাচ্ছেন ৬ মাসের আনলিমিটেড ফ্রি টেকনিক্যাল সাপোর্ট। 🛡️\n\nডেলিভারির পর কোনো বাগ বা কারিগরি সমস্যা হলে আমাদের ডেভেলপার টিম সাথে সাথে ঠিক করে দেয়। ক্লায়েন্টের সন্তুষ্টিই আমাদের প্রধান লক্ষ্য।`;
      return this.sendBotReply(session, reply, 'discussing_requirements');
    }

    // 8. Intent: Portfolio & Previous Work Samples (আগের কাজ)
    if (lower.includes('স্যাম্পল') || lower.includes('ডেমো') || lower.includes('আগের কাজ') || lower.includes('portfolio') || lower.includes('sample') || lower.includes('demo')) {
      const reply = `অবশ্যই! আমরা ইতিমধ্যে বহু সফল ই-কমার্স ও কর্পোরেট ওয়েবসাইট এবং অটোমেশন বট ডেলিভারি করেছি। 💻\n\nআপনি কোন ধরনের কাজের ডেমো দেখতে চান (যেমন: ফ্যাশন ই-কমার্স, রেস্তোরাঁ ওয়েবসাইট বা এজেন্সি পোর্টাল)? জানালে সাথে সাথে লাইভ লিংক শেয়ার করছি।`;
      return this.sendBotReply(session, reply, 'discussing_requirements');
    }

    // 9. Intent: Contact & Location (অফিস ও যোগাযোগ)
    if (lower.includes('অফিস') || lower.includes('কোথায়') || lower.includes('ঠিকানা') || lower.includes('লোকেশন') || lower.includes('location') || lower.includes('address')) {
      const reply = `আমাদের প্রধান অফিস: WebPulse Automation, ঢাকা, বাংলাদেশ। 📍\nআমাদের সাথে সার্বক্ষণিক মেসেঞ্জারে কথা বলতে পারেন, অথবা প্রয়োজনে আমাদের টিম মেম্বারদের সাথে গুগল মিট বা সরাসরি কলে বিস্তারিত প্রজেক্ট ডিসকাশন করতে পারেন।`;
      return this.sendBotReply(session, reply, 'discussing_requirements');
    }

    // 10. Intent: Agreement / Confirm Deal (সম্মতি দেওয়া)
    if (lower.includes('রাজি') || lower.includes('কনফার্ম') || lower.includes('করুন') || lower.includes('ঠিক আছে') || lower.includes('ডান') || lower.includes('done') || lower.includes('confirm') || lower.includes('agree')) {
      session.state = 'finalizing';
      const reply = `অসাধারণ! আপনার সাথে ডিলটি কনফার্ম করতে পেরে আমরা অত্যন্ত আনন্দিত। 🎉\n\nঅফিশিয়াল ইনভয়েস ও মেমো তৈরি করার জন্য অনুগ্রহ করে আপনার নাম, মোবাইল নম্বর এবং ডেলিভারি/কোম্পানি ঠিকানাটি লিখে দিন (যেমন: তানভীর আহমেদ, 01712345678, ধানমন্ডি ঢাকা)।`;
      return this.sendBotReply(session, reply, 'finalizing');
    }

    // 11. Intent: Specific Product / Requirement Mention (যেমন ওয়েবসাইট, সফটওয়্যার)
    if (lower.includes('ওয়েবসাইট') || lower.includes('website') || lower.includes('সফটওয়্যার') || lower.includes('software') || lower.includes('অ্যাপ') || lower.includes('app')) {
      session.requirement = trimmed;
      const reply = `চমৎকার! আপনার "${trimmed}" প্রজেক্টের জন্য আমাদের কাছে আধুনিক ও হাই-স্পিড সল্যুশন রয়েছে। 🚀\n\nআমাদের স্ট্যান্ডার্ড রেগুলার প্যাকেজ সাধারণত ৳${session.standardPrice.toLocaleString('en-US')} টাকা।\n\nআপনার কি কোনো নির্দিষ্ট ফিচার রিকোয়ারমেন্ট বা বাজেট ভাবনায় আছে? আমাকে জানালে সেরা অফারটি রেডি করে দেব।`;
      return this.sendBotReply(session, reply, 'discussing_requirements');
    }

    // 12. Smart Contextual Fallback (Avoid generic repeated greetings!)
    if (session.messages.length > 2) {
      const smartFollowup = `ধন্যবাদ আপনার বার্তার জন্য! আপনার প্রজেক্টটি নিখুঁতভাবে সম্পন্ন করতে আমরা প্রস্তুত।\n\nকাজের কোনো নির্দিষ্ট ফিচার, বাজেট বা ডেডলাইন সম্পর্কে আপনার কোনো প্রশ্ন থাকলে বলুন, আমি সাথে সাথে সহযোগিতা করছি।`;
      return this.sendBotReply(session, smartFollowup, 'discussing_requirements');
    }

    // 13. First-time Greeting
    const welcome = `সালাম! WebPulse Automation-এ আপনাকে স্বাগতম। 🌸\nআমি এআই বিজনেস অ্যাসিস্ট্যান্ট।\n\nআপনি কি কোনো ওয়েবসাইট, ই-কমার্স শপ বা বিজনেস অটোমেশন সিস্টেমের খোঁজ করছেন? আপনার কাজের বিবরণ বা প্রশ্ন শেয়ার করলে আমি বিস্তারিত জানাচ্ছি!`;
    return this.sendBotReply(session, welcome, 'greeting');
  }

  sendBotReply(session, text, nextState) {
    session.state = nextState;
    session.messages.push({ sender: 'bot', text, time: new Date().toISOString() });
    this.emit('message', { clientId: session.id, sender: 'bot', text });
    return { status: nextState, text };
  }

  /**
   * Called when Owner responds via Telegram or Simulator
   */
  async handleOwnerResponse(proposalId, action, options = {}) {
    let targetSession = null;
    for (const session of this.sessions.values()) {
      if (session.pendingProposal && session.pendingProposal.proposalId === proposalId) {
        targetSession = session;
        break;
      }
    }

    if (!targetSession) {
      targetSession = this.sessions.get('default_client') || Array.from(this.sessions.values())[0];
    }

    if (!targetSession) return { success: false, error: 'Session not found' };

    let clientReply = '';
    const proposal = targetSession.pendingProposal || { clientOffer: targetSession.clientOffer, standardPrice: targetSession.standardPrice };

    if (action === 'accept') {
      targetSession.agreedPrice = proposal.clientOffer;
      targetSession.state = 'finalizing';
      clientReply = `🎉 দারুণ খবর! আমাদের WebPulse Automation-এর মাননীয় চেয়ারম্যান জনাব লাবিব ফোহায়ের এবং ম্যানেজিং ডিরেক্টর জনাব জায়ান আরহাম আপনার ব্যবসার প্রসারের কথা বিবেচনা করে প্রস্তাবিত বাজেট ৳${proposal.clientOffer.toLocaleString('en-US')} বিশেষ বিবেচনায় অনুমোদন করেছেন!\n\nআমরা এখনই আপনার কাজ শুরু করতে প্রস্তুত। অফিশিয়াল ইনভয়েস ও ওয়ার্ক অর্ডার প্রস্তুত করতে অনুগ্রহ করে আপনার নাম, মোবাইল নম্বর ও ঠিকানাটি লিখে দিন।`;
    } else if (action === 'counter') {
      const counterAmount = options.counterPrice || proposal.suggestedCounter || Math.round((proposal.standardPrice + proposal.clientOffer) / 2);
      targetSession.agreedPrice = counterAmount;
      targetSession.state = 'negotiating';
      clientReply = `আমাদের চেয়ারম্যান জনাব লাবিব ফোহায়ের এবং ম্যানেজিং ডিরেক্টর জনাব জায়ান আরহাম-এর সাথে আলোচনা হয়েছে। প্রজেক্টের প্রিমিয়াম কোয়ালিটি, লাইভ সাপোর্ট ও দ্রুত ডেলিভারি নিশ্চিত করতে আমরা সর্বনিম্ন ৳${counterAmount.toLocaleString('en-US')} টাকায় কাজটি করে দিতে পারব।\n\nএই বাজেটে কি আমরা ডিল কনফার্ম করব? আপনার সম্মতি পেলে এখনই প্রসেস শুরু করছি।`;
    } else if (action === 'reject') {
      targetSession.state = 'discussing_requirements';
      clientReply = `দুঃখিত, আমাদের টেকনিক্যাল টিম আলোচনা করে দেখেছে যে এই বাজেটে প্রিমিয়াম কোয়ালিটি মেইনটেইন করা সম্ভব হবে না।\n\nআপনি চাইলে আমরা ফিচার কিছুটা কাস্টমাইজ করে বাজেট মানানসই করতে পারি, অথবা ৳${proposal.standardPrice.toLocaleString('en-US')} বাজেটে স্ট্যান্ডার্ড প্যাকেজটি বেছে নিতে পারেন।`;
    } else if (action === 'custom') {
      targetSession.state = 'negotiating';
      const customInstruction = options.customText || 'ম্যানেজমেন্ট থেকে জানানো হয়েছে...';
      clientReply = `আমাদের ওনারের বিশেষ বার্তা:\n"${customInstruction}"\n\nআপনার মতামত জানালে আমরা পরবর্তী পদক্ষেপে এগোব।`;
    }

    targetSession.messages.push({ sender: 'bot', text: clientReply, time: new Date().toISOString() });
    targetSession.pendingProposal = null;

    this.emit('message', { clientId: targetSession.id, sender: 'bot', text: clientReply });
    this.emit('owner_decision_applied', { proposalId, action, reply: clientReply, session: targetSession });

    return { success: true, reply: clientReply };
  }

  async handleFinalizingDetails(session, text) {
    const parts = text.split(/[,|\n]/).map(s => s.trim()).filter(Boolean);
    const name = parts[0] || 'Honorable Client';
    const phone = parts.find(p => /\d{5,}/.test(p)) || '01712345678';
    const address = parts.length > 2 ? parts.slice(2).join(', ') : (parts[1] && !/\d{5,}/.test(parts[1]) ? parts[1] : 'Dhaka, Bangladesh');

    session.clientName = name;
    session.clientPhone = phone;
    session.clientAddress = address;
    session.state = 'finalized';

    const finalAmount = session.agreedPrice || session.clientOffer || session.standardPrice;

    const orderData = {
      orderId: `DEAL-${Date.now().toString().slice(-6)}`,
      channel: 'telegram-ai-negotiator',
      paymentMethod: 'Advance / Milestone Payment',
      customer: { name, phone, address },
      items: [
        { name: session.requirement || 'Custom Digital Solution Package', price: finalAmount, quantity: 1 }
      ],
      pricing: {
        subtotal: finalAmount,
        deliveryFee: 0,
        discount: session.standardPrice > finalAmount ? (session.standardPrice - finalAmount) : 0,
        grandTotal: finalAmount
      }
    };

    const processedOrder = await this.pipeline.processOrder(orderData);

    const successMsg = `🎉 অভিনন্দন ${name}! আপনার ডিলটি সফলভাবে কনফার্ম করা হয়েছে (ডিল আইডি: #${orderData.orderId})।\n\n💰 চূড়ান্ত মূল্য: ৳${finalAmount.toLocaleString('en-US')}\n📄 আপনার ডিজিটাল ইনভয়েস ও মেমো তৈরি হয়ে গেছে।\n\nআমাদের টিম শিগগিরই আপনার সাথে যোগাযোগ করে প্রজেক্ট কাজ শুরু করবে। আমাদের সাথে থাকার জন্য ধন্যবাদ! ✨`;

    session.messages.push({ sender: 'bot', text: successMsg, time: new Date().toISOString() });
    this.emit('message', { clientId: session.id, sender: 'bot', text: successMsg, invoiceUrl: processedOrder.invoiceUrl });

    if (this.telegramNotifier) {
      await this.telegramNotifier.notifyDealClosed(processedOrder);
    }

    return { status: 'finalized', order: processedOrder, text: successMsg };
  }
}

module.exports = { NegotiatorEngine };
