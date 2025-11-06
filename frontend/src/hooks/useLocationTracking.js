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
  const sendLocationUpdate = useCallback(async (position, isFirst = false, currentSessionId = null) => {
    const { latitude, longitude, accuracy, speed, heading } = position.coords;
    
    // Use provided sessionId or generate new one
    const activeSessionId = currentSessionId || sessionId || generateSessionId();
    
    console.log('📡 Sending location update:', { 
      isFirst, 
      latitude, 
      longitude, 
      accuracy,
      sessionId: activeSessionId
    });
    
    const batteryLevel = await getBatteryLevel();
    
    const locationData = {
      sessionId: activeSessionId,
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
        console.log('🚀 Starting new tracking session...');
        console.log('📤 Sending to /api/location-tracking/start:', locationData);
        const response = await API.locationTracking.startTracking(locationData);
        console.log('✅ Tracking started successfully:', response.data);
        toast.success('Location tracking started', { duration: 2000 });
      } else {
        console.log('📍 Updating existing session...');
        console.log('📤 Sending to /api/location-tracking/update:', locationData);
        await API.locationTracking.updateLocation(locationData);
        console.log('✅ Location updated successfully:', { latitude, longitude, accuracy });
      }
    } catch (error) {
      console.error('❌ Failed to send location:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      console.error('Error message:', error.message);
      setError(error.message);
      
      // Show detailed error to user
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
      toast.error(`Tracking error: ${errorMsg}`, { duration: 5000 });
    }
  }, [sessionId]);
  
  // Start tracking
  const startTracking = useCallback(() => {
    console.log('🎯 startTracking() called');
    
    if (!('geolocation' in navigator)) {
      const errorMsg = 'Geolocation is not supported by your browser';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('❌ Geolocation not supported');
      return;
    }
    
    // Generate new session ID
    const newSessionId = generateSessionId();
    console.log('🆔 Generated session ID:', newSessionId);
    setSessionId(newSessionId);
    setIsTracking(true);
    setError(null);
    
    console.log('📍 Requesting initial GPS position...');
    
    // Get initial location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Initial GPS position acquired:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        sendLocationUpdate(position, true, newSessionId);
      },
      (error) => {
        console.error('❌ Geolocation error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
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
    
    // Set interval to send location updates every 30 seconds (more frequent)
    intervalIdRef.current = setInterval(() => {
      console.log('⏰ Interval timer fired - sending location update');
      if (lastLocationRef.current) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            sendLocationUpdate(position, false, newSessionId);
          },
          (error) => {
            console.error('❌ Interval location update error:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } else {
        console.warn('⚠️ No lastLocationRef available');
      }
    }, 30000); // 30 seconds for more accurate tracking
    
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

