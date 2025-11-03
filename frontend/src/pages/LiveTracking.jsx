import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiRefreshCw, FiUser, FiMapPin, FiClock, FiNavigation, FiCalendar, FiUsers } from 'react-icons/fi';
import API from '../api';
import { toast } from 'react-toastify';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for active employees
const activeEmployeeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to auto-fit map bounds
function MapBounds({ locations }) {
  const map = useMap();
  
  useEffect(() => {
    if (locations && locations.length > 0) {
      const bounds = locations.map(loc => [
        loc.location.coordinates[1], // latitude
        loc.location.coordinates[0]  // longitude
      ]);
      
      if (bounds.length === 1) {
        map.setView(bounds[0], 13);
      } else {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [locations, map]);
  
  return null;
}

const LiveTracking = () => {
  const [activeLocations, setActiveLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [historicalRoute, setHistoricalRoute] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [stats, setStats] = useState({
    currentlyActive: 0,
    today: {
      totalLocations: 0,
      activeEmployeesCount: 0,
      activeSessionsCount: 0
    }
  });
  const intervalRef = useRef(null);

  // Fetch active locations
  const fetchActiveLocations = async () => {
    try {
      const response = await API.locationTracking.getActiveLocations();
      setActiveLocations(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch active locations:', error);
    }
  };

  // Fetch all employees
  const fetchEmployees = async () => {
    try {
      const response = await API.employees.getAll({ fields: '_id employeeId name role' });
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  // Fetch tracking stats
  const fetchStats = async () => {
    try {
      const response = await API.locationTracking.getStats();
      setStats(response.data.data || stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Fetch historical route for selected employee and date
  const fetchHistoricalRoute = async (employeeId, date) => {
    try {
      setLoading(true);
      const response = await API.locationTracking.getHistory(employeeId, { date });
      const sessions = response.data.data || [];
      
      // If there are multiple sessions, combine their locations
      let allLocations = [];
      sessions.forEach(session => {
        if (session.locations && Array.isArray(session.locations)) {
          allLocations = [...allLocations, ...session.locations];
        }
      });
      
      setHistoricalRoute(allLocations);
      
      if (allLocations.length === 0) {
        toast.info(`No tracking data found for ${date}`);
      } else {
        toast.success(`Loaded ${allLocations.length} location points`);
      }
    } catch (error) {
      console.error('Failed to fetch historical route:', error);
      toast.error('Failed to load route history');
    } finally {
      setLoading(false);
    }
  };

  // Handle employee selection for historical view
  const handleEmployeeSelect = (employeeId) => {
    setSelectedEmployee(employeeId);
    if (employeeId) {
      fetchHistoricalRoute(employeeId, selectedDate);
    } else {
      setHistoricalRoute([]);
    }
  };

  // Handle date change
  const handleDateChange = (date) => {
    setSelectedDate(date);
    if (selectedEmployee) {
      fetchHistoricalRoute(selectedEmployee, date);
    }
  };

  // Manual refresh
  const handleRefresh = () => {
    fetchActiveLocations();
    fetchStats();
    if (selectedEmployee) {
      fetchHistoricalRoute(selectedEmployee, selectedDate);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchActiveLocations();
    fetchEmployees();
    fetchStats();
  }, []);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchActiveLocations();
        fetchStats();
      }, 15000); // 15 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh]);

  // Get map center - default to first active location or India center
  const getMapCenter = () => {
    if (historicalRoute.length > 0) {
      return [historicalRoute[0].latitude, historicalRoute[0].longitude];
    }
    if (activeLocations.length > 0) {
      return [
        activeLocations[0].location.coordinates[1],
        activeLocations[0].location.coordinates[0]
      ];
    }
    return [20.5937, 78.9629]; // Center of India
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Live Employee Tracking</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Real-time location monitoring & route history</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <FiRefreshCw className="mr-2" />
            Refresh
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center px-4 py-2 rounded-lg ${
              autoRefresh ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'
            }`}
          >
            {autoRefresh ? '🔄 Auto' : '⏸️ Manual'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Currently Tracking</p>
              <p className="text-2xl font-bold text-green-600">{stats.currentlyActive}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <FiNavigation className="text-green-600 animate-pulse" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Today</p>
              <p className="text-2xl font-bold text-blue-600">{stats.today.activeEmployeesCount}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <FiUsers className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sessions Today</p>
              <p className="text-2xl font-bold text-purple-600">{stats.today.activeSessionsCount}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <FiClock className="text-purple-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Location Updates</p>
              <p className="text-2xl font-bold text-orange-600">{stats.today.totalLocations}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <FiMapPin className="text-orange-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Historical Route Viewer */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">📍 View Historical Route</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Employee</label>
            <select
              value={selectedEmployee || ''}
              onChange={(e) => handleEmployeeSelect(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Employee --</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.employeeId} - {emp.name} ({emp.role})
                </option>
              ))}
            </select>
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
        {historicalRoute.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
            <p className="text-sm text-blue-800">
              📊 <strong>{historicalRoute.length} location points</strong> recorded on {selectedDate}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Route shown in blue on the map below
            </p>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '600px' }}>
        <MapContainer
          center={getMapCenter()}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Auto-fit bounds */}
          <MapBounds locations={activeLocations.length > 0 ? activeLocations : []} />
          
          {/* Active employee markers */}
          {activeLocations.map((loc, index) => (
            <Marker
              key={`active-${index}`}
              position={[loc.location.coordinates[1], loc.location.coordinates[0]]}
              icon={activeEmployeeIcon}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-lg">{loc.employeeDetails.name}</h3>
                  <p className="text-sm text-gray-600">{loc.employeeDetails.employeeId} • {loc.employeeDetails.role}</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <p><strong>Accuracy:</strong> {Math.round(loc.accuracy)}m</p>
                    {loc.speed && <p><strong>Speed:</strong> {(loc.speed * 3.6).toFixed(1)} km/h</p>}
                    {loc.batteryLevel && <p><strong>Battery:</strong> {loc.batteryLevel}%</p>}
                    <p><strong>Last Update:</strong> {new Date(loc.createdAt).toLocaleTimeString()}</p>
                    {loc.address && <p><strong>Location:</strong> {loc.address}</p>}
                  </div>
                  <div className="mt-2 flex items-center text-green-600">
                    <FiNavigation className="mr-1 animate-pulse" size={14} />
                    <span className="text-xs font-medium">Live Tracking</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          
          {/* Historical route */}
          {historicalRoute.length > 0 && (
            <>
              {/* Draw polyline for route */}
              <Polyline
                positions={historicalRoute.map(loc => [loc.latitude, loc.longitude])}
                color="blue"
                weight={3}
                opacity={0.7}
              />
              
              {/* Start marker */}
              <Marker
                position={[historicalRoute[0].latitude, historicalRoute[0].longitude]}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold">🚀 Start</h3>
                    <p className="text-xs">{new Date(historicalRoute[0].timestamp).toLocaleTimeString()}</p>
                  </div>
                </Popup>
              </Marker>
              
              {/* End marker */}
              <Marker
                position={[
                  historicalRoute[historicalRoute.length - 1].latitude,
                  historicalRoute[historicalRoute.length - 1].longitude
                ]}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold">🏁 End</h3>
                    <p className="text-xs">
                      {new Date(historicalRoute[historicalRoute.length - 1].timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </Popup>
              </Marker>
            </>
          )}
        </MapContainer>
      </div>

      {/* Active Employees List */}
      {activeLocations.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-800">🟢 Currently Tracked Employees</h2>
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
                      <FiNavigation className="animate-pulse" size={16} />
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t text-xs space-y-1">
                    <p className="flex justify-between">
                      <span className="text-gray-600">Accuracy:</span>
                      <span className="font-medium">{Math.round(loc.accuracy)}m</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-600">Last Update:</span>
                      <span className="font-medium">{new Date(loc.createdAt).toLocaleTimeString()}</span>
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

      {/* Empty state */}
      {activeLocations.length === 0 && !loading && (
        <div className="mt-6 bg-white rounded-lg shadow p-12 text-center">
          <FiMapPin className="mx-auto text-gray-400 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Active Tracking</h3>
          <p className="text-gray-600">
            No employees are currently being tracked. Employees will appear here once they check in.
          </p>
        </div>
      )}
    </div>
  );
};

export default LiveTracking;

