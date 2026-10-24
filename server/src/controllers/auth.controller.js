import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateToken } from '../utils/token.js';
import { sendWelcomeEmail } from '../services/email.service.js';

// Safe masked email utility for logging without exposing sensitive full addresses
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return 'unknown';
  return email.replace(/(?<=^.).+(?=@)/, '***');
};

/**
 * @desc    Register a new customer account
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, address, city, pinCode } = req.body;

    // Guard: Ensure database is connected before querying
    if (mongoose.connection.readyState !== 1) {
      console.error(`[Auth] Registration rejected: Database is not connected (readyState: ${mongoose.connection.readyState})`);
      return res.status(503).json({
        success: false,
        message: 'Database service is currently unavailable. Please verify MongoDB Atlas connection and IP whitelist.',
      });
    }

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email }).maxTimeMS(4000);
    if (existingUser) {
      console.warn(`[Auth] Registration failed: Email '${maskEmail(email)}' already registered`);
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // 2. Hash password with bcrypt salt factor 10
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Create user document - force 'customer' role
    const newUser = await User.create({
      name,
      email,
      passwordHash,
      role: 'customer', // Security: strictly customer, admin is created only via seed/CLI
      phone: phone || '',
      address: address || '',
      city: city || '',
      pinCode: pinCode || '',
    });

    // 4. Issue JWT bearer token
    const token = generateToken(newUser);
    console.log(`[Auth] Registration successful: ${newUser.name} (${newUser.role}) - ID: ${newUser._id}`);

    // Trigger welcome email asynchronously (failure never interrupts registration)
    sendWelcomeEmail({ email: newUser.email, name: newUser.name, userId: newUser._id }).catch(() => {});

    // 5. Respond with sanitized profile (passwordHash omitted by User.toJSON)
    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: newUser.toJSON(),
    });
  } catch (error) {
    console.error(`[Auth] Registration error for '${maskEmail(req.body?.email)}': ${error.name} - ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Authenticate user and get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Guard: Ensure database is connected before querying to prevent buffering hangs
    if (mongoose.connection.readyState !== 1) {
      console.error(`[Auth] Login rejected: Database is not connected (readyState: ${mongoose.connection.readyState})`);
      return res.status(503).json({
        success: false,
        message: 'Database service is currently unavailable. Please verify MongoDB Atlas connection and IP whitelist.',
      });
    }

    // 1. Retrieve user by normalized email with strict timeout
    const user = await User.findOne({ email }).maxTimeMS(4000);

    // 2. Verify existence and match bcrypt hash
    const isMatch = user ? await user.matchPassword(password) : false;
    if (!user || !isMatch) {
      console.warn(`[Auth] Failed login attempt: Invalid credentials for '${maskEmail(email)}'`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 3. Issue JWT bearer token
    const token = generateToken(user);
    console.log(`[Auth] User logged in successfully: ${user.name} (${user.role}) - ID: ${user._id}`);

    // 4. Respond with sanitized profile and token
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error(`[Auth] Login error for '${maskEmail(req.body?.email)}': ${error.name} - ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Log out current session
 * @route   POST /api/auth/logout
 * @access  Public
 */
export const logout = async (req, res) => {
  // In a stateless JWT architecture, the client removes the token from storage.
  // The server acknowledges the logout request.
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

/**
 * @desc    Get authenticated user's profile
 * @route   GET /api/auth/me
 * @access  Private (Bearer token required)
 */
export const getMe = async (req, res) => {
  // req.user is attached by the 'protect' middleware
  return res.status(200).json({
    success: true,
    user: req.user.toJSON(),
  });
};

/**
 * @desc    Update authenticated user's profile
 * @route   PUT /api/auth/profile
 * @access  Private (Bearer token required)
 */
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const { name, phone, address, city, pinCode, password, newPassword } = req.body;

    // Update allowable contact and address fields
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (city !== undefined) user.city = city;
    if (pinCode !== undefined) user.pinCode = pinCode;

    // If changing password, verify current password first
    if (newPassword) {
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password provided is incorrect.',
        });
      }
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
    }

    const updatedUser = await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

export default { register, login, logout, getMe, updateProfile };
