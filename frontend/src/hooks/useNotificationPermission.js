import { useState, useEffect } from 'react';

export const useNotificationPermission = () => {
  const [permission, setPermission] = useState('default');
  const [isSupported, setIsSupported] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Register service worker
      registerServiceWorker();
    } else {
      console.log('Push notifications are not supported');
      setIsSupported(false);
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', reg);
      setRegistration(reg);
      
      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'NAVIGATE') {
          window.location.href = event.data.url;
        }
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const requestPermission = async () => {
    if (!isSupported) {
      console.log('Notifications not supported');
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        console.log('Notification permission granted');
        
        // Show a test notification
        showNotification(
          'Notifications Enabled! 🔔',
          'You will now receive notifications from Sanjana CRM',
          '/'
        );
      }
      
      return result;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  };

  const showNotification = async (title, body, url = '/', options = {}) => {
    if (!isSupported || permission !== 'granted') {
      console.log('Cannot show notification - permission not granted');
      return;
    }

    try {
      // If service worker is available, use it
      if (registration) {
        await registration.showNotification(title, {
          body,
          icon: '/logo.png',
          badge: '/logo.png',
          vibrate: [200, 100, 200],
          tag: 'crm-notification',
          requireInteraction: false,
          data: { url },
          ...options
        });
      } else {
        // Fallback to browser notification
        const notification = new Notification(title, {
          body,
          icon: '/logo.png',
          badge: '/logo.png',
          vibrate: [200, 100, 200],
          tag: 'crm-notification',
          requireInteraction: false,
          data: { url },
          ...options
        });

        notification.onclick = () => {
          window.focus();
          if (url) {
            window.location.href = url;
          }
          notification.close();
        };
      }

      // Play notification sound
      playNotificationSound();
    } catch (error) {
      console.error('Error showing notification:', error);
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

