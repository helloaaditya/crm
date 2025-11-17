import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  FiRefreshCw, FiUser, FiMapPin, FiClock, FiNavigation, FiCalendar, 
  FiUsers, FiChevronDown, FiPlay, FiCheckCircle, FiCar, FiMap, 
  FiSettings, FiDownload, FiPlus, FiFilter, FiChevronLeft, FiChevronRight,
  FiBattery, FiGlobe, FiEye
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

// Custom icon for movement points (blue)
const movementPointIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [15, 25],
  iconAnchor: [7, 25],
  popupAnchor: [1, -20],
  shadowSize: [25, 25]
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
  const [activeTab, setActiveTab] = useState('live');
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const employeeDropdownRef = useRef(null);
  const intervalRef = useRef(null);
  const [activityLog, setActivityLog] = useState([]);
  const [todayStats, setTodayStats] = useState({
    completed: 0,
    distance: 0,
    punchIn: null
  });

  // Fetch active locations
  const fetchActiveLocations = async () => {
    try {
      const response = await API.locationTracking.getActiveLocations();
      const locations = response.data.data || [];
      setActiveLocations(locations);
      setLastUpdateTime(new Date());
      
      // If an employee is selected, find their active location
      if (selectedEmployeeId) {
        const empLocation = locations.find(loc => 
          loc.employeeDetails?._id === selectedEmployeeId
        );
        if (empLocation) {
          setSelectedEmployee(empLocation.employeeDetails);
        }
      }
    } catch (error) {
      console.error('Failed to fetch active locations:', error);
    }
  };

  // Fetch all employees
  const fetchEmployees = async () => {
    try {
      const response = await API.employees.getAll({ 
        limit: 10000,
        fields: '_id employeeId name role phone designation profilePicture' 
      });
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      toast.error('Failed to load employees');
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
      let punchInTime = null;
      const activities = [];
      
      sessions.forEach(session => {
        if (session.locations && Array.isArray(session.locations)) {
          if (session.locations.length > 0 && !punchInTime) {
            punchInTime = session.locations[0].timestamp;
          }
          
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
          let currentSegment = null;
          let lastStop = null;
          
          for (let i = 0; i < session.locations.length; i++) {
            const loc = session.locations[i];
            const prevLoc = i > 0 ? session.locations[i - 1] : null;
            
            if (loc.isStopPoint && loc.stopDuration) {
              // End current travel segment if exists
              if (currentSegment) {
                const segmentDistance = calculateDistance(
                  currentSegment.start.latitude,
                  currentSegment.start.longitude,
                  prevLoc.latitude,
                  prevLoc.longitude
                );
                activities.push({
                  type: 'travel',
                  distance: segmentDistance,
                  startTime: currentSegment.start.timestamp,
                  endTime: prevLoc.timestamp,
                  duration: Math.round((new Date(prevLoc.timestamp) - new Date(currentSegment.start.timestamp)) / 1000)
                });
                currentSegment = null;
              }
              
              // Add stoppage
              if (loc.stopDuration > 30) { // Only show stops > 30 seconds
                activities.push({
                  type: 'stoppage',
                  duration: loc.stopDuration,
                  address: loc.address,
                  timestamp: loc.timestamp,
                  coordinates: [loc.latitude, loc.longitude]
                });
                lastStop = loc;
              }
            } else {
              // Start new travel segment if not exists
              if (!currentSegment) {
                currentSegment = {
                  start: loc
                };
              }
            }
          }
          
          // End last travel segment if exists
          if (currentSegment && session.locations.length > 0) {
            const lastLoc = session.locations[session.locations.length - 1];
            const segmentDistance = calculateDistance(
              currentSegment.start.latitude,
              currentSegment.start.longitude,
              lastLoc.latitude,
              lastLoc.longitude
            );
            activities.push({
              type: 'travel',
              distance: segmentDistance,
              startTime: currentSegment.start.timestamp,
              endTime: lastLoc.timestamp,
              duration: Math.round((new Date(lastLoc.timestamp) - new Date(currentSegment.start.timestamp)) / 1000)
            });
          }
        }
      });
      
      setHistoricalRoute(allLocations);
      setActivityLog(activities);
      setTodayStats({
        completed: 0, // TODO: Fetch from tasks API
        distance: (totalDistance / 1000).toFixed(2),
        punchIn: punchInTime
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

  // Helper function to calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c / 1000).toFixed(2); // Return in km
  };

  // Handle employee selection
  const handleEmployeeSelect = async (employeeId) => {
    setSelectedEmployeeId(employeeId);
    if (employeeId) {
      const emp = employees.find(e => e._id === employeeId);
      setSelectedEmployee(emp);
      
      // Find active location for this employee
      const empLocation = activeLocations.find(loc => 
        loc.employeeDetails?._id === employeeId
      );
      
      // Fetch historical route for today
      await fetchHistoricalRoute(employeeId, selectedDate);
    } else {
      setSelectedEmployee(null);
      setHistoricalRoute([]);
      setActivityLog([]);
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

  // Get employee avatar initial
  const getAvatarInitial = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
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

  const tabs = [
    { id: 'live', label: 'Live' },
    { id: 'playback', label: 'Playback' },
    { id: 'task', label: 'Task' },
    { id: 'attendance', label: 'All Attendance' },
    { id: 'leave', label: 'All Leave' },
    { id: 'details', label: 'Details' },
    { id: 'managers', label: 'Managers' },
    { id: 'feeds', label: 'Feeds' },
    { id: 'expense', label: 'Expense' },
    { id: 'audit', label: 'Audit History' }
  ];

  const currentEmpLocation = selectedEmployeeId 
    ? activeLocations.find(loc => loc.employeeDetails?._id === selectedEmployeeId)
    : null;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-800">Live Employee Tracking</h1>
          {lastUpdateTime && (
            <span className="text-xs text-gray-500">
              Updated {Math.floor((new Date() - lastUpdateTime) / 1000)}s ago
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 rounded-lg text-sm ${
              autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {autoRefresh ? '🔄 Auto' : '⏸️ Manual'}
          </button>
        </div>
      </div>

      {/* Main Content - Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Employee Details & Activity Log */}
        <div className="w-96 bg-white border-r flex flex-col overflow-hidden">
          {/* Employee Selection */}
          <div className="p-4 border-b">
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
          </div>

          {/* Employee Information */}
          {selectedEmployee && (
            <>
              <div className="p-4 border-b">
                <div className="flex flex-col items-center mb-4">
                  <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold mb-2">
                    {selectedEmployee.profilePicture ? (
                      <img 
                        src={selectedEmployee.profilePicture} 
                        alt={selectedEmployee.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getAvatarInitial(selectedEmployee.name)
                    )}
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedEmployee.name}</h2>
                  <p className="text-sm text-gray-600 capitalize">{selectedEmployee.role || selectedEmployee.designation}</p>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Employee ID:</span>
                    <span className="font-medium">{selectedEmployee.employeeId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{selectedEmployee.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium flex items-center gap-1">
                      {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      <span className="text-green-500">✓</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time Zone:</span>
                    <span className="font-medium flex items-center gap-1">
                      IST <FiGlobe className="text-gray-400" size={14} />
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded text-sm font-medium">
                    Default
                  </button>
                  <button className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-medium">
                    Sales
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b flex overflow-x-auto">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* 360° View Section */}
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">360° View</h3>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <FiRefreshCw size={16} />
                </button>
              </div>

              {/* Activity Log */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <FiCalendar size={16} />
                      Today
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>Completed {todayStats.completed}</span>
                      <span>Distance {todayStats.distance}Km</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Punch In */}
                  {todayStats.punchIn && (
                    <div className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                      <FiClock className="text-blue-600 mt-0.5" size={16} />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(todayStats.punchIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-xs text-gray-600">Punch In</div>
                        <button className="text-xs text-blue-600 hover:underline mt-1">See on Map!</button>
                      </div>
                    </div>
                  )}

                  {/* Activity Items */}
                  {activityLog.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                      {activity.type === 'travel' ? (
                        <>
                          <FiCar className="text-blue-600 mt-0.5" size={16} />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              Travelled ({activity.distance}Km)
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
                          <FiMapPin className="text-red-600 mt-0.5" size={16} />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              Stoppage of {formatDuration(activity.duration)}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {activity.address || 'Location not available'}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {activityLog.length === 0 && !loading && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No activity data available
                    </div>
                  )}
                </div>

                {/* Nearest Location */}
                <div className="mt-4 p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Nearest Location</span>
                    <button className="text-xs text-blue-600 hover:underline">See location on map</button>
                  </div>
                </div>
              </div>

              {/* Device Info Bar */}
              {currentEmpLocation && (
                <div className="p-3 border-t bg-gray-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-600">Device: Mobile</span>
                    {currentEmpLocation.batteryLevel && (
                      <div className="flex items-center gap-1">
                        <FiBattery size={14} />
                        <span>{currentEmpLocation.batteryLevel}%</span>
                      </div>
                    )}
                    <span className="text-gray-600">
                      {Math.floor((new Date() - new Date(currentEmpLocation.createdAt)) / 1000 / 60)} min ago
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1 hover:bg-gray-200 rounded">
                      <FiPlus size={14} />
                    </button>
                    <button className="p-1 hover:bg-gray-200 rounded">
                      <FiDownload size={14} />
                    </button>
                    <button className="p-1 hover:bg-gray-200 rounded">
                      <FiSettings size={14} />
                    </button>
                    <button className="p-1 hover:bg-gray-200 rounded">
                      <FiFilter size={14} />
                    </button>
                    <button className="p-1 hover:bg-gray-200 rounded" onClick={handleRefresh}>
                      <FiRefreshCw size={14} />
                    </button>
                    <button className="p-1 hover:bg-gray-200 rounded">
                      <FiChevronLeft size={14} />
                    </button>
                    <button className="p-1 hover:bg-gray-200 rounded">
                      <FiChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {!selectedEmployee && (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FiUser size={48} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Select an employee to view tracking details</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Map */}
        <div className="flex-1 relative">
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
                
                {/* Start marker */}
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
                
                {/* End marker */}
                {historicalRoute.length > 1 && (
                  <Marker
                    position={[
                      historicalRoute[historicalRoute.length - 1].latitude,
                      historicalRoute[historicalRoute.length - 1].longitude
                    ]}
                    icon={stopPointIcon}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-semibold text-red-600">🏁 Journey End</h3>
                        <p className="text-xs text-gray-600 mt-1">
                          {new Date(historicalRoute[historicalRoute.length - 1].timestamp).toLocaleString()}
                        </p>
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
                      <p><strong>Last Update:</strong> {new Date(currentEmpLocation.createdAt).toLocaleTimeString()}</p>
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
  );
};

export default LiveTracking;
