import LocationTracking from '../models/LocationTracking.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Start a new tracking session
// @route   POST /api/location-tracking/start
// @access  Private (Employee)
export const startTracking = asyncHandler(async (req, res) => {
  const { sessionId, latitude, longitude, accuracy, address } = req.body;
  
  console.log('🚀 START TRACKING REQUEST:', {
    userId: req.user._id,
    userName: req.user.name,
    sessionId,
    latitude,
    longitude,
    accuracy
  });
  
  // Find employee record
  const employee = await Employee.findOne({ userId: req.user._id });
  
  if (!employee) {
    console.error('❌ Employee record not found for user:', req.user._id);
    return res.status(404).json({ message: 'Employee record not found' });
  }
  
  console.log('✅ Employee found:', employee.employeeId, employee.name);
  
  // **PREVENT DUPLICATE SESSIONS**: Check for existing active session for this employee
  const existingActiveSessions = await LocationTracking.find({
    employee: employee._id,
    isActive: true
  });
  
  if (existingActiveSessions.length > 0) {
    console.log(`⚠️ Found ${existingActiveSessions.length} active sessions for employee, stopping all...`);
    console.log('Active sessions:', existingActiveSessions.map(s => s.sessionId));
    
    // Stop ALL existing sessions for this employee
    const result = await LocationTracking.updateMany(
      { 
        employee: employee._id,
        isActive: true
      },
      { 
        $set: { isActive: false }
      }
    );
    
    console.log(`✅ Stopped ${result.modifiedCount} old sessions`);
  }
  
  // Also check if this specific sessionId already exists
  const existingSessionId = await LocationTracking.findOne({
    sessionId: sessionId
  });
  
  if (existingSessionId) {
    console.log('⚠️ This sessionId already exists! This is a duplicate request.');
    // Return the existing session instead of creating duplicate
    return res.status(200).json({
      success: true,
      message: 'Tracking session already active',
      data: existingSessionId
    });
  }
  
  // Create initial location record with new session
  const locationRecord = await LocationTracking.create({
    employee: employee._id,
    user: req.user._id,
    sessionId,
    location: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    address,
    accuracy,
    isActive: true,
    trackingDate: new Date()
  });
  
  console.log('✅ Location record created:', locationRecord._id);
  
  res.status(201).json({
    success: true,
    message: 'Tracking started successfully',
    data: locationRecord
  });
});

// @desc    Update location during active tracking
// @route   POST /api/location-tracking/update
// @access  Private (Employee)
export const updateLocation = asyncHandler(async (req, res) => {
  const { sessionId, latitude, longitude, accuracy, address, speed, heading, batteryLevel } = req.body;
  
  console.log('📍 UPDATE LOCATION:', { sessionId, latitude, longitude });
  
  // Find employee record
  const employee = await Employee.findOne({ userId: req.user._id });
  
  if (!employee) {
    console.error('❌ Employee not found for location update');
    return res.status(404).json({ message: 'Employee record not found' });
  }
  
  // Check for stop detection (if location hasn't changed much)
  let isStopPoint = false;
  let stopDuration = null;
  
  // Get last location for this session
  const lastLocation = await LocationTracking.findOne({
    sessionId,
    employee: employee._id
  }).sort({ createdAt: -1 });
  
  if (lastLocation) {
    // Calculate distance between current and last location (Haversine formula)
    const R = 6371e3; // Earth radius in meters
    const φ1 = lastLocation.location.coordinates[1] * Math.PI / 180;
    const φ2 = latitude * Math.PI / 180;
    const Δφ = (latitude - lastLocation.location.coordinates[1]) * Math.PI / 180;
    const Δλ = (longitude - lastLocation.location.coordinates[0]) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in meters
    
    console.log(`📏 Distance from last location: ${distance.toFixed(1)}m`);
    
    // If distance < 50 meters, consider it a stop
    if (distance < 50) {
      isStopPoint = true;
      // Calculate stop duration
      const timeDiff = (new Date() - new Date(lastLocation.createdAt)) / 1000; // seconds
      stopDuration = Math.round(timeDiff);
      console.log(`⏸️ Stop detected! Duration: ${stopDuration}s`);
    }
  }
  
  // Create new location record
  const locationRecord = await LocationTracking.create({
    employee: employee._id,
    user: req.user._id,
    sessionId,
    location: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    address,
    accuracy,
    speed,
    heading,
    batteryLevel,
    isStopPoint,
    stopDuration,
    isActive: true,
    trackingDate: new Date()
  });
  
  // Mark previous locations as inactive (keep only latest as active)
  await LocationTracking.updateMany(
    {
      employee: employee._id,
      sessionId,
      isActive: true,
      _id: { $ne: locationRecord._id }
    },
    {
      $set: { isActive: false }
    }
  );
  
  console.log('✅ Location updated:', locationRecord._id, isStopPoint ? '⏸️ STOP' : '🚶 MOVING');
  
  res.status(201).json({
    success: true,
    message: 'Location updated successfully',
    data: locationRecord
  });
});

