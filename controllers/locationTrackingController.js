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
  
  // Mark all locations for this session as inactive
  const result = await LocationTracking.updateMany(
    { sessionId, user: req.user._id },
    { isActive: false }
  );
  
  console.log(`✅ Stopped ${result.modifiedCount} location records for session: ${sessionId}`);
  
  res.json({
    success: true,
    message: 'Tracking stopped successfully',
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
  
  // First, check total active records
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
    
    // Calculate distance for each session
    Object.values(sessions).forEach(session => {
      let totalDistance = 0;
      for (let i = 1; i < session.locations.length; i++) {
        const prev = session.locations[i - 1];
        const curr = session.locations[i];
        
        const R = 6371e3;
        const φ1 = prev.latitude * Math.PI / 180;
        const φ2 = curr.latitude * Math.PI / 180;
        const Δφ = (curr.latitude - prev.latitude) * Math.PI / 180;
        const Δλ = (curr.longitude - prev.longitude) * Math.PI / 180;
        
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        totalDistance += R * c;
      }
      
      session.totalDistance = (totalDistance / 1000).toFixed(2); // km
      session.duration = Math.round((new Date(session.endTime) - new Date(session.startTime)) / 1000 / 60); // minutes
      session.avgSpeed = session.duration > 0 ? ((totalDistance / 1000) / (session.duration / 60)).toFixed(1) : '0'; // km/h
    });
    
    groupedData = Object.values(sessions);
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

