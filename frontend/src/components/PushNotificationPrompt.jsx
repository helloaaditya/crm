import { useState, useEffect } from 'react';
import { FiBell, FiBellOff, FiX, FiCheck } from 'react-icons/fi';
import { toast } from 'react-toastify';
import {
  isPushNotificationSupported,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getPushSubscription,
  sendTestPushNotification
} from '../utils/pushNotifications';

const PushNotificationPrompt = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    const supported = isPushNotificationSupported();
    setIsSupported(supported);

    if (supported && 'Notification' in window) {
      setPermission(Notification.permission);
      
      const subscription = await getPushSubscription();
      setIsSubscribed(!!subscription);
      
      // Show prompt if not subscribed and permission not denied
      if (!subscription && Notification.permission === 'default') {
        // Show prompt after 3 seconds
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }
  };

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      const granted = await requestNotificationPermission();
      
      if (granted) {
        await subscribeToPushNotifications();
        setPermission('granted');
        setIsSubscribed(true);
        setShowPrompt(false);
        toast.success('🔔 Push notifications enabled!');
      } else {
        toast.error('Please allow notifications in your browser settings');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setLoading(true);
    try {
      await unsubscribeFromPushNotifications();
      setIsSubscribed(false);
      toast.info('Push notifications disabled');
    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast.error('Failed to disable notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setLoading(true);
    try {
      await sendTestPushNotification();
      toast.success('Test notification sent! Check your notifications.');
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return null; // Browser doesn't support push notifications
  }

  return (
    <>
      {/* Floating Prompt */}
      {showPrompt && permission === 'default' && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-white rounded-lg shadow-2xl border border-gray-200 p-4 animate-slide-up">
          <button
            onClick={() => setShowPrompt(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            <FiX size={18} />
          </button>
          
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FiBell className="text-blue-600" size={20} />
            </div>
            
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800 mb-1">
                Enable Notifications
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Stay updated with real-time notifications even when you're not on the site.
              </p>
              
              <div className="flex gap-2">
                <button
                  onClick={handleEnableNotifications}
                  disabled={loading}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {loading ? 'Enabling...' : 'Enable'}
                </button>
                <button
                  onClick={() => setShowPrompt(false)}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Toggle (for header) */}
      {permission === 'granted' && (
        <div className="relative group">
          <button
            className={`p-2 rounded-lg ${isSubscribed ? 'text-green-600' : 'text-gray-400'}`}
            title={isSubscribed ? 'Push notifications enabled' : 'Push notifications disabled'}
          >
            {isSubscribed ? <FiBell size={20} /> : <FiBellOff size={20} />}
          </button>
          
          {/* Dropdown on hover */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <h5 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              {isSubscribed ? <FiCheck className="text-green-600" /> : <FiBellOff className="text-gray-400" />}
              Push Notifications
            </h5>
            <p className="text-xs text-gray-600 mb-3">
              {isSubscribed 
                ? 'You will receive real-time browser notifications' 
                : 'Notifications are disabled'}
            </p>
            
            <div className="flex flex-col gap-2">
              {isSubscribed ? (
                <>
                  <button
                    onClick={handleTestNotification}
                    disabled={loading}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    {loading ? 'Sending...' : 'Test Notification'}
                  </button>
                  <button
                    onClick={handleDisableNotifications}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 text-sm"
                  >
                    {loading ? 'Disabling...' : 'Disable'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEnableNotifications}
                  disabled={loading}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {loading ? 'Enabling...' : 'Enable'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PushNotificationPrompt;

