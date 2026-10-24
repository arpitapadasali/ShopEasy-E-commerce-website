import { config } from '../config/env.js';
import NotificationLog from '../models/NotificationLog.js';

/**
 * Validates and normalizes phone numbers into E.164 / Indian standard format
 * Handles formats like: "9876543210", "+919876543210", "91-9876543210", "+91 98765 43210"
 * Returns sanitized string (e.g., "+919876543210") or null if invalid.
 */
export const normalizePhoneNumber = (rawPhone) => {
  if (!rawPhone || typeof rawPhone !== 'string') return null;

  // Strip spaces, dashes, parentheses
  let digits = rawPhone.replace(/[\s\-\(\)]/g, '');

  if (!digits) return null;

  // If already starts with '+', verify length
  if (digits.startsWith('+')) {
    const numOnly = digits.slice(1);
    if (/^\d{10,15}$/.test(numOnly)) {
      return digits;
    }
    return null;
  }

  // Handle standard 10-digit Indian mobile numbers (e.g. 9876543210)
  if (/^[6-9]\d{9}$/.test(digits)) {
    return `+91${digits}`;
  }

  // Handle leading '0' before 10-digit mobile number (e.g. 09876543210 -> +919876543210)
  if (/^0[6-9]\d{9}$/.test(digits)) {
    return `+91${digits.slice(1)}`;
  }

  // Handle 12-digit format starting with 91 (e.g. 919876543210)
  if (/^91[6-9]\d{9}$/.test(digits)) {
    return `+${digits}`;
  }

  // Handle general 10-15 digit numbers
  if (/^\d{10,15}$/.test(digits)) {
    return `+${digits}`;
  }

  return null;
};

/**
 * Formats paise into INR string (e.g., 49900 -> ₹499.00)
 */
const formatINR = (paise) => {
  if (typeof paise !== 'number') return '₹0.00';
  return `₹${(paise / 100).toFixed(2)}`;
};

/**
 * Sends an SMS message via Twilio REST API
 */
