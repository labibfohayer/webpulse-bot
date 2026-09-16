const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * Generates a clean, modern PDF Invoice for an order
 * @param {Object} order - The normalized order object
 * @param {Object} config - Business configuration
 * @returns {Promise<string>} - The absolute path of the generated PDF file
 */
async function generateInvoicePDF(order, config) {
  const outputDir = path.join(__dirname, '..', 'output', 'invoices');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `Invoice_${order.orderId}.pdf`;
  const filePath = path.join(outputDir, filename);

  // Generate QR Code as data buffer
  const qrData = JSON.stringify({
    orderId: order.orderId,
    customer: order.customer.name,
    phone: order.customer.phone,
    total: order.pricing.grandTotal,
    date: order.createdAt
  });
  const qrBuffer = await QRCode.toBuffer(qrData, { width: 120, margin: 1 });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    // Primary Colors
    const primaryColor = '#1e3a8a'; // Deep Navy Blue
    const secondaryColor = '#475569'; // Slate
    const accentColor = '#10b981'; // Emerald Green
    const lightBg = '#f8fafc'; // Clean light gray

    // --- Header Section ---
    doc
      .rect(40, 40, doc.page.width - 80, 70)
      .fill(lightBg);

    doc
      .fillColor(primaryColor)
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(config.businessName || 'SMART STORE', 55, 55);

    doc
      .fillColor(secondaryColor)
      .fontSize(9)
      .font('Helvetica')
      .text(config.businessAddress || 'Dhaka, Bangladesh', 55, 80)
      .text(`Phone: ${config.businessPhone} | Email: ${config.businessEmail}`, 55, 93);

    // Invoice badge on top right
    doc
      .fillColor(accentColor)
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('INVOICE', doc.page.width - 180, 52, { align: 'right' });

    doc
      .fillColor(secondaryColor)
      .fontSize(9)
      .font('Helvetica')
      .text(`Invoice #: ${order.orderId}`, doc.page.width - 240, 80, { align: 'right' })
      .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}`, doc.page.width - 240, 93, { align: 'right' });

    // --- Customer & Order Details Box ---
    const detailTop = 125;
    doc
      .roundedRect(40, detailTop, doc.page.width - 80, 95, 6)
      .strokeColor('#e2e8f0')
      .stroke();

    // Bill To Column
    doc
      .fillColor(primaryColor)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('BILL TO (CUSTOMER)', 55, detailTop + 12);

    doc
      .fillColor('#0f172a')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(order.customer.name, 55, detailTop + 28);

    doc
      .fillColor(secondaryColor)
      .fontSize(9)
      .font('Helvetica')
      .text(`Phone: ${order.customer.phone}`, 55, detailTop + 43)
      .text(`Address: ${order.customer.address}`, 55, detailTop + 58, { width: 260 });

    // Order Info Column
    const rightColX = 350;
    doc
      .fillColor(primaryColor)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('ORDER SUMMARY', rightColX, detailTop + 12);

    doc
      .fillColor(secondaryColor)
      .fontSize(9)
      .font('Helvetica')
      .text(`Channel: ${order.channel.toUpperCase()}`, rightColX, detailTop + 28)
      .text(`Payment Method: ${order.paymentMethod || 'Cash On Delivery (COD)'}`, rightColX, detailTop + 43)
      .text(`Order Status: Confirmed & Ready for Dispatch`, rightColX, detailTop + 58);

    // --- Items Table Header ---
    const tableTop = 235;
    doc
      .rect(40, tableTop, doc.page.width - 80, 24)
      .fill(primaryColor);

    doc
      .fillColor('#ffffff')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('SL', 50, tableTop + 7)
      .text('ITEM DESCRIPTION', 85, tableTop + 7)
      .text('PRICE', 330, tableTop + 7, { width: 60, align: 'right' })
      .text('QTY', 410, tableTop + 7, { width: 40, align: 'right' })
      .text('TOTAL', 470, tableTop + 7, { width: 70, align: 'right' });

    // --- Items Rows ---
    let y = tableTop + 28;
    order.items.forEach((item, index) => {
      const isEven = index % 2 === 0;
      if (isEven) {
        doc.rect(40, y - 4, doc.page.width - 80, 22).fill('#f8fafc');
      }

      doc
        .fillColor('#334155')
        .fontSize(9)
        .font('Helvetica')
        .text((index + 1).toString(), 50, y)
        .text(item.name, 85, y, { width: 230 })
        .text(`${item.price} ${config.currency}`, 330, y, { width: 60, align: 'right' })
        .text(item.quantity.toString(), 410, y, { width: 40, align: 'right' })
        .font('Helvetica-Bold')
        .text(`${item.price * item.quantity} ${config.currency}`, 470, y, { width: 70, align: 'right' });

      y += 22;
    });

    // Divider line
    y += 10;
    doc
      .moveTo(40, y)
      .lineTo(doc.page.width - 40, y)
      .strokeColor('#cbd5e1')
      .stroke();

    // --- Totals and QR Code Section ---
    const bottomY = y + 15;

    // QR Code on Left
    doc.image(qrBuffer, 50, bottomY, { width: 85 });
    doc
      .fillColor(secondaryColor)
      .fontSize(8)
      .font('Helvetica')
      .text('Scan to verify digital invoice', 45, bottomY + 90, { width: 100, align: 'center' });

    // Summary Calculations on Right
    const calcX = 350;
    const valX = 460;
    let calcY = bottomY + 5;

    const printCalcRow = (label, val, bold = false) => {
      doc
        .fillColor(bold ? primaryColor : secondaryColor)
        .fontSize(bold ? 11 : 9)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, calcX, calcY)
        .text(val, valX, calcY, { width: 80, align: 'right' });
      calcY += 18;
    };

    printCalcRow('Subtotal:', `${order.pricing.subtotal} ${config.currency}`);
    printCalcRow('Delivery Fee:', `${order.pricing.deliveryFee} ${config.currency}`);
    if (order.pricing.discount > 0) {
      printCalcRow('Discount:', `-${order.pricing.discount} ${config.currency}`);
    }

    doc
      .moveTo(calcX, calcY - 2)
      .lineTo(doc.page.width - 40, calcY - 2)
      .strokeColor('#94a3b8')
      .stroke();

    calcY += 4;
    printCalcRow('Grand Total:', `${order.pricing.grandTotal} ${config.currency}`, true);

    // --- Footer ---
    const footerY = doc.page.height - 70;
    doc
      .moveTo(40, footerY)
      .lineTo(doc.page.width - 40, footerY)
      .strokeColor('#e2e8f0')
      .stroke();

    doc
      .fillColor(secondaryColor)
      .fontSize(8)
      .font('Helvetica')
      .text('This is a computer-generated invoice automatically processed by AutoOrder Engine.', 40, footerY + 10, {
        align: 'center',
        width: doc.page.width - 80
      })
      .text('No physical signature required. Thank you for your business!', 40, footerY + 22, {
        align: 'center',
        width: doc.page.width - 80
      });

    doc.end();

    writeStream.on('finish', () => {
      resolve(filePath);
    });

    writeStream.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = { generateInvoicePDF };
