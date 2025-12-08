/**
 * Background Location Service for React Native
 * 
 * This service handles GPS tracking in the background using react-native-background-geolocation
 * 
 * Installation:
 * npm install react-native-background-geolocation
 * npm install @react-native-community/geolocation
 * npm install @react-native-async-storage/async-storage
 * 
 * For Android, add to AndroidManifest.xml:
 * <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
 * <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
 * <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
 * <uses-permission android:name="android.permission.WAKE_LOCK" />
 * <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
 * 
 * For iOS, add to Info.plist:
 * <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
 * <string>We need your location to track your work activities</string>
 * <key>NSLocationAlwaysUsageDescription</key>
 * <string>We need your location to track your work activities</string>
 * <key>UIBackgroundModes</key>
 * <array>
 *   <string>location</string>
 * </array>
 */

import BackgroundGeolocation from 'react-native-background-geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import API from '../api';

const STORAGE_KEY = '@location_queue';
const API_BASE_URL = process.env.API_URL || 'https://prod.sanjanawaterproofing.com';

class BackgroundLocationService {
  constructor() {
    this.isTracking = false;
    this.sessionId = null;
    this.locationQueue = [];
    this.syncInterval = null;
  }

  /**
   * Initialize the background location service
   */
  async initialize() {
    try {
      await BackgroundGeolocation.ready({
        // Geolocation Config
        desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
        distanceFilter: 50, // Send update every 50 meters
        stopTimeout: 5, // Stop tracking after 5 minutes of no movement
        stopOnTerminate: false, // Continue tracking when app is terminated
        startOnBoot: true, // Start tracking when device boots
        enableHeadless: true, // Enable headless mode for Android

        // Activity Recognition
        activityRecognitionInterval: 10000,
        minimumActivityRecognitionInterval: 10000,
        stopDetectionDelay: 1,
        activityType: BackgroundGeolocation.ACTIVITY_TYPE_OTHER_NAVIGATION,

        // Application config
        debug: false, // Set to true for development
        logLevel: BackgroundGeolocation.LOG_LEVEL_VERBOSE,
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true,

        // Android specific
        notification: {
          title: 'Location Tracking Active',
          text: 'Your location is being tracked for work activities',
          channelName: 'Location Tracking',
          priority: BackgroundGeolocation.NOTIFICATION_PRIORITY_LOW,
          smallIcon: 'drawable/ic_notification',
          largeIcon: 'drawable/ic_notification'
        },

        // iOS specific
        pausesLocationUpdatesAutomatically: false,
        backgroundPermissionRationale: {
          title: "Allow {applicationName} to access this device's location even when closed or not in use?",
          message: "This app collects location data to enable work activity tracking even when the app is closed or not in use.",
          positiveAction: 'Change to "Always Allow"',
          negativeAction: 'Cancel'
        }
      });

      // Load queued locations
      await this.loadLocationQueue();

      // Start syncing queued locations
      this.startSyncInterval();

      // Listen for location updates
      BackgroundGeolocation.onLocation(this.onLocation.bind(this));
      BackgroundGeolocation.onMotionChange(this.onMotionChange.bind(this));
      BackgroundGeolocation.onProviderChange(this.onProviderChange.bind(this));
      BackgroundGeolocation.onActivityChange(this.onActivityChange.bind(this));
      BackgroundGeolocation.onHeartbeat(this.onHeartbeat.bind(this));

      console.log('✅ Background Location Service initialized');
    } catch (error) {
      console.error('❌ Error initializing background location service:', error);
      throw error;
    }
  }

  /**
   * Start tracking location
   */
  async startTracking(sessionId) {
    try {
      if (this.isTracking) {
        console.log('⚠️ Tracking already active');
        return;
      }

      this.sessionId = sessionId;
      this.isTracking = true;

      // Start background geolocation
      await BackgroundGeolocation.start();

      // Save session ID
      await AsyncStorage.setItem('@tracking_session_id', sessionId);

      console.log('✅ Location tracking started:', sessionId);
      return true;
    } catch (error) {
      console.error('❌ Error starting location tracking:', error);
      this.isTracking = false;
      throw error;
    }
  }

