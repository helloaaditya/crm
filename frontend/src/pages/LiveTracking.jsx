import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  FiRefreshCw, FiUser, FiMapPin, FiClock, FiCalendar, 
  FiChevronDown, FiTruck, FiCheckCircle
} from 'react-icons/fi';
import API from '../api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for active employees (green)
const activeEmployeeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icon for stop points (orange)
const stopPointIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -28],
  shadowSize: [33, 33]
});

// Custom icon for check-in (green with rocket emoji)
const checkInIcon = new L.DivIcon({
  className: 'custom-checkin-icon',
  html: '<div style="background-color: #10b981; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-size: 18px;">🚀</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

// Custom icon for check-out (red with flag emoji)
const checkOutIcon = new L.DivIcon({
  className: 'custom-checkout-icon',
  html: '<div style="background-color: #ef4444; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-size: 18px;">🏁</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

// Custom icon for current location (pulsing blue)
const currentLocationIcon = new L.DivIcon({
  className: 'custom-current-icon',
  html: '<div style="background-color: #3b82f6; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3); animation: pulse 2s infinite;"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Component to auto-fit map bounds
function MapBounds({ locations, route }) {
  const map = useMap();
  
  useEffect(() => {
    const allPoints = [];
    
    if (route && route.length > 0) {
      route.forEach(loc => {
        allPoints.push([loc.latitude, loc.longitude]);
      });
    } else if (locations && locations.length > 0) {
      locations.forEach(loc => {
        if (loc.location && loc.location.coordinates) {
          allPoints.push([loc.location.coordinates[1], loc.location.coordinates[0]]);
        }
      });
    }
    
    if (allPoints.length > 0) {
      if (allPoints.length === 1) {
        map.setView(allPoints[0], 13);
      } else {
        map.fitBounds(allPoints, { padding: [50, 50] });
      }
    }
  }, [locations, route, map]);
  
  return null;
}

const LiveTracking = () => {
  const { user } = useAuth();
  const [activeLocations, setActiveLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [historicalRoute, setHistoricalRoute] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const employeeDropdownRef = useRef(null);
  const intervalRef = useRef(null);
  const [activityLog, setActivityLog] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [todayStats, setTodayStats] = useState({
    distance: 0,
    travelTime: 0,
    numberOfStops: 0
  });
  const [timeline, setTimeline] = useState([]);
  const [sessionData, setSessionData] = useState(null);

  // Fetch active locations
  const fetchActiveLocations = async () => {
    try {
      const response = await API.locationTracking.getActiveLocations();
      const locations = response.data.data || [];
      setActiveLocations(locations);
      setLastUpdateTime(new Date());
    } catch (error) {
      console.error('Failed to fetch active locations:', error);
    }
  };

  // Fetch all employees
  const fetchEmployees = async () => {
    try {
      const response = await API.employees.getAll({ 
        limit: 10000,
        fields: '_id employeeId name role' 
      });
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      toast.error('Failed to load employees');
    }
  };

  // Fetch today's attendance for selected employee
  const fetchTodayAttendance = async (employeeId) => {
    try {
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();
      
      const response = await API.employees.getAttendance(employeeId, { month, year });
      const attendanceRecords = response.data.data || [];
      
      const todayRecord = attendanceRecords.find(a => {
        const attDate = new Date(a.date);
        const todayStr = today.toDateString();
        const attDateStr = attDate.toDateString();
        return attDateStr === todayStr;
      });
      
      setTodayAttendance(todayRecord || null);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      setTodayAttendance(null);
    }
  };

  // Fetch historical route for selected employee and date
  const fetchHistoricalRoute = async (employeeId, date) => {
    try {
      setLoading(true);
      const response = await API.locationTracking.getHistory(employeeId, { date });
      const sessions = response.data.data || [];
      
      let allLocations = [];
      let combinedTimeline = [];
      let totalDistance = 0;
      let totalTravelTime = 0;
      let totalStops = 0;
      
      // Fetch today's attendance
      await fetchTodayAttendance(employeeId);
      
      // Process sessions - backend now returns unified session object
      if (sessions && sessions.timeline) {
        // Unified session object (handles multiple sessions for the day)
        if (sessions.locations) {
          allLocations = sessions.locations;
        }
        combinedTimeline = sessions.timeline || [];
        totalDistance = parseFloat(sessions.totalDistance || 0);
        totalTravelTime = parseInt(sessions.totalTravelTime || 0);
        totalStops = parseInt(sessions.numberOfStops || 0);
        setSessionData(sessions);
      } else if (Array.isArray(sessions) && sessions.length > 0) {
        // Fallback: if backend still returns array (backward compatibility)
        sessions.forEach(session => {
          if (session.locations && Array.isArray(session.locations)) {
            allLocations = [...allLocations, ...session.locations];
          }
          
          // Use timeline from backend if available
          if (session.timeline && Array.isArray(session.timeline)) {
            // Filter out duplicate check-ins/check-outs - only keep first check-in and last check-out
            session.timeline.forEach(event => {
              if (event.type === 'check-in') {
                // Only add if we don't already have a check-in
                if (!combinedTimeline.some(e => e.type === 'check-in')) {
                  combinedTimeline.push(event);
                }
              } else if (event.type === 'check-out') {
                // Remove any existing check-out and add this one (will be the last one)
                combinedTimeline = combinedTimeline.filter(e => e.type !== 'check-out');
                combinedTimeline.push(event);
              } else {
                // Add travel and stop events normally
                combinedTimeline.push(event);
              }
            });
            totalDistance += parseFloat(session.totalDistance || 0);
            totalTravelTime += parseInt(session.totalTravelTime || 0);
            totalStops += parseInt(session.numberOfStops || 0);
          }
          
          // Store first session data for map markers
          if (!sessionData) {
            setSessionData(session);
          }
        });
      }
      
      // Sort timeline by timestamp
      combinedTimeline.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.startTime || 0);
        const timeB = new Date(b.timestamp || b.startTime || 0);
        return timeA - timeB;
      });
      
      setHistoricalRoute(allLocations);
      setTimeline(combinedTimeline);
      setActivityLog(combinedTimeline); // For backward compatibility
      setTodayStats({
        distance: totalDistance.toFixed(2),
        travelTime: totalTravelTime,
        numberOfStops: totalStops
      });
      
      if (allLocations.length === 0) {
        toast.info(`No tracking data found for ${date}`);
      }
    } catch (error) {
      console.error('Failed to fetch historical route:', error);
      toast.error('Failed to load route history');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate distance between two points (returns km as number)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c / 1000); // Return in km as number
  };
  
  // Helper function to format distance for display
  const formatDistance = (distance) => {
    return parseFloat(distance).toFixed(2);
  };

  // Handle employee selection
  const handleEmployeeSelect = async (employeeId) => {
    setSelectedEmployeeId(employeeId);
    if (employeeId) {
      const emp = employees.find(e => e._id === employeeId);
      setSelectedEmployee(emp);
      
      // Fetch historical route for today
      await fetchHistoricalRoute(employeeId, selectedDate);
    } else {
      setSelectedEmployee(null);
      setHistoricalRoute([]);
      setActivityLog([]);
      setTodayAttendance(null);
    }
  };

  // Handle date change
  const handleDateChange = (date) => {
    setSelectedDate(date);
    if (selectedEmployeeId) {
      fetchHistoricalRoute(selectedEmployeeId, date);
    }
  };

  // Manual refresh
  const handleRefresh = () => {
    fetchActiveLocations();
    if (selectedEmployeeId) {
      fetchHistoricalRoute(selectedEmployeeId, selectedDate);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchActiveLocations();
    fetchEmployees();
  }, []);

  // Auto-select logged-in employee for self live tracking (non-admin users)
  useEffect(() => {
    const initSelfTracking = async () => {
      if (!user || selectedEmployeeId) return;

      const isAdmin = user.role === 'admin' || user.role === 'main_admin';
      if (isAdmin) return;

      try {
        const response = await API.employees.myProfile();
        const employee = response.data.data;
        if (employee && employee._id) {
          setSelectedEmployeeId(employee._id);

          // Try to find in already-fetched employees list; fallback to profile data
          const empFromList = employees.find(e => e._id === employee._id);
          setSelectedEmployee(empFromList || employee);

          await fetchHistoricalRoute(employee._id, selectedDate);
        }
      } catch (error) {
        console.error('Failed to auto-select logged-in employee for tracking:', error);
      }
    };

    initSelfTracking();
  }, [user, selectedEmployeeId, employees, selectedDate]);

  // Listen for refresh event from Header
  useEffect(() => {
    const handleRefresh = () => {
      fetchActiveLocations();
      if (selectedEmployeeId) {
        fetchHistoricalRoute(selectedEmployeeId, selectedDate);
      }
    }

    window.addEventListener('app-refresh', handleRefresh)
    return () => window.removeEventListener('app-refresh', handleRefresh)
  }, [selectedEmployeeId, selectedDate]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchActiveLocations();
        if (selectedEmployeeId) {
          fetchHistoricalRoute(selectedEmployeeId, selectedDate);
        }
      }, 30000); // 30 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, selectedEmployeeId, selectedDate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target)) {
        setEmployeeDropdownOpen(false);
      }
    };

    if (employeeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [employeeDropdownOpen]);

  // Filter employees based on search term
  const filteredEmployees = employees.filter(emp => {
    if (!employeeSearchTerm) return true;
    const searchLower = employeeSearchTerm.toLowerCase();
    return emp.name?.toLowerCase().includes(searchLower) || 
           emp.employeeId?.toLowerCase().includes(searchLower) ||
           emp.role?.toLowerCase().includes(searchLower);
  });

  // Get current employee location (active or from route)
  const getCurrentLocation = () => {
    if (selectedEmployeeId && historicalRoute.length > 0) {
      const lastLoc = historicalRoute[historicalRoute.length - 1];
      return [lastLoc.latitude, lastLoc.longitude];
    }
    if (selectedEmployeeId) {
      const empLocation = activeLocations.find(loc => 
        loc.employeeDetails?._id === selectedEmployeeId
      );
      if (empLocation) {
        return [
          empLocation.location.coordinates[1],
          empLocation.location.coordinates[0]
        ];
      }
    }
    if (activeLocations.length > 0) {
      return [
        activeLocations[0].location.coordinates[1],
        activeLocations[0].location.coordinates[0]
      ];
    }
    return [20.5937, 78.9629]; // Center of India
  };

  // Format duration
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const currentEmpLocation = selectedEmployeeId 
    ? activeLocations.find(loc => loc.employeeDetails?._id === selectedEmployeeId)
    : null;

  // Use timeline from backend (already sorted)
  const sortedActivities = timeline.length > 0 ? timeline : activityLog;

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Live Employee Tracking</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Real-time location monitoring & route history
            {lastUpdateTime && (
              <span className="ml-2 text-xs text-green-600">
                • Updated {Math.floor((new Date() - lastUpdateTime) / 1000)}s ago
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {autoRefresh ? '🔄 Auto' : '⏸️ Manual'}
          </button>
        </div>
      </div>

      {/* Employee Selection and Date */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative z-[20]" ref={employeeDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Employee</label>
            <button
              type="button"
              onClick={() => {
                setEmployeeDropdownOpen(!employeeDropdownOpen);
                setEmployeeSearchTerm('');
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex items-center justify-between relative z-[20]"
            >
              <span className={selectedEmployee ? 'text-gray-900' : 'text-gray-500'}>
                {selectedEmployee 
                  ? `${selectedEmployee.employeeId || ''} - ${selectedEmployee.name || ''}`
                  : '-- Select Employee --'}
              </span>
              <FiChevronDown className={`transition-transform ${employeeDropdownOpen ? 'transform rotate-180' : ''}`} />
            </button>
            
            {employeeDropdownOpen && (
              <div className="absolute w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden" style={{ maxHeight: '60vh', zIndex: 2 }}>
                <div className="p-2 border-b sticky top-0 bg-white z-[20]">
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={employeeSearchTerm}
                    onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(60vh - 60px)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      handleEmployeeSelect('');
                      setEmployeeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                      !selectedEmployee ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
                    }`}
                  >
                    -- Select Employee --
                  </button>
                  {filteredEmployees.length === 0 ? (
                    <div className="px-4 py-2 text-gray-500 text-sm">No employees found</div>
                  ) : (
                    filteredEmployees.map(emp => (
                      <button
                        key={emp._id}
                        type="button"
                        onClick={() => {
                          handleEmployeeSelect(emp._id);
                          setEmployeeDropdownOpen(false);
                          setEmployeeSearchTerm('');
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                          selectedEmployeeId === emp._id ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
                        }`}
                      >
                        {emp.employeeId} - {emp.name} ({emp.role})
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {selectedEmployee && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Total Distance</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{todayStats.distance} Km</p>
              </div>
              <FiTruck className="text-blue-500" size={24} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Travel Time</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{formatDuration(todayStats.travelTime)}</p>
              </div>
              <FiClock className="text-green-500" size={24} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Number of Stops</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">{todayStats.numberOfStops}</p>
              </div>
              <FiMapPin className="text-orange-500" size={24} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Map and Activity Log */}
      {selectedEmployee ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Timeline */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <FiCalendar size={18} />
                  Timeline
                </h2>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 text-sm mt-2">Loading timeline...</p>
                  </div>
                ) : sortedActivities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No activity data available
                  </div>
                ) : (
                  sortedActivities.map((activity, index) => (
                    <div key={index} className="relative pl-8 border-l-2 border-gray-200 pb-4 last:border-l-0 last:pb-0">
                      <div className="absolute left-[-6px] top-0">
                        {activity.type === 'check-in' ? (
                          <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow"></div>
                        ) : activity.type === 'check-out' ? (
                          <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow"></div>
                        ) : activity.type === 'travel' ? (
                          <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow"></div>
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow"></div>
                        )}
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        {activity.type === 'check-in' ? (
                          <>
                            <div className="text-lg">🚀</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900">
                                Check-In
                              </div>
                              <div className="text-xs text-gray-600">
                                {new Date(activity.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </div>
                              {activity.address && (
                                <div className="text-xs text-gray-500 mt-1 break-words">
                                  {activity.address}
                                </div>
                              )}
                            </div>
                          </>
                        ) : activity.type === 'check-out' ? (
                          <>
                            <div className="text-lg">🏁</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900">
                                Check-Out
                              </div>
                              <div className="text-xs text-gray-600">
                                {new Date(activity.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </div>
                              {activity.address && (
                                <div className="text-xs text-gray-500 mt-1 break-words">
                                  {activity.address}
                                </div>
                              )}
                            </div>
                          </>
                        ) : activity.type === 'travel' ? (
                          <>
                            <FiTruck className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900">
                                Travelled {activity.distance} Km
                              </div>
                              <div className="text-xs text-gray-600">
                                {new Date(activity.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - 
                                {new Date(activity.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                <span className="ml-2">({formatDuration(activity.duration)})</span>
                              </div>
                              {activity.startLocation?.address && (
                                <div className="text-xs text-gray-500 mt-1">
                                  From: {activity.startLocation.address}
                                </div>
                              )}
                              {activity.endLocation?.address && (
                                <div className="text-xs text-gray-500">
                                  To: {activity.endLocation.address}
                                </div>
                              )}
                            </div>
                          </>
                        ) : activity.type === 'stop' ? (
                          <>
                            <FiMapPin className="text-orange-600 mt-0.5 flex-shrink-0" size={16} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900">
                                Stop ({formatDuration(activity.duration)})
                              </div>
                              <div className="text-xs text-gray-600">
                                {new Date(activity.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </div>
                              {activity.address && (
                                <div className="text-xs text-gray-500 mt-1 break-words">
                                  {activity.address}
                                </div>
                              )}
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-2 relative z-[10]">
            <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '600px' }}>
              <MapContainer
                center={getCurrentLocation()}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <MapBounds 
                  locations={selectedEmployeeId ? [] : activeLocations} 
                  route={historicalRoute}
                />
                
                {/* Historical route polyline */}
                {historicalRoute.length > 0 && (
                  <>
                    <Polyline
                      positions={historicalRoute.map(loc => [loc.latitude, loc.longitude])}
                      color="#2563eb"
                      weight={4}
                      opacity={0.8}
                      smoothFactor={1.5}
                    />
                    
                    {/* Check-in marker from timeline */}
                    {sessionData?.checkIn && (
                      <Marker
                        position={[sessionData.checkIn.latitude, sessionData.checkIn.longitude]}
                        icon={checkInIcon}
                      >
                        <Popup>
                          <div className="p-2">
                            <h3 className="font-semibold text-green-600">🚀 Check-In</h3>
                            <p className="text-xs text-gray-600 mt-1">
                              {new Date(sessionData.checkIn.timestamp).toLocaleString()}
                            </p>
                            {sessionData.checkIn.address && (
                              <p className="text-xs text-gray-500 mt-1">{sessionData.checkIn.address}</p>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    
                    {/* Stop points from timeline */}
                    {timeline
                      .filter(activity => activity.type === 'stop')
                      .map((activity, idx) => (
                        <Marker
                          key={`stop-${idx}`}
                          position={[activity.latitude, activity.longitude]}
                          icon={stopPointIcon}
                        >
                          <Popup>
                            <div className="p-2">
                              <h3 className="font-semibold text-orange-600">⏸️ Stop</h3>
                              <p className="text-xs text-gray-600 mt-1">
                                {new Date(activity.timestamp).toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-600">
                                Duration: {formatDuration(activity.duration)}
                              </p>
                              {activity.address && (
                                <p className="text-xs text-gray-500 mt-1">{activity.address}</p>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    
                    {/* Check-out marker from timeline */}
                    {sessionData?.checkOut && (
                      <Marker
                        position={[sessionData.checkOut.latitude, sessionData.checkOut.longitude]}
                        icon={checkOutIcon}
                      >
                        <Popup>
                          <div className="p-2">
                            <h3 className="font-semibold text-red-600">🏁 Check-Out</h3>
                            <p className="text-xs text-gray-600 mt-1">
                              {new Date(sessionData.checkOut.timestamp).toLocaleString()}
                            </p>
                            {sessionData.checkOut.address && (
                              <p className="text-xs text-gray-500 mt-1">{sessionData.checkOut.address}</p>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    
                    {/* Current/Last location marker (pulsing blue) */}
                    {historicalRoute.length > 0 && (
                      <Marker
                        position={[
                          historicalRoute[historicalRoute.length - 1].latitude,
                          historicalRoute[historicalRoute.length - 1].longitude
                        ]}
                        icon={currentLocationIcon}
                      >
                        <Popup>
                          <div className="p-2">
                            <h3 className="font-semibold text-blue-600">📍 Current Location</h3>
                            <p className="text-xs text-gray-600 mt-1">
                              {new Date(historicalRoute[historicalRoute.length - 1].timestamp).toLocaleString()}
                            </p>
                            {historicalRoute[historicalRoute.length - 1].address && (
                              <p className="text-xs text-gray-500 mt-1">{historicalRoute[historicalRoute.length - 1].address}</p>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    )}
                  </>
                )}
                
                {/* Active employee markers (if not viewing specific employee) */}
                {!selectedEmployeeId && activeLocations.map((loc, index) => (
                  <Marker
                    key={`active-${index}`}
                    position={[loc.location.coordinates[1], loc.location.coordinates[0]]}
                    icon={activeEmployeeIcon}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-semibold text-lg">{loc.employeeDetails.name}</h3>
                        <p className="text-sm text-gray-600">
                          {loc.employeeDetails.employeeId} • {loc.employeeDetails.role}
                        </p>
                        <div className="mt-2 space-y-1 text-xs">
                          <p><strong>Accuracy:</strong> {Math.round(loc.accuracy)}m</p>
                          {loc.speed && <p><strong>Speed:</strong> {(loc.speed * 3.6).toFixed(1)} km/h</p>}
                          {loc.batteryLevel && <p><strong>Battery:</strong> {loc.batteryLevel}%</p>}
                          <p><strong>Last Update:</strong> {new Date(loc.createdAt).toLocaleString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            second: '2-digit',
                            month: 'short',
                            day: 'numeric'
                          })}</p>
                          <p className="text-gray-500">
                            {Math.floor((new Date() - new Date(loc.createdAt)) / 1000 / 60)} min ago
                          </p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                
                {/* Current active location for selected employee */}
                {selectedEmployeeId && currentEmpLocation && (
                  <Marker
                    position={[
                      currentEmpLocation.location.coordinates[1],
                      currentEmpLocation.location.coordinates[0]
                    ]}
                    icon={activeEmployeeIcon}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-semibold text-lg">{currentEmpLocation.employeeDetails.name}</h3>
                        <p className="text-sm text-gray-600">
                          {currentEmpLocation.employeeDetails.employeeId} • Live Tracking
                        </p>
                        <div className="mt-2 space-y-1 text-xs">
                          <p><strong>Accuracy:</strong> {Math.round(currentEmpLocation.accuracy)}m</p>
                          {currentEmpLocation.speed && (
                            <p><strong>Speed:</strong> {(currentEmpLocation.speed * 3.6).toFixed(1)} km/h</p>
                          )}
                          {currentEmpLocation.batteryLevel && (
                            <p><strong>Battery:</strong> {currentEmpLocation.batteryLevel}%</p>
                          )}
                          <p><strong>Last Update:</strong> {new Date(currentEmpLocation.createdAt).toLocaleString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            second: '2-digit',
                            month: 'short',
                            day: 'numeric'
                          })}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {Math.floor((new Date() - new Date(currentEmpLocation.createdAt)) / 1000 / 60)} min ago
                          </p>
                          {currentEmpLocation.address && (
                            <p><strong>Location:</strong> {currentEmpLocation.address}</p>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FiUser className="mx-auto text-gray-400 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Employee Selected</h3>
          <p className="text-gray-600">
            Select an employee from the dropdown above to view their live location and activity log.
          </p>
        </div>
      )}

      {/* Active Employees List */}
      {activeLocations.length > 0 && !selectedEmployeeId && (
        <div className="mt-6 bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-800">🟢 Currently Tracked Employees</h2>
            <p className="text-xs text-gray-500 mt-1">
              Real-time tracking • Updates every 30s • Sessions remain active until checkout
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeLocations.map((loc, index) => (
                <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{loc.employeeDetails.name}</h3>
                      <p className="text-sm text-gray-600">{loc.employeeDetails.employeeId}</p>
                      <p className="text-xs text-gray-500 mt-1">{loc.employeeDetails.role}</p>
                    </div>
                    <div className="flex items-center text-green-600">
                      <FiClock className="animate-pulse" size={16} />
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t text-xs space-y-1">
                    <p className="flex justify-between">
                      <span className="text-gray-600">Accuracy:</span>
                      <span className="font-medium">{Math.round(loc.accuracy)}m</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-600">Last Update:</span>
                      <span className="font-medium">
                        {new Date(loc.createdAt).toLocaleTimeString()}
                      </span>
                    </p>
                    {loc.batteryLevel && (
                      <p className="flex justify-between">
                        <span className="text-gray-600">Battery:</span>
                        <span className="font-medium">{loc.batteryLevel}%</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTracking;