// @desc    Stop tracking session
// @route   POST /api/location-tracking/stop
// @access  Private (Employee)
export const stopTracking = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  
  // Find employee record
  const employee = await Employee.findOne({ userId: req.user._id });
  
  // Mark all locations for this session/employee as inactive
  const result = await LocationTracking.updateMany(
    { 
      $or: [
        { sessionId, user: req.user._id },
        { employee: employee?._id, isActive: true }
      ]
    },
    { isActive: false }
  );
  
  console.log(`✅ EMPLOYEE LOGGED OUT - Stopped ${result.modifiedCount} location records for session: ${sessionId}`);
  console.log(`📍 Employee ${req.user.name} is now INACTIVE on live tracking`);
  
  res.json({
    success: true,
    message: 'Tracking stopped successfully - removed from live tracking',
    data: { updatedCount: result.modifiedCount }
  });
});

// @desc    Cleanup duplicate sessions for an employee
// @route   POST /api/location-tracking/cleanup
// @access  Private
export const cleanupDuplicateSessions = asyncHandler(async (req, res) => {
  // Find employee record
  const employee = await Employee.findOne({ userId: req.user._id });
  
  if (!employee) {
    return res.status(404).json({ message: 'Employee record not found' });
  }
  
  // Find all active sessions for this employee
  const activeSessions = await LocationTracking.find({
    employee: employee._id,
    isActive: true
  }).distinct('sessionId');
  
  console.log(`🧹 Cleanup: Found ${activeSessions.length} active sessions for employee ${employee.name}`);
  
  if (activeSessions.length > 1) {
    // Keep only the latest session, mark others as inactive
    const latestSession = await LocationTracking.findOne({
      employee: employee._id,
      isActive: true
    }).sort({ createdAt: -1 });
    
    const result = await LocationTracking.updateMany(
      { 
        employee: employee._id,
        isActive: true,
        sessionId: { $ne: latestSession.sessionId }
      },
      { 
        $set: { isActive: false }
      }
    );
    
    console.log(`✅ Cleaned up ${result.modifiedCount} duplicate sessions`);
    
    return res.json({
      success: true,
      message: `Cleaned up ${result.modifiedCount} duplicate sessions`,
      data: {
        cleaned: result.modifiedCount,
        activeSession: latestSession.sessionId
      }
    });
  }
  
  res.json({
    success: true,
    message: 'No duplicate sessions found',
    data: {
      cleaned: 0,
      activeSession: activeSessions[0] || null
    }
  });
});

