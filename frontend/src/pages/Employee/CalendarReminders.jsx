import { useState, useEffect, useContext } from 'react'
import { FiBell, FiPlus, FiCheck, FiX, FiClock, FiDollarSign, FiFilter, FiVideo, FiTrash2 } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'
import { AuthContext } from '../../context/AuthContext'

function CalendarReminders() {
  const { user } = useContext(AuthContext)
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [birthdays, setBirthdays] = useState([]) // For storing employee birthdays
  const [formData, setFormData] = useState({
    title: '',
    type: 'vendor_payment',
    date: '',
    amount: '',
    description: '',
    priority: 'medium',
    recurring: { enabled: false, frequency: 'monthly' },
    googleMeetLink: '' // Add Google Meet link field
  })

  useEffect(() => {
    fetchReminders()
    fetchUpcomingBirthdays() // Fetch birthdays on component mount
  }, [filterType, filterStatus])

  const fetchReminders = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filterType) params.type = filterType
      if (filterStatus) params.status = filterStatus
      
      const response = await API.employees.myReminders.get(params)
      setReminders(response.data.data)
    } catch (error) {
      console.error('Error fetching reminders:', error)
      toast.error('Failed to fetch reminders')
    } finally {
      setLoading(false)
    }
  }

  // Fetch employee birthdays for the next 30 days
  const fetchUpcomingBirthdays = async () => {
    try {
      if (!user) return;
      
      const today = new Date()
      const next30Days = new Date()
      next30Days.setDate(today.getDate() + 30)
      
      let upcomingBirthdays = [];
      
      // Check if user is admin
      const isAdmin = user && (user.role === 'admin' || user.role === 'main_admin');
      
      if (isAdmin) {
        // For admins, try to fetch all employees
        try {
          const response = await API.employees.getAll({ limit: 1000 })
          const employees = response.data.data
          
          upcomingBirthdays = employees
            .filter(employee => employee.dateOfBirth)
            .map(employee => {
              const dob = new Date(employee.dateOfBirth)
              // Create a date for this year's birthday
              const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
              // If this year's birthday has passed, use next year
              if (thisYearBirthday < today) {
                thisYearBirthday.setFullYear(today.getFullYear() + 1)
              }
              return { ...employee, birthdayThisYear: thisYearBirthday }
            })
            .filter(employee => {
              return employee.birthdayThisYear >= today && employee.birthdayThisYear <= next30Days
            })
            .sort((a, b) => a.birthdayThisYear - b.birthdayThisYear)
        } catch (adminError) {
          console.error('Error fetching all employees for birthdays:', adminError)
          // Fall back to current user's birthday only
          upcomingBirthdays = await getCurrentUserBirthday(today, next30Days);
        }
      } else {
        // For regular employees, only show their own birthday
        upcomingBirthdays = await getCurrentUserBirthday(today, next30Days);
      }
      
      setBirthdays(upcomingBirthdays)
    } catch (error) {
      console.error('Error fetching birthdays:', error)
      // Don't show error to user as this is not critical
      setBirthdays([])
    }
  }
  
  // Helper function to get current user's birthday
  const getCurrentUserBirthday = async (today, next30Days) => {
    try {
      // Get current employee's profile
      const profileResponse = await API.employees.myProfile()
      const employee = profileResponse.data.data
      
      // Check if employee has a date of birth
      if (employee.dateOfBirth) {
        const dob = new Date(employee.dateOfBirth)
        // Create a date for this year's birthday
        const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
        // If this year's birthday has passed, use next year
        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(today.getFullYear() + 1)
        }
        
        // Check if birthday is within the next 30 days
        if (thisYearBirthday >= today && thisYearBirthday <= next30Days) {
          return [{
            _id: employee._id,
            name: employee.name,
            birthdayThisYear: thisYearBirthday
          }]
        }
      }
    } catch (error) {
      console.error('Error fetching current user birthday:', error)
    }
    return []
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      await API.employees.myReminders.create(formData)
      toast.success('Reminder created successfully')
      setShowModal(false)
      setFormData({
        title: '',
        type: 'vendor_payment',
        date: '',
        amount: '',
        description: '',
        priority: 'medium',
        recurring: { enabled: false, frequency: 'monthly' },
        googleMeetLink: '' // Reset Google Meet link
      })
      fetchReminders()
    } catch (error) {
      toast.error('Failed to create reminder')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async (id) => {
    try {
      await API.employees.myReminders.update(id, { status: 'completed' })
      toast.success('Reminder marked as completed')
      fetchReminders()
    } catch (error) {
      toast.error('Failed to update reminder')
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this reminder?')) return
    try {
      await API.employees.myReminders.update(id, { status: 'cancelled' })
      toast.success('Reminder cancelled')
      fetchReminders()
    } catch (error) {
      toast.error('Failed to cancel reminder')
    }
  }

  const handleResetReminders = async () => {
    if (!window.confirm('Are you sure you want to delete all your calendar reminders? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true)
      const response = await API.employees.myReminders.reset()
      toast.success(response.data.message)
      fetchReminders() // Refresh the reminders list
    } catch (error) {
      console.error('Error resetting reminders:', error)
      toast.error('Failed to reset reminders: ' + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  // Function to open Google Meet
  const openGoogleMeet = (employeeName, meetLink) => {
    if (meetLink && meetLink.trim() !== '') {
      // If a specific Google Meet link is provided, use it
      window.open(meetLink, '_blank')
    } else if (employeeName) {
      // For birthdays, create a new Google Meet link
      const meetingTitle = `Meeting - ${employeeName}`
      const meetUrl = `https://meet.google.com/new?title=${encodeURIComponent(meetingTitle)}`
      window.open(meetUrl, '_blank')
    } else {
      // Default to Google Meet homepage
      window.open('https://meet.google.com', '_blank')
    }
  }

  const getTypeIcon = (type) => {
    return reminderTypes.find(t => t.value === type)?.icon || '📌'
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-gray-500',
      medium: 'text-blue-500',
      high: 'text-orange-500',
      urgent: 'text-red-500'
    }
    return colors[priority] || 'text-gray-500'
  }

  const reminderTypes = [
    { value: 'vendor_payment', label: 'Vendor Payment', icon: '💰' },
    { value: 'insurance', label: 'Insurance', icon: '🛡️' },
    { value: 'pf_esi', label: 'PF/ESI', icon: '📋' },
    { value: 'rent', label: 'Rent', icon: '🏠' },
    { value: 'emission_test', label: 'Emission Test', icon: '🚗' },
    { value: 'fastag_recharge', label: 'FASTag Recharge', icon: '🏷️' },
    { value: 'gas_filling', label: 'Gas Filling', icon: '⛽' },
    { value: 'electricity_bill', label: 'Electricity Bill', icon: '💡' },
    { value: 'water_bill', label: 'Water Bill', icon: '💧' },
    { value: 'employee_birthday', label: 'Employee Birthday', icon: '🎂' },
    { value: 'project_deadline', label: 'Project Deadline', icon: '📅' },
    { value: 'leave_request', label: 'Leave Request', icon: '🏖️' },
    { value: 'other', label: 'Other', icon: '📌' }
  ]

  const upcomingReminders = reminders.filter(r => 
    r.status === 'pending' && new Date(r.date) >= new Date()
  ).sort((a, b) => new Date(a.date) - new Date(b.date))

  const overdueReminders = reminders.filter(r => 
    r.status === 'pending' && new Date(r.date) < new Date()
  )

  // Combine reminders and birthdays for the upcoming section
  const allUpcomingItems = [
    ...upcomingReminders.map(r => ({ ...r, isBirthday: false })),
    ...birthdays.map(b => ({
      _id: `birthday-${b._id}`,
      title: `${b.name}'s Birthday`,
      type: 'employee_birthday',
      date: b.birthdayThisYear,
      description: `Employee birthday celebration for ${b.name}`,
      status: 'pending',
      priority: 'medium',
      isBirthday: true,
      employee: b,
      googleMeetLink: '' // Birthdays don't have a preset link
    }))
  ].sort((a, b) => new Date(a.date) - new Date(b.date))

  // Calculate the actual count of pending items (excluding birthdays unless filtering)
  const pendingRemindersCount = reminders.filter(r => r.status === 'pending').length;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Calendar Reminders</h1>
          <p className="text-gray-600 mt-1">Manage payments, bills & important dates</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleResetReminders}
            className="flex items-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            disabled={loading}
            title="Reset all my reminders"
          >
            <FiTrash2 className="mr-1" />
            Reset
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
          >
            <FiPlus className="mr-2" />
            Add Reminder
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Reminders</p>
              <p className="text-2xl font-bold text-gray-800">{reminders.length}</p>
            </div>
            <FiBell className="text-blue-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Upcoming</p>
              <p className="text-2xl font-bold text-blue-800">{allUpcomingItems.length}</p>
            </div>
            <FiClock className="text-blue-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-800">{overdueReminders.length}</p>
            </div>
            <FiBell className="text-red-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-800">
                {reminders.filter(r => r.status === 'completed').length}
              </p>
            </div>
            <FiCheck className="text-green-500" size={32} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <FiFilter className="text-gray-500" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Types</option>
            {reminderTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Overdue Alerts */}
      {overdueReminders.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex items-center">
            <FiBell className="text-red-500 mr-2" />
            <p className="text-red-800 font-medium">
              You have {overdueReminders.length} overdue reminder{overdueReminders.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Reminders List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          {loading ? (
            <p className="text-center text-gray-600">Loading reminders...</p>
          ) : allUpcomingItems.length === 0 ? (
            <p className="text-center text-gray-600">No upcoming reminders</p>
          ) : (
            <div className="space-y-4">
              {allUpcomingItems.map((item) => (
                <div
                  key={item._id}
                  className={`p-4 rounded-lg border-2 ${
                    new Date(item.date) < new Date() && item.status === 'pending'
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{getTypeIcon(item.type)}</span>
                        <h3 className="font-semibold text-gray-800">{item.title}</h3>
                        {item.isBirthday && (
                          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                            Birthday
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>📅 {new Date(item.date).toLocaleDateString()}</span>
                        {item.amount && (
                          <span className="flex items-center">
                            <FiDollarSign className="mr-1" />
                            ₹{item.amount.toLocaleString()}
                          </span>
                        )}
                        {item.recurring?.enabled && (
                          <span className="text-blue-600">🔄 {item.recurring.frequency}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {/* Google Meet button - show for all items */}
                      <button
                        onClick={() => openGoogleMeet(item.employee?.name, item.googleMeetLink)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Open Google Meet"
                      >
                        <FiVideo size={20} />
                      </button>
                      {!item.isBirthday && item.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleComplete(item._id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title="Mark as completed"
                          >
                            <FiCheck size={20} />
                          </button>
                          <button
                            onClick={() => handleCancel(item._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Cancel"
                          >
                            <FiX size={20} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Reminder Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create Reminder</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    {reminderTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Amount (Optional)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {/* Google Meet Link Field */}
                <div>
                  <label className="block text-sm font-medium mb-1">Google Meet Link (Optional)</label>
                  <input
                    type="text"
                    value={formData.googleMeetLink}
                    onChange={(e) => setFormData({ ...formData, googleMeetLink: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.recurring.enabled}
                      onChange={(e) => setFormData({
                        ...formData,
                        recurring: { ...formData.recurring, enabled: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm">Recurring Reminder</span>
                  </label>
                  {formData.recurring.enabled && (
                    <select
                      value={formData.recurring.frequency}
                      onChange={(e) => setFormData({
                        ...formData,
                        recurring: { ...formData.recurring, frequency: e.target.value }
                      })}
                      className="w-full px-3 py-2 border rounded-lg mt-2"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalendarReminders