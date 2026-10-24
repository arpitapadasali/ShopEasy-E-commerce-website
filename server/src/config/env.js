import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load server/.env regardless of root or server execution cwd
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  mongodbUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev_fallback_secret_must_be_changed',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  isProduction: process.env.NODE_ENV === 'production',

  // Dev admin configuration for safe database seeding
  createDevAdmin: process.env.CREATE_DEV_ADMIN === 'true',
  devAdminEmail: process.env.DEV_ADMIN_EMAIL || 'admin@shopeasy.local',
  devAdminPassword: process.env.DEV_ADMIN_PASSWORD || 'AdminSecurePass123!',

  // Email Notification Settings (Nodemailer / SMTP)
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT, 10) || 587,
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  emailFrom: process.env.EMAIL_FROM || 'ShopEasy <no-reply@shopeasy.com>',

  // SMS Notification Settings (Twilio / MSG91)
  smsProvider: (process.env.SMS_PROVIDER || 'none').toLowerCase(), // 'twilio' | 'msg91' | 'none'
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER || '',
  msg91AuthKey: process.env.MSG91_AUTH_KEY || '',
  msg91SenderId: process.env.MSG91_SENDER_ID || '',
  msg91TemplateIdOrderPlaced: process.env.MSG91_TEMPLATE_ORDER_PLACED || '',
  msg91TemplateIdPaymentVerified: process.env.MSG91_TEMPLATE_PAYMENT_VERIFIED || '',
  msg91TemplateIdStatusUpdate: process.env.MSG91_TEMPLATE_STATUS_UPDATE || '',

  // Store & Invoice Settings
  businessName: process.env.BUSINESS_NAME || 'ShopEasy Retail Pvt. Ltd.',
  businessAddress: process.env.BUSINESS_ADDRESS || 'Plot 42, Cyber Hub, Gurugram, Haryana 122002, India',
  businessPhone: process.env.BUSINESS_PHONE || '+91 1800 123 4567',
  businessEmail: process.env.BUSINESS_EMAIL || 'support@shopeasy.com',
  businessGstin: process.env.BUSINESS_GSTIN || '', // Optional: only displayed if legitimately configured
};

export default config;