// @desc    Get all active employee locations (for live tracking)
// @route   GET /api/location-tracking/active
// @access  Private (Admin)
export const getActiveLocations = asyncHandler(async (req, res) => {
  console.log('🗺️  FETCHING ACTIVE LOCATIONS');
  
  // Only cleanup sessions for employees who have checked out
  // Sessions remain active until employee checks out
  // Check each active session's employee to see if they're checked in today
  const activeSessions = await LocationTracking.find({ isActive: true }).distinct('employee');
  
  if (activeSessions.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find employees who are checked in today (have checkInTime but no checkOutTime)
    // Use aggregation to properly query nested attendance array
    const checkedInEmployeesResult = await Employee.aggregate([
      {
        $match: {
          _id: { $in: activeSessions }
        }
      },
      {
        $unwind: {
          path: '$attendance',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $match: {
          'attendance.date': {
            $gte: today,
            $lt: tomorrow
          },
          'attendance.checkInTime': { $exists: true, $ne: null },
          $or: [
            { 'attendance.checkOutTime': { $exists: false } },
            { 'attendance.checkOutTime': null }
          ]
        }
      },
      {
        $group: {
          _id: '$_id'
        }
      }
    ]);
    
    const checkedInEmployees = checkedInEmployeesResult.map(emp => emp._id);
    
    // Only cleanup sessions for employees who are NOT checked in
    const employeesToCleanup = activeSessions.filter(empId => 
      !checkedInEmployees.some(checkedInId => checkedInId.toString() === empId.toString())
    );
    
    if (employeesToCleanup.length > 0) {
      // Also check for truly stale sessions (no updates in last 30 minutes AND not checked in)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const staleCleanup = await LocationTracking.updateMany(
        {
          isActive: true,
          employee: { $in: employeesToCleanup },
          createdAt: { $lt: thirtyMinutesAgo }
        },
        {
          $set: { isActive: false }
        }
      );
      
      if (staleCleanup.modifiedCount > 0) {
        console.log(`🧹 Auto-cleanup: Marked ${staleCleanup.modifiedCount} stale sessions (not checked in, >30min old) as inactive`);
      }
    }
  }
  
  // Check total active records
  const totalActive = await LocationTracking.countDocuments({ isActive: true });
  console.log('📊 Total active location records:', totalActive);
  
  // Get the latest location for each EMPLOYEE (not session) to avoid duplicates
  // This ensures we only show ONE marker per employee on the map
  const activeLocations = await LocationTracking.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: '$employee', // GROUP BY EMPLOYEE, not sessionId
        latestLocation: { $first: '$$ROOT' }
      }
    },
    {
      $replaceRoot: { newRoot: '$latestLocation' }
    },
    {
      $lookup: {
        from: 'employees',
        localField: 'employee',
        foreignField: '_id',
        as: 'employeeDetails'
      }
    },
    {
      $unwind: '$employeeDetails'
    },
    {
      $project: {
        _id: 1,
        sessionId: 1,
        location: 1,
        address: 1,
        accuracy: 1,
        speed: 1,
        heading: 1,
        batteryLevel: 1,
        createdAt: 1,
        'employeeDetails._id': 1,
        'employeeDetails.employeeId': 1,
        'employeeDetails.name': 1,
        'employeeDetails.phone': 1,
        'employeeDetails.role': 1,
        'employeeDetails.profilePicture': 1
      }
    }
  ]);
  
  console.log('✅ Active locations found:', activeLocations.length);
  if (activeLocations.length > 0) {
    console.log('📍 Sample location:', {
      sessionId: activeLocations[0].sessionId,
      employee: activeLocations[0].employeeDetails.name,
      coords: activeLocations[0].location.coordinates
    });
  }
  
  res.json({
    success: true,
    count: activeLocations.length,
    data: activeLocations
  });
});

// Helper function to calculate distance between two GPS points using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c; // Distance in meters
};

