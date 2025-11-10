import { useState, useEffect, useRef, useCallback } from 'react';
import { locationTrackingAPI } from '../api';
import { toast } from 'react-toastify';

/**
 * Custom hook for automatic location tracking
 * Tracks employee location in real-time and works in background
 */
const useLocationTracking = (shouldTrack = false) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const watchId = useRef(null);
  const updateInterval = useRef(null);
  const lastLocation = useRef(null);

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
          const response = await locationTrackingAPI.updateLocation(locationData);
          console.log('✅ Location updated:', response.data);
        }

        // Update local state
        lastLocation.current = { latitude, longitude, timestamp: Date.now() };
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

  // Error callback for geolocation
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
    toast.error(errorMessage);
  };

  // Start tracking
  const startTracking = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    try {
      // Request permission and get initial location
      const permission = await navigator.permissions.query({ name: 'geolocation' });

      if (permission.state === 'denied') {
        toast.error('Location permission denied. Please enable it in browser settings.');
        return;
      }

      // Generate new session ID
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);
      setIsTracking(true);
      setError(null);
      setLocationHistory([]);
      lastLocation.current = null;

      // Store tracking state in localStorage to persist across page reloads
      localStorage.setItem('location_tracking_active', 'true');
      localStorage.setItem('location_tracking_session', newSessionId);

      console.log('🚀 Starting location tracking with session:', newSessionId);

      // Start watching position (background tracking)
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

      // Also update every 30 seconds even if position didn't change much
      // This ensures we have frequent updates for path tracking
      updateInterval.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => sendLocationToServer(position, false),
          handleLocationError,
          options
        );
      }, 30000); // 30 seconds

      toast.success('Location tracking started');
    } catch (error) {
      console.error('❌ Failed to start tracking:', error);
      toast.error('Failed to start location tracking');
      setError(error.message);
    }
  }, [handleLocationSuccess, sendLocationToServer]);

  // Stop tracking
  const stopTracking = useCallback(async () => {
    try {
      // Clear watch and interval
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }

      if (updateInterval.current) {
        clearInterval(updateInterval.current);
        updateInterval.current = null;
      }

      // Notify server
      if (sessionId) {
        await locationTrackingAPI.stopTracking({ sessionId });
        console.log('🛑 Tracking stopped');
      }

      setIsTracking(false);
      setSessionId(null);
      lastLocation.current = null;

      // Clear localStorage
      localStorage.removeItem('location_tracking_active');
      localStorage.removeItem('location_tracking_session');

      toast.info('Location tracking stopped');
    } catch (error) {
      console.error('❌ Failed to stop tracking:', error);
      toast.error('Failed to stop tracking properly');
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, []);

  // Check tracking status on mount and restore from localStorage if needed
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
            // Note: Geolocation watch will restart on next component interaction
            // or you could restart it here if needed
          } else {
            console.log('⚠️ Backend shows no active tracking, clearing localStorage');
            localStorage.removeItem('location_tracking_active');
            localStorage.removeItem('location_tracking_session');
          }
        }
      } catch (error) {
        console.log('Could not check tracking status:', error);
        // If there's an error, don't clear localStorage - might be network issue
      }
    };

    checkTrackingStatus();
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
