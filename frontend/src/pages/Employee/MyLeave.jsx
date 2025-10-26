import { useState, useEffect } from 'react'
import { FiPlus, FiCalendar, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'

function MyLeave() {
  const [leaveRequests, setLeaveRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: ''
  })

  const leaveTypes = [
    { value: 'casual', label: 'Casual Leave', color: 'blue' },
    { value: 'sick', label: 'Sick Leave', color: 'red' },
    { value: 'earned', label: 'Earned Leave', color: 'green' },
    { value: 'unpaid', label: 'Unpaid Leave', color: 'gray' },
    { value: 'maternity', label: 'Maternity Leave', color: 'pink' },
    { value: 'paternity', label: 'Paternity Leave', color: 'purple' }
  ]

  useEffect(() => {
    fetchLeaves()
  }, [])

  const fetchLeaves = async () => {
    try {
      setLoading(true)
      const response = await API.employees.myLeave.get()
      setLeaveRequests(response.data.data || [])
    } catch (error) {
      console.error('Error fetching leaves:', error)
      toast.error('Failed to fetch leave requests')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast.error('End date cannot be before start date')
      return
    }

    try {
      setLoading(true)
      await API.employees.myLeave.apply(formData)
      toast.success('Leave request submitted successfully')
      setShowModal(false)
      setFormData({
        leaveType: 'casual',
        startDate: '',
        endDate: '',
        reason: ''
      })
      fetchLeaves()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit leave request')
    } finally {
      setLoading(false)
    }
  }

  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
    return days
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100 text-yellow-800', icon: FiClock },
      approved: { bg: 'bg-green-100 text-green-800', icon: FiCheckCircle },
      rejected: { bg: 'bg-red-100 text-red-800', icon: FiXCircle }
    }
    return badges[status] || badges.pending
  }

  const getLeaveTypeColor = (type) => {
    const leaveType = leaveTypes.find(lt => lt.value === type)
    return leaveType?.color || 'gray'
  }

  const stats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter(l => l.status === 'pending').length,
    approved: leaveRequests.filter(l => l.status === 'approved').length,
    rejected: leaveRequests.filter(l => l.status === 'rejected').length
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Leave Requests</h1>
          <p className="text-gray-600 mt-1">Apply for leave and track your requests</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
        >
          <FiPlus className="mr-2" />
          Apply for Leave
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
            <FiCalendar className="text-blue-500" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <FiClock className="text-yellow-500" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <FiCheckCircle className="text-green-500" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <FiXCircle className="text-red-500" size={32} />
          </div>
        </div>
      </div>

      {/* Leave Requests List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Leave History</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <p className="text-center text-gray-600">Loading...</p>
          ) : leaveRequests.length === 0 ? (
            <p className="text-center text-gray-600 py-8">No leave requests found</p>
          ) : (
            <div className="space-y-4">
              {leaveRequests.map((leave, index) => {
                const statusConfig = getStatusBadge(leave.status)
                const StatusIcon = statusConfig.icon
                const color = getLeaveTypeColor(leave.leaveType)
                
                return (
                  <div
                    key={index}
                    className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 text-sm rounded-full bg-${color}-100 text-${color}-800 font-medium`}>
                            {leaveTypes.find(lt => lt.value === leave.leaveType)?.label || leave.leaveType}
                          </span>
                          <span className={`px-3 py-1 text-sm rounded-full ${statusConfig.bg} flex items-center`}>
                            <StatusIcon className="mr-1" size={14} />
                            {leave.status}
                          </span>
                          <span className="text-sm text-gray-500">
                            {leave.numberOfDays} day{leave.numberOfDays > 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-500">Start Date</p>
                            <p className="text-sm font-medium text-gray-800">
                              {new Date(leave.startDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">End Date</p>
                            <p className="text-sm font-medium text-gray-800">
                              {new Date(leave.endDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="mb-2">
                          <p className="text-xs text-gray-500 mb-1">Reason</p>
                          <p className="text-sm text-gray-700">{leave.reason}</p>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Applied: {new Date(leave.appliedDate).toLocaleDateString()}</span>
                          {leave.approvedBy && (
                            <span>Approved by: {leave.approvedBy.name}</span>
                          )}
                          {leave.approvedDate && (
                            <span>on {new Date(leave.approvedDate).toLocaleDateString()}</span>
                          )}
                        </div>

                        {leave.rejectionReason && (
                          <div className="mt-2 p-2 bg-red-50 rounded">
                            <p className="text-xs text-red-700">
                              <strong>Rejection Reason:</strong> {leave.rejectionReason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Apply for Leave</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Leave Type *</label>
                  <select
                    value={formData.leaveType}
                    onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    {leaveTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">End Date *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>

                {formData.startDate && formData.endDate && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Total Days: {calculateDays(formData.startDate, formData.endDate)}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Reason *</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows="3"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                >
                  Submit Request
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

export default MyLeave
