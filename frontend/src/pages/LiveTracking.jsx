import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  FiRefreshCw, FiUser, FiMapPin, FiClock, FiCalendar, 
  FiChevronDown, FiTruck, FiCheckCircle
} from 'react-icons/fi';
import API from '../api';
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

// Custom icon for stop points (red)
const stopPointIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -28],
  shadowSize: [33, 33]
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
    distance: 0
  });

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
      let totalDistance = 0;
      const activities = [];
      
      // Fetch today's attendance
      await fetchTodayAttendance(employeeId);
      
      sessions.forEach(session => {
        if (session.locations && Array.isArray(session.locations)) {
          allLocations = [...allLocations, ...session.locations];
          
          // Calculate distance for this session
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
          
          // Process activities (travel segments and stoppages)
          // Group consecutive locations to detect movement vs stops
          let travelStart = null;
          let lastLocation = null;
          
          for (let i = 0; i < session.locations.length; i++) {
            const loc = session.locations[i];
            
            if (!lastLocation) {
              // First location - start tracking
              travelStart = loc;
              lastLocation = loc;
              continue;
            }
            
            // Calculate distance from last location
            const distance = calculateDistance(
              lastLocation.latitude,
              lastLocation.longitude,
              loc.latitude,
              loc.longitude
            );
            
            const timeDiff = (new Date(loc.timestamp) - new Date(lastLocation.timestamp)) / 1000; // seconds
            
            // If location moved significantly (> 20 meters), it's travel
            if (distance > 0.02) { // 20 meters = 0.02 km
              // If we were in a stop, end it first
              if (travelStart && travelStart !== lastLocation) {
                const stopDuration = (new Date(lastLocation.timestamp) - new Date(travelStart.timestamp)) / 1000;
                if (stopDuration > 30) { // Only show stops > 30 seconds
                  activities.push({
                    type: 'stoppage',
                    duration: Math.round(stopDuration),
                    address: lastLocation.address || travelStart.address,
                    timestamp: lastLocation.timestamp,
                    coordinates: [lastLocation.latitude, lastLocation.longitude]
                  });
                }
              }
              
              // Start new travel segment
              travelStart = lastLocation;
              lastLocation = loc;
            } else {
              // Location hasn't moved much - could be a stop
              // Check if we have a travel segment to close
              if (travelStart && travelStart !== lastLocation) {
                const travelDistance = calculateDistance(
                  travelStart.latitude,
                  travelStart.longitude,
                  lastLocation.latitude,
                  lastLocation.longitude
                );
                const travelDuration = (new Date(lastLocation.timestamp) - new Date(travelStart.timestamp)) / 1000;
                
                // Only add travel if distance > 50m and duration > 30s
                if (travelDistance > 0.05 && travelDuration > 30) {
                  activities.push({
                    type: 'travel',
                    distance: travelDistance,
                    startTime: travelStart.timestamp,
                    endTime: lastLocation.timestamp,
                    duration: Math.round(travelDuration)
                  });
                }
              }
              
              // Update last location but keep travelStart for stop detection
              lastLocation = loc;
            }
          }
          
          // Handle final segment
          if (travelStart && lastLocation && travelStart !== lastLocation) {
            const finalDistance = calculateDistance(
              travelStart.latitude,
              travelStart.longitude,
              lastLocation.latitude,
              lastLocation.longitude
            );
            const finalDuration = (new Date(lastLocation.timestamp) - new Date(travelStart.timestamp)) / 1000;
            
            // Check if it's a stop or travel
            if (finalDistance <= 0.02) {
              // It's a stop
              if (finalDuration > 30) {
                activities.push({
                  type: 'stoppage',
                  duration: Math.round(finalDuration),
                  address: lastLocation.address || travelStart.address,
                  timestamp: lastLocation.timestamp,
                  coordinates: [lastLocation.latitude, lastLocation.longitude]
                });
              }
            } else {
              // It's travel
              if (finalDistance > 0.05 && finalDuration > 30) {
                activities.push({
                  type: 'travel',
                  distance: finalDistance,
                  startTime: travelStart.timestamp,
                  endTime: lastLocation.timestamp,
                  duration: Math.round(finalDuration)
                });
              }
            }
          }
        }
      });
      
      setHistoricalRoute(allLocations);
      setActivityLog(activities);
      setTodayStats({
        distance: (totalDistance / 1000).toFixed(2)
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

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchActiveLocations();
      }, 5000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, selectedEmployeeId]);

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

  // Build activity log with check-in/check-out
  const buildActivityLog = () => {
    const activities = [];
    
    // Add check-in
    if (todayAttendance?.checkInTime) {
      activities.push({
        type: 'checkin',
        timestamp: todayAttendance.checkInTime,
        address: todayAttendance.checkInLocation?.address,
        coordinates: todayAttendance.checkInLocation?.coordinates
      });
    }
    
    // Add travel and stoppage activities (sorted by time)
    activities.push(...activityLog);
    
    // Add check-out
    if (todayAttendance?.checkOutTime) {
      activities.push({
        type: 'checkout',
        timestamp: todayAttendance.checkOutTime,
        address: todayAttendance.checkOutLocation?.address,
        coordinates: todayAttendance.checkOutLocation?.coordinates
      });
    }
    
    // Sort by timestamp
    return activities.sort((a, b) => {
      const timeA = new Date(a.timestamp || a.startTime || 0);
      const timeB = new Date(b.timestamp || b.startTime || 0);
      return timeA - timeB;
    });
  };

  const sortedActivities = buildActivityLog();

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
          <div className="relative z-[10000]" ref={employeeDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Employee</label>
            <button
              type="button"
              onClick={() => {
                setEmployeeDropdownOpen(!employeeDropdownOpen);
                setEmployeeSearchTerm('');
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex items-center justify-between relative z-[10001]"
            >
              <span className={selectedEmployee ? 'text-gray-900' : 'text-gray-500'}>
                {selectedEmployee 
                  ? `${selectedEmployee.employeeId || ''} - ${selectedEmployee.name || ''}`
                  : '-- Select Employee --'}
              </span>
              <FiChevronDown className={`transition-transform ${employeeDropdownOpen ? 'transform rotate-180' : ''}`} />
            </button>
            
            {employeeDropdownOpen && (
              <div className="absolute w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden" style={{ maxHeight: '60vh', zIndex: 10000 }}>
                <div className="p-2 border-b sticky top-0 bg-white z-10">
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

      {/* Main Content - Map and Activity Log */}
      {selectedEmployee ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Activity Log */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <FiCalendar size={18} />
                  Activity Log
                </h2>
                <div className="text-xs text-gray-600">
                  Distance: {todayStats.distance}Km
                </div>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {sortedActivities.length === 0 && !loading ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No activity data available
                  </div>
                ) : (
                  sortedActivities.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      {activity.type === 'checkin' ? (
                        <>
                          <FiCheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={16} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">
                              Checked In
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
                      ) : activity.type === 'checkout' ? (
                        <>
                          <FiClock className="text-red-600 mt-0.5 flex-shrink-0" size={16} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">
                              Checked Out
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
                              Travelled ({formatDistance(activity.distance)}Km)
                            </div>
                            <div className="text-xs text-gray-600">
                              {new Date(activity.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - 
                              {new Date(activity.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              <span className="ml-2">({formatDuration(activity.duration)})</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <FiMapPin className="text-red-600 mt-0.5 flex-shrink-0" size={16} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">
                              Stoppage of {formatDuration(activity.duration)}
                            </div>
                            <div className="text-xs text-gray-600 mt-1 break-words">
                              {activity.address || 'Location not available'}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-2">
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
                    
                    {/* Start marker - Use check-in location if available, otherwise first GPS point */}
                    {todayAttendance?.checkInLocation?.coordinates ? (
                      <Marker
                        position={[
                          todayAttendance.checkInLocation.coordinates[1],
                          todayAttendance.checkInLocation.coordinates[0]
                        ]}
                        icon={activeEmployeeIcon}
                      >
                        <Popup>
                          <div className="p-2">
                            <h3 className="font-semibold text-green-600">🚀 Journey Start (Check-In)</h3>
                            <p className="text-xs text-gray-600 mt-1">
                              {new Date(todayAttendance.checkInTime).toLocaleString()}
                            </p>
                            {todayAttendance.checkInLocation.address && (
                              <p className="text-xs text-gray-500 mt-1">{todayAttendance.checkInLocation.address}</p>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    ) : (
                      <Marker
                        position={[historicalRoute[0].latitude, historicalRoute[0].longitude]}
                        icon={activeEmployeeIcon}
                      >
                        <Popup>
                          <div className="p-2">
                            <h3 className="font-semibold text-green-600">🚀 Journey Start</h3>
                            <p className="text-xs text-gray-600 mt-1">
                              {new Date(historicalRoute[0].timestamp).toLocaleString()}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    
                    {/* Stop points */}
                    {historicalRoute
                      .filter(loc => loc.isStopPoint)
                      .map((loc, idx) => (
                        <Marker
                          key={`stop-${idx}`}
                          position={[loc.latitude, loc.longitude]}
                          icon={stopPointIcon}
                        >
                          <Popup>
                            <div className="p-2">
                              <h3 className="font-semibold text-red-600">⏸️ Stop Point</h3>
                              <p className="text-xs text-gray-600 mt-1">
                                {new Date(loc.timestamp).toLocaleTimeString()}
                              </p>
                              {loc.address && (
                                <p className="text-xs text-gray-500 mt-1">{loc.address}</p>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    
                    {/* End marker - Only show if checked out */}
                    {todayAttendance?.checkOutTime && todayAttendance?.checkOutLocation?.coordinates ? (
                      <Marker
                        position={[
                          todayAttendance.checkOutLocation.coordinates[1],
                          todayAttendance.checkOutLocation.coordinates[0]
                        ]}
                        icon={stopPointIcon}
                      >
                        <Popup>
                          <div className="p-2">
                            <h3 className="font-semibold text-red-600">🏁 Journey End (Check-Out)</h3>
                            <p className="text-xs text-gray-600 mt-1">
                              {new Date(todayAttendance.checkOutTime).toLocaleString()}
                            </p>
                            {todayAttendance.checkOutLocation.address && (
                              <p className="text-xs text-gray-500 mt-1">{todayAttendance.checkOutLocation.address}</p>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    ) : null}
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
                          <p><strong>Last Update:</strong> {new Date(loc.createdAt).toLocaleTimeString()}</p>
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
              Real-time tracking • Updates every 30s • Sessions auto-cleanup after 10 minutes of inactivity
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
