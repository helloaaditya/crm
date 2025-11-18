/**
 * Request location permission from the user
 * @returns {Promise<boolean>} True if permission is granted, false otherwise
 */
export const requestLocationPermission = async () => {
  if (!('geolocation' in navigator)) {
    console.warn('Geolocation is not supported by this browser');
    return false;
  }

  try {
    // Check current permission status
    if ('permissions' in navigator) {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'granted') {
        console.log('✅ Location permission already granted');
        return true;
      }
      
      if (permission.state === 'denied') {
        console.warn('❌ Location permission denied');
        return false;
      }
    }

    // Request permission by attempting to get current position
    // This will trigger the browser's permission prompt
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          console.log('✅ Location permission granted');
          resolve(true);
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            console.warn('❌ Location permission denied by user');
            resolve(false);
          } else {
            // Other errors (timeout, position unavailable) don't mean permission is denied
            // Permission might still be granted, just couldn't get position right now
            console.log('⚠️ Could not get location, but permission may be granted');
            resolve(true); // Assume permission is granted if not explicitly denied
          }
        },
        {
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
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

