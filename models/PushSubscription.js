import mongoose from 'mongoose';

const pushSubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  subscription: {
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true }
    }
  },
  userAgent: String,
  isActive: { type: Boolean, default: true, index: true },
  lastUsed: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Compound index for finding user's subscriptions
pushSubscriptionSchema.index({ user: 1, isActive: 1 });

// Method to mark subscription as inactive
pushSubscriptionSchema.methods.markInactive = async function() {
  this.isActive = false;
  await this.save();
};

export default mongoose.model('PushSubscription', pushSubscriptionSchema);

