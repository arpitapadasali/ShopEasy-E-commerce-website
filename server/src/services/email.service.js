import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import NotificationLog from '../models/NotificationLog.js';

let transporterInstance = null;

/**
 * Formats integer paise into INR display string (e.g., 49900 -> ₹499.00)
 */
const formatINR = (paise) => {
  if (typeof paise !== 'number') return '₹0.00';
  return `₹${(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Returns a configured Nodemailer transporter or null if SMTP is unconfigured
 */
const getTransporter = () => {
  if (transporterInstance) return transporterInstance;

  if (!config.smtpHost || !config.smtpUser) {
    return null;
  }

  transporterInstance = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
    // Useful timeout settings to avoid hanging requests
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 15000,
  });

  return transporterInstance;
};

/**
 * Clean ShopEasy responsive HTML email wrapper
 */
const renderEmailLayout = ({ title, preheader, content }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .wrapper { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background-color: #2563eb; padding: 24px 32px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0; color: #bfdbfe; font-size: 13px; }
    .body-content { padding: 32px; }
    .footer { background-color: #f1f5f9; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; margin: 16px 0; }
    .table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    .table th { background-color: #f8fafc; color: #475569; padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-size: 12px; text-transform: uppercase; }
    .table td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    .total-row { font-weight: 700; color: #0f172a; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge-success { background-color: #dcfce7; color: #166534; }
    .badge-info { background-color: #dbeafe; color: #1e40af; }
    .badge-warning { background-color: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden;">${preheader || title}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 24px 0; background-color: #f8fafc;">
    <tr>
      <td align="center">
        <div class="wrapper">
          <div class="header">
            <h1>ShopEasy</h1>
            <p>Your Trusted Shopping Destination</p>
          </div>
          <div class="body-content">
            ${content}
          </div>
          <div class="footer">
            <p style="margin: 0 0 6px;">Need assistance? Contact us at <a href="mailto:${config.businessEmail}" style="color: #2563eb; text-decoration: none;">${config.businessEmail}</a> or call ${config.businessPhone}</p>
            <p style="margin: 0;">© ${new Date().getFullYear()} ${config.businessName}. All rights reserved.</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Generic safe mail sender with idempotency verification and graceful error suppression
 */
const sendMail = async ({ eventId, to, subject, html, event, orderId = null, userId = null }) => {
  // 1. Idempotency check: Skip if this specific event was already successfully sent
  try {
    const existingLog = await NotificationLog.findOne({ eventId, status: 'sent' });
    if (existingLog) {
      console.log(`[EmailService] Notification '${eventId}' already sent previously. Skipping duplicate.`);
      return { success: true, skipped: true, messageId: existingLog.providerMessageId };
    }
  } catch (dbErr) {
    console.warn(`[EmailService] Idempotency lookup error: ${dbErr.message}`);
  }

  // 2. Check SMTP configuration
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[EmailService] SMTP credentials not configured. Skipping email to '${to}' for event '${event}'.`);
    try {
      await NotificationLog.findOneAndUpdate(
        { eventId },
        {
          eventId,
          type: 'email',
          recipient: to,
          event,
          status: 'skipped',
          order: orderId,
          user: userId,
          subjectOrSnippet: subject,
          error: 'SMTP not configured in environment variables',
        },
        { upsert: true, new: true }
      );
    } catch (_) {}
    return { success: false, skipped: true, reason: 'SMTP_NOT_CONFIGURED' };
  }

  // 3. Send email via Nodemailer
  try {
    const mailOptions = {
      from: config.emailFrom,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Sent email for event '${event}' to '${to}'. MessageId: ${info.messageId}`);

    // Record success in notification log
    await NotificationLog.findOneAndUpdate(
      { eventId },
      {
        eventId,
        type: 'email',
        recipient: to,
        event,
        status: 'sent',
        order: orderId,
        user: userId,
        subjectOrSnippet: subject,
        providerMessageId: info.messageId,
        error: null,
      },
      { upsert: true, new: true }
    );

    return { success: true, messageId: info.messageId };
  } catch (sendError) {
    // Log delivery failure without exposing credentials or passwords
    const sanitizedError = sendError.message || 'Unknown SMTP error';
    console.error(`[EmailService] Failed to send email for event '${event}' to '${to}': ${sanitizedError}`);

    try {
      await NotificationLog.findOneAndUpdate(
        { eventId },
        {
          eventId,
          type: 'email',
          recipient: to,
          event,
          status: 'failed',
          order: orderId,
          user: userId,
          subjectOrSnippet: subject,
          error: sanitizedError,
        },
        { upsert: true, new: true }
      );
    } catch (_) {}

    // Gracefully resolve - do NOT crash caller
    return { success: false, error: sanitizedError };
  }
};

/**
 * 1. Welcome Email on Registration
 */
export const sendWelcomeEmail = async ({ email, name, userId }) => {
  const eventId = `welcome_email:${userId || email}`;
  const title = `Welcome to ShopEasy, ${name}!`;
  const content = `
    <h2 style="margin-top: 0; color: #0f172a;">Welcome to ShopEasy, ${name}! 🎉</h2>
    <p style="line-height: 1.6; color: #334155;">
      We're thrilled to have you with us! Your account has been successfully created. Explore thousands of handpicked products across fashion, electronics, home decor, and more.
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${config.clientUrl}" class="btn">Start Shopping Now</a>
    </div>
    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      If you did not create this account, please contact our support team immediately at ${config.businessEmail}.
    </p>
  `;

  const html = renderEmailLayout({
    title,
    preheader: 'Welcome to ShopEasy! Your account is active.',
    content,
  });

  return sendMail({
    eventId,
    to: email,
    subject: title,
    html,
    event: 'welcome',
    userId,
  });
};

/**
 * 2. Order Placement / Confirmation Email
 */
export const sendOrderConfirmationEmail = async ({ order, user }) => {
  const customerEmail = user?.email || order?.shippingDetails?.phone;
  if (!customerEmail || !customerEmail.includes('@')) {
    console.log('[EmailService] Order has no valid customer email for confirmation. Skipping.');
    return { success: false, skipped: true };
  }

  const eventId = `order_confirmation_email:${order._id}`;
  const orderUrl = `${config.clientUrl}/orders/${order._id}`;
  const orderNumber = order.orderNumber || order._id;

  const itemsRows = (order.items || [])
    .map(
      (item) => `
    <tr>
      <td>
        <strong>${item.name}</strong>
        ${item.sku ? `<br><small style="color: #64748b;">SKU: ${item.sku}</small>` : ''}
      </td>
      <td align="center">${item.quantity}</td>
      <td align="right">${formatINR(item.price)}</td>
      <td align="right"><strong>${formatINR(item.subtotal)}</strong></td>
    </tr>
  `
    )
    .join('');

  const discountRow = order.totals?.discount > 0
    ? `
    <tr>
      <td colspan="3" align="right" style="color: #16a34a;"><strong>Coupon Discount (${order.couponCode || 'APPLIED'})</strong></td>
      <td align="right" style="color: #16a34a;"><strong>-${formatINR(order.totals.discount)}</strong></td>
    </tr>`
    : '';

  const shippingRow = `
    <tr>
      <td colspan="3" align="right" style="color: #64748b;">Shipping Fee</td>
      <td align="right">${order.totals?.shippingFee > 0 ? formatINR(order.totals.shippingFee) : '<span style="color: #16a34a; font-weight: bold;">FREE</span>'}</td>
    </tr>`;

  const content = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2 style="margin: 0; color: #0f172a;">Order Placed Successfully!</h2>
      <span class="badge badge-success">Placed</span>
    </div>
    <p style="color: #334155; line-height: 1.6;">
      Hi <strong>${order.shippingDetails?.fullName || user?.name || 'Valued Customer'}</strong>, thank you for your order! We are getting it ready for delivery.
    </p>

    <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; margin: 20px 0; font-size: 14px;">
      <p style="margin: 0 0 6px;"><strong>Order ID:</strong> #${orderNumber}</p>
      <p style="margin: 0 0 6px;"><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
      <p style="margin: 0 0 6px;"><strong>Payment Method:</strong> ${order.paymentMethod?.toUpperCase()}</p>
      <p style="margin: 0;"><strong>Delivery Address:</strong> ${order.shippingDetails?.address}, ${order.shippingDetails?.city} - ${order.shippingDetails?.pinCode}</p>
    </div>

    <h3 style="color: #0f172a; margin-top: 24px; margin-bottom: 8px;">Order Summary</h3>
    <table class="table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
        <tr>
          <td colspan="3" align="right" style="color: #64748b;">Subtotal</td>
          <td align="right"><strong>${formatINR(order.totals?.itemsTotal)}</strong></td>
        </tr>
        ${discountRow}
        ${shippingRow}
        <tr class="total-row" style="background-color: #f8fafc; font-size: 16px;">
          <td colspan="3" align="right">Final Amount:</td>
          <td align="right" style="color: #2563eb;">${formatINR(order.totals?.grandTotal)}</td>
        </tr>
      </tbody>
    </table>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${orderUrl}" class="btn">View Order Details & Invoice</a>
    </div>
  `;

  const html = renderEmailLayout({
    title: `Order Confirmation #${orderNumber}`,
    preheader: `Thank you for your order #${orderNumber}. Total: ${formatINR(order.totals?.grandTotal)}`,
    content,
  });

  return sendMail({
    eventId,
    to: customerEmail,
    subject: `Order Confirmed: #${orderNumber} [${formatINR(order.totals?.grandTotal)}]`,
    html,
    event: 'order_placed',
    orderId: order._id,
    userId: user?._id || order.user,
  });
};

/**
 * 3. Payment Verified Email
 */
export const sendPaymentVerificationEmail = async ({ order, user, transactionId = '' }) => {
  const customerEmail = user?.email || order?.shippingDetails?.phone;
  if (!customerEmail || !customerEmail.includes('@')) {
    return { success: false, skipped: true };
  }

  const eventId = `payment_verified_email:${order._id}:${transactionId || 'verified'}`;
  const orderNumber = order.orderNumber || order._id;
  const orderUrl = `${config.clientUrl}/orders/${order._id}`;

  const content = `
    <h2 style="margin-top: 0; color: #166534;">Payment Received & Verified! ✅</h2>
    <p style="color: #334155; line-height: 1.6;">
      Dear <strong>${order.shippingDetails?.fullName || user?.name || 'Customer'}</strong>,
      we have successfully verified and received your payment of <strong>${formatINR(order.totals?.grandTotal)}</strong> for Order <strong>#${orderNumber}</strong>.
    </p>

    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 6px; margin: 20px 0; font-size: 14px;">
      <p style="margin: 0 0 6px;"><strong>Order Number:</strong> #${orderNumber}</p>
      <p style="margin: 0 0 6px;"><strong>Payment Status:</strong> <span class="badge badge-success">PAID</span></p>
      <p style="margin: 0 0 6px;"><strong>Amount Paid:</strong> ${formatINR(order.totals?.grandTotal)}</p>
      ${transactionId ? `<p style="margin: 0 0 6px;"><strong>Transaction ID:</strong> ${transactionId}</p>` : ''}
      <p style="margin: 0;"><strong>Date:</strong> ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>
    </div>

    <p style="color: #475569; font-size: 14px;">
      Your order is currently being processed and prepared for dispatch. You can track your shipment and download your official tax invoice anytime below.
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${orderUrl}" class="btn">View Order & Download Invoice</a>
    </div>
  `;

  const html = renderEmailLayout({
    title: `Payment Receipt for Order #${orderNumber}`,
    preheader: `Payment of ${formatINR(order.totals?.grandTotal)} verified for order #${orderNumber}`,
    content,
  });

  return sendMail({
    eventId,
    to: customerEmail,
    subject: `Payment Confirmed: Order #${orderNumber} [${formatINR(order.totals?.grandTotal)}]`,
    html,
    event: 'payment_verified',
    orderId: order._id,
    userId: user?._id || order.user,
  });
};

/**
 * 4. Order Status Update Email (shipped, delivered, processing)
 */
export const sendOrderStatusEmail = async ({ order, user, newStatus }) => {
  const customerEmail = user?.email || order?.shippingDetails?.phone;
  if (!customerEmail || !customerEmail.includes('@')) {
    return { success: false, skipped: true };
  }

  const eventId = `order_status_email:${order._id}:${newStatus}`;
  const orderNumber = order.orderNumber || order._id;
  const orderUrl = `${config.clientUrl}/orders/${order._id}`;

  const statusDescriptions = {
    processing: 'Your order is currently being packed with utmost care at our fulfillment center.',
    shipped: 'Great news! Your order has been dispatched and is on its way to your delivery address.',
    delivered: 'Your order has been safely delivered to your doorstep. We hope you love your purchase!',
  };

  const statusBadges = {
    processing: '<span class="badge badge-info">Processing</span>',
    shipped: '<span class="badge badge-info">Shipped</span>',
    delivered: '<span class="badge badge-success">Delivered</span>',
  };

  const message = statusDescriptions[newStatus] || `Your order status has been updated to "${newStatus}".`;
  const badge = statusBadges[newStatus] || `<span class="badge badge-info">${newStatus}</span>`;

  const content = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2 style="margin: 0; color: #0f172a;">Order Status Update</h2>
      ${badge}
    </div>
    <p style="color: #334155; line-height: 1.6;">
      Dear <strong>${order.shippingDetails?.fullName || user?.name || 'Customer'}</strong>,
    </p>
    <p style="color: #334155; line-height: 1.6; font-size: 15px;">
      ${message}
    </p>

    <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; margin: 20px 0; font-size: 14px;">
      <p style="margin: 0 0 6px;"><strong>Order ID:</strong> #${orderNumber}</p>
      <p style="margin: 0 0 6px;"><strong>Status:</strong> ${newStatus.toUpperCase()}</p>
      <p style="margin: 0 0 6px;"><strong>Destination:</strong> ${order.shippingDetails?.city} - ${order.shippingDetails?.pinCode}</p>
      <p style="margin: 0;"><strong>Total Items:</strong> ${order.items?.length || 0}</p>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${orderUrl}" class="btn">Track Order Online</a>
    </div>
  `;

  const html = renderEmailLayout({
    title: `Order #${orderNumber} is now ${newStatus}`,
    preheader: `Update on Order #${orderNumber}: Status changed to ${newStatus}`,
    content,
  });

  return sendMail({
    eventId,
    to: customerEmail,
    subject: `Order Update: #${orderNumber} is ${newStatus.toUpperCase()}`,
    html,
    event: 'order_status',
    orderId: order._id,
    userId: user?._id || order.user,
  });
};

