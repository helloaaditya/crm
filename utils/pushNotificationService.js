import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@sanjana-crm.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
}

/**
 * Send push notification to a user
 * @param {Object} subscription - Push subscription object
 * @param {Object} payload - Notification payload
 */
export const sendPushNotification = async (subscription, payload) => {
  try {
    console.log('📤 Preparing push notification:', {
      title: payload.title,
      type: payload.type,
      endpoint: subscription.endpoint?.substring(0, 50) + '...'
    });
    
    const notificationPayload = JSON.stringify({
      title: payload.title || 'CRM Notification',
      body: payload.message || payload.body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      data: {
        url: payload.actionUrl || '/',
        notificationId: payload._id || payload.id,
        priority: payload.priority || 'normal'
      },
      tag: payload.type || 'notification',
      requireInteraction: payload.priority === 'high',
      vibrate: [200, 100, 200]
    });

    console.log('📮 Sending to Web Push API...');
    await webpush.sendNotification(subscription, notificationPayload);
    console.log('✅ Push notification sent successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Push notification error:', error.message);
    console.error('   Status:', error.statusCode);
    console.error('   Body:', error.body);
    
    // If subscription is expired or invalid, return error
    if (error.statusCode === 404 || error.statusCode === 410) {
      console.log('⚠️ Subscription expired/invalid');
      return { success: false, expired: true };
    }
    
    return { success: false, error: error.message };
  }
};

/**
 * Send push notification to multiple subscriptions
 * @param {Array} subscriptions - Array of push subscription objects
 * @param {Object} payload - Notification payload
 */
export const sendBulkPushNotifications = async (subscriptions, payload) => {
  const results = await Promise.allSettled(
    subscriptions.map(sub => sendPushNotification(sub, payload))
  );
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const expired = results.filter(r => r.status === 'fulfilled' && r.value.expired).length;
  
  return {
    total: subscriptions.length,
    successful,
    expired,
    failed: subscriptions.length - successful - expired
  };
};

export default {
  sendPushNotification,
  sendBulkPushNotifications
};

