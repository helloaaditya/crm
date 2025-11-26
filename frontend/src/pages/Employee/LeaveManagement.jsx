import { useState, useEffect, useRef } from 'react'
import { FiCheckCircle, FiXCircle, FiClock, FiFilter, FiChevronDown, FiEye, FiX } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'

const LeaveManagement = () => {
  const [leaveRequests, setLeaveRequests] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterStatus, setFilterStatus] = useState('pending')
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false)
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('')
  const employeeDropdownRef = useRef(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingLeave, setViewingLeave] = useState(null)

  useEffect(() => {
    fetchLeaveRequests()
    fetchEmployees()
  }, [filterEmployee, filterStatus])

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true)
      // For now, we'll fetch all employees and filter on frontend
      // In a real app, you'd have a backend endpoint for this
      const employeesResponse = await API.employees.getAll({ limit: 10000 })
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
      const response = await API.employees.getAll({ limit: 10000 })
      setEmployees(response.data.data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to load employees')
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target)) {
        setEmployeeDropdownOpen(false)
      }
    }
    if (employeeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [employeeDropdownOpen])

  // Filter employees based on search term
  const filteredEmployees = employees.filter(emp => {
    if (!employeeSearchTerm) return true
    const searchLower = employeeSearchTerm.toLowerCase()
    return emp.name?.toLowerCase().includes(searchLower) || 
           emp.employeeId?.toLowerCase().includes(searchLower) ||
           emp.role?.toLowerCase().includes(searchLower)
  })

  const handleApprove = async (leaveId, employeeId) => {
    try {
      await API.employees.updateLeaveStatus(leaveId, { status: 'approved' })
      toast.success('Leave request approved')
      fetchLeaveRequests()
    } catch (error) {
      toast.error('Failed to approve leave request')
    }
  }

  const handleView = (leaveRequest) => {
    setViewingLeave(leaveRequest)
    setShowViewModal(true)
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
    { value: 'sick', label: '🤒 Sick Leave', color: 'red' },
    { value: 'compoff', label: '⏰ Comp Off', color: 'blue' },
    { value: 'unpaid', label: '💸 Unpaid Leave', color: 'gray' }
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
          <div className="relative z-[150]" ref={employeeDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Employee</label>
            <button
              type="button"
              onClick={() => {
                setEmployeeDropdownOpen(!employeeDropdownOpen)
                setEmployeeSearchTerm('')
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-left flex items-center justify-between relative z-[151]"
            >
              <span className={filterEmployee ? 'text-gray-900' : 'text-gray-500'}>
                {filterEmployee 
                  ? `${employees.find(e => e._id === filterEmployee)?.name || ''} (${employees.find(e => e._id === filterEmployee)?.employeeId || ''})`
                  : 'All Employees'}
              </span>
              <FiChevronDown className={`transition-transform ${employeeDropdownOpen ? 'transform rotate-180' : ''}`} />
            </button>
            
            {employeeDropdownOpen && (
              <div className="absolute z-[150] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden" style={{ maxHeight: '60vh' }}>
                {/* Search Input */}
                <div className="p-2 border-b sticky top-0 bg-white z-[151]">
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={employeeSearchTerm}
                    onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    autoFocus
                  />
                </div>
                
                {/* Scrollable Employee List */}
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(60vh - 60px)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterEmployee('')
                      setEmployeeDropdownOpen(false)
                      setEmployeeSearchTerm('')
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                      !filterEmployee ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
                    }`}
                  >
                    All Employees
                  </button>
                  {filteredEmployees.length === 0 ? (
                    <div className="px-4 py-2 text-gray-500 text-sm">No employees found</div>
                  ) : (
                    filteredEmployees.map(emp => (
                      <button
                        key={emp._id}
                        type="button"
                        onClick={() => {
                          setFilterEmployee(emp._id)
                          setEmployeeDropdownOpen(false)
                          setEmployeeSearchTerm('')
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                          filterEmployee === emp._id ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
                        }`}
                      >
                        {emp.name} ({emp.employeeId})
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
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
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleView(request)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              title="View Details"
                            >
                              <FiEye />
                            </button>
                            {request.status === 'pending' && (
                              <>
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
                              </>
                            )}
                          </div>
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
                    
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        onClick={() => handleView(request)}
                        className="flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-xs"
                      >
                        <FiEye className="mr-1" size={12} />
                        View
                      </button>
                      {request.status === 'pending' && (
                        <>
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
                        </>
                      )}
                    </div>
                    {request.status !== 'pending' && (
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

      {/* View Leave Request Modal */}
      {showViewModal && viewingLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1200] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mobile-modal">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-800">Leave Request Details</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 mobile-modal-content">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                  <p className="text-gray-900">{viewingLeave.employee?.name || 'N/A'}</p>
                  {viewingLeave.employee?.employeeId && (
                    <p className="text-sm text-gray-600">{viewingLeave.employee.employeeId}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    getLeaveTypeColor(viewingLeave.leaveType) === 'blue' ? 'bg-blue-100 text-blue-800' :
                    getLeaveTypeColor(viewingLeave.leaveType) === 'green' ? 'bg-green-100 text-green-800' :
                    getLeaveTypeColor(viewingLeave.leaveType) === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {leaveTypes.find(lt => lt.value === viewingLeave.leaveType)?.label || viewingLeave.leaveType}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <p className="text-gray-900">
                    {viewingLeave.startDate ? new Date(viewingLeave.startDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <p className="text-gray-900">
                    {viewingLeave.endDate ? new Date(viewingLeave.endDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Days</label>
                  <p className="text-gray-900 font-semibold">
                    {viewingLeave.numberOfDays || 0} day{(viewingLeave.numberOfDays || 0) > 1 ? 's' : ''}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    viewingLeave.status === 'approved' ? 'bg-green-100 text-green-800' :
                    viewingLeave.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {viewingLeave.status ? viewingLeave.status.charAt(0).toUpperCase() + viewingLeave.status.slice(1) : 'N/A'}
                  </span>
                </div>
                {viewingLeave.appliedDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Applied Date</label>
                    <p className="text-gray-900">
                      {new Date(viewingLeave.appliedDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {viewingLeave.rejectionReason && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
                    <p className="text-gray-900 bg-red-50 p-3 rounded-lg">{viewingLeave.rejectionReason}</p>
                  </div>
                )}
              </div>

              {viewingLeave.reason && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{viewingLeave.reason}</p>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LeaveManagement