// Helper function to build timeline from location points
const buildTimeline = (locations) => {
  if (!locations || locations.length === 0) {
    return {
      timeline: [],
      totalDistance: 0,
      totalTravelTime: 0,
      numberOfStops: 0,
      checkIn: null,
      checkOut: null
    };
  }

  const timeline = [];
  let totalDistance = 0;
  let totalTravelTime = 0;
  let numberOfStops = 0;
  
  // Sort locations by timestamp
  const sortedLocations = [...locations].sort((a, b) => 
    new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt)
  );

  // Check-in event (first location)
  // Only add check-in if we have multiple locations (to avoid single-point check-ins)
  const checkIn = sortedLocations[0];
  if (sortedLocations.length > 1) {
    timeline.push({
      type: 'check-in',
      timestamp: checkIn.timestamp || checkIn.createdAt,
      latitude: checkIn.latitude || checkIn.location?.coordinates[1],
      longitude: checkIn.longitude || checkIn.location?.coordinates[0],
      address: checkIn.address || 'Unknown location',
      accuracy: checkIn.accuracy
    });
  }

  // Process locations to detect travel vs stops
  let currentStopStart = null;
  let currentTravelStart = null;
  let lastLocation = checkIn;
  const STOP_THRESHOLD_METERS = 30; // 30 meters
  const STOP_MIN_DURATION_SECONDS = 60; // 1 minute

  for (let i = 1; i < sortedLocations.length; i++) {
    const current = sortedLocations[i];
    const prev = sortedLocations[i - 1];
    
    const currentLat = current.latitude || current.location?.coordinates[1];
    const currentLon = current.longitude || current.location?.coordinates[0];
    const prevLat = prev.latitude || prev.location?.coordinates[1];
    const prevLon = prev.longitude || prev.location?.coordinates[0];
    
    const currentTime = new Date(current.timestamp || current.createdAt);
    const prevTime = new Date(prev.timestamp || prev.createdAt);
    const timeDiff = (currentTime - prevTime) / 1000; // seconds
    
    const distance = calculateDistance(prevLat, prevLon, currentLat, currentLon);
    
    if (distance < STOP_THRESHOLD_METERS) {
      // Potential stop - location hasn't moved much
      if (!currentStopStart) {
        // Start tracking a stop
        currentStopStart = prev;
        // If we were in travel, end it first
        if (currentTravelStart) {
          const travelDistance = calculateDistance(
            currentTravelStart.latitude || currentTravelStart.location?.coordinates[1],
            currentTravelStart.longitude || currentTravelStart.location?.coordinates[0],
            prevLat,
            prevLon
          );
          const travelTime = (prevTime - new Date(currentTravelStart.timestamp || currentTravelStart.createdAt)) / 1000;
          
          if (travelDistance > STOP_THRESHOLD_METERS) {
            timeline.push({
              type: 'travel',
              distance: (travelDistance / 1000).toFixed(2), // km
              startTime: currentTravelStart.timestamp || currentTravelStart.createdAt,
              endTime: prev.timestamp || prev.createdAt,
              duration: Math.round(travelTime),
              startLocation: {
                latitude: currentTravelStart.latitude || currentTravelStart.location?.coordinates[1],
                longitude: currentTravelStart.longitude || currentTravelStart.location?.coordinates[0],
                address: currentTravelStart.address
              },
              endLocation: {
                latitude: prevLat,
                longitude: prevLon,
                address: prev.address
              }
            });
            totalDistance += travelDistance;
            totalTravelTime += travelTime;
          }
          currentTravelStart = null;
        }
      }
      
      // Check if stop duration is long enough
      const stopDuration = (currentTime - new Date(currentStopStart.timestamp || currentStopStart.createdAt)) / 1000;
      if (stopDuration >= STOP_MIN_DURATION_SECONDS && i === sortedLocations.length - 1) {
        // Last location and it's a stop - add it
        numberOfStops++;
        timeline.push({
          type: 'stop',
          timestamp: current.timestamp || current.createdAt,
          latitude: currentLat,
          longitude: currentLon,
          address: current.address || currentStopStart.address || 'Unknown location',
          duration: Math.round(stopDuration),
          startTime: currentStopStart.timestamp || currentStopStart.createdAt,
          endTime: current.timestamp || current.createdAt
        });
        currentStopStart = null;
      }
    } else {
      // Movement detected - it's travel
      if (currentStopStart) {
        // End the stop first
        const stopDuration = (prevTime - new Date(currentStopStart.timestamp || currentStopStart.createdAt)) / 1000;
        if (stopDuration >= STOP_MIN_DURATION_SECONDS) {
          numberOfStops++;
          timeline.push({
            type: 'stop',
            timestamp: prev.timestamp || prev.createdAt,
            latitude: prevLat,
            longitude: prevLon,
            address: prev.address || currentStopStart.address || 'Unknown location',
            duration: Math.round(stopDuration),
            startTime: currentStopStart.timestamp || currentStopStart.createdAt,
            endTime: prev.timestamp || prev.createdAt
          });
        }
        currentStopStart = null;
      }
      
      // Start or continue travel
      if (!currentTravelStart) {
        currentTravelStart = prev;
      }
      
      // If this is the last location, finalize travel segment
      if (i === sortedLocations.length - 1) {
        const travelDistance = calculateDistance(
          currentTravelStart.latitude || currentTravelStart.location?.coordinates[1],
          currentTravelStart.longitude || currentTravelStart.location?.coordinates[0],
          currentLat,
          currentLon
        );
        const travelTime = (currentTime - new Date(currentTravelStart.timestamp || currentTravelStart.createdAt)) / 1000;
        
        if (travelDistance > STOP_THRESHOLD_METERS) {
          timeline.push({
            type: 'travel',
            distance: (travelDistance / 1000).toFixed(2), // km
            startTime: currentTravelStart.timestamp || currentTravelStart.createdAt,
            endTime: current.timestamp || current.createdAt,
            duration: Math.round(travelTime),
            startLocation: {
              latitude: currentTravelStart.latitude || currentTravelStart.location?.coordinates[1],
              longitude: currentTravelStart.longitude || currentTravelStart.location?.coordinates[0],
              address: currentTravelStart.address
            },
            endLocation: {
              latitude: currentLat,
              longitude: currentLon,
              address: current.address
            }
          });
          totalDistance += travelDistance;
          totalTravelTime += travelTime;
        }
      }
    }
    
    lastLocation = current;
  }

  // Check-out event (last location)
  // Only add check-out if it's different from check-in (avoid duplicate if only one location)
  const checkOut = sortedLocations[sortedLocations.length - 1];
  if (sortedLocations.length > 1) {
    const checkInTime = new Date(checkIn.timestamp || checkIn.createdAt);
    const checkOutTime = new Date(checkOut.timestamp || checkOut.createdAt);
    const timeDiff = (checkOutTime - checkInTime) / 1000; // seconds
    
    // Only add check-out if it's at least 30 seconds after check-in
    if (timeDiff >= 30) {
      timeline.push({
        type: 'check-out',
        timestamp: checkOut.timestamp || checkOut.createdAt,
        latitude: checkOut.latitude || checkOut.location?.coordinates[1],
        longitude: checkOut.longitude || checkOut.location?.coordinates[0],
        address: checkOut.address || 'Unknown location',
        accuracy: checkOut.accuracy
      });
    }
  }

  return {
    timeline,
    totalDistance: (totalDistance / 1000).toFixed(2), // km
    totalTravelTime: Math.round(totalTravelTime), // seconds
    numberOfStops,
    checkIn: {
      timestamp: checkIn.timestamp || checkIn.createdAt,
      latitude: checkIn.latitude || checkIn.location?.coordinates[1],
      longitude: checkIn.longitude || checkIn.location?.coordinates[0],
      address: checkIn.address || 'Unknown location'
    },
    checkOut: sortedLocations.length > 1 ? {
      timestamp: checkOut.timestamp || checkOut.createdAt,
      latitude: checkOut.latitude || checkOut.location?.coordinates[1],
      longitude: checkOut.longitude || checkOut.location?.coordinates[0],
      address: checkOut.address || 'Unknown location'
    } : null
  };
};

