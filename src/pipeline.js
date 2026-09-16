const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const { generateInvoicePDF } = require('./invoiceGenerator');

class AutomationPipeline extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.processedOrders = [];
    this.ensureDirectories();
    this.loadHistory();
  }

  ensureDirectories() {
    const dirs = [
      path.join(__dirname, '..', 'output', 'invoices'),
      path.join(__dirname, '..', 'output', 'notifications'),
      path.join(__dirname, '..', 'output')
    ];
    dirs.forEach(d => {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    });
  }

  loadHistory() {
    const ledgerPath = path.join(__dirname, '..', 'output', 'sales_ledger.json');
    if (fs.existsSync(ledgerPath)) {
      try {
        const raw = fs.readFileSync(ledgerPath, 'utf8');
        this.processedOrders = JSON.parse(raw);
      } catch (err) {
        this.processedOrders = [];
      }
    }
  }

  saveLedger() {
    const ledgerJsonPath = path.join(__dirname, '..', 'output', 'sales_ledger.json');
    const ledgerCsvPath = path.join(__dirname, '..', 'output', 'sales_ledger.csv');

    fs.writeFileSync(ledgerJsonPath, JSON.stringify(this.processedOrders, null, 2), 'utf8');

    // Update CSV version for easy Excel opening
    const headers = 'Order_ID,Timestamp,Customer_Name,Phone,Address,Channel,Grand_Total,Status\n';
    const rows = this.processedOrders.map(o => 
      `"${o.orderId}","${o.createdAt}","${o.customer.name}","${o.customer.phone}","${o.customer.address}","${o.channel}","${o.pricing.grandTotal}","Confirmed"`
    ).join('\n');

    fs.writeFileSync(ledgerCsvPath, headers + rows, 'utf8');
  }

  /**
   * Main Pipeline Execution
   * @param {Object} rawOrder 
   */
  async processOrder(rawOrder) {
    const startTime = Date.now();
    const orderId = rawOrder.orderId || `ORD-${Date.now().toString().slice(-6)}`;

    this.emit('step', {
      orderId,
      step: 1,
      title: 'Trigger Received',
      detail: `New order received via [${rawOrder.channel || 'Manual/File'}]. Starting automated processing...`,
      status: 'active'
    });

    // Step 1: Validation & Normalization
    await new Promise(r => setTimeout(r, 400)); // Smooth real-time visual pacing
    const customer = {
      name: (rawOrder.customer?.name || 'Valued Customer').trim(),
      phone: (rawOrder.customer?.phone || '01700000000').trim(),
      address: (rawOrder.customer?.address || 'Dhaka, Bangladesh').trim()
    };

    const items = (rawOrder.items && rawOrder.items.length > 0) ? rawOrder.items : [
      { name: 'Standard Product Package', price: 950, quantity: 1 }
    ];

    // Calculate financials
    const subtotal = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    const deliveryFee = rawOrder.pricing?.deliveryFee ?? this.config.defaultDeliveryFee ?? 70;
    const discount = rawOrder.pricing?.discount || 0;
    const grandTotal = subtotal + deliveryFee - discount;

    const normalizedOrder = {
      orderId,
      createdAt: new Date().toISOString(),
      channel: rawOrder.channel || 'web-form',
      paymentMethod: rawOrder.paymentMethod || 'Cash On Delivery (COD)',
      customer,
      items,
      pricing: {
        subtotal,
        deliveryFee,
        discount,
        grandTotal
      }
    };

    this.emit('step', {
      orderId,
      step: 2,
      title: 'Data Validated & Calculated',
      detail: `Validated customer: ${customer.name} (${customer.phone}). Total amount calculated: ${grandTotal} ${this.config.currency}`,
      status: 'completed'
    });

    // Step 2: Generate PDF Invoice with QR
    await new Promise(r => setTimeout(r, 500));
    this.emit('step', {
      orderId,
      step: 3,
      title: 'Generating PDF Invoice',
      detail: 'Building high-resolution PDF invoice with digital verification QR Code...',
      status: 'active'
    });

    const pdfPath = await generateInvoicePDF(normalizedOrder, this.config);
    const pdfFilename = path.basename(pdfPath);

    this.emit('step', {
      orderId,
      step: 3,
      title: 'Invoice PDF Ready',
      detail: `Generated file: ${pdfFilename} (${(fs.statSync(pdfPath).size / 1024).toFixed(1)} KB)`,
      status: 'completed',
      pdfUrl: `/invoices/${pdfFilename}`
    });

    // Step 3: Notification Drafting (WhatsApp & SMS)
    await new Promise(r => setTimeout(r, 400));
    this.emit('step', {
      orderId,
      step: 4,
      title: 'Drafting Customer Notification',
      detail: 'Composing instant WhatsApp & SMS dispatch notification...',
      status: 'active'
    });

    const notificationMessage = `সালাম ${customer.name}! 🌸\n` +
      `আপনার অর্ডারটি #${orderId} সফলভাবে গ্রহণ করা হয়েছে।\n\n` +
      `📦 পণ্যের বিবরণ:\n` +
      items.map(it => `• ${it.name} (x${it.quantity}) - ${it.price * it.quantity} ${this.config.currency}`).join('\n') + '\n\n' +
      `💰 মোট প্রদেয় (ক্যাশ অন ডেলিভারি): ${grandTotal} ${this.config.currency}\n` +
      `📍 ডেলিভারি ঠিকানা: ${customer.address}\n\n` +
      `আপনার ডিজিটাল মেমোটি ইতিমধ্যে প্রস্তুত করা হয়েছে। ডেলিভারি রাইডার পৌঁছানোর পূর্বে যোগাযোগ করবেন। ধন্যবাদ! ✨`;

    const notifPath = path.join(__dirname, '..', 'output', 'notifications', `${orderId}.txt`);
    fs.writeFileSync(notifPath, notificationMessage, 'utf8');

    this.emit('step', {
      orderId,
      step: 4,
      title: 'Notification Ready for Dispatch',
      detail: 'WhatsApp/SMS message composed and logged to dispatch queue.',
      status: 'completed',
      message: notificationMessage
    });

    // Step 4: Ledger Update
    await new Promise(r => setTimeout(r, 300));
    normalizedOrder.invoiceUrl = `/invoices/${pdfFilename}`;
    normalizedOrder.notificationMessage = notificationMessage;
    normalizedOrder.processingTimeMs = Date.now() - startTime;

    this.processedOrders.unshift(normalizedOrder);
    this.saveLedger();

    this.emit('step', {
      orderId,
      step: 5,
      title: 'Ledger Updated & Automation Complete',
      detail: `Order logged into Excel/JSON ledger in ${normalizedOrder.processingTimeMs}ms. Ready for shipping!`,
      status: 'completed',
      order: normalizedOrder
    });

    return normalizedOrder;
  }
}

module.exports = { AutomationPipeline };
