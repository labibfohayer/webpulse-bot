const http = require('http');

function post(path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('--- 1. Client asks about Website ---');
  const r1 = await post('/api/chat/message', { clientId: 'demo', text: 'আমি একটি কাস্টম ওয়েবসাইট বানাতে চাই' });
  console.log('Bot:', r1.response.text.substring(0, 70) + '...');

  console.log('\n--- 2. Client offers 18000 BDT budget ---');
  const r2 = await post('/api/chat/message', { clientId: 'demo', text: 'আমার বাজেট ১৮,০০০ টাকা হবে কি?' });
  console.log('Status:', r2.response.status);
  console.log('Proposal ID:', r2.response.proposal.proposalId);
  const propId = r2.response.proposal.proposalId;

  console.log('\n--- 3. Owner taps Counter Offer on Telegram (21,500 BDT) ---');
  const r3 = await post('/api/telegram/respond', { proposalId: propId, action: 'counter', counterPrice: 21500 });
  console.log('Owner action processed. Bot reply to client:', r3.reply.substring(0, 80) + '...');

  console.log('\n--- 4. Client accepts and provides details ---');
  const r4 = await post('/api/chat/message', { clientId: 'demo', text: 'তানভীর আহমেদ, 01712345678, ধানমন্ডি ঢাকা' });
  console.log('Deal closed! Order ID:', r4.response.order.orderId);
  console.log('Grand Total:', r4.response.order.pricing.grandTotal);
  console.log('Invoice URL:', r4.response.order.invoiceUrl);

  console.log('\n🎉 FULL NEGOTIATOR & TELEGRAM LOOP TEST COMPLETED SUCCESSFULLY!');
}

run().catch(console.error);
