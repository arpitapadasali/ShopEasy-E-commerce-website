import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide user name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Please provide password hash'],
      minlength: 6,
    },
    role: {
      type: String,
      enum: {
        values: ['customer', 'admin'],
        message: 'Role must be either customer or admin',
      },
      default: 'customer',
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9+\s-]{7,15}$/, 'Please provide a valid phone number'],
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    pinCode: {
      type: String,
      trim: true,
      match: [/^[0-9]{4,10}$/, 'Please provide a valid postal/pin code'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Compare plain text password against stored hash
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

/**
 * Omit sensitive credentials when serializing to JSON
 */
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.passwordHash;
  delete userObject.__v;
  return userObject;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