// @desc    Get location history for a specific employee and date
// @route   GET /api/location-tracking/history/:employeeId
// @access  Private (Admin)
export const getLocationHistory = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { date, sessionId } = req.query;
  
  // Build query
  const query = { employee: employeeId };
  
  if (sessionId) {
    query.sessionId = sessionId;
  }
  
  if (date) {
    // Get locations for specific date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    query.trackingDate = {
      $gte: startOfDay,
      $lte: endOfDay
    };
  }
  
  // Get location history
  const locations = await LocationTracking.find(query)
    .populate('employee', 'employeeId name phone role')
    .sort({ createdAt: 1 });
  
  // Group by session if no specific session requested
  let groupedData = locations;
  
  if (!sessionId && locations.length > 0) {
    // Group locations by sessionId with analytics
    const sessions = {};
    
    locations.forEach(loc => {
      if (!sessions[loc.sessionId]) {
        sessions[loc.sessionId] = {
          sessionId: loc.sessionId,
          employee: loc.employee,
          startTime: loc.createdAt,
          endTime: loc.createdAt,
          isActive: loc.isActive,
          locations: [],
          stopPoints: 0,
          majorStops: []
        };
      }
      
      sessions[loc.sessionId].locations.push({
        _id: loc._id,
        latitude: loc.location.coordinates[1],
        longitude: loc.location.coordinates[0],
        address: loc.address,
        accuracy: loc.accuracy,
        speed: loc.speed,
        heading: loc.heading,
        batteryLevel: loc.batteryLevel,
        isStopPoint: loc.isStopPoint,
        stopDuration: loc.stopDuration,
        timestamp: loc.createdAt
      });
      
      // Count stop points
      if (loc.isStopPoint) {
        sessions[loc.sessionId].stopPoints++;
        // Track major stops (> 5 minutes)
        if (loc.stopDuration > 300) {
          sessions[loc.sessionId].majorStops.push({
            address: loc.address,
            duration: Math.round(loc.stopDuration / 60),
            timestamp: loc.createdAt,
            coordinates: [loc.location.coordinates[1], loc.location.coordinates[0]]
          });
        }
      }
      
      // Update end time
      if (loc.createdAt > sessions[loc.sessionId].endTime) {
        sessions[loc.sessionId].endTime = loc.createdAt;
      }
    });
    
    // Sort sessions by start time
    const sortedSessions = Object.values(sessions).sort((a, b) => 
      new Date(a.startTime) - new Date(b.startTime)
    );
    
    // Combine all locations from all sessions into one timeline
    // This ensures only one check-in and one check-out for the entire day
    let allLocations = [];
    sortedSessions.forEach(session => {
      allLocations = [...allLocations, ...session.locations];
    });
    
    // Build unified timeline from all locations
    const unifiedTimelineData = buildTimeline(allLocations);
    
    // Filter timeline to remove duplicate check-ins/check-outs that are too close together
    const filteredTimeline = [];
    let lastCheckInTime = null;
    let lastCheckOutTime = null;
    const MIN_TIME_BETWEEN_EVENTS = 60; // 60 seconds minimum between check-in/check-out events
    
    unifiedTimelineData.timeline.forEach(event => {
      if (event.type === 'check-in') {
        if (!lastCheckInTime) {
          // First check-in - always add
          filteredTimeline.push(event);
          lastCheckInTime = new Date(event.timestamp);
        } else {
          // Only add if it's been at least MIN_TIME_BETWEEN_EVENTS seconds since last check-in
          const timeSinceLastCheckIn = (new Date(event.timestamp) - lastCheckInTime) / 1000;
          if (timeSinceLastCheckIn >= MIN_TIME_BETWEEN_EVENTS) {
            // Remove previous check-in and add this one (keep the latest)
            filteredTimeline.pop(); // Remove last check-in
            filteredTimeline.push(event);
            lastCheckInTime = new Date(event.timestamp);
          }
          // Otherwise, ignore this duplicate check-in
        }
      } else if (event.type === 'check-out') {
        if (!lastCheckOutTime) {
          // First check-out - always add
          filteredTimeline.push(event);
          lastCheckOutTime = new Date(event.timestamp);
        } else {
          // Only add if it's been at least MIN_TIME_BETWEEN_EVENTS seconds since last check-out
          const timeSinceLastCheckOut = (new Date(event.timestamp) - lastCheckOutTime) / 1000;
          if (timeSinceLastCheckOut >= MIN_TIME_BETWEEN_EVENTS) {
            // Remove previous check-out and add this one (keep the latest)
            const lastCheckOutIndex = filteredTimeline.findIndex(e => e.type === 'check-out');
            if (lastCheckOutIndex !== -1) {
              filteredTimeline.splice(lastCheckOutIndex, 1);
            }
            filteredTimeline.push(event);
            lastCheckOutTime = new Date(event.timestamp);
          }
          // Otherwise, ignore this duplicate check-out
        }
      } else {
        // Travel and stop events - add normally
        filteredTimeline.push(event);
      }
    });
    
    // Calculate totals across all sessions
    let totalDistance = 0;
    let totalTravelTime = 0;
    let totalStops = 0;
    
    sortedSessions.forEach(session => {
      const timelineData = buildTimeline(session.locations);
      totalDistance += parseFloat(timelineData.totalDistance || 0);
      totalTravelTime += parseInt(timelineData.totalTravelTime || 0);
      totalStops += parseInt(timelineData.numberOfStops || 0);
      
      // Keep individual session data for reference
      session.timeline = timelineData.timeline;
      session.totalDistance = timelineData.totalDistance;
      session.totalTravelTime = timelineData.totalTravelTime;
      session.numberOfStops = timelineData.numberOfStops;
      session.checkIn = timelineData.checkIn;
      session.checkOut = timelineData.checkOut;
      
      // Legacy fields for backward compatibility
      session.duration = Math.round((new Date(session.endTime) - new Date(session.startTime)) / 1000 / 60); // minutes
      session.avgSpeed = session.duration > 0 ? ((parseFloat(session.totalDistance)) / (session.duration / 60)).toFixed(1) : '0'; // km/h
    });
    
    // Create a unified session object with combined timeline
    const unifiedSession = {
      sessionId: 'unified',
      employee: sortedSessions[0]?.employee,
      startTime: sortedSessions[0]?.startTime,
      endTime: sortedSessions[sortedSessions.length - 1]?.endTime,
      isActive: sortedSessions.some(s => s.isActive),
      locations: allLocations,
      timeline: filteredTimeline, // Filtered timeline with only one check-in and one check-out
      totalDistance: unifiedTimelineData.totalDistance,
      totalTravelTime: unifiedTimelineData.totalTravelTime,
      numberOfStops: unifiedTimelineData.numberOfStops,
      checkIn: unifiedTimelineData.checkIn,
      checkOut: unifiedTimelineData.checkOut,
      sessions: sortedSessions, // Keep individual sessions for reference
      sessionCount: sortedSessions.length
    };
    
    // Return unified session instead of array of sessions
    groupedData = unifiedSession;
  } else if (sessionId && locations.length > 0) {
    // Single session - build timeline
    const sessionLocations = locations.map(loc => ({
      _id: loc._id,
      latitude: loc.location.coordinates[1],
      longitude: loc.location.coordinates[0],
      address: loc.address,
      accuracy: loc.accuracy,
      speed: loc.speed,
      heading: loc.heading,
      batteryLevel: loc.batteryLevel,
      isStopPoint: loc.isStopPoint,
      stopDuration: loc.stopDuration,
      timestamp: loc.createdAt
    }));
    
    const timelineData = buildTimeline(sessionLocations);
    
    groupedData = {
      sessionId: locations[0].sessionId,
      employee: locations[0].employee,
      startTime: locations[0].createdAt,
      endTime: locations[locations.length - 1].createdAt,
      isActive: locations[locations.length - 1].isActive,
      locations: sessionLocations,
      timeline: timelineData.timeline,
      totalDistance: timelineData.totalDistance,
      totalTravelTime: timelineData.totalTravelTime,
      numberOfStops: timelineData.numberOfStops,
      checkIn: timelineData.checkIn,
      checkOut: timelineData.checkOut
    };
  }
  
  res.json({
    success: true,
    count: locations.length,
    data: groupedData
  });
});

