import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Generate a signed JWT token containing user id and role
 * @param {Object} user - User document or object with _id and role
 * @returns {string} Signed JWT token
 */
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
    }
  );
};

export default generateToken;
