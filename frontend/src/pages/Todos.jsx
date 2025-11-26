import { useState, useEffect } from 'react'
import { FiPlus, FiCheck, FiX, FiEdit, FiTrash2, FiClock, FiAlertCircle, FiFilter, FiSearch, FiCalendar, FiTrendingUp, FiUsers, FiBarChart2, FiEye } from 'react-icons/fi'
import API from '../api'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'

function Todos() {
  const { user } = useAuth()
  const [todos, setTodos] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [editingTodo, setEditingTodo] = useState(null)
  const [viewingTodo, setViewingTodo] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    assignedTo: '',
    tags: [],
    notes: '',
    estimatedHours: '',
    status: 'pending',
    project: '',
    customer: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [performanceStats, setPerformanceStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)

  useEffect(() => {
    fetchTodos()
    fetchEmployees()
    fetchPerformanceStats()
  }, [statusFilter, priorityFilter, employeeFilter, searchTerm])

  const fetchTodos = async () => {
    try {
      setLoading(true)
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (priorityFilter) params.priority = priorityFilter
      if (employeeFilter) params.assignedTo = employeeFilter
      if (searchTerm) params.search = searchTerm

      const response = await API.todos.getAll(params)
      setTodos(response.data.data || [])
    } catch (error) {
      toast.error('Failed to fetch todos')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const response = await API.employees.getList({ limit: 1000 })
      setEmployees(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch employees')
    }
  }

  const fetchPerformanceStats = async () => {
    try {
      setLoadingStats(true)
      const response = await API.todos.getPerformanceStats()
      setPerformanceStats(response.data.data)
    } catch (error) {
      console.error('Failed to fetch performance stats')
    } finally {
      setLoadingStats(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingTodo) {
        await API.todos.update(editingTodo._id, formData)
        toast.success('Todo updated successfully')
      } else {
        await API.todos.create(formData)
        toast.success('Todo created successfully')
      }
      setShowModal(false)
      setEditingTodo(null)
      resetForm()
      fetchTodos()
      fetchPerformanceStats()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save todo')
    }
  }

  const handleEdit = (todo) => {
    setEditingTodo(todo)
    setFormData({
      title: todo.title || '',
      description: todo.description || '',
      priority: todo.priority || 'medium',
      dueDate: todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : '',
      assignedTo: todo.assignedTo?._id || '',
      tags: todo.tags || [],
      notes: todo.notes || '',
      estimatedHours: todo.estimatedHours || '',
      status: todo.status || 'pending',
      project: todo.project?._id || '',
      customer: todo.customer?._id || ''
    })
    setShowModal(true)
  }

  const handleView = (todo) => {
    setViewingTodo(todo)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this todo?')) return
    
    try {
      await API.todos.delete(id)
      toast.success('Todo deleted successfully')
      fetchTodos()
      fetchPerformanceStats()
    } catch (error) {
      toast.error('Failed to delete todo')
    }
  }

  const handleStatusChange = async (todo, newStatus) => {
    try {
      await API.todos.update(todo._id, { status: newStatus })
      toast.success('Todo status updated')
      fetchTodos()
      fetchPerformanceStats()
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: '',
      assignedTo: '',
      tags: [],
      notes: '',
      estimatedHours: '',
      status: 'pending',
      project: '',
      customer: ''
    })
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low': return 'bg-green-100 text-green-800 border-green-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isOverdue = (todo) => {
    if (todo.status === 'completed' || !todo.dueDate) return false
    return new Date(todo.dueDate) < new Date()
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Todos Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowStatsModal(true)}
            className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <FiBarChart2 className="mr-2" />
            Performance
          </button>
          <button
            onClick={() => {
              setEditingTodo(null)
              resetForm()
              setShowModal(true)
            }}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FiPlus className="mr-2" />
            Add Todo
          </button>
        </div>
      </div>

      {/* Performance Overview */}
      {performanceStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Todos</div>
            <div className="text-2xl font-bold text-gray-900">{performanceStats.overall.totalTodos}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Completed</div>
            <div className="text-2xl font-bold text-green-600">{performanceStats.overall.completedTodos}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Completion Rate</div>
            <div className="text-2xl font-bold text-blue-600">{performanceStats.overall.completionRate.toFixed(1)}%</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">On-Time Rate</div>
            <div className="text-2xl font-bold text-purple-600">{performanceStats.overall.onTimeRate.toFixed(1)}%</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search todos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Employees</option>
            {employees.map(emp => (
              <option key={emp._id} value={emp._id}>{emp.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button
            onClick={() => {
              setStatusFilter('')
              setPriorityFilter('')
              setEmployeeFilter('')
              setSearchTerm('')
            }}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Todos List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : todos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FiClock className="mx-auto text-gray-400 text-5xl mb-4" />
          <p className="text-gray-600">No todos found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {todos.map((todo) => (
            <div
              key={todo._id}
              className={`bg-white rounded-lg shadow p-4 sm:p-6 border-l-4 ${
                isOverdue(todo) ? 'border-red-500' :
                todo.priority === 'urgent' ? 'border-red-400' :
                todo.priority === 'high' ? 'border-orange-400' :
                todo.priority === 'medium' ? 'border-yellow-400' :
                'border-green-400'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-2">
                    <h3 className={`text-lg font-semibold ${todo.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {todo.title}
                    </h3>
                    {isOverdue(todo) && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded flex items-center">
                        <FiAlertCircle className="mr-1" />
                        Overdue
                      </span>
                    )}
                  </div>
                  {todo.description && (
                    <p className="text-gray-600 text-sm mb-2">{todo.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 items-center mb-2">
                    <span className="text-sm text-gray-600">
                      <FiUsers className="inline mr-1" />
                      {todo.assignedTo?.name || 'Unassigned'}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(todo.status)}`}>
                      {todo.status.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(todo.priority)}`}>
                      {todo.priority}
                    </span>
                    {todo.dueDate && (
                      <span className="text-xs text-gray-600 flex items-center">
                        <FiCalendar className="mr-1" />
                        {new Date(todo.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {todo.notes && (
                    <p className="text-sm text-gray-500 italic">{todo.notes}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleView(todo)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="View Details"
                  >
                    <FiEye size={20} />
                  </button>
                  {todo.status !== 'completed' && (
                    <button
                      onClick={() => handleStatusChange(todo, 'completed')}
                      className="p-2 text-green-600 hover:bg-green-50 rounded"
                      title="Mark Complete"
                    >
                      <FiCheck size={20} />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(todo)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                    title="Edit"
                  >
                    <FiEdit size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(todo._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <FiTrash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Todo Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mobile-modal">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingTodo ? 'Edit Todo' : 'Create Todo'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingTodo(null)
                  resetForm()
                }}
                className="p-2 text-gray-500 hover:text-gray-700 rounded"
              >
                <FiX size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 mobile-modal-content">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign To *</label>
                  <select
                    required
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name} ({emp.employeeId})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {editingTodo && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingTodo(null)
                    resetForm()
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingTodo ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Performance Stats Modal */}
      {showStatsModal && performanceStats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto mobile-modal">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-800">Performance & Productivity Stats</h2>
              <button
                onClick={() => setShowStatsModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-6 mobile-modal-content">
              {/* Overall Stats */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Overall Performance</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Completion Rate</div>
                    <div className="text-2xl font-bold text-blue-600">{performanceStats.overall.completionRate.toFixed(1)}%</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">On-Time Rate</div>
                    <div className="text-2xl font-bold text-green-600">{performanceStats.overall.onTimeRate.toFixed(1)}%</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Time Efficiency</div>
                    <div className="text-2xl font-bold text-purple-600">{performanceStats.overall.timeEfficiency.toFixed(1)}%</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Urgent Completion</div>
                    <div className="text-2xl font-bold text-orange-600">{performanceStats.overall.urgentCompletionRate.toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              {/* Employee Stats */}
              <div>
                <h3 className="text-lg font-semibold mb-4">By Employee</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">On-Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Efficiency</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {performanceStats.byEmployee.map((emp, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{emp.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{emp.total}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{emp.completed}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              emp.completionRate >= 80 ? 'bg-green-100 text-green-800' :
                              emp.completionRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {emp.completionRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{emp.onTimeRate.toFixed(1)}%</td>
                          <td className="px-4 py-3 text-sm">{emp.timeEfficiency.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Todo Modal */}
      {viewingTodo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mobile-modal">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-800">Todo Details</h2>
              <button
                onClick={() => setViewingTodo(null)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 mobile-modal-content">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <p className="text-gray-900">{viewingTodo.title}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                  <p className="text-gray-900">{viewingTodo.assignedTo?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(viewingTodo.status)}`}>
                    {viewingTodo.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full border ${getPriorityColor(viewingTodo.priority)}`}>
                    {viewingTodo.priority}
                  </span>
                </div>
                {viewingTodo.dueDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <p className="text-gray-900">{new Date(viewingTodo.dueDate).toLocaleDateString()}</p>
                  </div>
                )}
                {viewingTodo.completedDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Completed Date</label>
                    <p className="text-gray-900">{new Date(viewingTodo.completedDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {viewingTodo.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{viewingTodo.description}</p>
                </div>
              )}

              {viewingTodo.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{viewingTodo.notes}</p>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setViewingTodo(null)}
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

export default Todos