// @desc    Get my current tracking status
// @route   GET /api/location-tracking/my-status
// @access  Private (Employee)
export const getMyTrackingStatus = asyncHandler(async (req, res) => {
  // Find active sessions for current user
  const activeSessions = await LocationTracking.aggregate([
    {
      $match: {
        user: req.user._id,
        isActive: true
      }
    },
    {
      $group: {
        _id: '$sessionId',
        startTime: { $min: '$createdAt' },
        latestUpdate: { $max: '$createdAt' },
        locationCount: { $sum: 1 }
      }
    }
  ]);
  
  res.json({
    success: true,
    isTracking: activeSessions.length > 0,
    data: activeSessions[0] || null
  });
});

// @desc    Get tracking statistics for admin dashboard
// @route   GET /api/location-tracking/stats
// @access  Private (Admin)
export const getTrackingStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get stats for today
  const stats = await LocationTracking.aggregate([
    {
      $match: {
        trackingDate: { $gte: today }
      }
    },
    {
      $group: {
        _id: null,
        totalLocations: { $sum: 1 },
        activeEmployees: { $addToSet: '$employee' },
        activeSessions: { $addToSet: '$sessionId' }
      }
    },
    {
      $project: {
        totalLocations: 1,
        activeEmployeesCount: { $size: '$activeEmployees' },
        activeSessionsCount: { $size: '$activeSessions' }
      }
    }
  ]);
  
  // Get currently active employees
  const currentlyActive = await LocationTracking.distinct('employee', {
    isActive: true
  });
  
  res.json({
    success: true,
    data: {
      today: stats[0] || {
        totalLocations: 0,
        activeEmployeesCount: 0,
        activeSessionsCount: 0
      },
      currentlyActive: currentlyActive.length
    }
  });
});

