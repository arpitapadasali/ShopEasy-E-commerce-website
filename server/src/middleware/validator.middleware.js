/**
 * Input Validation Middleware for Authentication Endpoints
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validates user registration payload
 */
export const validateRegistration = (req, res, next) => {
  const { name, email, password, passwordConfirm } = req.body;
  const errors = [];

  // 1. Name validation
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name is required and must be at least 2 characters long.');
  }

  // 2. Email validation
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push('A valid email address is required.');
  }

  // 3. Password validation
  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password is required and must be at least 6 characters long.');
  }

  // 4. Password confirmation validation
  if (!passwordConfirm || password !== passwordConfirm) {
    errors.push('Password confirmation does not match the entered password.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
    });
  }

  // Normalize email
  req.body.email = email.trim().toLowerCase();
  req.body.name = name.trim();

  // SECURITY: Never accept a user-selected administrator or privileged role
  delete req.body.role;
  delete req.body.passwordHash;

  next();
};

/**
 * Validates user login payload
 */
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address.',
    });
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide your password.',
    });
  }

  // Normalize email
  req.body.email = email.trim().toLowerCase();

  next();
};

/**
 * Validates profile update payload
 */
export const validateProfileUpdate = (req, res, next) => {
  const { name, phone, password, newPassword, newPasswordConfirm } = req.body;
  const errors = [];

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long.');
    } else {
      req.body.name = name.trim();
    }
  }

  if (phone !== undefined && phone !== '') {
    const phoneRegex = /^[0-9+\s-]{7,15}$/;
    if (!phoneRegex.test(phone.trim())) {
      errors.push('Please provide a valid phone number (7-15 digits).');
    }
  }

  // If attempting password change
  if (newPassword) {
    if (!password) {
      errors.push('Current password is required to set a new password.');
    }
    if (newPassword.length < 6) {
      errors.push('New password must be at least 6 characters long.');
    }
    if (newPassword !== newPasswordConfirm) {
      errors.push('New password confirmation does not match.');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
    });
  }

  // SECURITY: Never allow changing email or role through profile update
  delete req.body.email;
  delete req.body.role;
  delete req.body.passwordHash;

  next();
};

export default { validateRegistration, validateLogin, validateProfileUpdate };