const sendTwilioSMS = async ({ to, message }) => {
  const { twilioAccountSid, twilioAuthToken, twilioFromNumber } = config;
  if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
    throw new Error('Twilio credentials incomplete (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_NUMBER missing)');
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
  const bodyParams = new URLSearchParams();
  bodyParams.append('To', to);
  bodyParams.append('From', twilioFromNumber);
  bodyParams.append('Body', message);

  const authHeader = 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: bodyParams.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Twilio HTTP error ${response.status}: ${JSON.stringify(data)}`);
  }

  return {
    provider: 'twilio',
    messageId: data.sid,
    status: data.status, // 'queued', 'sent', etc.
  };
};

/**
 * Sends an SMS message via MSG91 (India DLT Compliant REST API)
 * Note: Commercial SMS in India requires DLT template ID and registered Sender ID.
 */
const sendMSG91SMS = async ({ to, templateId, variables }) => {
  const { msg91AuthKey, msg91SenderId } = config;
  if (!msg91AuthKey || !msg91SenderId) {
    throw new Error('MSG91 credentials incomplete (MSG91_AUTH_KEY or MSG91_SENDER_ID missing)');
  }

  // MSG91 mobile numbers should be without '+' prefix (e.g. "919876543210")
  const recipientMobile = to.replace(/^\+/, '');

  const payload = {
    template_id: templateId || config.msg91TemplateIdOrderPlaced,
    short_url: '0',
    recipients: [
      {
        mobiles: recipientMobile,
        ...variables,
      },
    ],
  };

  const response = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: {
      authkey: msg91AuthKey,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || data.type === 'error') {
    throw new Error(data.message || `MSG91 error: ${JSON.stringify(data)}`);
  }

  return {
    provider: 'msg91',
    messageId: data.request_id || data.message || 'msg91_sent',
    status: 'sent',
  };
};

/**
 * Safe core SMS dispatcher with idempotency and non-blocking failure recovery
 */
const dispatchSMS = async ({ eventId, to, text, event, orderId = null, userId = null, templateId = '', variables = {} }) => {
  // 1. Phone number validation
  const normalizedPhone = normalizePhoneNumber(to);
  if (!normalizedPhone) {
    console.warn(`[SMSService] Invalid phone number provided: '${to}'. Skipping SMS dispatch.`);
    return { success: false, skipped: true, reason: 'INVALID_PHONE_NUMBER' };
  }

  // 2. Idempotency check: Skip duplicate sends
  try {
    const existingLog = await NotificationLog.findOne({ eventId, status: 'sent' });
    if (existingLog) {
      console.log(`[SMSService] SMS '${eventId}' already sent previously. Skipping duplicate.`);
      return { success: true, skipped: true, messageId: existingLog.providerMessageId };
    }
  } catch (err) {
    console.warn(`[SMSService] Idempotency lookup error: ${err.message}`);
  }

  // 3. Check configured provider
  const provider = config.smsProvider;
  if (!provider || provider === 'none') {
    console.log(`[SMSService] SMS provider not configured (SMS_PROVIDER='none'). Skipping SMS to ${normalizedPhone} for '${event}'.`);
    try {
      await NotificationLog.findOneAndUpdate(
        { eventId },
        {
          eventId,
          type: 'sms',
          recipient: normalizedPhone,
          event,
          status: 'skipped',
          order: orderId,
          user: userId,
          subjectOrSnippet: text,
          error: 'SMS provider not configured (SMS_PROVIDER=none)',
        },
        { upsert: true, new: true }
      );
    } catch (_) {}
    return { success: false, skipped: true, reason: 'SMS_PROVIDER_NONE' };
  }

  // 4. Send SMS via configured provider
  try {
    let result;
    if (provider === 'twilio') {
      result = await sendTwilioSMS({ to: normalizedPhone, message: text });
    } else if (provider === 'msg91') {
      result = await sendMSG91SMS({ to: normalizedPhone, templateId, variables });
    } else {
      throw new Error(`Unsupported SMS provider: '${provider}'. Valid options: 'twilio', 'msg91', 'none'`);
    }

    console.log(`[SMSService] SMS sent via ${provider} to ${normalizedPhone}. Id: ${result.messageId}`);

    await NotificationLog.findOneAndUpdate(
      { eventId },
      {
        eventId,
        type: 'sms',
        recipient: normalizedPhone,
        event,
        status: 'sent',
        order: orderId,
        user: userId,
        subjectOrSnippet: text,
        providerMessageId: result.messageId,
        error: null,
      },
      { upsert: true, new: true }
    );

    return { success: true, messageId: result.messageId, provider };
  } catch (err) {
    const sanitizedError = err.message || 'SMS dispatch failure';
    console.error(`[SMSService] Failed to send SMS for event '${event}' to '${normalizedPhone}': ${sanitizedError}`);

    try {
      await NotificationLog.findOneAndUpdate(
        { eventId },
        {
          eventId,
          type: 'sms',
          recipient: normalizedPhone,
          event,
          status: 'failed',
          order: orderId,
          user: userId,
          subjectOrSnippet: text,
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
 * 1. Order Confirmation SMS
 */
export const sendOrderConfirmationSMS = async ({ order, user }) => {
  const phone = order.shippingDetails?.phone || user?.phone;
  if (!phone) return { success: false, skipped: true };

  const orderNumber = order.orderNumber || order._id;
  const amountStr = formatINR(order.totals?.grandTotal);
  const text = `ShopEasy: Your order #${orderNumber} for ${amountStr} has been successfully placed. We will notify you once dispatched.`;

  return dispatchSMS({
    eventId: `order_placed_sms:${order._id}`,
    to: phone,
    text,
    event: 'order_placed',
    orderId: order._id,
    userId: user?._id || order.user,
    templateId: config.msg91TemplateIdOrderPlaced,
    variables: {
      order_id: orderNumber,
      amount: amountStr,
    },
  });
};

/**
 * 2. Payment Verified SMS
 */
export const sendPaymentVerifiedSMS = async ({ order, user, transactionId = '' }) => {
  const phone = order.shippingDetails?.phone || user?.phone;
  if (!phone) return { success: false, skipped: true };

  const orderNumber = order.orderNumber || order._id;
  const amountStr = formatINR(order.totals?.grandTotal);
  const text = `ShopEasy: Payment of ${amountStr} for Order #${orderNumber} has been verified successfully. Your order is confirmed!`;

  return dispatchSMS({
    eventId: `payment_verified_sms:${order._id}:${transactionId || 'verified'}`,
    to: phone,
    text,
    event: 'payment_verified',
    orderId: order._id,
    userId: user?._id || order.user,
    templateId: config.msg91TemplateIdPaymentVerified,
    variables: {
      order_id: orderNumber,
      amount: amountStr,
    },
  });
};

/**
 * 3. Order Status Update SMS (shipped, delivered, cancelled)
 */
export const sendOrderStatusSMS = async ({ order, user, newStatus }) => {
  const phone = order.shippingDetails?.phone || user?.phone;
  if (!phone) return { success: false, skipped: true };

  const orderNumber = order.orderNumber || order._id;
  const statusUpper = newStatus.toUpperCase();
  const text = `ShopEasy: Status update for Order #${orderNumber}. Your order is now ${statusUpper}. Track updates on your ShopEasy account.`;

  return dispatchSMS({
    eventId: `order_status_sms:${order._id}:${newStatus}`,
    to: phone,
    text,
    event: 'order_status',
    orderId: order._id,
    userId: user?._id || order.user,
    templateId: config.msg91TemplateIdStatusUpdate,
    variables: {
      order_id: orderNumber,
      status: statusUpper,
    },
  });
};

export default {
  normalizePhoneNumber,
  sendOrderConfirmationSMS,
  sendPaymentVerifiedSMS,
  sendOrderStatusSMS,
};
