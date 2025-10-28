import { useState, useEffect } from 'react'
import { FiCheckCircle, FiXCircle, FiClock, FiFilter } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'

const LeaveManagement = () => {
  const [leaveRequests, setLeaveRequests] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterStatus, setFilterStatus] = useState('pending')

  useEffect(() => {
    fetchLeaveRequests()
    fetchEmployees()
  }, [filterEmployee, filterStatus])

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true)
      // For now, we'll fetch all employees and filter on frontend
      // In a real app, you'd have a backend endpoint for this
      const employeesResponse = await API.employees.getAll()
      const allEmployees = employeesResponse.data.data || []
      
      // Flatten leave requests from all employees
      const allLeaveRequests = []
      for (const employee of allEmployees) {
        if (employee.leaves && employee.leaves.length > 0) {
          employee.leaves.forEach(leave => {
            allLeaveRequests.push({
              ...leave,
              employee: {
                _id: employee._id,
                name: employee.name,
                employeeId: employee.employeeId,
                role: employee.role
              }
            })
          })
        }
      }
      
      setLeaveRequests(allLeaveRequests)
    } catch (error) {
      console.error('Error fetching leave requests:', error)
      toast.error('Failed to load leave requests')
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const response = await API.employees.getAll()
      setEmployees(response.data.data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to load employees')
    }
  }

  const handleApprove = async (leaveId, employeeId) => {
    try {
      await API.employees.updateLeaveStatus(leaveId, { status: 'approved' })
      toast.success('Leave request approved')
      fetchLeaveRequests()
    } catch (error) {
      toast.error('Failed to approve leave request')
    }
  }

  const handleReject = async (leaveId, employeeId, reason = '') => {
    const rejectionReason = reason || prompt('Enter rejection reason:')
    if (!rejectionReason) return

    try {
      await API.employees.updateLeaveStatus(leaveId, { 
        status: 'rejected',
        rejectionReason
      })
      toast.success('Leave request rejected')
      fetchLeaveRequests()
    } catch (error) {
      toast.error('Failed to reject leave request')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100 text-yellow-800', icon: FiClock },
      approved: { bg: 'bg-green-100 text-green-800', icon: FiCheckCircle },
      rejected: { bg: 'bg-red-100 text-red-800', icon: FiXCircle }
    }
    return badges[status] || badges.pending
  }

  const leaveTypes = [
    { value: 'casual', label: 'Casual Leave', color: 'blue' },
    { value: 'sick', label: 'Sick Leave', color: 'red' },
    { value: 'earned', label: 'Earned Leave', color: 'green' },
    { value: 'unpaid', label: 'Unpaid Leave', color: 'gray' },
    { value: 'maternity', label: 'Maternity Leave', color: 'pink' },
    { value: 'paternity', label: 'Paternity Leave', color: 'purple' }
  ]

  const getLeaveTypeColor = (type) => {
    const leaveType = leaveTypes.find(lt => lt.value === type)
    return leaveType?.color || 'gray'
  }

  // Filter leave requests
  const filteredLeaveRequests = leaveRequests.filter(request => {
    if (filterEmployee && request.employee._id !== filterEmployee) return false
    if (filterStatus && request.status !== filterStatus) return false
    return true
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Leave Management</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Employee</label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">All Employees</option>
              {employees.map(employee => (
                <option key={employee._id} value={employee._id}>
                  {employee.name} ({employee.employeeId})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => { setFilterEmployee(''); setFilterStatus('pending') }}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-800">{leaveRequests.length}</p>
            </div>
            <FiClock className="text-blue-500" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {leaveRequests.filter(l => l.status === 'pending').length}
              </p>
            </div>
            <FiClock className="text-yellow-500" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">
                {leaveRequests.filter(l => l.status === 'approved').length}
              </p>
            </div>
            <FiCheckCircle className="text-green-500" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">
                {leaveRequests.filter(l => l.status === 'rejected').length}
              </p>
            </div>
            <FiXCircle className="text-red-500" size={32} />
          </div>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredLeaveRequests.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLeaveRequests.map((request) => {
                    const statusConfig = getStatusBadge(request.status)
                    const StatusIcon = statusConfig.icon
                    const color = getLeaveTypeColor(request.leaveType)
                    
                    return (
                      <tr key={request._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="font-medium text-gray-900">{request.employee.name}</div>
                          <div className="text-gray-500 text-xs">{request.employee.employeeId}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full bg-${color}-100 text-${color}-800`}>
                            {leaveTypes.find(lt => lt.value === request.leaveType)?.label || request.leaveType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.numberOfDays} day{request.numberOfDays > 1 ? 's' : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 max-w-xs truncate">
                          {request.reason}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full flex items-center ${statusConfig.bg}`}>
                            <StatusIcon className="mr-1" size={14} />
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {request.status === 'pending' ? (
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => handleApprove(request._id, request.employee._id)}
                                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 flex items-center"
                              >
                                <FiCheckCircle className="mr-1" size={14} />
                                Approve
                              </button>
                              <button 
                                onClick={() => handleReject(request._id, request.employee._id)}
                                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 flex items-center"
                              >
                                <FiXCircle className="mr-1" size={14} />
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">
                              {request.status === 'approved' ? 'Approved' : 'Rejected'}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden">
              {filteredLeaveRequests.map((request) => {
                const statusConfig = getStatusBadge(request.status)
                const StatusIcon = statusConfig.icon
                const color = getLeaveTypeColor(request.leaveType)
                
                return (
                  <div key={request._id} className="p-4 border-b border-gray-200 last:border-b-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">{request.employee.name}</h3>
                        <p className="text-xs text-gray-500">{request.employee.employeeId}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full flex items-center ${statusConfig.bg}`}>
                        <StatusIcon className="mr-1" size={12} />
                        {request.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Leave Type:</span>
                        <span className={`px-2 py-1 text-xs rounded-full bg-${color}-100 text-${color}-800`}>
                          {leaveTypes.find(lt => lt.value === request.leaveType)?.label || request.leaveType}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Dates:</span>
                        <span className="font-medium text-right">
                          {new Date(request.startDate).toLocaleDateString()}<br/>
                          <span className="text-xs">to {new Date(request.endDate).toLocaleDateString()}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Days:</span>
                        <span className="font-medium">{request.numberOfDays} day{request.numberOfDays > 1 ? 's' : ''}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Reason: </span>
                        <span>{request.reason}</span>
                      </div>
                    </div>
                    
                    {request.status === 'pending' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => handleApprove(request._id, request.employee._id)}
                          className="flex items-center justify-center px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-xs"
                        >
                          <FiCheckCircle className="mr-1" size={12} />
                          Approve
                        </button>
                        <button 
                          onClick={() => handleReject(request._id, request.employee._id)}
                          className="flex items-center justify-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-xs"
                        >
                          <FiXCircle className="mr-1" size={12} />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <span className="text-gray-500 text-sm">
                          {request.status === 'approved' ? 'Approved' : 'Rejected'}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <FiClock className="mx-auto text-gray-400 text-5xl mb-4" />
            <p className="text-gray-600">No leave requests found</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default LeaveManagement