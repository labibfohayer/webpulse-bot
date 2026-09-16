const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { AutomationPipeline } = require('./src/pipeline');
const { startFolderWatcher } = require('./src/watcher');

// Load config
const configPath = path.join(__dirname, 'config.json');
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.clear();
console.log('===============================================================');
console.log('🤖  AUTO-ORDER DESKTOP BOT (স্বয়ংক্রিয় লোকাল স্ক্রিপ্ট বট)');
console.log('===============================================================');
console.log('📌 স্ট্যাটাস: বট সক্রিয় (ACTIVE)');
console.log('💻 হোস্ট: আপনার লোকাল পিসি (কোনো ক্লাউড সার্ভার বা টাকা লাগবে না!)');
console.log('⏱️  কার্যপদ্ধতি: পিসি অন থাকলে চলবে, বন্ধ করলে বন্ধ থাকবে।');
console.log('---------------------------------------------------------------');
console.log('📂 বট যে ফোল্ডার পাহারা দিচ্ছে (Watcher Folder):');
console.log('   data\\incoming\\ (এখানে ফাইল ফেলা মাত্রই বট কাজ শুরু করবে)');
console.log('---------------------------------------------------------------');

const pipeline = new AutomationPipeline(config);
startFolderWatcher(pipeline);

// Console visual output for bot
pipeline.on('step', (stepData) => {
  const icons = {
    1: '📥',
    2: '⚙️',
    3: '📄',
    4: '💬',
    5: '✅'
  };
  const icon = icons[stepData.step] || '🔹';
  console.log(`\n${icon} [ধাপ ${stepData.step}/৫] ${stepData.title}`);
  console.log(`   └─ ${stepData.detail}`);

  if (stepData.step === 3 && stepData.pdfUrl) {
    console.log(`   └─ 💾 ইনভয়েস তৈরি হয়েছে: output\\invoices\\${path.basename(stepData.pdfUrl)}`);
  }

  if (stepData.step === 5) {
    console.log(`🎉 [সফল] অর্ডার #${stepData.orderId} প্রসেসিং সম্পন্ন!`);
    console.log('---------------------------------------------------------------');
    console.log('🤖 বট পরবর্তী অর্ডারের জন্য প্রস্তুত...\n');
  }
});

// Interactive terminal menu for demonstration
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function showMenu() {
  console.log('\n[বট টেস্ট মেনু - যেকোনো অপশন টাইপ করে Enter চাপুন]:');
  console.log('  1 - ফেসবুক মেসেঞ্জার অর্ডারের লাইভ সিমুলেশন');
  console.log('  2 - ফেসবুক লিড অ্যাড অর্ডারের লাইভ সিমুলেশন');
  console.log('  3 - ফোল্ডারে টেস্ট অর্ডার ফাইল ফেলা');
  console.log('  4 - মোট সেলস ও হিস্ট্রি দেখা');
  console.log('  5 - ড্যাশবোর্ড ওপেন করা (ঐচ্ছিক)');
  console.log('  0 - বট বন্ধ করা');
  rl.question('\nআপনার কমান্ড লিখুন (0-5): ', handleCommand);
}

async function handleCommand(cmd) {
  cmd = cmd.trim();
  if (cmd === '1') {
    console.log('\n🚀 ফেসবুক মেসেঞ্জারে নতুন অর্ডারের মেসেজ আসল...');
    await pipeline.processOrder({
      channel: 'facebook-messenger',
      customer: {
        name: 'সাকিব আল হাসান',
        phone: '01712345678',
        address: 'বাড়ি ১২, রোড ৫, গুলশান ২, ঢাকা'
      },
      items: [
        { name: 'Wireless Bluetooth Earbuds Pro', price: 1450, quantity: 1 }
      ]
    });
    showMenu();
  } else if (cmd === '2') {
    console.log('\n🚀 ফেসবুক বিজ্ঞাপনের লিড ফর্ম থেকে অর্ডার আসল...');
    await pipeline.processOrder({
      channel: 'facebook-lead-ad',
      customer: {
        name: 'ফারহানা আহমেদ',
        phone: '01899887766',
        address: 'আগ্রাবাদ সি/এ, চট্টগ্রাম'
      },
      items: [
        { name: 'অর্গানিক হেয়ার অয়েল কম্বো প্যাক', price: 950, quantity: 2 }
      ]
    });
    showMenu();
  } else if (cmd === '3') {
    const dummyFile = path.join(__dirname, 'data', 'incoming', `order_${Date.now()}.json`);
    const dummyData = {
      orderId: `ORD-${Date.now().toString().slice(-6)}`,
      channel: 'file-drop-watcher',
      customer: {
        name: 'মোহাম্মদ ইমরান',
        phone: '01911223344',
        address: 'উত্তরা সেক্টর ৭, ঢাকা'
      },
      items: [
        { name: 'স্মার্ট ফিটনেস ওয়াচ ব্যান্ড', price: 2100, quantity: 1 }
      ]
    };
    fs.writeFileSync(dummyFile, JSON.stringify(dummyData, null, 2), 'utf8');
    console.log(`\n📁 data\\incoming\\ ফোল্ডারে ফাইল ফেলা হয়েছে: ${path.basename(dummyFile)}`);
    console.log('👀 বট স্বয়ংক্রিয়ভাবে ফাইলটি ডিটেক্ট করছে...');
    setTimeout(showMenu, 1500);
  } else if (cmd === '4') {
    console.log('\n📊 [বটের সেলস হিস্ট্রি]');
    console.log(`মোট প্রসেসকৃত অর্ডার: ${pipeline.processedOrders.length} টি`);
    const totalAmount = pipeline.processedOrders.reduce((sum, o) => sum + o.pricing.grandTotal, 0);
    console.log(`মোট অর্ডারের মূল্য: ৳ ${totalAmount.toLocaleString('en-US')}`);
    pipeline.processedOrders.slice(0, 5).forEach(o => {
      console.log(`• #${o.orderId} | ${o.customer.name} | ৳ ${o.pricing.grandTotal} | ${o.channel}`);
    });
    showMenu();
  } else if (cmd === '5') {
    const { exec } = require('child_process');
    exec('start http://localhost:3000');
    console.log('\n🌐 ব্রাউজারে ড্যাশবোর্ড ওপেন করা হচ্ছে...');
    showMenu();
  } else if (cmd === '0') {
    console.log('\n🛑 বট বন্ধ করা হলো। বিদায়!');
    process.exit(0);
  } else {
    console.log('⚠️ সঠিক অপশন বেছে নিন (0 থেকে 5)।');
    showMenu();
  }
}

// Start first menu prompt after 1 sec
setTimeout(showMenu, 1000);
