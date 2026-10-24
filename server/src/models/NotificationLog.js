import mongoose from 'mongoose';

const notificationLogSchema = new mongoose.Schema(
  {
    /**
     * Unique stable event or idempotency identifier.
     * Prevents duplicate messages during webhook retries or repeated status transitions.
     * Example: "order_confirmation_email:65f1234abcd" or "order_placed_sms:65f1234abcd"
     */
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['email', 'sms'],
      required: true,
      index: true,
    },
    recipient: {
      type: String,
      required: true,
      trim: true,
    },
    event: {
      type: String,
      enum: ['welcome', 'order_placed', 'order_status', 'payment_verified', 'order_cancelled'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['sent', 'failed', 'skipped'],
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    subjectOrSnippet: {
      type: String,
      default: '',
    },
    error: {
      type: String,
      default: null,
    },
    providerMessageId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const NotificationLog =
  mongoose.models.NotificationLog ||
  mongoose.model('NotificationLog', notificationLogSchema);

export default NotificationLog;
