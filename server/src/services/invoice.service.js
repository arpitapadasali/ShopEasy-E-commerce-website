import PDFDocument from 'pdfkit';
import { config } from '../config/env.js';

/**
 * Formats paise into INR string (e.g. 189900 -> ₹1,899.00 or Rs. 1,899.00)
 * Note: PDF standard fonts (Helvetica) render "Rs." reliably across all PDF viewers.
 */
const formatINR = (paise) => {
  if (typeof paise !== 'number') return 'Rs. 0.00';
  const val = (paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Rs. ${val}`;
};

/**
 * Generate a unique, professional invoice number if one doesn't exist
 * Format: INV-YYYYMMDD-XXXX
 */
export const generateInvoiceNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${dateStr}-${randomSuffix}`;
};

/**
 * Generates a PDF invoice for an order and returns a Buffer
 * @param {Object} order - Full Mongoose Order document
 * @param {Object} user - User document or populated user
 * @returns {Promise<Buffer>}
 */
export const generateInvoicePDF = (order, user = null) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Invoice ${order.invoiceNumber || order.orderNumber}`,
          Author: config.businessName,
          Subject: `Tax Invoice for Order #${order.orderNumber}`,
          Keywords: 'Invoice, ShopEasy, Ecommerce, Receipt',
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#1e40af'; // Blue 800
      const secondaryColor = '#334155'; // Slate 700
      const lightBg = '#f8fafc'; // Slate 50
      const borderColor = '#cbd5e1'; // Slate 300

      // -------------------------------------------------------------
      // 1. Header Banner & Store Details
      // -------------------------------------------------------------
      doc
        .rect(40, 40, 515, 65)
        .fill(primaryColor);

      doc
        .fillColor('#ffffff')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('ShopEasy', 55, 52);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#bfdbfe')
        .text('OFFICIAL TAX INVOICE / BILL OF SUPPLY', 55, 78);

      // Business address under banner
      doc
        .fillColor(secondaryColor)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(config.businessName, 40, 115);

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#64748b')
        .text(config.businessAddress, 40, 127, { width: 260 })
        .text(`Email: ${config.businessEmail} | Phone: ${config.businessPhone}`, 40, 147);

      if (config.businessGstin) {
        doc.text(`GSTIN: ${config.businessGstin}`, 40, 159);
      }

      // -------------------------------------------------------------
      // 2. Invoice & Order Metadata Box (Top Right)
      // -------------------------------------------------------------
      const invoiceNum = order.invoiceNumber || `INV-${order.orderNumber}`;
      const invoiceDate = order.invoiceDate
        ? new Date(order.invoiceDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })
        : new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' });

      const metaX = 340;
      doc
        .rect(metaX - 10, 112, 225, 75)
        .fillAndStroke(lightBg, borderColor);

      doc
        .fillColor(primaryColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('INVOICE DETAILS', metaX, 120);

      doc
        .fontSize(8)
        .fillColor(secondaryColor)
        .font('Helvetica-Bold').text('Invoice No: ', metaX, 135)
        .font('Helvetica').text(invoiceNum, metaX + 65, 135)
        .font('Helvetica-Bold').text('Invoice Date: ', metaX, 147)
        .font('Helvetica').text(invoiceDate, metaX + 65, 147)
        .font('Helvetica-Bold').text('Order ID: ', metaX, 159)
        .font('Helvetica').text(`#${order.orderNumber}`, metaX + 65, 159)
        .font('Helvetica-Bold').text('Payment: ', metaX, 171)
        .font('Helvetica').text(`${order.paymentMethod?.toUpperCase()} (${order.paymentStatus?.toUpperCase()})`, metaX + 65, 171);

      // -------------------------------------------------------------
      // 3. Customer Billing / Shipping Details
      // -------------------------------------------------------------
      const custY = 198;
      doc
        .rect(40, custY, 515, 65)
        .fillAndStroke(lightBg, borderColor);

      doc
        .fillColor(primaryColor)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('BILL TO / SHIP TO:', 50, custY + 8);

      const recipientName = order.shippingDetails?.fullName || user?.name || 'Customer';
      const addressLine = order.shippingDetails?.address || '';
      const cityPin = `${order.shippingDetails?.city || ''} - ${order.shippingDetails?.pinCode || ''}`;
      const contactLine = `Phone: ${order.shippingDetails?.phone || user?.phone || 'N/A'}${user?.email ? ` | Email: ${user.email}` : ''}`;

      doc
        .fillColor(secondaryColor)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(recipientName, 50, custY + 22)
        .font('Helvetica')
        .fontSize(8)
        .text(addressLine, 50, custY + 34, { width: 495 })
        .text(cityPin, 50, custY + 45)
        .text(contactLine, 50, custY + 55);

      // -------------------------------------------------------------
      // 4. Line Items Table
      // -------------------------------------------------------------
      const tableTop = 275;
      doc
        .rect(40, tableTop, 515, 20)
        .fill(primaryColor);

      doc
        .fillColor('#ffffff')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('#', 45, tableTop + 6)
        .text('Item Description', 65, tableTop + 6)
        .text('SKU', 290, tableTop + 6)
        .text('Qty', 370, tableTop + 6, { width: 30, align: 'center' })
        .text('Unit Price', 410, tableTop + 6, { width: 65, align: 'right' })
        .text('Total Amount', 485, tableTop + 6, { width: 65, align: 'right' });

      let currentY = tableTop + 20;
      const items = order.items || [];

      items.forEach((item, index) => {
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
        const rowHeight = 24;

        doc
          .rect(40, currentY, 515, rowHeight)
          .fillAndStroke(rowBg, '#e2e8f0');

        doc
          .fillColor(secondaryColor)
          .fontSize(8)
          .font('Helvetica')
          .text(String(index + 1), 45, currentY + 7)
          .text(item.name ? item.name.slice(0, 50) : 'Product Item', 65, currentY + 7, { width: 220 })
          .text(item.sku || '—', 290, currentY + 7, { width: 75 })
          .text(String(item.quantity), 370, currentY + 7, { width: 30, align: 'center' })
          .text(formatINR(item.price), 410, currentY + 7, { width: 65, align: 'right' })
          .font('Helvetica-Bold')
          .text(formatINR(item.subtotal), 485, currentY + 7, { width: 65, align: 'right' });

        currentY += rowHeight;
      });

      // -------------------------------------------------------------
      // 5. Totals & Financial Summary
      // -------------------------------------------------------------
      currentY += 10;
      const totalsBoxWidth = 220;
      const totalsBoxX = 555 - totalsBoxWidth;

      doc
        .rect(totalsBoxX, currentY, totalsBoxWidth, 85)
        .fillAndStroke(lightBg, borderColor);

      let totY = currentY + 8;
      doc
        .fontSize(8)
        .fillColor(secondaryColor)
        .font('Helvetica').text('Items Subtotal:', totalsBoxX + 10, totY)
        .font('Helvetica-Bold').text(formatINR(order.totals?.itemsTotal), totalsBoxX + 110, totY, { width: 95, align: 'right' });

      totY += 14;
      if (order.totals?.discount > 0) {
        doc
          .fillColor('#16a34a')
          .font('Helvetica').text(`Coupon (${order.couponCode || 'PROMO'}):`, totalsBoxX + 10, totY)
          .font('Helvetica-Bold').text(`-${formatINR(order.totals.discount)}`, totalsBoxX + 110, totY, { width: 95, align: 'right' });
        totY += 14;
      }

      doc
        .fillColor(secondaryColor)
        .font('Helvetica').text('Delivery Charges:', totalsBoxX + 10, totY)
        .font('Helvetica-Bold').text(
          order.totals?.shippingFee > 0 ? formatINR(order.totals.shippingFee) : 'FREE',
          totalsBoxX + 110,
          totY,
          { width: 95, align: 'right' }
        );

      totY += 16;
      doc
        .strokeColor(borderColor)
        .moveTo(totalsBoxX + 10, totY - 4)
        .lineTo(totalsBoxX + 210, totY - 4)
        .stroke();

      doc
        .fontSize(10)
        .fillColor(primaryColor)
        .font('Helvetica-Bold').text('Final Grand Total:', totalsBoxX + 10, totY)
        .text(formatINR(order.totals?.grandTotal), totalsBoxX + 110, totY, { width: 95, align: 'right' });

      // -------------------------------------------------------------
      // 6. Notes & Terms (Bottom)
      // -------------------------------------------------------------
      const notesY = Math.max(currentY + 100, 680);
      doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor('#64748b')
        .text('TERMS & CONDITIONS:', 40, notesY)
        .text('1. Goods received in good condition. Returns accepted within 7 days of delivery per ShopEasy return policy.', 40, notesY + 10)
        .text('2. All disputes are subject to the jurisdiction of courts in Gurugram, Haryana.', 40, notesY + 18)
        .text('3. This is a computer-generated tax invoice and does not require a physical signature.', 40, notesY + 26)
        .text(`Thank you for shopping with ${config.businessName}!`, 40, notesY + 36, { align: 'center', width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

export default {
  generateInvoiceNumber,
  generateInvoicePDF,
};
