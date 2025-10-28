import { useState, useEffect } from 'react'
import { FiEdit, FiTrash2, FiKey, FiUser, FiLock } from 'react-icons/fi'
import API from '../api'
import { toast } from 'react-toastify'
import UserAccountModal from '../components/Modals/UserAccountModal'

const Accounts = () => {
  const [users, setUsers] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  useEffect(() => {
    fetchUsers()
    fetchEmployees()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await API.auth.getAll()
      setUsers(response.data.data)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load user accounts')
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const response = await API.employees.getAll({ limit: 1000 })
      setEmployees(response.data.data)
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const handleEdit = (user) => {
    setSelectedUser(user)
    setShowModal(true)
  }

  const handleCreate = () => {
    setSelectedUser(null)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this user account? This action cannot be undone.')) return

    try {
      await API.auth.delete(id)
      toast.success('User account deleted successfully')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to delete user account')
    }
  }

  const handleResetPassword = async (user) => {
    const newPassword = prompt(`Enter new password for ${user.name}:`)
    if (!newPassword) return

    try {
      await API.auth.resetPassword(user._id, { newPassword })
      toast.success('Password reset successfully')
    } catch (error) {
      toast.error('Failed to reset password')
    }
  }

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-purple-100 text-purple-800',
      supervisor: 'bg-blue-100 text-blue-800',
      employee: 'bg-green-100 text-green-800',
      accountant: 'bg-yellow-100 text-yellow-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  const getEmployeeName = (userId) => {
    const employee = employees.find(emp => emp.userId?._id === userId || emp.userId === userId)
    return employee ? `${employee.name} (${employee.employeeId})` : '-'
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">User Accounts</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage employee login credentials and access</p>
        </div>
        <button 
          onClick={handleCreate}
          className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
        >
          <FiUser className="mr-2" />
          Create Account
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
        <div className="flex items-start">
          <FiKey className="text-blue-600 mt-1 mr-3 flex-shrink-0" size={20} />
          <div>
            <h3 className="text-sm sm:text-base font-medium text-blue-900">Account Management</h3>
            <p className="text-xs sm:text-sm text-blue-700 mt-1">
              Create and manage login credentials for employees. Each employee can have their own username and password to access the system.
            </p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : users.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email/Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module Access</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {getEmployeeName(user._id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {user.module === 'all' ? 'All Modules' : user.module}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleResetPassword(user)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded"
                            title="Reset Password"
                          >
                            <FiLock />
                          </button>
                          <button 
                            onClick={() => handleEdit(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <FiEdit />
                          </button>
                          <button 
                            onClick={() => handleDelete(user._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden">
              {users.map((user) => (
                <div key={user._id} className="p-4 border-b border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{user.name}</h3>
                      <p className="text-xs text-gray-600 mt-1">{user.email}</p>
                      {user.phone && (
                        <p className="text-xs text-gray-500 mt-1">{user.phone}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Employee:</span>
                      <span className="text-xs text-gray-700">{getEmployeeName(user._id)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Module Access:</span>
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {user.module === 'all' ? 'All Modules' : user.module}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleResetPassword(user)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-orange-600 hover:bg-orange-50 rounded-lg text-xs font-medium min-h-44"
                    >
                      <FiLock className="mr-1" size={14} />
                      Reset Password
                    </button>
                    <button 
                      onClick={() => handleEdit(user)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-medium min-h-44"
                    >
                      <FiEdit className="mr-1" size={14} />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(user._id)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium min-h-44"
                    >
                      <FiTrash2 className="mr-1" size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No user accounts found</p>
          </div>
        )}
      </div>

      {/* User Account Modal */}
      <UserAccountModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setSelectedUser(null); }}
        onSuccess={fetchUsers}
        user={selectedUser}
        employees={employees}
      />
    </div>
  )
}

export default Accounts