// @desc    Admin cleanup all duplicate sessions globally
// @route   POST /api/location-tracking/admin-cleanup
// @access  Private (Admin)
export const adminCleanupDuplicates = asyncHandler(async (req, res) => {
  console.log('🧹 Admin global cleanup starting...');
  
  // Get all employees with active sessions
  const employeesWithActive = await LocationTracking.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: '$employee',
        sessionCount: { $sum: 1 },
        sessions: { $push: { sessionId: '$sessionId', createdAt: '$createdAt' } }
      }
    },
    {
      $match: { sessionCount: { $gt: 1 } } // Only employees with multiple active sessions
    }
  ]);
  
  console.log(`Found ${employeesWithActive.length} employees with duplicate active sessions`);
  
  let totalCleaned = 0;
  
  for (const emp of employeesWithActive) {
    // Sort sessions by createdAt descending to find latest
    const sortedSessions = emp.sessions.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    const latestSessionId = sortedSessions[0].sessionId;
    const oldSessionIds = sortedSessions.slice(1).map(s => s.sessionId);
    
    console.log(`Employee ${emp._id}: Keeping ${latestSessionId}, removing ${oldSessionIds.length} old sessions`);
    
    // Mark old sessions as inactive
    const result = await LocationTracking.updateMany(
      {
        employee: emp._id,
        sessionId: { $in: oldSessionIds },
        isActive: true
      },
      {
        $set: { isActive: false }
      }
    );
    
    totalCleaned += result.modifiedCount;
  }
  
  console.log(`✅ Global cleanup complete: ${totalCleaned} duplicate sessions cleaned`);
  
  res.json({
    success: true,
    message: `Cleaned up ${totalCleaned} duplicate sessions from ${employeesWithActive.length} employees`,
    data: {
      employeesAffected: employeesWithActive.length,
      sessionsCleaned: totalCleaned
    }
  });
});

