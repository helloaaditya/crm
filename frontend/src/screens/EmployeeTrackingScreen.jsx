/**
 * Employee Tracking Screen for React Native Mobile App
 * 
 * This screen allows employees to check in/out and automatically start/stop GPS tracking
 * 
 * Usage:
 * - Import this component in your React Native navigation
 * - Ensure BackgroundLocationService is initialized in App.js
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import BackgroundLocationService from '../services/BackgroundLocationService';
import { toast } from 'react-toastify';

const EmployeeTrackingScreen = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState({
    isTracking: false,
    sessionId: null,
    queuedLocations: 0
  });
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    loadTrackingStatus();
    loadTodayAttendance();
    
    // Refresh status every 10 seconds
    const interval = setInterval(() => {
      loadTrackingStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadTrackingStatus = async () => {
    try {
      const status = await BackgroundLocationService.getTrackingStatus();
      setTrackingStatus(status);
    } catch (error) {
      console.error('Error loading tracking status:', error);
    }
  };

  const loadTodayAttendance = async () => {
    try {
      // Get employee ID from user
      const employeeResponse = await API.employees.getMyProfile();
      const employee = employeeResponse.data.data;
      
      if (employee) {
        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();
        
        const attendanceResponse = await API.employees.getAttendance(employee._id, { month, year });
        const attendanceRecords = attendanceResponse.data.data || [];
        
        const todayRecord = attendanceRecords.find(a => {
          const attDate = new Date(a.date);
          return attDate.toDateString() === today.toDateString();
        });
        
        setTodayAttendance(todayRecord || null);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      
      // Get current location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude, accuracy } = position.coords;

      // Reverse geocode to get address
      let address = 'Location not available';
      try {
        const geocodeResponse = await API.employees.geocode({
          latitude,
          longitude
        });
        address = geocodeResponse.data.data?.address || address;
      } catch (error) {
        console.error('Geocoding error:', error);
      }

      // Generate session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Start tracking session
      await API.locationTracking.startTracking({
        sessionId,
        latitude,
        longitude,
        accuracy,
        address
      });

      // Start background location tracking
      await BackgroundLocationService.startTracking(sessionId);

      // Mark attendance check-in
      const employeeResponse = await API.employees.getMyProfile();
      const employee = employeeResponse.data.data;
      
      if (employee) {
        await API.employees.markAttendance(employee._id, {
          date: new Date().toISOString().split('T')[0],
          checkInTime: new Date().toISOString(),
          checkInLocation: {
            latitude,
            longitude,
            address
          }
        });
      }

      await loadTrackingStatus();
      await loadTodayAttendance();
      
      Alert.alert('Success', 'Check-in successful! GPS tracking started.');
    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to check in. Please try again.');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setCheckingOut(true);
      
      // Get current location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude, accuracy } = position.coords;

      // Reverse geocode to get address
      let address = 'Location not available';
      try {
        const geocodeResponse = await API.employees.geocode({
          latitude,
          longitude
        });
        address = geocodeResponse.data.data?.address || address;
      } catch (error) {
        console.error('Geocoding error:', error);
      }

      // Stop background location tracking
      await BackgroundLocationService.stopTracking();

      // Stop tracking session
      if (trackingStatus.sessionId) {
        await API.locationTracking.stopTracking({
          sessionId: trackingStatus.sessionId
        });
      }

      // Mark attendance check-out
      const employeeResponse = await API.employees.getMyProfile();
      const employee = employeeResponse.data.data;
      
      if (employee && todayAttendance) {
        await API.employees.updateAttendance(employee._id, todayAttendance._id, {
          checkOutTime: new Date().toISOString(),
          checkOutLocation: {
            latitude,
            longitude,
            address
          }
        });
      }

      await loadTrackingStatus();
      await loadTodayAttendance();
      
      Alert.alert('Success', 'Check-out successful! GPS tracking stopped.');
    } catch (error) {
      console.error('Check-out error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to check out. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '--';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const isCheckedIn = todayAttendance?.checkInTime && !todayAttendance?.checkOutTime;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Employee Tracking</Text>
        <Text style={styles.subtitle}>Check in/out and track your location</Text>
      </View>

      {/* Tracking Status Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tracking Status</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusIndicator, { backgroundColor: trackingStatus.isTracking ? '#10b981' : '#ef4444' }]} />
          <Text style={styles.statusText}>
            {trackingStatus.isTracking ? 'Active' : 'Inactive'}
          </Text>
        </View>
        {trackingStatus.sessionId && (
          <Text style={styles.sessionId}>Session: {trackingStatus.sessionId.substring(0, 20)}...</Text>
        )}
        {trackingStatus.queuedLocations > 0 && (
          <Text style={styles.queuedText}>
            {trackingStatus.queuedLocations} locations queued for sync
          </Text>
        )}
      </View>

      {/* Today's Attendance Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Attendance</Text>
        <View style={styles.attendanceRow}>
          <View style={styles.attendanceItem}>
            <Text style={styles.attendanceLabel}>Check-In</Text>
            <Text style={styles.attendanceValue}>
              {formatTime(todayAttendance?.checkInTime)}
            </Text>
            {todayAttendance?.checkInLocation?.address && (
              <Text style={styles.attendanceAddress} numberOfLines={2}>
                {todayAttendance.checkInLocation.address}
              </Text>
            )}
          </View>
          <View style={styles.attendanceItem}>
            <Text style={styles.attendanceLabel}>Check-Out</Text>
            <Text style={styles.attendanceValue}>
              {formatTime(todayAttendance?.checkOutTime)}
            </Text>
            {todayAttendance?.checkOutLocation?.address && (
              <Text style={styles.attendanceAddress} numberOfLines={2}>
                {todayAttendance.checkOutLocation.address}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {!isCheckedIn ? (
          <TouchableOpacity
            style={[styles.button, styles.checkInButton]}
            onPress={handleCheckIn}
            disabled={checkingIn || loading}
          >
            {checkingIn ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonIcon}>🚀</Text>
                <Text style={styles.buttonText}>Check In</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.checkOutButton]}
            onPress={handleCheckOut}
            disabled={checkingOut || loading}
          >
            {checkingOut ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonIcon}>🏁</Text>
                <Text style={styles.buttonText}>Check Out</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Info Section */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ How it works</Text>
        <Text style={styles.infoText}>
          • Check in to start GPS tracking{'\n'}
          • Your location is tracked automatically{'\n'}
          • Tracking continues even when app is closed{'\n'}
          • Check out to stop tracking{'\n'}
          • All data is synced to the server
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 16
  },
  header: {
    marginBottom: 24,
    paddingTop: 16
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937'
  },
  sessionId: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4
  },
  queuedText: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 4
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  attendanceItem: {
    flex: 1
  },
  attendanceLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4
  },
  attendanceValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4
  },
  attendanceAddress: {
    fontSize: 11,
    color: '#9ca3af'
  },
  actions: {
    marginBottom: 16
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12
  },
  checkInButton: {
    backgroundColor: '#10b981'
  },
  checkOutButton: {
    backgroundColor: '#ef4444'
  },
  buttonIcon: {
    fontSize: 24,
    marginRight: 8
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  },
  infoCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8
  },
  infoText: {
    fontSize: 14,
    color: '#1e3a8a',
    lineHeight: 22
  }
});

export default EmployeeTrackingScreen;


