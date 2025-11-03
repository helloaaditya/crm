import api from '../api/axios';

// Convert base64 VAPID key to Uint8Array
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Check if push notifications are supported
 */
export const isPushNotificationSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Request notification permission
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

/**
 * Register service worker
 */
export const registerServiceWorker = async () => {
  if (!isPushNotificationSupported()) {
    console.log('Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });
    
    console.log('Service Worker registered:', registration);
    
    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

/**
 * Subscribe to push notifications
 */
export const subscribeToPushNotifications = async () => {
  try {
    // Check if already subscribed
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      console.log('Already subscribed to push notifications');
      return subscription;
    }

    // Get VAPID public key from backend
    const response = await api.get('/push/vapid-public-key');
    const vapidPublicKey = response.data.publicKey;

    if (!vapidPublicKey) {
      throw new Error('VAPID public key not found');
    }

    // Subscribe to push notifications
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    console.log('Push subscription:', subscription);

    // Send subscription to backend
    await api.post('/push/subscribe', { subscription });

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPushNotifications = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      
      // Notify backend
      await api.post('/push/unsubscribe', { endpoint });
      
      console.log('Unsubscribed from push notifications');
    }
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    throw error;
  }
};

/**
 * Get current subscription status
 */
export const getPushSubscription = async () => {
  try {
    if (!isPushNotificationSupported()) {
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    return subscription;
  } catch (error) {
    console.error('Error getting push subscription:', error);
    return null;
  }
};

/**
 * Send test push notification
 */
export const sendTestPushNotification = async () => {
  try {
    const response = await api.post('/push/test');
    return response.data;
  } catch (error) {
    console.error('Error sending test notification:', error);
    throw error;
  }
};

/**
 * Initialize push notifications
 */
export const initializePushNotifications = async () => {
  try {
    if (!isPushNotificationSupported()) {
      console.log('Push notifications not supported on this browser');
      return false;
    }

    // Register service worker
    await registerServiceWorker();

    // Check notification permission
    if (Notification.permission === 'granted') {
      // Subscribe to push notifications
      await subscribeToPushNotifications();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error initializing push notifications:', error);
    return false;
  }
};

export default {
  isPushNotificationSupported,
  requestNotificationPermission,
  registerServiceWorker,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getPushSubscription,
  sendTestPushNotification,
  initializePushNotifications
};

