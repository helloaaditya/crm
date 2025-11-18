import { useState, useEffect, useMemo } from 'react'
import { FiClock, FiBriefcase, FiCalendar, FiCheckCircle, FiMapPin, FiGift, FiSearch, FiFilter, FiX, FiNavigation } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import Confetti from 'react-confetti'
import useLocationTracking from '../../hooks/useLocationTracking'
import { requestLocationPermission, checkLocationPermission } from '../../utils/locationPermission'

const MyDashboard = () => {
  const { user } = useAuth()
  const { isTracking, currentLocation, startTracking, stopTracking } = useLocationTracking()
  const [employee, setEmployee] = useState(null) // Add employee state
  const [projects, setProjects] = useState([])
  const [leaves, setLeaves] = useState([])
  const [reminders, setReminders] = useState([])
  const [todayAttendance, setTodayAttendance] = useState(null)
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isBirthday, setIsBirthday] = useState(false)
  
  // Filter and search states for projects
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    role: ''
  })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    // Check if today is user's birthday
    const checkBirthday = (dob) => {
      if (dob) {
        const dobDate = new Date(dob);
        const today = new Date();
        
        // Compare month and date, ignoring year and time
        const isTodayBirthday = 
          dobDate.getMonth() === today.getMonth() && 
          dobDate.getDate() === today.getDate();
          
        if (isTodayBirthday) {
          setIsBirthday(true)
          setShowConfetti(true)
          // Stop confetti after 5 seconds
          setTimeout(() => setShowConfetti(false), 5000)
        }
      }
    }
    
    // Fetch employee profile and check birthday
    const fetchEmployeeProfile = async () => {
      try {
        const response = await API.employees.myProfile()
        const employeeData = response.data.data
        setEmployee(employeeData)
        
        // Check birthday with employee's date of birth
        checkBirthday(employeeData.dateOfBirth)
      } catch (error) {
        console.error('Error fetching employee profile:', error)
        // Fallback to user data if employee profile fails
        checkBirthday(user?.dateOfBirth)
      }
    }
    
    fetchEmployeeProfile()
    fetchDashboardData()
    // Request location permission on page load
    const requestPermission = async () => {
      const permission = await checkLocationPermission()
      if (permission === 'prompt' || permission === 'default') {
        // Show info toast and request permission
        toast.info('Location access is required for attendance tracking. Please allow location access when prompted.', {
          autoClose: 2000
        })
        const result = await requestLocationPermission()
        if (!result.granted) {
          if (result.reason === 'permission_denied') {
            toast.error('Location permission denied. Please enable location permission in your browser settings.', {
              autoClose: 5000
            })
          } else if (result.reason === 'location_disabled') {
            toast.error('Location services are disabled. Please enable location/GPS on your device.', {
              autoClose: 5000
            })
          }
        }
      } else if (permission === 'denied') {
        toast.error('Location permission denied. Please enable location permission in your browser settings.', {
          autoClose: 5000
        })
      }
      // Get location after permission check
      getCurrentLocation()
    }
    requestPermission()
  }, [user])

  // Listen for refresh event from Header
  useEffect(() => {
    const handleRefresh = () => {
      fetchDashboardData()
      fetchEmployeeProfile()
    }

    window.addEventListener('app-refresh', handleRefresh)
    return () => window.removeEventListener('app-refresh', handleRefresh)
  }, [user])

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          
          console.log('📍 Dashboard - Captured coordinates:', latitude, longitude);
          
          // Get human-readable address from backend geocoding service
          try {
            const response = await API.employees.geocode({
              lat: latitude,
              lon: longitude
            });
            
            if (response.data && response.data.success) {
              console.log('📍 Dashboard - Geocoded address:', response.data.data.address);
              setLocation({
                coordinates: response.data.data.coordinates,
                address: response.data.data.address
              });
              return;
            }
          } catch (error) {
            console.log('⚠️ Dashboard - Could not geocode, using coordinates');
          }
          
          // Fallback to coordinates
          const fallbackAddress = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setLocation({
            coordinates: [longitude, latitude],
            address: fallbackAddress
          })
        },
        (error) => {
          console.error('❌ Dashboard - Location error:', error)
          setLocation({
            coordinates: [0, 0],
            address: 'Location not available'
          })
        }
      )
    } else {
      console.log('⚠️ Dashboard - Geolocation not supported');
      setLocation({
        coordinates: [0, 0],
        address: 'Location not available'
      });
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [projectsRes, leavesRes, remindersRes, attendanceRes] = await Promise.all([
        API.employees.myProjects(),
        API.employees.myLeave.get(),
        API.employees.myReminders.get({ status: 'pending' }),
        API.employees.myAttendance.get({
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        })
      ])

      // Add debugging to see what data is being returned
      console.log('Projects data:', projectsRes.data.data.activeProjects);
      
      setProjects(projectsRes.data.data.activeProjects || [])
      setLeaves(leavesRes.data.data || [])
      setReminders(remindersRes.data.data || [])
      
      // Find today's attendance
      const today = new Date().toDateString()
      const todayAtt = attendanceRes.data.data.find(
        a => new Date(a.date).toDateString() === today
      )
      setTodayAttendance(todayAtt)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async () => {
    // Request location permission if not already granted
    const result = await requestLocationPermission()
    if (!result.granted) {
      if (result.reason === 'permission_denied') {
        toast.error('Location permission is required for check-in. Please enable location permission in your browser settings.', {
          autoClose: 7000
        })
      } else if (result.reason === 'location_disabled') {
        toast.error('Location services are disabled. Please enable location/GPS on your device to check in.', {
          autoClose: 7000
        })
      } else {
        toast.error('Could not access your location. Please enable location services and try again.', {
          autoClose: 7000
        })
      }
      return
    }

    if (!location) {
      toast.info('Getting your location...')
      getCurrentLocation()
      // Wait a bit for location to be fetched
      await new Promise(resolve => setTimeout(resolve, 2000))
      if (!location || location.address === 'Location not available') {
        toast.error('Could not get your location. Please ensure location services are enabled and try again.', {
          autoClose: 7000
        })
        return
      }
    }

    console.log('📥 Dashboard - Check-in button clicked');
    console.log('📍 Dashboard - Current location:', location);

    try {
      setLoading(true)
      
      // Mark attendance check-in
      console.log('⏱️ Dashboard - Marking attendance check-in...');
      await API.employees.myAttendance.mark({
        type: 'checkin',
        location: {
          coordinates: location?.coordinates || [0, 0],
          address: location?.address || 'Location not provided'
        }
      })
      console.log('✅ Dashboard - Check-in marked successfully');
      
      // Start live location tracking
      console.log('🎯 Dashboard - Calling startTracking()...');
      startTracking()
      console.log('✅ Dashboard - startTracking() called');
      
      toast.success('Checked in successfully! 🎯 Live tracking started')
      fetchDashboardData()
    } catch (error) {
      console.error('❌ Dashboard - Check-in error:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to check in')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckOut = async () => {
    // Request location permission if not already granted
    const result = await requestLocationPermission()
    if (!result.granted) {
      if (result.reason === 'permission_denied') {
        toast.error('Location permission is required for check-out. Please enable location permission in your browser settings.', {
          autoClose: 7000
        })
      } else if (result.reason === 'location_disabled') {
        toast.error('Location services are disabled. Please enable location/GPS on your device to check out.', {
          autoClose: 7000
        })
      } else {
        toast.error('Could not access your location. Please enable location services and try again.', {
          autoClose: 7000
        })
      }
      return
    }

    if (!location) {
      toast.info('Getting your location...')
      getCurrentLocation()
      // Wait a bit for location to be fetched
      await new Promise(resolve => setTimeout(resolve, 2000))
      if (!location || location.address === 'Location not available') {
        toast.error('Could not get your location. Please ensure location services are enabled and try again.', {
          autoClose: 7000
        })
        return
      }
    }

    console.log('📤 Dashboard - Check-out button clicked');
    console.log('📍 Dashboard - Current location:', location);

    try {
      setLoading(true)
      
      // Mark attendance check-out
      console.log('⏱️ Dashboard - Marking attendance check-out...');
      await API.employees.myAttendance.mark({
        type: 'checkout',
        location: {
          coordinates: location?.coordinates || [0, 0],
          address: location?.address || 'Location not provided'
        }
      })
      console.log('✅ Dashboard - Check-out marked successfully');
      
      // Stop live location tracking
      console.log('🛑 Dashboard - Calling stopTracking()...');
      await stopTracking()
      console.log('✅ Dashboard - stopTracking() called');
      
      toast.success('Checked out successfully! 🛑 Tracking stopped')
      fetchDashboardData()
    } catch (error) {
      console.error('❌ Dashboard - Check-out error:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to check out')
    } finally {
      setLoading(false)
    }
  }

  // Get unique values for filter options
  const uniqueStatuses = useMemo(() => {
    const statuses = projects.map(p => p.project?.status).filter(Boolean)
    return [...new Set(statuses)]
  }, [projects])

  const uniqueRoles = useMemo(() => {
    const roles = projects.map(p => p.role).filter(Boolean)
    return [...new Set(roles)]
  }, [projects])

  // Filter projects
  const filteredProjects = useMemo(() => {
    let result = [...projects]
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(p => 
        (p.project?.projectId && p.project.projectId.toLowerCase().includes(term)) ||
        (p.project?.description && p.project.description.toLowerCase().includes(term))
      )
    }
    
    // Apply filters
    if (filters.status) {
      result = result.filter(p => p.project?.status === filters.status)
    }
    if (filters.role) {
      result = result.filter(p => p.role === filters.role)
    }
    
    return result
  }, [projects, searchTerm, filters])

  const clearFilters = () => {
    setFilters({
      status: '',
      role: ''
    })
    setSearchTerm('')
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Birthday Confetti */}
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={true}
          numberOfPieces={200}
        />
      )}

      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">My Dashboard</h1>

      {/* Birthday Wish Card */}
      {isBirthday && (
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 shadow-lg animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center">
            <FiGift className="text-4xl sm:text-5xl mr-0 sm:mr-4 mb-2 sm:mb-0" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">🎉 Happy Birthday, {user?.name}! 🎂</h2>
              <p className="text-base sm:text-lg mt-2">Wishing you a fantastic day filled with joy and success!</p>
              <p className="text-xs sm:text-sm mt-1 opacity-90">- Team Sanjana CRM</p>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold">Welcome back, {user?.name}!</h2>
        <p className="text-blue-100 mt-1 text-sm sm:text-base">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Attendance Card */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600">Today's Attendance</h3>
            <FiClock className="text-blue-500" size={20} />
          </div>
          {todayAttendance ? (
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {todayAttendance.checkInTime ? 'Checked In' : 'Not Marked'}
              </p>
              {todayAttendance.checkInTime && (
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(todayAttendance.checkInTime).toLocaleTimeString()}
                </p>
              )}
              {todayAttendance.checkOutTime && (
                <p className="text-sm text-green-600 mt-1">
                  Out: {new Date(todayAttendance.checkOutTime).toLocaleTimeString()}
                </p>
              )}
              
              {/* Live Tracking Indicator */}
              {isTracking && !todayAttendance.checkOutTime && (
                <div className="mt-2 flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                  <FiNavigation className="animate-pulse" size={16} />
                  <span className="text-xs font-medium">Live Tracking Active</span>
                  {currentLocation && (
                    <span className="text-xs bg-green-100 px-2 py-0.5 rounded">
                      {Math.round(currentLocation.accuracy)}m
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-2xl font-bold text-gray-400">Not Marked</p>
          )}
          <div className="mt-4 space-x-2">
            {!todayAttendance?.checkInTime && (
              <button
                onClick={handleCheckIn}
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                Check In
              </button>
            )}
            {todayAttendance?.checkInTime && !todayAttendance?.checkOutTime && (
              <button
                onClick={handleCheckOut}
                disabled={loading}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                Check Out
              </button>
            )}
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Active Projects</h3>
            <FiBriefcase className="text-purple-500" size={24} />
          </div>
          <p className="text-2xl font-bold text-gray-800">{projects.length}</p>
          <p className="text-sm text-gray-500 mt-1">Projects assigned</p>
        </div>

        {/* Pending Leaves */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Leave Requests</h3>
            <FiCalendar className="text-orange-500" size={24} />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {leaves.filter(l => l.status === 'pending').length}
          </p>
          <p className="text-sm text-gray-500 mt-1">Pending approval</p>
        </div>

        {/* Reminders */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Reminders</h3>
            <FiCheckCircle className="text-green-500" size={24} />
          </div>
          <p className="text-2xl font-bold text-gray-800">{reminders.length}</p>
          <p className="text-sm text-gray-500 mt-1">Pending tasks</p>
        </div>
      </div>

      {/* Recent Projects */}
      {projects.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-800">My Projects</h2>
              
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Search */}
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
                
                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  <FiFilter size={14} />
                  Filters
                  {(filters.status || filters.role) && (
                    <span className="bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {Object.values(filters).filter(Boolean).length}
                    </span>
                  )}
                </button>
              </div>
            </div>
            
            {/* Filter Panel */}
            {showFilters && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Filter Projects</span>
                  <button
                    onClick={clearFilters}
                    className="text-xs text-primary hover:text-primary-dark flex items-center gap-1"
                  >
                    <FiX size={12} />
                    Clear
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {/* Status Filter */}
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">All Statuses</option>
                    {uniqueStatuses.map(status => (
                      <option key={status} value={status}>
                        {status?.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                  
                  {/* Role Filter */}
                  <select
                    value={filters.role}
                    onChange={(e) => setFilters({...filters, role: e.target.value})}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">All Roles</option>
                    {uniqueRoles.map(role => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-6">
            {filteredProjects.length > 0 ? (
              <div className="space-y-4">
                {filteredProjects.slice(0, 5).map((ap) => (
                  <div key={ap._id} className="flex items-center justify-between p-4 bg-gray-50 rounded">
                    <div>
                      <h3 className="font-medium text-gray-800">{ap.project?.projectId}</h3>
                      <p className="text-sm text-gray-600">{ap.project?.description}</p>
                      <p className="text-xs text-gray-500 mt-1">Role: {ap.role}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full ${
                      ap.project?.status === 'completed' ? 'bg-green-100 text-green-800' :
                      ap.project?.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {ap.project?.status?.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600">
                  {searchTerm || filters.status || filters.role
                    ? 'No projects match your filters'
                    : 'No projects found'}
                </p>
                {(searchTerm || filters.status || filters.role) && (
                  <button
                    onClick={clearFilters}
                    className="mt-2 text-primary hover:text-primary-dark text-sm"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Location Status */}
      {location && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center text-green-600">
            <FiMapPin className="mr-2" />
            <span className="text-sm">Location: {location.address}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyDashboard