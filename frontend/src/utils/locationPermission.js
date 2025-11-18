/**
 * Request location permission from the user
 * @returns {Promise<{granted: boolean, reason?: string}>} Object with granted status and optional reason
 */
export const requestLocationPermission = async () => {
  if (!('geolocation' in navigator)) {
    console.warn('Geolocation is not supported by this browser');
    return { granted: false, reason: 'not_supported' };
  }

  try {
    // Check current permission status
    if ('permissions' in navigator) {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'granted') {
        console.log('✅ Location permission already granted');
        // Still verify location services are enabled
        return await verifyLocationServices();
      }
      
      if (permission.state === 'denied') {
        console.warn('❌ Location permission denied');
        return { granted: false, reason: 'permission_denied' };
      }
    }

    // Request permission by attempting to get current position
    // This will trigger the browser's permission prompt
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          console.log('✅ Location permission granted');
          resolve({ granted: true });
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            console.warn('❌ Location permission denied by user');
            resolve({ granted: false, reason: 'permission_denied' });
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            console.warn('❌ Location unavailable - location services may be disabled');
            resolve({ granted: false, reason: 'location_disabled' });
          } else if (error.code === error.TIMEOUT) {
            console.warn('⚠️ Location request timed out');
            // Timeout doesn't necessarily mean permission is denied
            resolve({ granted: true, reason: 'timeout' });
          } else {
            console.log('⚠️ Could not get location:', error);
            resolve({ granted: false, reason: 'unknown' });
          }
        },
        {
          timeout: 10000, // Increased timeout to 10 seconds
          maximumAge: 0,
          enableHighAccuracy: true
        }
      );
    });
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return { granted: false, reason: 'error' };
  }
};

/**
 * Verify that location services are enabled on the device
 * @returns {Promise<{granted: boolean, reason?: string}>}
 */
export const verifyLocationServices = async () => {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => {
        console.log('✅ Location services are enabled');
        resolve({ granted: true });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve({ granted: false, reason: 'permission_denied' });
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          resolve({ granted: false, reason: 'location_disabled' });
        } else {
          resolve({ granted: false, reason: 'unknown' });
        }
      },
      {
        timeout: 10000,
        maximumAge: 0,
        enableHighAccuracy: true
      }
    );
  });
};

/**
 * Check if location permission is granted
 * @returns {Promise<'granted' | 'denied' | 'prompt' | 'unsupported'>}
 */
export const checkLocationPermission = async () => {
  if (!('geolocation' in navigator)) {
    return 'unsupported';
  }

  try {
    if ('permissions' in navigator) {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state;
    }
    // If permissions API is not available, return 'prompt' (unknown state)
    return 'prompt';
  } catch (error) {
    console.error('Error checking location permission:', error);
    return 'prompt';
  }
};

