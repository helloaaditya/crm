import { useState, useEffect } from 'react';

export const useNotificationPermission = () => {
  const [permission, setPermission] = useState('default');
  const [isSupported, setIsSupported] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      console.log('🔔 Notification permission status:', Notification.permission);

      // Get service worker registration if it exists
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          console.log('🔧 Service Worker is ready:', reg.scope);
          setRegistration(reg);
        }).catch(err => {
          console.error('❌ Service Worker not ready:', err);
        });
      }
    } else {
      console.log('❌ Push notifications are not supported in this browser');
      setIsSupported(false);
    }
  }, []);


  const requestPermission = async () => {
    if (!isSupported) {
      console.log('❌ Notifications not supported in this browser');
      alert('Notifications are not supported in this browser. Please use Chrome, Firefox, or Edge.');
      return 'denied';
    }

    try {
      console.log('📱 Requesting notification permission...');
      const result = await Notification.requestPermission();
      console.log('📱 Permission result:', result);
      setPermission(result);
      
      if (result === 'granted') {
        console.log('✅ Notification permission granted!');
        
        // Show a test notification immediately
        setTimeout(() => {
          showNotification(
            '🔔 Notifications Enabled!',
            'You will now receive alerts from Sanjana CRM',
            '/',
            {
              requireInteraction: true,
              tag: 'permission-granted'
            }
          );
        }, 500);
      } else if (result === 'denied') {
        console.log('❌ Notification permission denied');
        alert('Notifications blocked. Please enable them in your browser settings:\n\n1. Click the lock icon in address bar\n2. Change Notifications to "Allow"\n3. Refresh the page');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return 'denied';
    }
  };

  const showNotification = async (title, body, url = '/', options = {}) => {
    if (!isSupported) {
      console.log('❌ Notifications not supported');
      return;
    }

    if (permission !== 'granted') {
      console.log('⚠️ Cannot show notification - permission not granted. Current:', permission);
      return;
    }

    try {
      console.log('📣 Showing notification:', title);

      const notificationOptions = {
        body,
        icon: '/vite.svg',
        badge: '/vite.svg',
        vibrate: [200, 100, 200, 100, 200],
        tag: options.tag || 'crm-notification',
        requireInteraction: options.requireInteraction || false,
        data: { url },
        silent: false,
        renotify: true,
        ...options
      };

      // Try service worker first
      if (registration && registration.active) {
        console.log('📱 Using Service Worker for notification');
        await registration.showNotification(title, notificationOptions);
      } else {
        // Fallback to browser notification API
        console.log('📱 Using Browser Notification API');
        const notification = new Notification(title, notificationOptions);

        notification.onclick = (event) => {
          event.preventDefault();
          console.log('🖱️ Notification clicked');
          window.focus();
          if (url && url !== '/') {
            window.location.href = url;
          }
          notification.close();
        };

        notification.onerror = (error) => {
          console.error('❌ Notification error:', error);
        };

        notification.onshow = () => {
          console.log('✅ Notification shown successfully');
        };
      }

      // Play notification sound
      playNotificationSound();
      console.log('✅ Notification created successfully');
    } catch (error) {
      console.error('❌ Error showing notification:', error);
    }
  };

  const playNotificationSound = () => {
    try {
      // Create a short beep sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    registration
  };
};

export default useNotificationPermission;

