import { useState, useEffect, useRef } from 'react';
import { FiRefreshCw, FiMapPin, FiUsers, FiClock, FiActivity, FiMap, FiList } from 'react-icons/fi';
import { locationTrackingAPI } from '../../api';
import { toast } from 'react-toastify';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons for different employee statuses
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

const LiveLocationTracking = () => {
  const [activeLocations, setActiveLocations] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeHistory, setEmployeeHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [stats, setStats] = useState({
    totalActive: 0,
    totalLocations: 0,
    activeEmployeesCount: 0,
  });
  const mapRef = useRef(null);
  const refreshInterval = useRef(null);

  // Fetch active locations
  const fetchActiveLocations = async () => {
    try {
      const response = await locationTrackingAPI.getActiveLocations();
      setActiveLocations(response.data.data || []);
      setStats((prev) => ({
        ...prev,
        totalActive: response.data.count || 0,
      }));
    } catch (error) {
      console.error('Error fetching active locations:', error);
      if (!activeLocations.length) {
        toast.error('Failed to load active locations');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch tracking stats
  const fetchStats = async () => {
    try {
      const response = await locationTrackingAPI.getStats();
      setStats({
        totalActive: activeLocations.length,
        ...response.data.data.today,
        currentlyActive: response.data.data.currentlyActive,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Fetch location history for selected employee
  const fetchEmployeeHistory = async (employeeId, sessionId) => {
    try {
      const response = await locationTrackingAPI.getHistory(employeeId, { sessionId });
      if (response.data.data && response.data.data[0]) {
        setEmployeeHistory(response.data.data[0].locations || []);
      }
    } catch (error) {
      console.error('Error fetching employee history:', error);
      toast.error('Failed to load employee history');
    }
  };

  // Auto-refresh locations
  useEffect(() => {
    fetchActiveLocations();
    fetchStats();

    if (autoRefresh) {
      refreshInterval.current = setInterval(() => {
        fetchActiveLocations();
        fetchStats();
      }, 10000); // Refresh every 10 seconds
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [autoRefresh]);

  // Load employee history when selected
  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeHistory(selectedEmployee.employeeDetails._id, selectedEmployee.sessionId);
    } else {
      setEmployeeHistory([]);
    }
  }, [selectedEmployee]);

  // Calculate center point of all markers
  const getMapCenter = () => {
    if (activeLocations.length === 0) {
      return [20.5937, 78.9629]; // India center
    }

    if (activeLocations.length === 1) {
      const loc = activeLocations[0].location.coordinates;
      return [loc[1], loc[0]];
    }

    const avgLat =
      activeLocations.reduce((sum, loc) => sum + loc.location.coordinates[1], 0) /
      activeLocations.length;
    const avgLng =
      activeLocations.reduce((sum, loc) => sum + loc.location.coordinates[0], 0) /
      activeLocations.length;

    return [avgLat, avgLng];
  };

  // Format time
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get time since last update
  const getTimeSince = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Live Location Tracking</h1>
            <p className="text-sm text-gray-600 mt-1">
              Real-time employee location monitoring
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                autoRefresh
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiRefreshCw className={`inline mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
            </button>

            {/* View toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-md flex items-center transition-colors ${
                  viewMode === 'map'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <FiMap className="mr-2" />
                Map
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md flex items-center transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <FiList className="mr-2" />
                List
              </button>
            </div>

            {/* Manual refresh */}
            <button
              onClick={() => {
                fetchActiveLocations();
                fetchStats();
                toast.success('Refreshed');
              }}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FiRefreshCw />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center">
              <FiUsers className="text-blue-600 text-xl mr-2" />
              <div>
                <p className="text-xs text-gray-600">Active Now</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalActive}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center">
              <FiMapPin className="text-green-600 text-xl mr-2" />
              <div>
                <p className="text-xs text-gray-600">Locations Today</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalLocations}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-3">
            <div className="flex items-center">
              <FiActivity className="text-purple-600 text-xl mr-2" />
              <div>
                <p className="text-xs text-gray-600">Tracking Sessions</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.activeSessionsCount || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-3">
            <div className="flex items-center">
              <FiClock className="text-orange-600 text-xl mr-2" />
              <div>
                <p className="text-xs text-gray-600">Tracked Today</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.activeEmployeesCount || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'map' ? (
          // Map View
          <div className="h-full relative">
            {activeLocations.length > 0 ? (
              <MapContainer
                center={getMapCenter()}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                ref={mapRef}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Active employee markers */}
                {activeLocations.map((location) => (
                  <Marker
                    key={location._id}
                    position={[
                      location.location.coordinates[1],
                      location.location.coordinates[0],
                    ]}
                    icon={createCustomIcon('#3b82f6')}
                    eventHandlers={{
                      click: () => setSelectedEmployee(location),
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold text-lg">{location.employeeDetails.name}</h3>
                        <p className="text-sm text-gray-600">
                          {location.employeeDetails.employeeId}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                          {location.address || 'Loading address...'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Last updated: {getTimeSince(location.createdAt)}
                        </p>
                        {location.accuracy && (
                          <p className="text-xs text-gray-500">
                            Accuracy: ±{Math.round(location.accuracy)}m
                          </p>
                        )}
                      </div>
                    </Popup>

                    {/* Accuracy circle */}
                    {location.accuracy && (
                      <Circle
                        center={[
                          location.location.coordinates[1],
                          location.location.coordinates[0],
                        ]}
                        radius={location.accuracy}
                        pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1 }}
                      />
                    )}
                  </Marker>
                ))}

                {/* Path/route for selected employee */}
                {selectedEmployee && employeeHistory.length > 1 && (
                  <Polyline
                    positions={employeeHistory.map((loc) => [loc.latitude, loc.longitude])}
                    pathOptions={{ color: '#ef4444', weight: 3 }}
                  />
                )}
              </MapContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <FiMapPin className="text-6xl mx-auto mb-4 text-gray-300" />
                  <p className="text-xl font-medium">No active tracking sessions</p>
                  <p className="text-sm mt-2">
                    Employees will appear here when they start location tracking
                  </p>
                </div>
              </div>
            )}

            {/* Selected Employee Panel */}
            {selectedEmployee && (
              <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 w-80 max-h-[80vh] overflow-y-auto z-[1000]">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg">
                      {selectedEmployee.employeeDetails.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {selectedEmployee.employeeDetails.employeeId}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedEmployee.employeeDetails.role}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedEmployee(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600 font-medium">Current Location:</p>
                    <p className="text-gray-800">
                      {selectedEmployee.address || 'Loading address...'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-gray-600">Last Update:</p>
                      <p className="font-medium">
                        {getTimeSince(selectedEmployee.createdAt)}
                      </p>
                    </div>
                    {selectedEmployee.speed > 0 && (
                      <div>
                        <p className="text-gray-600">Speed:</p>
                        <p className="font-medium">
                          {(selectedEmployee.speed * 3.6).toFixed(1)} km/h
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedEmployee.batteryLevel && (
                    <div>
                      <p className="text-gray-600">Battery Level:</p>
                      <div className="flex items-center mt-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              selectedEmployee.batteryLevel > 50
                                ? 'bg-green-500'
                                : selectedEmployee.batteryLevel > 20
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${selectedEmployee.batteryLevel}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 font-medium">
                          {selectedEmployee.batteryLevel}%
                        </span>
                      </div>
                    </div>
                  )}

                  {employeeHistory.length > 0 && (
                    <div>
                      <p className="text-gray-600 font-medium mb-2">
                        Path History ({employeeHistory.length} points):
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {employeeHistory.slice().reverse().slice(0, 10).map((loc, index) => (
                          <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                            <p className="font-medium">{formatTime(loc.timestamp)}</p>
                            <p className="text-gray-600 truncate">{loc.address}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // List View
          <div className="p-6 overflow-y-auto h-full">
            {activeLocations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeLocations.map((location) => (
                  <div
                    key={location._id}
                    className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedEmployee(location);
                      setViewMode('map');
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">
                          {location.employeeDetails.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {location.employeeDetails.employeeId}
                        </p>
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full mt-2">
                          {location.employeeDetails.role}
                        </span>
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {location.employeeDetails.name.charAt(0)}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-start">
                        <FiMapPin className="text-gray-400 mr-2 mt-1 flex-shrink-0" />
                        <p className="text-gray-700 line-clamp-2">
                          {location.address || 'Loading address...'}
                        </p>
                      </div>

                      <div className="flex items-center text-gray-600">
                        <FiClock className="text-gray-400 mr-2 flex-shrink-0" />
                        <p>{getTimeSince(location.createdAt)}</p>
                      </div>

                      {location.batteryLevel && (
                        <div className="flex items-center text-gray-600">
                          <FiActivity className="text-gray-400 mr-2 flex-shrink-0" />
                          <p>Battery: {location.batteryLevel}%</p>
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployee(location);
                          setViewMode('map');
                        }}
                        className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        View on Map
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <FiUsers className="text-6xl mx-auto mb-4 text-gray-300" />
                  <p className="text-xl font-medium">No active employees</p>
                  <p className="text-sm mt-2">
                    Employees will appear here when they start tracking
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveLocationTracking;

