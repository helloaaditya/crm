import { useState, useEffect, useRef, useCallback } from 'react';
import { locationTrackingAPI } from '../api';
import { toast } from 'react-toastify';

/**
 * Custom hook for automatic location tracking
 * Tracks employee location in real-time and works in background
 * Uses multiple strategies to ensure continuous tracking even when app is backgrounded
 */
const useLocationTracking = (shouldTrack = false) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const watchId = useRef(null);
  const updateInterval = useRef(null);
  const updateIntervalBackup = useRef(null); // Backup interval for web view
  const heartbeatInterval = useRef(null);
  const wakeLock = useRef(null);
  const lastLocation = useRef(null);
  const lastUpdateTime = useRef(Date.now());

  // Queue location update for background sync
  const queueLocationForBackgroundSync = async (locationData) => {
    try {
      // Store in IndexedDB for service worker to sync
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
      
      // Register background sync
      if ('serviceWorker' in navigator && 'sync' in self.registration) {
        try {
          await self.registration.sync.register(`location-update-${Date.now()}`);
        } catch (error) {
          console.log('Background sync registration failed:', error);
        }
      }
    } catch (error) {
      console.error('Failed to queue location update:', error);
    }
  };

  // Generate unique session ID
  const generateSessionId = () => {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  };

  // Get battery level (if supported)
  const getBatteryLevel = async () => {
    try {
      if ('getBattery' in navigator) {
        const battery = await navigator.getBattery();
        return Math.round(battery.level * 100);
      }
    } catch (error) {
      console.log('Battery API not supported');
    }
    return null;
  };

  // Reverse geocode coordinates to address
  const reverseGeocode = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      return data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  };

  // Send location to server
  const sendLocationToServer = useCallback(
    async (position, isFirst = false) => {
      try {
        const { latitude, longitude, accuracy, speed, heading } = position.coords;

        // Skip if location hasn't changed significantly (less than 10 meters)
        if (lastLocation.current && !isFirst) {
          const distance = calculateDistance(
            lastLocation.current.latitude,
            lastLocation.current.longitude,
            latitude,
            longitude
          );

          if (distance < 10) {
            console.log('📍 Location change too small, skipping update');
            return;
          }
        }

        const batteryLevel = await getBatteryLevel();
        const address = await reverseGeocode(latitude, longitude);

        const locationData = {
          sessionId: sessionId || generateSessionId(),
          latitude,
          longitude,
          accuracy,
          speed: speed || 0,
          heading: heading || 0,
          batteryLevel,
          address,
        };

        console.log('📤 Sending location to server:', locationData);

        // Send to server
        if (isFirst) {
          const response = await locationTrackingAPI.startTracking(locationData);
          console.log('✅ Tracking started:', response.data);
        } else {
          try {
            const response = await locationTrackingAPI.updateLocation(locationData);
            console.log('✅ Location updated:', response.data);
          } catch (error) {
            // If update fails, queue it for background sync
            console.log('⚠️ Location update failed, queueing for background sync');
            await queueLocationForBackgroundSync(locationData);
          }
        }

        // Update local state
        lastLocation.current = { latitude, longitude, timestamp: Date.now() };
        lastUpdateTime.current = Date.now(); // Track last successful update time
        
        setCurrentLocation({
          latitude,
          longitude,
          accuracy,
          speed,
          heading,
          batteryLevel,
          address,
          timestamp: new Date(),
        });

        // Add to history
        setLocationHistory((prev) => [
          ...prev,
          {
            latitude,
            longitude,
            timestamp: new Date(),
            address,
          },
        ]);
      } catch (error) {
        console.error('❌ Failed to send location:', error);
        setError(error.message);
      }
    },
    [sessionId]
  );

  // Success callback for geolocation
  const handleLocationSuccess = useCallback(
    (position) => {
      console.log('📍 Location obtained:', position.coords);
      sendLocationToServer(position, !lastLocation.current);
    },
    [sendLocationToServer]
  );

  // Error callback for geolocation (no toast - would repeat and disturb employees)
  const handleLocationError = (error) => {
    console.error('❌ Location error:', error);
    let errorMessage = 'Failed to get location';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out';
        break;
      default:
        errorMessage = 'Unknown location error';
    }

    setError(errorMessage);
    // No toast here - callback can fire repeatedly during tracking
  };

  // Request wake lock to prevent device sleep
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLock.current = await navigator.wakeLock.request('screen');
        console.log('🔒 Wake lock acquired - device will stay awake');
        
        // Re-acquire wake lock if it's released
        wakeLock.current.addEventListener('release', () => {
          console.log('⚠️ Wake lock released, will re-acquire on next interaction');
        });
      }
    } catch (error) {
      console.log('Wake lock not available or failed:', error.message);
    }
  };

  // Release wake lock
  const releaseWakeLock = async () => {
    try {
      if (wakeLock.current) {
        await wakeLock.current.release();
        wakeLock.current = null;
        console.log('🔓 Wake lock released');
      }
    } catch (error) {
      console.log('Failed to release wake lock:', error);
    }
  };

  // Start tracking
  const startTracking = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not supported by your browser', { autoClose: 5000 });
      return;
    }

    try {
      // Request permission and get initial location
      const permission = await navigator.permissions.query({ name: 'geolocation' });

      if (permission.state === 'denied') {
        toast.error('Location permission denied. Enable it in browser settings.', { autoClose: 5000 });
        return;
      }

      // Check if already tracking - prevent duplicate sessions
      if (isTracking || watchId.current !== null) {
        console.log('⚠️ Tracking already active, skipping duplicate start');
        return;
      }

      // Generate new session ID
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);
      setIsTracking(true);
      setError(null);
      setLocationHistory([]);
      lastLocation.current = null;
      lastUpdateTime.current = Date.now();

      // Store tracking state in localStorage to persist across page reloads
      localStorage.setItem('location_tracking_active', 'true');
      localStorage.setItem('location_tracking_session', newSessionId);

      console.log('🚀 Starting location tracking with session:', newSessionId);
      
      // Notify service worker to start background tracking
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Get auth token from localStorage
        const token = localStorage.getItem('token');
        if (token) {
          navigator.serviceWorker.controller.postMessage({
            type: 'STORE_AUTH_TOKEN',
            token: token
          });
        }
        
        navigator.serviceWorker.controller.postMessage({
          type: 'START_LOCATION_TRACKING',
          sessionId: newSessionId,
          isActive: true
        });
        console.log('📡 Notified service worker to start background tracking');
      }

      // Cleanup any duplicate sessions first
      try {
        const cleanupResponse = await locationTrackingAPI.cleanupDuplicates();
        console.log('🧹 Cleanup result:', cleanupResponse.data);
      } catch (error) {
        console.log('Cleanup failed (non-critical):', error.message);
      }

      // Request wake lock to keep device awake
      await requestWakeLock();

      // Start watching position (continuous background tracking)
      const options = {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      };

      watchId.current = navigator.geolocation.watchPosition(
        handleLocationSuccess,
        handleLocationError,
        options
      );

      // Primary update interval - every 30 seconds
      // Use setInterval with a more aggressive approach for web view
      // In web view, intervals may be throttled, so we use a shorter interval
      updateInterval.current = setInterval(() => {
        console.log('⏰ Interval update trigger');
        navigator.geolocation.getCurrentPosition(
          (position) => sendLocationToServer(position, false),
          handleLocationError,
          options
        );
      }, 30000); // 30 seconds
      
      // Additional aggressive interval for web view (every 15 seconds as backup)
      // This helps when the main interval gets throttled
      if (!updateIntervalBackup.current) {
        updateIntervalBackup.current = setInterval(() => {
          // Only trigger if last update was more than 35 seconds ago
          const timeSinceLastUpdate = Date.now() - lastUpdateTime.current;
          if (timeSinceLastUpdate > 35000) {
            console.log('⏰ Backup interval trigger (web view)');
            navigator.geolocation.getCurrentPosition(
              (position) => sendLocationToServer(position, false),
              handleLocationError,
              options
            );
          }
        }, 15000); // 15 seconds backup
      }

      // Heartbeat interval - keeps connection alive and prevents browser throttling
      // This runs more frequently to signal that tracking is still active
      heartbeatInterval.current = setInterval(() => {
        const timeSinceLastUpdate = Date.now() - lastUpdateTime.current;
        console.log(`💓 Heartbeat - Last update: ${Math.round(timeSinceLastUpdate / 1000)}s ago`);
        
        // If no update in last 2 minutes, force an update
        if (timeSinceLastUpdate > 120000) {
          console.log('⚠️ No update in 2 minutes, forcing location update...');
          navigator.geolocation.getCurrentPosition(
            (position) => sendLocationToServer(position, false),
            handleLocationError,
            options
          );
        }
      }, 60000); // Check every 1 minute

      // Request notification permission for persistent notification
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      
      // Show persistent notification to keep app active
      await showPersistentNotification();
      
      // No toast on start - avoids disturbing employees with popups
      console.log('✅ All tracking mechanisms started:');
      console.log('  - watchPosition (continuous)');
      console.log('  - 30s update interval');
      console.log('  - 60s heartbeat monitor');
      console.log('  - Wake lock requested');
      console.log('  - Persistent notification active');
    } catch (error) {
      console.error('❌ Failed to start tracking:', error);
      toast.error('Failed to start location tracking', { autoClose: 4000 });
      setError(error.message);
    }
  }, [handleLocationSuccess, sendLocationToServer]);

  // Stop tracking
  const stopTracking = useCallback(async () => {
    try {
      console.log('🛑 Stopping all tracking mechanisms...');
      
      // Clear watch and intervals
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
        console.log('  ✓ watchPosition stopped');
      }

      if (updateInterval.current) {
        clearInterval(updateInterval.current);
        updateInterval.current = null;
        console.log('  ✓ Update interval cleared');
      }

      if (updateIntervalBackup.current) {
        clearInterval(updateIntervalBackup.current);
        updateIntervalBackup.current = null;
        console.log('  ✓ Backup update interval cleared');
      }

      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
        console.log('  ✓ Heartbeat monitor stopped');
      }

      // Release wake lock
      await releaseWakeLock();

      // Notify server
      if (sessionId) {
        await locationTrackingAPI.stopTracking({ sessionId });
        console.log('  ✓ Server notified');
      }

      setIsTracking(false);
      setSessionId(null);
      lastLocation.current = null;

      // Clear localStorage
      localStorage.removeItem('location_tracking_active');
      localStorage.removeItem('location_tracking_session');

      // Notify service worker to stop background tracking
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'STOP_LOCATION_TRACKING'
        });
        console.log('📡 Notified service worker to stop background tracking');
      }
      
      // Close persistent notification
      if ('Notification' in window && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const notifications = await registration.getNotifications({ tag: 'location-tracking' });
          notifications.forEach(notification => notification.close());
        } catch (error) {
          console.log('Could not close notification:', error);
        }
      }

      // No toast on stop - avoids disturbing employees
      console.log('✅ All tracking stopped successfully');
    } catch (error) {
      console.error('❌ Failed to stop tracking:', error);
      toast.error('Failed to stop tracking properly', { autoClose: 4000 });
    }
  }, [sessionId]);

  // Auto-start tracking when shouldTrack becomes true (only if shouldTrack is explicitly provided)
  useEffect(() => {
    // Only auto-manage tracking if shouldTrack is explicitly set (not using default false)
    if (shouldTrack === true && !isTracking) {
      startTracking();
    }
    // Don't auto-stop if shouldTrack is just the default false - let manual control work
  }, [shouldTrack, isTracking, startTracking]);

  // Show persistent notification to keep app active in background
  const showPersistentNotification = async () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('Location Tracking Active', {
          body: 'Your location is being tracked. Keep this notification visible for continuous tracking.',
          icon: '/logo.png',
          badge: '/logo.png',
          tag: 'location-tracking',
          requireInteraction: false,
          silent: true,
          persistent: true,
          data: {
            url: '/'
          }
        });
        console.log('✅ Persistent notification shown to keep tracking active');
      } catch (error) {
        console.log('Could not show notification:', error);
      }
    }
  };

  // Handle page visibility changes (background/foreground)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        console.log('📱 Page hidden - ensuring tracking continues in background');
        
        // Show persistent notification to keep app active
        if (isTracking) {
          await showPersistentNotification();
        }
        
        // Ensure intervals are still running - restart if needed
        if (isTracking) {
          const options = {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 0,
          };
          
          // Restart update interval if it was cleared
          if (!updateInterval.current) {
            console.log('⚠️ Update interval missing, restarting...');
            updateInterval.current = setInterval(() => {
              console.log('⏰ Background interval update trigger');
              navigator.geolocation.getCurrentPosition(
                (position) => sendLocationToServer(position, false),
                handleLocationError,
                options
              );
            }, 30000);
          }
          
          // Restart backup interval if it was cleared
          if (!updateIntervalBackup.current) {
            updateIntervalBackup.current = setInterval(() => {
              const timeSinceLastUpdate = Date.now() - lastUpdateTime.current;
              if (timeSinceLastUpdate > 35000) {
                console.log('⏰ Background backup interval trigger');
                navigator.geolocation.getCurrentPosition(
                  (position) => sendLocationToServer(position, false),
                  handleLocationError,
                  options
                );
              }
            }, 15000);
          }
          
          // Restart heartbeat if it was cleared
          if (!heartbeatInterval.current) {
            heartbeatInterval.current = setInterval(() => {
              const timeSinceLastUpdate = Date.now() - lastUpdateTime.current;
              console.log(`💓 Background heartbeat - Last update: ${Math.round(timeSinceLastUpdate / 1000)}s ago`);
              
              if (timeSinceLastUpdate > 120000) {
                console.log('⚠️ No update in 2 minutes, forcing location update...');
                navigator.geolocation.getCurrentPosition(
                  (position) => sendLocationToServer(position, false),
                  handleLocationError,
                  options
                );
              }
            }, 60000);
          }
          
          // Ensure watchPosition is still active
          if (watchId.current === null) {
            console.log('⚠️ watchPosition missing, restarting...');
            watchId.current = navigator.geolocation.watchPosition(
              handleLocationSuccess,
              handleLocationError,
              options
            );
          }
        }
      } else {
        console.log('📱 Page visible - re-acquiring wake lock and ensuring tracking is active');
        
        // Close persistent notification
        if ('Notification' in window && 'serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.ready;
            const notifications = await registration.getNotifications({ tag: 'location-tracking' });
            notifications.forEach(notification => notification.close());
          } catch (error) {
            console.log('Could not close notification:', error);
          }
        }
        
        // Re-acquire wake lock when page becomes visible again
        if (isTracking && !wakeLock.current) {
          await requestWakeLock();
        }
        
        // Force an immediate location update when page becomes visible
        if (isTracking) {
          navigator.geolocation.getCurrentPosition(
            (position) => sendLocationToServer(position, false),
            handleLocationError,
            {
              enableHighAccuracy: true,
              timeout: 30000,
              maximumAge: 0,
            }
          );
        }
      }
    };

    // Handle page focus/blur events as backup
    const handleFocus = async () => {
      if (isTracking) {
        console.log('📱 Page focused - ensuring tracking is active');
        navigator.geolocation.getCurrentPosition(
          (position) => sendLocationToServer(position, false),
          handleLocationError,
          {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 0,
          }
        );
      }
    };

    // Handle page freeze/resume (when browser suspends/resumes the page)
    const handleFreeze = () => {
      console.log('❄️ Page frozen - tracking may pause');
    };
    
    const handleResume = () => {
      console.log('▶️ Page resumed - resuming tracking');
      if (isTracking) {
        // Restart tracking mechanisms
        const options = {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
        };
        
        if (!updateInterval.current) {
          updateInterval.current = setInterval(() => {
            navigator.geolocation.getCurrentPosition(
              (position) => sendLocationToServer(position, false),
              handleLocationError,
              options
            );
          }, 30000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('freeze', handleFreeze);
    document.addEventListener('resume', handleResume);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('freeze', handleFreeze);
      document.removeEventListener('resume', handleResume);
    };
  }, [isTracking, sendLocationToServer, handleLocationSuccess, handleLocationError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      if (wakeLock.current) {
        wakeLock.current.release().catch(() => {});
      }
    };
  }, []);

  // Check tracking status on mount and restore from localStorage if needed
  // Also check if employee is checked in and auto-resume tracking
  useEffect(() => {
    const checkTrackingStatus = async () => {
      try {
        // Check localStorage for active tracking
        const wasTracking = localStorage.getItem('location_tracking_active') === 'true';
        const savedSessionId = localStorage.getItem('location_tracking_session');

        if (wasTracking && savedSessionId) {
          console.log('📍 Found active tracking session in localStorage, checking backend...');
          
          // Verify with backend
          const response = await locationTrackingAPI.getMyStatus();
          if (response.data.isTracking) {
            console.log('✅ Backend confirms active tracking, resuming...');
            // Resume the tracking with saved session
            setSessionId(savedSessionId);
            setIsTracking(true);
            // Restart tracking immediately
            await startTracking();
          } else {
            console.log('⚠️ Backend shows no active tracking, checking if should resume...');
            // Check if employee is checked in (has check-in but no check-out today)
            // If checked in, resume tracking
            try {
              // Import API to check attendance
              const { default: API } = await import('../api');
              const today = new Date();
              const month = today.getMonth() + 1;
              const year = today.getFullYear();
              
              const attendanceRes = await API.employees.myAttendance.get({ month, year });
              const records = attendanceRes.data.data || [];
              const todayRecord = records.find(r => {
                const rDate = new Date(r.date);
                return rDate.toDateString() === today.toDateString();
              });
              
              // If checked in but not checked out, resume tracking
              if (todayRecord?.checkInTime && !todayRecord?.checkOutTime) {
                console.log('✅ Employee is checked in, resuming location tracking...');
                setSessionId(savedSessionId || generateSessionId());
                setIsTracking(true);
                await startTracking();
                return;
              }
            } catch (attError) {
              console.log('Could not check attendance:', attError);
            }
            
            // If not checked in, clear localStorage
            localStorage.removeItem('location_tracking_active');
            localStorage.removeItem('location_tracking_session');
          }
        } else {
          // No saved tracking, but check if employee is checked in
          try {
            const { default: API } = await import('../api');
            const today = new Date();
            const month = today.getMonth() + 1;
            const year = today.getFullYear();
            
            const attendanceRes = await API.employees.myAttendance.get({ month, year });
            const records = attendanceRes.data.data || [];
            const todayRecord = records.find(r => {
              const rDate = new Date(r.date);
              return rDate.toDateString() === today.toDateString();
            });
            
            // If checked in but not checked out, start tracking
            if (todayRecord?.checkInTime && !todayRecord?.checkOutTime) {
              console.log('✅ Employee is checked in but tracking not active, starting tracking...');
              const newSessionId = generateSessionId();
              setSessionId(newSessionId);
              setIsTracking(true);
              await startTracking();
            }
          } catch (attError) {
            console.log('Could not check attendance:', attError);
          }
        }
      } catch (error) {
        console.log('Could not check tracking status:', error);
        // If there's an error, don't clear localStorage - might be network issue
      }
    };

    checkTrackingStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isTracking,
    currentLocation,
    locationHistory,
    error,
    sessionId,
    startTracking,
    stopTracking,
  };
};

export default useLocationTracking;