// @desc    Get detailed session analytics (distance, stops, etc.)
// @route   GET /api/location-tracking/session-analytics/:sessionId
// @access  Private (Admin)
export const getSessionAnalytics = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  // Get all locations for this session
  const locations = await LocationTracking.find({ sessionId })
    .sort({ createdAt: 1 })
    .populate('employee', 'employeeId name role');
  
  if (locations.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'No locations found for this session'
    });
  }
  
  // Calculate total distance using Haversine formula
  let totalDistance = 0;
  for (let i = 1; i < locations.length; i++) {
    const prev = locations[i - 1];
    const curr = locations[i];
    
    const R = 6371e3; // Earth radius in meters
    const φ1 = prev.location.coordinates[1] * Math.PI / 180;
    const φ2 = curr.location.coordinates[1] * Math.PI / 180;
    const Δφ = (curr.location.coordinates[1] - prev.location.coordinates[1]) * Math.PI / 180;
    const Δλ = (curr.location.coordinates[0] - prev.location.coordinates[0]) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    totalDistance += R * c;
  }
  
  // Find major stops (> 5 minutes at same location)
  const majorStops = locations.filter(loc => loc.isStopPoint && loc.stopDuration > 300); // 5 minutes
  
  // Calculate duration
  const startTime = new Date(locations[0].createdAt);
  const endTime = new Date(locations[locations.length - 1].createdAt);
  const duration = Math.round((endTime - startTime) / 1000 / 60); // minutes
  
  // Calculate average speed
  const avgSpeed = duration > 0 ? (totalDistance / 1000) / (duration / 60) : 0; // km/h
  
  res.json({
    success: true,
    data: {
      sessionId,
      employee: locations[0].employee,
      startTime,
      endTime,
      duration, // minutes
      totalDistance: (totalDistance / 1000).toFixed(2), // km
      avgSpeed: avgSpeed.toFixed(1), // km/h
      totalPoints: locations.length,
      stopPoints: locations.filter(loc => loc.isStopPoint).length,
      majorStops: majorStops.map(stop => ({
        address: stop.address,
        duration: Math.round(stop.stopDuration / 60), // minutes
        timestamp: stop.createdAt,
        coordinates: stop.location.coordinates
      }))
    }
  });
});

