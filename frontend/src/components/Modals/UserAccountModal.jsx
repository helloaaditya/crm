import { useState, useEffect } from 'react'
import { FiX } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'

const UserAccountModal = ({ isOpen, onClose, onSuccess, user = null, employees = [] }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'employee',
    modules: ['all'],
    permissions: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canView: true,
      canHandleAccounts: false
    },
    employeeId: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      // Handle backward compatibility - convert old module string to array
      let userModules = ['all'] // Default to 'all' instead of 'none'
      if (user.module) {
        if (Array.isArray(user.module)) {
          userModules = user.module
        } else if (user.module === 'all') {
          userModules = ['all']
        } else if (user.module === 'none') {
          userModules = ['all'] // Convert 'none' to 'all' for better access
        } else {
          // For comma-separated modules, split them
          if (user.module.includes(',')) {
            userModules = user.module.split(',').map(m => m.trim()).filter(m => m)
          } else {
            // For single module values, convert to array
            userModules = [user.module]
          }
        }
      }

      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        password: '',
        role: user.role || 'employee',
        modules: userModules,
        permissions: {
          canCreate: user.permissions?.canCreate || false,
          canEdit: user.permissions?.canEdit || false,
          canDelete: user.permissions?.canDelete || false,
          canView: user.permissions?.canView !== false,
          canHandleAccounts: user.permissions?.canHandleAccounts || false
        },
        employeeId: ''
      })
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'employee',
        modules: ['none'],
        permissions: {
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canView: true,
          canHandleAccounts: false
        },
        employeeId: ''
      })
    }
  }, [user, isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Client-side validation
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!formData.email.trim()) {
      toast.error('Email is required')
      return
    }
    if (!formData.phone || formData.phone.length !== 10) {
      toast.error('Valid 10-digit phone number is required')
      return
    }
    if (!user && !formData.password) {
      toast.error('Password is required for new accounts')
      return
    }
    if (formData.password && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    try {
      setLoading(true)
      
      // Convert modules array to appropriate format for backend
      const submitData = {
        ...formData
      };
      
      // Handle module conversion for backend compatibility
      if (formData.modules.includes('all')) {
        submitData.module = 'all';
      } else if (formData.modules.includes('none') || formData.modules.length === 0) {
        submitData.module = 'all'; // Default to 'all' instead of 'none' for better access
      } else {
        // For multiple specific modules, join them with commas
        submitData.module = formData.modules.join(',');
      }
      
      delete submitData.modules;

      if (user) {
        // Update existing user
        if (!submitData.password) {
          delete submitData.password // Don't update password if empty
        }
        await API.auth.update(user._id, submitData)
        toast.success('User account updated successfully')
      } else {
        // Create new user
        await API.auth.register(submitData)
        toast.success('User account created successfully')
      }
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving user account:', error)
      const errorMessage = error.response?.data?.message || 
                          (error.response?.data?.errors ? 
                            error.response.data.errors.map(e => e.msg).join(', ') : 
                            'Failed to save user account')
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleModuleToggle = (moduleValue) => {
    setFormData(prev => {
      const newModules = [...prev.modules].filter(m => m !== 'all' && m !== 'none')
      if (newModules.includes(moduleValue)) {
        const filtered = newModules.filter(m => m !== moduleValue)
        // If nothing left after removing, default to all instead of none
        return { ...prev, modules: filtered.length === 0 ? ['all'] : filtered }
      } else {
        return { ...prev, modules: [...newModules, moduleValue] }
      }
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mobile-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">
            {user ? 'Edit User Account' : 'Create User Account'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1">
            <FiX size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 mobile-modal-content">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base min-h-44"
              />
            </div>

            {/* Email/Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email/Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base min-h-44"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                pattern="[0-9]{10}"
                maxLength="10"
                value={formData.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData({ ...formData, phone: value });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base min-h-44"
                placeholder="10-digit phone number"
              />
              {formData.phone && formData.phone.length !== 10 && (
                <p className="text-red-500 text-sm mt-1">Phone number must be exactly 10 digits</p>
              )}
            </div>

            {/* Password */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password {!user && <span className="text-red-500">*</span>}
                {user && <span className="text-sm text-gray-500">(Leave empty to keep current)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!user}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base min-h-44"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base min-h-44"
              >
                <option value="employee">Employee</option>
                <option value="supervisor">Supervisor</option>
                <option value="engineer">Engineer</option>
                <option value="worker">Worker</option>
                <option value="technician">Technician</option>
                <option value="helper">Helper</option>
                <option value="driver">Driver</option>
                <option value="manager">Manager</option>
                <option value="accountant">Accountant</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Module Access - Radio Button Approach */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Module Access <span className="text-red-500">*</span>
              </label>
              
              {/* Radio button selection */}
              <div className="space-y-3 mb-3">
                <label className="flex items-center cursor-pointer p-3 border-2 rounded-lg hover:bg-gray-50 transition-colors"
                  style={{
                    borderColor: formData.modules.includes('all') ? '#3b82f6' : '#d1d5db',
                    backgroundColor: formData.modules.includes('all') ? '#eff6ff' : 'transparent'
                  }}>
                  <input
                    type="radio"
                    name="moduleAccessType"
                    checked={formData.modules.includes('all')}
                    onChange={() => setFormData(prev => ({ ...prev, modules: ['all'] }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="ml-3 text-sm font-semibold text-gray-900">All Modules - Full Access</span>
                </label>
                
                <label className="flex items-center cursor-pointer p-3 border-2 rounded-lg hover:bg-gray-50 transition-colors"
                  style={{
                    borderColor: (!formData.modules.includes('all') && !formData.modules.includes('none')) ? '#3b82f6' : '#d1d5db',
                    backgroundColor: (!formData.modules.includes('all') && !formData.modules.includes('none')) ? '#eff6ff' : 'transparent'
                  }}>
                  <input
                    type="radio"
                    name="moduleAccessType"
                    checked={!formData.modules.includes('all') && !formData.modules.includes('none')}
                    onChange={() => setFormData(prev => ({ ...prev, modules: [] }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="ml-3 text-sm font-semibold text-gray-900">Specific Modules</span>
                </label>
                
                <label className="flex items-center cursor-pointer p-3 border-2 rounded-lg hover:bg-gray-50 transition-colors"
                  style={{
                    borderColor: formData.modules.includes('none') ? '#3b82f6' : '#d1d5db',
                    backgroundColor: formData.modules.includes('none') ? '#eff6ff' : 'transparent'
                  }}>
                  <input
                    type="radio"
                    name="moduleAccessType"
                    checked={formData.modules.includes('none')}
                    onChange={() => setFormData(prev => ({ ...prev, modules: ['none'] }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="ml-3 text-sm font-semibold text-gray-900">None - Self-Service Only</span>
                </label>
              </div>
              
              {/* Show specific module checkboxes only when "Specific Modules" is selected */}
              {!formData.modules.includes('all') && !formData.modules.includes('none') && (
                <div className="p-4 border-2 border-blue-300 rounded-lg bg-blue-50">
                  <p className="text-sm font-medium text-gray-700 mb-3">Select specific modules:</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'crm', label: 'CRM Module' },
                      { value: 'inventory', label: 'Inventory Module' },
                      { value: 'employee', label: 'Employee Module' }
                    ].map((module) => (
                      <label 
                        key={module.value}
                        className="flex items-center cursor-pointer p-2 rounded hover:bg-blue-100 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formData.modules.includes(module.value)}
                          onChange={() => handleModuleToggle(module.value)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="ml-2 text-sm text-gray-700 font-medium">{module.label}</span>
                      </label>
                    ))}
                  </div>
                  {formData.modules.length === 0 && (
                    <p className="text-xs text-orange-600 mt-2">⚠️ Please select at least one module</p>
                  )}
                </div>
              )}
              
              {/* Currently selected indicator */}
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                <p className="text-xs text-green-900">
                  <strong>✓ Selected:</strong> {' '}
                  <span className="font-mono">
                    {formData.modules.length === 0 ? 'None selected (will default to "none")' : formData.modules.join(', ')}
                  </span>
                </p>
              </div>
            </div>

            {/* Permissions */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permissions
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.permissions.canView}
                    onChange={(e) => setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, canView: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Can View</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.permissions.canCreate}
                    onChange={(e) => setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, canCreate: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Can Create</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.permissions.canEdit}
                    onChange={(e) => setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, canEdit: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Can Edit</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.permissions.canDelete}
                    onChange={(e) => setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, canDelete: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Can Delete</span>
                </label>
                <label className="flex items-center col-span-2">
                  <input
                    type="checkbox"
                    checked={formData.permissions.canHandleAccounts}
                    onChange={(e) => setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, canHandleAccounts: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Can Handle Accounts/Payments</span>
                </label>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 min-h-44"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed min-h-44"
            >
              {loading ? 'Saving...' : (user ? 'Update' : 'Create')} Account
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UserAccountModal