import { useState, useEffect } from 'react';
import { FiMapPin, FiNavigation, FiClock, FiActivity, FiBattery, FiPlay, FiPause } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLocationTracking from '../../hooks/useLocationTracking';
import { useAuth } from '../../context/AuthContext';

const MyLocationTracking = () => {
  const { user } = useAuth();
  const [shouldTrack, setShouldTrack] = useState(false);
  const {
    isTracking,
    currentLocation,
    locationHistory,
    error,
    sessionId,
    startTracking,
    stopTracking,
  } = useLocationTracking(shouldTrack);

  // Auto-start tracking if user has active attendance
  useEffect(() => {
    // Check if employee is checked in
    const isCheckedIn = localStorage.getItem('attendance_session');
    if (isCheckedIn) {
      setShouldTrack(true);
    }
  }, []);

  const handleStartTracking = async () => {
    setShouldTrack(true);
    localStorage.setItem('location_tracking_active', 'true');
  };

  const handleStopTracking = async () => {
    if (window.confirm('Are you sure you want to stop location tracking?')) {
      setShouldTrack(false);
      localStorage.removeItem('location_tracking_active');
    }
  };

  // Format time
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Calculate total distance traveled
  const calculateTotalDistance = () => {
    if (locationHistory.length < 2) return 0;

    let total = 0;
    for (let i = 1; i < locationHistory.length; i++) {
      const prev = locationHistory[i - 1];
      const curr = locationHistory[i];

      const R = 6371e3; // Earth radius in meters
      const φ1 = (prev.latitude * Math.PI) / 180;
      const φ2 = (curr.latitude * Math.PI) / 180;
      const Δφ = ((curr.latitude - prev.latitude) * Math.PI) / 180;
      const Δλ = ((curr.longitude - prev.longitude) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      total += R * c;
    }

    return (total / 1000).toFixed(2); // Convert to kilometers
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">My Location Tracking</h1>
              <p className="text-sm text-gray-600 mt-1">
                Track your location during work hours
              </p>
            </div>

            {/* Tracking Control */}
            <div>
              {!isTracking ? (
                <button
                  onClick={handleStartTracking}
                  className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md"
                >
                  <FiPlay className="mr-2" />
                  Start Tracking
                </button>
              ) : (
                <button
                  onClick={handleStopTracking}
                  className="flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md"
                >
                  <FiPause className="mr-2" />
                  Stop Tracking
                </button>
              )}
            </div>
          </div>

          {/* Status Indicator */}
          <div className="mt-4 p-4 rounded-lg bg-gray-50">
            <div className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full mr-3 ${
                  isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`}
              ></div>
              <span className="font-medium text-gray-700">
                {isTracking ? 'Tracking Active' : 'Tracking Inactive'}
              </span>
              {isTracking && sessionId && (
                <span className="ml-auto text-xs text-gray-500">
                  Session: {sessionId.slice(-8)}
                </span>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}
        </div>

        {/* Current Location Card */}
        {isTracking && currentLocation && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <FiMapPin className="mr-2 text-blue-600" />
              Current Location
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Location Details */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium mb-1">Address</p>
                  <p className="text-gray-800">
                    {currentLocation.address || 'Loading address...'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Latitude</p>
                    <p className="text-gray-800 font-mono text-sm">
                      {currentLocation.latitude.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                      Longitude
                    </p>
                    <p className="text-gray-800 font-mono text-sm">
                      {currentLocation.longitude.toFixed(6)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium mb-1">Accuracy</p>
                  <p className="text-gray-800">±{Math.round(currentLocation.accuracy)} meters</p>
                </div>
              </div>

              {/* Live Stats */}
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                  <FiClock className="text-blue-600 text-xl mr-3" />
                  <div>
                    <p className="text-xs text-gray-600">Last Updated</p>
                    <p className="font-medium text-gray-800">
                      {formatTime(currentLocation.timestamp)}
                    </p>
                  </div>
                </div>

                {currentLocation.speed > 0 && (
                  <div className="flex items-center p-3 bg-green-50 rounded-lg">
                    <FiNavigation className="text-green-600 text-xl mr-3" />
                    <div>
                      <p className="text-xs text-gray-600">Speed</p>
                      <p className="font-medium text-gray-800">
                        {(currentLocation.speed * 3.6).toFixed(1)} km/h
                      </p>
                    </div>
                  </div>
                )}

                {currentLocation.batteryLevel && (
                  <div className="flex items-center p-3 bg-purple-50 rounded-lg">
                    <FiBattery className="text-purple-600 text-xl mr-3" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-600">Battery Level</p>
                      <div className="flex items-center mt-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              currentLocation.batteryLevel > 50
                                ? 'bg-green-500'
                                : currentLocation.batteryLevel > 20
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${currentLocation.batteryLevel}%` }}
                          ></div>
                        </div>
                        <span className="font-medium text-gray-800 text-sm">
                          {currentLocation.batteryLevel}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Google Maps Link */}
            <div className="mt-4">
              <a
                href={`https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                View on Google Maps
              </a>
            </div>
          </div>
        )}

        {/* Tracking Summary */}
        {isTracking && locationHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <FiActivity className="mr-2 text-green-600" />
              Tracking Summary
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600 uppercase font-medium">Total Points</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {locationHistory.length}
                </p>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-600 uppercase font-medium">Distance Traveled</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {calculateTotalDistance()} km
                </p>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-xs text-gray-600 uppercase font-medium">Duration</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">
                  {Math.floor(
                    (new Date() - new Date(locationHistory[0].timestamp)) / (1000 * 60)
                  )}{' '}
                  min
                </p>
              </div>

              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-xs text-gray-600 uppercase font-medium">Avg Speed</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {locationHistory.length > 1
                    ? (
                        (parseFloat(calculateTotalDistance()) /
                          ((new Date() - new Date(locationHistory[0].timestamp)) /
                            (1000 * 60 * 60))) ||
                        0
                      ).toFixed(1)
                    : '0'}{' '}
                  km/h
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Location History */}
        {isTracking && locationHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Location History</h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {locationHistory
                .slice()
                .reverse()
                .map((loc, index) => (
                  <div
                    key={index}
                    className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="mr-3 mt-1">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <FiMapPin className="text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{formatTime(loc.timestamp)}</p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {loc.address || `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`}
                      </p>
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View
                    </a>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Info Card for Inactive Tracking */}
        {!isTracking && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center text-gray-500">
              <FiMapPin className="text-6xl mx-auto mb-4 text-gray-300" />
              <p className="text-xl font-medium mb-2">Location Tracking Inactive</p>
              <p className="text-sm mb-6">
                Start tracking to record your location during work hours
              </p>
              <div className="text-left max-w-md mx-auto bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">How it works:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Click "Start Tracking" to begin</li>
                  <li>• Your location is recorded every 30 seconds</li>
                  <li>• Tracking continues even in background</li>
                  <li>• Your path and activities are logged</li>
                  <li>• Click "Stop Tracking" when done</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyLocationTracking;

