import asyncHandler from '../middleware/asyncHandler.js';
import PushSubscription from '../models/PushSubscription.js';

// @desc    Get VAPID public key
// @route   GET /api/push/vapid-public-key
// @access  Public
export const getVapidPublicKey = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    publicKey: process.env.VAPID_PUBLIC_KEY
  });
});

// @desc    Subscribe to push notifications
// @route   POST /api/push/subscribe
// @access  Private
export const subscribe = asyncHandler(async (req, res) => {
  const { subscription } = req.body;
  
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ message: 'Invalid subscription' });
  }

  // Check if subscription already exists
  const existing = await PushSubscription.findOne({
    user: req.user._id,
    'subscription.endpoint': subscription.endpoint
  });

  if (existing) {
    existing.isActive = true;
    existing.lastUsed = Date.now();
    existing.userAgent = req.get('User-Agent');
    await existing.save();
    
    return res.json({
      success: true,
      message: 'Subscription updated',
      subscription: existing
    });
  }

  // Create new subscription
  const newSubscription = await PushSubscription.create({
    user: req.user._id,
    subscription,
    userAgent: req.get('User-Agent')
  });

  res.status(201).json({
    success: true,
    message: 'Subscribed to push notifications',
    subscription: newSubscription
  });
});

// @desc    Unsubscribe from push notifications
// @route   POST /api/push/unsubscribe
// @access  Private
export const unsubscribe = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  
  if (!endpoint) {
    return res.status(400).json({ message: 'Endpoint required' });
  }

  const subscription = await PushSubscription.findOne({
    user: req.user._id,
    'subscription.endpoint': endpoint
  });

  if (subscription) {
    await subscription.markInactive();
  }

  res.json({
    success: true,
    message: 'Unsubscribed from push notifications'
  });
});

// @desc    Get user's active subscriptions
// @route   GET /api/push/subscriptions
// @access  Private
export const getSubscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await PushSubscription.find({
    user: req.user._id,
    isActive: true
  }).select('-__v');

  res.json({
    success: true,
    count: subscriptions.length,
    subscriptions
  });
});

// @desc    Test push notification
// @route   POST /api/push/test
// @access  Private
export const testPushNotification = asyncHandler(async (req, res) => {
  const { sendPushNotification } = await import('../utils/pushNotificationService.js');
  
  const subscriptions = await PushSubscription.find({
    user: req.user._id,
    isActive: true
  });

  if (subscriptions.length === 0) {
    return res.status(404).json({ message: 'No active subscriptions found' });
  }

  const results = await Promise.allSettled(
    subscriptions.map(sub => 
      sendPushNotification(sub.subscription, {
        title: '🔔 Test Notification',
        message: 'Push notifications are working! You will receive updates here.',
        actionUrl: '/notifications',
        priority: 'normal'
      })
    )
  );

  // Mark expired subscriptions as inactive
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.expired) {
      subscriptions[index].markInactive();
    }
  });

  res.json({
    success: true,
    message: 'Test notification sent',
    sent: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
    failed: results.filter(r => r.status === 'rejected' || !r.value?.success).length
  });
});

export default {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  getSubscriptions,
  testPushNotification
};

