# GPS Tracking System Implementation Guide

## Overview
This document describes the complete GPS tracking system implementation similar to TrackOlap, including backend enhancements, frontend improvements, and mobile app integration.

## Features Implemented

### 1. Backend Enhancements

#### Location Tracking Controller (`controllers/locationTrackingController.js`)
- **Haversine Distance Calculation**: Added `calculateDistance()` helper function to calculate distance between GPS points
- **Timeline Building**: Added `buildTimeline()` function that:
  - Detects travel vs stops automatically
  - Uses 30-meter threshold for stop detection
  - Requires 60+ seconds duration for a stop
  - Groups timeline events: check-in → travel → stop → travel → check-out
  - Calculates total distance, travel time, and number of stops

#### API Endpoints
- `GET /api/location-tracking/history/:employeeId?date=YYYY-MM-DD` - Returns timeline data with events
- `POST /api/location-tracking/start` - Start tracking session (mobile)
- `POST /api/location-tracking/update` - Update location (mobile)
- `POST /api/location-tracking/stop` - Stop tracking (mobile)
- `GET /api/location-tracking/active` - Get active employees (admin)

### 2. Frontend Enhancements

#### Live Tracking Page (`frontend/src/pages/LiveTracking.jsx`)

**Timeline Sidebar:**
- Left sidebar with timeline showing:
  - 🚀 Check-in time and location
  - 🚗 Travel segments with distance (e.g., "Travelled 2.96 Km")
  - ⏸️ Stop/Stoppage points with duration
  - 🏁 Check-out time and location
- Visual timeline with colored dots and connecting lines
- Chronologically sorted events

**Map Visualization:**
- Blue polyline route connecting all GPS points
- 🚀 Green marker (check-in icon) for check-in location
- 🏁 Red marker (check-out icon) for check-out location
- 🟠 Orange markers for stop points
- 🔵 Pulsing blue marker for current/last location
- Auto-fit map bounds to show full route
- Popup on marker click showing time/address

**Stats Cards:**
- Total distance traveled (Km)
- Total travel time (formatted as HH:MM:SS)
- Number of stops

**Employee & Date Selection:**
- Searchable employee dropdown
- Date picker for historical data
- Auto-refresh toggle (every 30 seconds)
- "Last updated X seconds ago" indicator

### 3. Mobile App Integration

#### Background Location Service (`frontend/src/services/BackgroundLocationService.js`)
- Uses `react-native-background-geolocation` for background GPS tracking
- Tracks GPS even when app is closed/background
- Sends location updates every 50-100 meters
- Shows foreground notification on Android
- Handles battery optimization
- Stores failed updates locally and syncs later
- Queue management for offline scenarios

**Key Features:**
- Automatic location updates
- Offline queue management
- Background tracking support
- Battery-optimized settings
- Persistent notification during tracking

#### Employee Tracking Screen (`frontend/src/screens/EmployeeTrackingScreen.jsx`)
- Check In/Out buttons
- Automatically starts GPS tracking on check-in
- Stops tracking on check-out
- Shows current tracking status
- Displays today's attendance
- Shows queued locations count

## Installation & Setup

### Backend
No additional packages required. The backend enhancements use existing dependencies.

### Frontend (Web)
No additional packages required. Uses existing React-Leaflet for maps.

### Mobile App (React Native)

#### 1. Install Required Packages
```bash
npm install react-native-background-geolocation
npm install @react-native-community/geolocation
npm install @react-native-async-storage/async-storage
```

#### 2. Android Configuration

Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

#### 3. iOS Configuration

Add to `ios/YourApp/Info.plist`:
```xml
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>We need your location to track your work activities</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>We need your location to track your work activities</string>
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
</array>
```

#### 4. Initialize Service

In your `App.js` or main entry point:
```javascript
import BackgroundLocationService from './src/services/BackgroundLocationService';

// Initialize on app start
BackgroundLocationService.initialize().catch(console.error);
```

## Usage

### For Employees (Mobile App)
1. Open the Employee Tracking screen
2. Tap "Check In" to start tracking
3. GPS tracking starts automatically
4. Tracking continues even when app is closed
5. Tap "Check Out" to stop tracking

### For Admins (Web Dashboard)
1. Navigate to "Live Tracking" page
2. Select an employee from dropdown
3. Select a date to view historical data
4. View timeline in left sidebar
5. View route on map with markers
6. Check stats cards for summary
7. Enable auto-refresh for real-time updates

