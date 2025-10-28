import { useState, useEffect } from 'react'
import { FiClock, FiMapPin, FiCalendar, FiCheckCircle } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'

function MyAttendance() {
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [todayAttendance, setTodayAttendance] = useState(null)
  const [location, setLocation] = useState(null)
  const [stats, setStats] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    totalLeaves: 0,
    totalHalfDays: 0
  })

  useEffect(() => {
    fetchAttendance()
    getCurrentLocation()
  }, [selectedMonth, selectedYear])

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          
          console.log('Captured coordinates:', latitude, longitude);
          
          // Get human-readable address from our backend geocoding service
          try {
            const response = await API.employees.geocode({
              lat: latitude,
              lon: longitude
            });
            
            console.log('Geocoding response:', response);
            
            if (response.data && response.data.success) {
              console.log('Geocoded address:', response.data.data.address);
              setLocation({
                coordinates: response.data.data.coordinates,
                address: response.data.data.address
              });
              return;
            } else {
              console.log('Geocoding API returned error:', response.data?.message);
            }
          } catch (error) {
            console.log('Could not get address from geocoding service, using coordinates as text:', error);
          }
          
          // Fallback to coordinates if geocoding fails
          const fallbackAddress = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          console.log('Using fallback address:', fallbackAddress);
          setLocation({
            coordinates: [longitude, latitude],
            address: fallbackAddress
          })
        },
        (error) => {
          console.error('Error getting location:', error)
          // Set a default location text if geolocation fails
          setLocation({
            coordinates: [0, 0],
            address: 'Location not available'
          })
        }
      )
    } else {
      console.log('Geolocation is not supported by this browser');
      setLocation({
        coordinates: [0, 0],
        address: 'Location not available'
      });
    }
  }

  const fetchAttendance = async () => {
    try {
      setLoading(true)
      const response = await API.employees.myAttendance.get({
        month: selectedMonth,
        year: selectedYear
      })
      
      const records = response.data.data || []
      setAttendanceRecords(records)
      
      // Find today's attendance
      const today = new Date().toDateString()
      const todayRecord = records.find(
        r => new Date(r.date).toDateString() === today
      )
      setTodayAttendance(todayRecord)

      // Calculate stats
      const stats = {
        totalPresent: records.filter(r => r.status === 'present').length,
        totalAbsent: records.filter(r => r.status === 'absent').length,
        totalLeaves: records.filter(r => r.status === 'leave').length,
        totalHalfDays: records.filter(r => r.status === 'half_day').length
      }
      setStats(stats)
    } catch (error) {
      console.error('Error fetching attendance:', error)
      toast.error('Failed to fetch attendance records')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async () => {
    if (!location) {
      toast.error('Please enable location access')
      getCurrentLocation()
      return
    }

    console.log('Sending location data for check-in:', location);

    try {
      setLoading(true)
      await API.employees.myAttendance.mark({
        type: 'checkin',
        location: {
          coordinates: location?.coordinates || [0, 0],
          address: location?.address || 'Location not provided'
        }
      })
      toast.success('Checked in successfully!')
      fetchAttendance()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to check in')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckOut = async () => {
    if (!location) {
      toast.error('Please enable location access')
      getCurrentLocation()
      return
    }

    console.log('Sending location data for check-out:', location);

    try {
      setLoading(true)
      await API.employees.myAttendance.mark({
        type: 'checkout',
        location: {
          coordinates: location?.coordinates || [0, 0],
          address: location?.address || 'Location not provided'
        }
      })
      toast.success('Checked out successfully!')
      fetchAttendance()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to check out')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      present: 'bg-green-100 text-green-800',
      absent: 'bg-red-100 text-red-800',
      half_day: 'bg-yellow-100 text-yellow-800',
      leave: 'bg-blue-100 text-blue-800',
      holiday: 'bg-purple-100 text-purple-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Attendance</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Track your attendance and working hours</p>
        </div>
        
        {/* Month/Year Selector */}
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg"
          >
            {months.map((month, index) => (
              <option key={index} value={index + 1}>{month}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg"
          >
            {[2023, 2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Today's Attendance Card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Today's Status</h2>
            {todayAttendance ? (
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-sm">
                    {todayAttendance.checkInTime && (
                      <>✓ In: {new Date(todayAttendance.checkInTime).toLocaleTimeString()}</>
                    )}
                  </span>
                  {todayAttendance.checkOutTime && (
                    <span className="text-sm">
                      ✓ Out: {new Date(todayAttendance.checkOutTime).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                {todayAttendance.workHours && (
                  <p className="text-sm">Work Hours: {todayAttendance.workHours.toFixed(2)} hrs</p>
                )}
              </div>
            ) : (
              <p>Not marked yet</p>
            )}
          </div>
          <div className="flex gap-2">
            {!todayAttendance?.checkInTime && (
              <button
                onClick={handleCheckIn}
                disabled={loading}
                className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 disabled:opacity-50"
              >
                Check In
              </button>
            )}
            {todayAttendance?.checkInTime && !todayAttendance?.checkOutTime && (
              <button
                onClick={handleCheckOut}
                disabled={loading}
                className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 disabled:opacity-50"
              >
                Check Out
              </button>
            )}
            {todayAttendance?.checkOutTime && (
              <div className="flex items-center px-6 py-3 bg-green-500 rounded-lg">
                <FiCheckCircle className="mr-2" />
                Completed
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Present Days</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalPresent}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <FiCheckCircle className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Absent Days</p>
              <p className="text-2xl font-bold text-red-600">{stats.totalAbsent}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <FiClock className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Leave Days</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalLeaves}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <FiCalendar className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Half Days</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.totalHalfDays}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <FiClock className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Records */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            Attendance History - {months[selectedMonth - 1]} {selectedYear}
          </h2>
        </div>
        <div className="p-6">
          {loading ? (
            <p className="text-center text-gray-600">Loading...</p>
          ) : attendanceRecords.length === 0 ? (
            <p className="text-center text-gray-600">No attendance records found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Check In</th>
                    <th className="text-left py-3 px-4">Check Out</th>
                    <th className="text-left py-3 px-4">Work Hours</th>
                    <th className="text-left py-3 px-4">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((record, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {record.workHours ? `${record.workHours.toFixed(2)} hrs` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {record.checkInLocation?.address && record.checkInLocation.address !== 'Location not provided' ? (
                          <div className="flex items-center text-sm text-gray-600">
                            <FiMapPin className="mr-1" size={14} />
                            <span className="truncate max-w-xs">{record.checkInLocation.address}</span>
                          </div>
                        ) : record.checkInLocation?.coordinates ? (
                          <div className="flex items-center text-sm text-gray-600">
                            <FiMapPin className="mr-1" size={14} />
                            <span className="truncate max-w-xs">
                              {record.checkInLocation.coordinates[1].toFixed(4)}, {record.checkInLocation.coordinates[0].toFixed(4)}
                            </span>
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Location Status */}
      {location && (
        <div className="mt-4 bg-white rounded-lg shadow p-4">
          <div className="flex items-center text-green-600">
            <FiMapPin className="mr-2" />
            <span className="text-sm">GPS Location Active: {location.address}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyAttendance
