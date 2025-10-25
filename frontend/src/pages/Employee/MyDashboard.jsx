import { useState, useEffect } from 'react'
import { FiClock, FiMapPin, FiCheckCircle, FiCalendar, FiBriefcase, FiDollarSign, FiGift } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import Confetti from 'react-confetti'

function MyDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [todayAttendance, setTodayAttendance] = useState(null)
  const [projects, setProjects] = useState([])
  const [leaves, setLeaves] = useState([])
  const [reminders, setReminders] = useState([])
  const [location, setLocation] = useState(null)
  const [isBirthday, setIsBirthday] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [employeeData, setEmployeeData] = useState(null)

  useEffect(() => {
    fetchDashboardData()
    getCurrentLocation()
    checkBirthday()
  }, [])

  const checkBirthday = async () => {
    try {
      // Use the new myProfile endpoint to get current employee data
      const response = await API.employees.myProfile()
      const currentEmployee = response.data.data
      
      if (currentEmployee) {
        setEmployeeData(currentEmployee)
        
        if (currentEmployee.dateOfBirth) {
          const today = new Date()
          const dob = new Date(currentEmployee.dateOfBirth)
          
          if (today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate()) {
            setIsBirthday(true)
            setShowConfetti(true)
            
            // Stop confetti after 10 seconds
            setTimeout(() => setShowConfetti(false), 10000)
          }
        }
      }
    } catch (error) {
      console.error('Error checking birthday:', error)
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            coordinates: [position.coords.longitude, position.coords.latitude],
            address: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
          })
        },
        (error) => {
          console.error('Error getting location:', error)
          toast.error('Please enable location access')
        }
      )
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [projectsRes, leavesRes, remindersRes, attendanceRes] = await Promise.all([
        API.employees.myProjects(),
        API.employees.getMyLeaves(),
        API.employees.getMyReminders({ status: 'pending' }),
        API.employees.myAttendance.get({
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        })
      ])

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
    if (!location) {
      toast.error('Please enable location access')
      getCurrentLocation()
      return
    }

    try {
      setLoading(true)
      await API.employees.myAttendance.mark({
        type: 'checkin',
        location: location
      })
      toast.success('Checked in successfully!')
      fetchDashboardData()
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

    try {
      setLoading(true)
      await API.employees.myAttendance.mark({
        type: 'checkout',
        location: location
      })
      toast.success('Checked out successfully!')
      fetchDashboardData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to check out')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      {/* Birthday Confetti */}
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={true}
          numberOfPieces={200}
        />
      )}

      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Dashboard</h1>

      {/* Birthday Wish Card */}
      {isBirthday && (
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white rounded-lg p-6 mb-6 shadow-lg animate-pulse">
          <div className="flex items-center">
            <FiGift className="text-5xl mr-4" />
            <div>
              <h2 className="text-2xl font-bold">🎉 Happy Birthday, {user?.name}! 🎂</h2>
              <p className="text-lg mt-2">Wishing you a fantastic day filled with joy and success!</p>
              <p className="text-sm mt-1 opacity-90">- Team Sanjana CRM</p>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold">Welcome back, {user?.name}!</h2>
        <p className="text-blue-100 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {/* Attendance Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Today's Attendance</h3>
            <FiClock className="text-blue-500" size={24} />
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
            <h2 className="text-lg font-semibold text-gray-800">My Projects</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {projects.slice(0, 5).map((ap) => (
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
                    {ap.project?.status}
                  </span>
                </div>
              ))}
            </div>
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