## Timeline Algorithm

The timeline building algorithm works as follows:

1. **Sort locations chronologically**
2. **First location = Check-in event**
3. **Process consecutive locations:**
   - Calculate distance between points
   - If distance < 30m and time > 60s → Mark as "stop"
   - If distance > 30m → Mark as "travel" segment
4. **Group consecutive stops/travels together**
5. **Calculate total distance per travel segment**
6. **Last location = Check-out event**

## Stop Detection Logic

- **Threshold**: 30 meters
- **Minimum Duration**: 60 seconds
- **Detection**: If location changes < 30 meters for > 1 minute = stop

## Distance Calculation

Uses Haversine formula to calculate great-circle distance between two GPS points:
- Returns distance in meters
- Converts to kilometers for display
- Accounts for Earth's curvature

## Data Structure

### Timeline Event Types
```javascript
{
  type: 'check-in' | 'check-out' | 'travel' | 'stop',
  timestamp: Date,
  latitude: Number,
  longitude: Number,
  address: String,
  // For travel events:
  distance: Number, // km
  startTime: Date,
  endTime: Date,
  duration: Number, // seconds
  startLocation: { latitude, longitude, address },
  endLocation: { latitude, longitude, address },
  // For stop events:
  duration: Number, // seconds
  startTime: Date,
  endTime: Date
}
```

## API Response Format

### Get Location History
```json
{
  "success": true,
  "count": 150,
  "data": [
    {
      "sessionId": "session_1234567890",
      "employee": { ... },
      "startTime": "2025-12-02T09:00:00Z",
      "endTime": "2025-12-02T17:00:00Z",
      "isActive": false,
      "locations": [ ... ],
      "timeline": [
        {
          "type": "check-in",
          "timestamp": "2025-12-02T09:00:00Z",
          "latitude": 12.9716,
          "longitude": 77.5946,
          "address": "Bangalore, India"
        },
        {
          "type": "travel",
          "distance": "2.96",
          "startTime": "2025-12-02T09:05:00Z",
          "endTime": "2025-12-02T09:15:00Z",
          "duration": 600
        },
        {
          "type": "stop",
          "timestamp": "2025-12-02T09:20:00Z",
          "latitude": 12.9750,
          "longitude": 77.6000,
          "address": "Client Site",
          "duration": 1800
        },
        {
          "type": "check-out",
          "timestamp": "2025-12-02T17:00:00Z",
          "latitude": 12.9716,
          "longitude": 77.5946,
          "address": "Office"
        }
      ],
      "totalDistance": "45.32",
      "totalTravelTime": 7200,
      "numberOfStops": 5
    }
  ]
}
```

## Styling

The implementation uses Tailwind CSS with a blue color scheme:
- Primary: `#2196F3` / `#1976D2`
- Success (Check-in): `#10b981`
- Danger (Check-out): `#ef4444`
- Warning (Stops): `#f59e0b`
- Info (Travel): `#3b82f6`

## Performance Considerations

- Timeline building is done server-side to reduce client load
- Auto-refresh interval set to 30 seconds (configurable)
- Map markers use custom icons for better performance
- Location queue syncs every 30 seconds in background
- Failed location updates are queued and synced when online

## Error Handling

- Graceful degradation if location services unavailable
- Queue management for offline scenarios
- User-friendly error messages
- Loading states for all async operations
- Toast notifications for errors

## Future Enhancements

Potential improvements:
- Export route data to CSV/PDF
- Geofencing for automatic check-in/out
- Route optimization suggestions
- Speed limit alerts
- Battery usage optimization
- Offline map caching
- Route replay with animation

## Troubleshooting

### Mobile App Issues

**GPS not tracking:**
- Check location permissions in device settings
- Ensure "Always Allow" permission is granted
- Check battery optimization settings
- Verify background location is enabled

**Locations not syncing:**
- Check internet connection
- Verify API endpoint is accessible
- Check queued locations count
- Review console logs for errors

### Web Dashboard Issues

**Timeline not showing:**
- Verify employee has tracking data for selected date
- Check browser console for API errors
- Ensure date format is correct (YYYY-MM-DD)

**Map not loading:**
- Check internet connection (requires OpenStreetMap)
- Verify Leaflet library is loaded
- Check browser console for errors

## Support

For issues or questions, please refer to:
- Backend logs: Check server console
- Frontend logs: Check browser console
- Mobile logs: Check React Native debugger


