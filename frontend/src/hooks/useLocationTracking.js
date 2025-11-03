import { useState, useEffect, useRef, useCallback } from 'react';
import API from '../api';
import { toast } from 'react-toastify';

const useLocationTracking = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  
  const watchIdRef = useRef(null);
  const intervalIdRef = useRef(null);
  const lastLocationRef = useRef(null);
  
  // Generate unique session ID
  const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
  
  // Send location to backend
  const sendLocationUpdate = useCallback(async (position, isFirst = false) => {
    const { latitude, longitude, accuracy, speed, heading } = position.coords;
    
    const batteryLevel = await getBatteryLevel();
    
    const locationData = {
      sessionId: sessionId || generateSessionId(),
      latitude,
      longitude,
      accuracy,
      speed: speed || null,
      heading: heading || null,
      batteryLevel,
      address: '' // Can be filled by reverse geocoding if needed
    };
    
    lastLocationRef.current = locationData;
    setCurrentLocation(locationData);
    
    try {
      if (isFirst) {
        const response = await API.locationTracking.startTracking(locationData);
        console.log('✅ Tracking started:', response.data);
        toast.success('Location tracking started');
      } else {
        await API.locationTracking.updateLocation(locationData);
        console.log('📍 Location updated:', { latitude, longitude, accuracy });
      }
    } catch (error) {
      console.error('Failed to send location:', error);
      setError(error.message);
    }
  }, [sessionId]);
  
  // Start tracking
  const startTracking = useCallback(() => {
    if (!('geolocation' in navigator)) {
      const errorMsg = 'Geolocation is not supported by your browser';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    
    // Generate new session ID
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    setIsTracking(true);
    setError(null);
    
    // Get initial location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('🎯 Initial location acquired');
        sendLocationUpdate(position, true);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError(error.message);
        toast.error(`Location error: ${error.message}`);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
    
    // Start watching position for continuous updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        // Update location state but don't send to server on every watch update
        const { latitude, longitude, accuracy } = position.coords;
        setCurrentLocation(prev => ({
          ...prev,
          latitude,
          longitude,
          accuracy
        }));
      },
      (error) => {
        console.error('Watch position error:', error);
        setError(error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
      }
    );
    
    // Set interval to send location updates every 45 seconds
    intervalIdRef.current = setInterval(() => {
      if (lastLocationRef.current) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            sendLocationUpdate(position, false);
          },
          (error) => {
            console.error('Interval location update error:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      }
    }, 45000); // 45 seconds
    
    console.log('🚀 Location tracking started with session:', newSessionId);
  }, [sendLocationUpdate]);
  
  // Stop tracking
  const stopTracking = useCallback(async () => {
    // Clear watch and interval
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    
    // Send stop signal to backend
    if (sessionId) {
      try {
        await API.locationTracking.stopTracking({ sessionId });
        console.log('🛑 Tracking stopped for session:', sessionId);
        toast.success('Location tracking stopped');
      } catch (error) {
        console.error('Failed to stop tracking:', error);
      }
    }
    
    setIsTracking(false);
    setSessionId(null);
    setCurrentLocation(null);
    lastLocationRef.current = null;
  }, [sessionId]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, []);
  
  return {
    isTracking,
    currentLocation,
    error,
    sessionId,
    startTracking,
    stopTracking
  };
};

export default useLocationTracking;

