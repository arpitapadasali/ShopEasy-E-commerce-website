import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for sensitive authentication endpoints (login, register)
 * Protects against brute force credential attacks and automated spamming
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 30, // Limit each IP to 30 requests per window
  standardHeaders: true, // Return standard RateLimit headers
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
  skip: (req) => process.env.NODE_ENV === 'test', // Skip rate limiting during automated test suites
});

export default authLimiter;