  /**
   * Stop tracking location
   */
  async stopTracking() {
    try {
      if (!this.isTracking) {
        console.log('⚠️ Tracking not active');
        return;
      }

      await BackgroundGeolocation.stop();
      this.isTracking = false;
      this.sessionId = null;

      // Clear session ID
      await AsyncStorage.removeItem('@tracking_session_id');

      // Sync any remaining queued locations
      await this.syncLocationQueue();

      console.log('✅ Location tracking stopped');
      return true;
    } catch (error) {
      console.error('❌ Error stopping location tracking:', error);
      throw error;
    }
  }

  /**
   * Handle location updates
   */
  async onLocation(location) {
    try {
      const locationData = {
        sessionId: this.sessionId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        speed: location.coords.speed,
        heading: location.coords.heading,
        batteryLevel: location.battery?.level || null,
        timestamp: new Date(location.timestamp).toISOString(),
        address: location.address || null
      };

      // Try to send immediately
      const sent = await this.sendLocationUpdate(locationData);

      if (!sent) {
        // If failed, queue for later sync
        await this.queueLocation(locationData);
      }
    } catch (error) {
      console.error('❌ Error handling location update:', error);
      // Queue location even if there's an error
      await this.queueLocation({
        sessionId: this.sessionId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: new Date(location.timestamp).toISOString()
      });
    }
  }

  /**
   * Send location update to API
   */
  async sendLocationUpdate(locationData) {
    try {
      const response = await API.locationTracking.updateLocation(locationData);
      return response.success;
    } catch (error) {
      console.error('❌ Error sending location update:', error);
      return false;
    }
  }

  /**
   * Queue location for later sync
   */
  async queueLocation(locationData) {
    try {
      this.locationQueue.push(locationData);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.locationQueue));
      console.log('📍 Location queued:', this.locationQueue.length);
    } catch (error) {
      console.error('❌ Error queueing location:', error);
    }
  }

  /**
   * Load queued locations from storage
   */
  async loadLocationQueue() {
    try {
      const queueData = await AsyncStorage.getItem(STORAGE_KEY);
      if (queueData) {
        this.locationQueue = JSON.parse(queueData);
        console.log('📦 Loaded queued locations:', this.locationQueue.length);
      }
    } catch (error) {
      console.error('❌ Error loading location queue:', error);
      this.locationQueue = [];
    }
  }

  /**
   * Sync queued locations to API
   */
  async syncLocationQueue() {
    if (this.locationQueue.length === 0) return;

    try {
      const queueToSync = [...this.locationQueue];
      const successful = [];

      for (const location of queueToSync) {
        const sent = await this.sendLocationUpdate(location);
        if (sent) {
          successful.push(location);
        } else {
          // If still failing, keep in queue
          break;
        }
      }

      // Remove successfully synced locations
      if (successful.length > 0) {
        this.locationQueue = this.locationQueue.slice(successful.length);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.locationQueue));
        console.log(`✅ Synced ${successful.length} queued locations`);
      }
    } catch (error) {
      console.error('❌ Error syncing location queue:', error);
    }
  }

  /**
   * Start interval to sync queued locations
   */
  startSyncInterval() {
    // Sync every 30 seconds
    this.syncInterval = setInterval(() => {
      this.syncLocationQueue();
    }, 30000);
  }

  /**
   * Stop sync interval
   */
  stopSyncInterval() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Handle motion change events
   */
  onMotionChange(event) {
    console.log('📍 Motion change:', event.isMoving ? 'Moving' : 'Stationary');
  }

  /**
   * Handle provider change events
   */
  onProviderChange(event) {
    console.log('📍 Provider change:', event.status);
  }

  /**
   * Handle activity change events
   */
  onActivityChange(event) {
    console.log('📍 Activity change:', event.activity);
  }

  /**
   * Handle heartbeat events
   */
  onHeartbeat(event) {
    console.log('💓 Heartbeat:', event.location);
  }

  /**
   * Get current tracking status
   */
  async getTrackingStatus() {
    try {
      const state = await BackgroundGeolocation.getState();
      const sessionId = await AsyncStorage.getItem('@tracking_session_id');
      
      return {
        isTracking: state.enabled,
        sessionId: sessionId,
        queuedLocations: this.locationQueue.length
      };
    } catch (error) {
      console.error('❌ Error getting tracking status:', error);
      return {
        isTracking: false,
        sessionId: null,
        queuedLocations: 0
      };
    }
  }

  /**
   * Clear queued locations
   */
  async clearLocationQueue() {
    this.locationQueue = [];
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Location queue cleared');
  }
}

// Export singleton instance
export default new BackgroundLocationService();


