/* eslint-disable no-restricted-globals */

// Service Worker for Background Location Tracking & Push Notifications

const CACHE_NAME = 'sanjana-crm-v1';
const API_BASE_URL = '/api';

// Install event
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activating...');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.delete(CACHE_NAME).catch(() => {})
    ])
  );
});

// Note: Service Workers cannot directly access geolocation API
// Instead, we handle queued location updates and sync them when the service worker wakes up
// The main app will queue location updates in IndexedDB, and we'll sync them here

// Get tracking data from IndexedDB
async function getTrackingData() {
  return new Promise((resolve) => {
    const request = indexedDB.open('LocationTrackingDB', 1);
    
    request.onerror = () => resolve(null);
    request.onsuccess = (event) => {
      const db = event.target.result;
      if (!db) {
        resolve(null);
        return;
      }
      
      const transaction = db.transaction(['tracking'], 'readonly');
      const store = transaction.objectStore('tracking');
      const getRequest = store.get('current');
      
      getRequest.onsuccess = () => {
        resolve(getRequest.result || null);
      };
      getRequest.onerror = () => resolve(null);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('tracking')) {
        db.createObjectStore('tracking');
      }
    };
  });
}

// Send location update to server
async function sendLocationUpdate(locationData) {
  try {
    // Get auth token from IndexedDB
    const authData = await getAuthData();
    if (!authData || !authData.token) {
      console.log('⚠️ No auth token, cannot send location update');
      return;
    }
  
    const response = await fetch(`${API_BASE_URL}/location-tracking/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.token}`
      },
      body: JSON.stringify(locationData)
    });
    
    if (response.ok) {
      console.log('✅ Background location update sent:', locationData);
    } else {
      console.error('❌ Failed to send location update:', response.status);
    }
  } catch (error) {
    console.error('❌ Error sending location update:', error);
    // Queue for background sync
    await queueLocationUpdate(locationData);
  }
}

// Get auth data from IndexedDB
async function getAuthData() {
  return new Promise((resolve) => {
    const request = indexedDB.open('AuthDB', 1);
    
    request.onerror = () => resolve(null);
    request.onsuccess = (event) => {
      const db = event.target.result;
      if (!db) {
        resolve(null);
        return;
      }
      
      const transaction = db.transaction(['auth'], 'readonly');
      const store = transaction.objectStore('auth');
      const getRequest = store.get('token');
      
      getRequest.onsuccess = () => {
        resolve(getRequest.result || null);
      };
      getRequest.onerror = () => resolve(null);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('auth')) {
        db.createObjectStore('auth');
      }
    };
  });
}

// Queue location update for background sync
async function queueLocationUpdate(locationData) {
  if ('sync' in self.registration) {
    try {
      await self.registration.sync.register(`location-update-${Date.now()}`);
      // Store location data for sync event
      const request = indexedDB.open('LocationQueueDB', 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
        }
      };
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['queue'], 'readwrite');
        const store = transaction.objectStore('queue');
        store.add({ ...locationData, timestamp: Date.now() });
      };
    } catch (error) {
      console.error('❌ Failed to queue location update:', error);
    }
  }
}

// Handle background sync
self.addEventListener('sync', (event) => {
  if (event.tag.startsWith('location-update-')) {
    event.waitUntil(syncLocationUpdates());
  } else if (event.tag === 'location-sync') {
    // Periodic sync for location updates
    event.waitUntil(syncLocationUpdates());
  }
});

// Handle periodic background sync (if available)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'location-sync') {
    event.waitUntil(syncLocationUpdates());
  }
});

// Sync queued location updates
async function syncLocationUpdates() {
  const request = indexedDB.open('LocationQueueDB', 1);
  request.onsuccess = (event) => {
    const db = event.target.result;
    if (!db) return;
    
    const transaction = db.transaction(['queue'], 'readwrite');
    const store = transaction.objectStore('queue');
    const getAllRequest = store.getAll();
    
    getAllRequest.onsuccess = async () => {
      const updates = getAllRequest.result || [];
      for (const update of updates) {
        try {
          await sendLocationUpdate(update);
          store.delete(update.id);
        } catch (error) {
          console.error('❌ Failed to sync location update:', error);
        }
      }
    };
  };
}

// Handle messages from the client
self.addEventListener('message', (event) => {
  console.log('📨 Service Worker received message:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'START_LOCATION_TRACKING') {
    // Store tracking data in IndexedDB
    const request = indexedDB.open('LocationTrackingDB', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('tracking')) {
        db.createObjectStore('tracking');
      }
    };
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['tracking'], 'readwrite');
      const store = transaction.objectStore('tracking');
      store.put({
        isActive: true,
        sessionId: event.data.sessionId,
        ...event.data
      }, 'current');
    };
    
    // Register periodic background sync if available
    if ('periodicSync' in self.registration) {
      self.registration.periodicSync.register('location-sync', {
        minInterval: 30000 // 30 seconds minimum
      }).then(() => {
        console.log('✅ Periodic background sync registered');
      }).catch((error) => {
        console.log('⚠️ Periodic sync not available:', error);
      });
    }
  } else if (event.data.type === 'STOP_LOCATION_TRACKING') {
    // Unregister periodic sync
    if ('periodicSync' in self.registration) {
      self.registration.periodicSync.unregister('location-sync').catch((error) => {
        console.log('Error unregistering periodic sync:', error);
      });
    }
    
    // Clear tracking data
    const request = indexedDB.open('LocationTrackingDB', 1);
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['tracking'], 'readwrite');
      const store = transaction.objectStore('tracking');
      store.delete('current');
    };
  } else if (event.data.type === 'STORE_AUTH_TOKEN') {
    // Store auth token in IndexedDB
    const request = indexedDB.open('AuthDB', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('auth')) {
        db.createObjectStore('auth');
      }
    };
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['auth'], 'readwrite');
      const store = transaction.objectStore('auth');
      store.put({ token: event.data.token }, 'token');
    };
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received:', event);
  
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push data:', data);
    
    const options = {
      body: data.body || data.message,
      icon: data.icon || '/logo192.png',
      badge: data.badge || '/logo192.png',
      data: data.data || {},
      tag: data.tag || 'default',
      requireInteraction: data.requireInteraction || false,
      actions: [
        {
          action: 'open',
          title: 'View'
        },
        {
          action: 'close',
          title: 'Dismiss'
        }
      ],
      vibrate: [200, 100, 200],
      timestamp: Date.now()
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'New Notification', options)
    );
  } catch (error) {
    console.error('Error showing notification:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then(() => {
              return client.navigate(urlToOpen);
            });
          }
        }
        
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});