/**
 * 5. Order Cancellation Email
 */
export const sendOrderCancellationEmail = async ({ order, user }) => {
  const customerEmail = user?.email || order?.shippingDetails?.phone;
  if (!customerEmail || !customerEmail.includes('@')) {
    return { success: false, skipped: true };
  }

  const eventId = `order_cancelled_email:${order._id}`;
  const orderNumber = order.orderNumber || order._id;

  const content = `
    <h2 style="margin-top: 0; color: #b91c1c;">Order Cancelled</h2>
    <p style="color: #334155; line-height: 1.6;">
      Dear <strong>${order.shippingDetails?.fullName || user?.name || 'Customer'}</strong>,
      your order <strong>#${orderNumber}</strong> has been cancelled as requested.
    </p>
    <p style="color: #475569; font-size: 14px; line-height: 1.5;">
      Any reserved inventory for this order has been safely restored. If this was a prepaid order, any applicable refund will be processed to the original payment method within 3-5 business days.
    </p>

    <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 6px; margin: 20px 0; font-size: 14px;">
      <p style="margin: 0 0 6px;"><strong>Order ID:</strong> #${orderNumber}</p>
      <p style="margin: 0 0 6px;"><strong>Status:</strong> <span class="badge" style="background-color: #fee2e2; color: #991b1b;">CANCELLED</span></p>
      <p style="margin: 0;"><strong>Amount:</strong> ${formatINR(order.totals?.grandTotal)}</p>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${config.clientUrl}" class="btn">Continue Shopping</a>
    </div>
  `;

  const html = renderEmailLayout({
    title: `Order Cancellation #${orderNumber}`,
    preheader: `Your order #${orderNumber} has been cancelled.`,
    content,
  });

  return sendMail({
    eventId,
    to: customerEmail,
    subject: `Order Cancelled: #${orderNumber}`,
    html,
    event: 'order_cancelled',
    orderId: order._id,
    userId: user?._id || order.user,
  });
};

export default {
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendPaymentVerificationEmail,
  sendOrderStatusEmail,
  sendOrderCancellationEmail,
};
