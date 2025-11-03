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
  
  // Create initial location record
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
    isActive: true,
    trackingDate: new Date()
  });
  
  console.log('✅ Location updated:', locationRecord._id);
  
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
  
  res.json({
    success: true,
    message: 'Tracking stopped successfully',
    data: { updatedCount: result.modifiedCount }
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
  
  // Get the latest location for each active session
  const activeLocations = await LocationTracking.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: '$sessionId',
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
    // Group locations by sessionId
    const sessions = {};
    
    locations.forEach(loc => {
      if (!sessions[loc.sessionId]) {
        sessions[loc.sessionId] = {
          sessionId: loc.sessionId,
          employee: loc.employee,
          startTime: loc.createdAt,
          endTime: loc.createdAt,
          isActive: loc.isActive,
          locations: []
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
        timestamp: loc.createdAt
      });
      
      // Update end time
      if (loc.createdAt > sessions[loc.sessionId].endTime) {
        sessions[loc.sessionId].endTime = loc.createdAt;
      }
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

