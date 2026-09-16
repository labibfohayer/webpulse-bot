const { AutomationPipeline } = require('./src/pipeline');
const config = require('./config.json');
const fs = require('fs');
const path = require('path');

async function runTest() {
  console.log('Testing AutoOrder Automation Pipeline...');
  const pipeline = new AutomationPipeline(config);

  const testOrder = {
    channel: 'facebook-messenger',
    customer: {
      name: 'Rahim Chowdhury',
      phone: '01711223344',
      address: 'House 14, Road 8, Dhanmondi, Dhaka'
    },
    items: [
      { name: 'Premium Leather Wallet', price: 1150, quantity: 1 },
      { name: 'Cotton Casual T-Shirt', price: 650, quantity: 2 }
    ]
  };

  const processed = await pipeline.processOrder(testOrder);
  console.log('✅ Pipeline Processed Successfully!');
  console.log('Order ID:', processed.orderId);
  console.log('Grand Total:', processed.pricing.grandTotal, config.currency);

  const pdfPath = path.join(__dirname, 'output', 'invoices', `Invoice_${processed.orderId}.pdf`);
  if (fs.existsSync(pdfPath)) {
    console.log(`✅ PDF Invoice verified: ${pdfPath} (${fs.statSync(pdfPath).size} bytes)`);
  } else {
    throw new Error('PDF Invoice file was not created!');
  }

  const notifPath = path.join(__dirname, 'output', 'notifications', `${processed.orderId}.txt`);
  if (fs.existsSync(notifPath)) {
    console.log(`✅ Notification verified: ${notifPath}`);
  } else {
    throw new Error('Notification file was not created!');
  }

  console.log('\n🎉 ALL AUTOMATION UNIT TESTS PASSED SUCCESSFULLY!');
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
