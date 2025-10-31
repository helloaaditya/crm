import { useState, useEffect } from 'react'
import { FiCalendar, FiCheckCircle, FiXCircle, FiClock, FiMapPin, FiFilter, FiDownload, FiEdit, FiX } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'

const Attendance = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'main_admin'
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [filterStatus, setFilterStatus] = useState('all')
  const [editingEntry, setEditingEntry] = useState(null)
  const [editForm, setEditForm] = useState({ checkInTime: '', checkOutTime: '', status: '', notes: '' })

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    if (selectedEmployee) {
      fetchAttendance()
    }
  }, [selectedEmployee, selectedMonth, selectedYear])

  const fetchEmployees = async () => {
    try {
      const response = await API.employees.getAll()
      setEmployees(response.data.data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to fetch employees')
    }
  }

  const fetchAttendance = async () => {
    if (!selectedEmployee) return
    
    try {
      setLoading(true)
      const response = await API.employees.getAttendance(selectedEmployee, {
        month: selectedMonth,
        year: selectedYear
      })
      setAttendance(response.data.data || [])
    } catch (error) {
      console.error('Error fetching attendance:', error)
      toast.error('Failed to fetch attendance')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAttendance = async (status) => {
    if (!selectedEmployee) {
      toast.error('Please select an employee')
      return
    }

    try {
      await API.employees.markAttendance(selectedEmployee, {
        date: new Date(),
        status,
        markedBy: 'admin'
      })
      toast.success(`Attendance marked as ${status}`)
      fetchAttendance()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark attendance')
    }
  }

  const openEditModal = (entry) => {
    setEditingEntry(entry)
    const checkInTimeStr = entry.checkInTime ? new Date(entry.checkInTime).toISOString().slice(0, 16) : ''
    const checkOutTimeStr = entry.checkOutTime ? new Date(entry.checkOutTime).toISOString().slice(0, 16) : ''
    setEditForm({
      checkInTime: checkInTimeStr,
      checkOutTime: checkOutTimeStr,
      status: entry.status || '',
      notes: entry.notes || ''
    })
  }

  const closeEditModal = () => {
    setEditingEntry(null)
    setEditForm({ checkInTime: '', checkOutTime: '', status: '', notes: '' })
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!selectedEmployee || !editingEntry) return
    try {
      const payload = {}
      if (editForm.checkInTime) payload.checkInTime = new Date(editForm.checkInTime).toISOString()
      if (editForm.checkOutTime) payload.checkOutTime = new Date(editForm.checkOutTime).toISOString()
      if (editForm.status) payload.status = editForm.status
      if (editForm.notes !== undefined) payload.notes = editForm.notes
      await API.employees.updateAttendance(selectedEmployee, editingEntry._id, payload)
      toast.success('Attendance updated successfully')
      closeEditModal()
      fetchAttendance()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update attendance')
    }
  }

  const exportAttendance = async () => {
    if (!selectedEmployee || attendance.length === 0) {
      toast.error('Please select an employee and ensure there is attendance data to export')
      return
    }

    try {
      // Create CSV content
      const headers = ['Date', 'Day', 'Status', 'Check In Time', 'Check Out Time', 'Work Hours', 'Location', 'Notes']
      const csvContent = [
        headers.join(','),
        ...attendance.map(record => [
          new Date(record.date).toLocaleDateString(),
          new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' }),
          record.status,
          record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '-',
          record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : '-',
          record.workHours ? record.workHours.toFixed(2) : '-',
          record.checkInLocation?.address || '-',
          record.notes || '-'
        ].map(field => `"${field}"`).join(','))
      ].join('\n')

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `attendance_${selectedEmployee}_${selectedMonth}_${selectedYear}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Attendance report exported successfully')
    } catch (error) {
      console.error('Error exporting attendance:', error)
      toast.error('Failed to export attendance report')
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

  const filteredAttendance = filterStatus === 'all' 
    ? attendance 
    : attendance.filter(a => a.status === filterStatus)

  const stats = {
    total: attendance.length,
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    leaves: attendance.filter(a => a.status === 'leave').length,
    halfDay: attendance.filter(a => a.status === 'half_day').length
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Attendance Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Track and manage employee attendance</p>
        </div>
        <button
          onClick={exportAttendance}
          className="flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm sm:text-base"
        >
          <FiDownload className="mr-2" />
          Export Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Select Employee --</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {months.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {[2023, 2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="half_day">Half Day</option>
              <option value="leave">Leave</option>
              <option value="holiday">Holiday</option>
            </select>
          </div>
        </div>

        {/* Quick Actions */}
        {selectedEmployee && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium text-gray-700 mb-2">Quick Mark Today:</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleMarkAttendance('present')}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center"
              >
                <FiCheckCircle className="mr-2" />
                Present
              </button>
              <button
                onClick={() => handleMarkAttendance('absent')}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center"
              >
                <FiXCircle className="mr-2" />
                Absent
              </button>
              <button
                onClick={() => handleMarkAttendance('half_day')}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center"
              >
                <FiClock className="mr-2" />
                Half Day
              </button>
              <button
                onClick={() => handleMarkAttendance('holiday')}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center"
              >
                <FiCalendar className="mr-2" />
                Holiday
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      {selectedEmployee && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Days</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Present</p>
            <p className="text-2xl font-bold text-green-600">{stats.present}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Absent</p>
            <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Leave</p>
            <p className="text-2xl font-bold text-blue-600">{stats.leaves}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Half Day</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.halfDay}</p>
          </div>
        </div>
      )}

      {/* Attendance Records */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            Attendance Records - {months[selectedMonth - 1]} {selectedYear}
          </h2>
        </div>
        <div className="p-4 sm:p-6">
          {loading ? (
            <p className="text-center text-gray-600">Loading...</p>
          ) : !selectedEmployee ? (
            <p className="text-center text-gray-600 py-8">Please select an employee to view attendance</p>
          ) : filteredAttendance.length === 0 ? (
            <p className="text-center text-gray-600 py-8">No attendance records found</p>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Day</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Check In</th>
                      <th className="text-left py-3 px-4">Check Out</th>
                      <th className="text-left py-3 px-4">Work Hours</th>
                      <th className="text-left py-3 px-4">Location</th>
                      <th className="text-left py-3 px-4">Notes</th>
                      {isAdmin && <th className="text-left py-3 px-4">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendance.map((record, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}
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
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {record.notes || '-'}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4">
                            <button
                              onClick={() => openEditModal(record)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit Attendance"
                            >
                              <FiEdit size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-3">
                {filteredAttendance.map((record, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {new Date(record.date).toLocaleDateString()}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(record.status)}`}>
                        {record.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Check In:</span>
                        <span className="font-medium">
                          {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Check Out:</span>
                        <span className="font-medium">
                          {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Work Hours:</span>
                        <span className="font-medium">
                          {record.workHours ? `${record.workHours.toFixed(2)} hrs` : '-'}
                        </span>
                      </div>
                      {record.checkInLocation?.address && record.checkInLocation.address !== 'Location not provided' && (
                        <div className="flex items-start text-sm">
                          <FiMapPin className="mr-1 mt-0.5 flex-shrink-0" size={14} />
                          <span className="text-gray-600">{record.checkInLocation.address}</span>
                        </div>
                      )}
                      {record.notes && (
                        <div className="text-sm">
                          <span className="text-gray-600">Notes: </span>
                          <span>{record.notes}</span>
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => openEditModal(record)}
                          className="flex items-center px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                          <FiEdit className="mr-1" size={14} />
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit Attendance Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mobile-modal">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Edit Attendance</h2>
              <button
                onClick={closeEditModal}
                className="p-2 text-gray-500 hover:text-gray-700 rounded"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 space-y-4 mobile-modal-content">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check In Time
                </label>
                <input
                  type="datetime-local"
                  value={editForm.checkInTime}
                  onChange={(e) => setEditForm({ ...editForm, checkInTime: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-44"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check Out Time
                </label>
                <input
                  type="datetime-local"
                  value={editForm.checkOutTime}
                  onChange={(e) => setEditForm({ ...editForm, checkOutTime: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-44"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-44"
                >
                  <option value="">Auto (based on hours)</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="half_day">Half Day</option>
                  <option value="leave">Leave</option>
                  <option value="holiday">Holiday</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-44"
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 min-h-44"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 min-h-44"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Attendance
