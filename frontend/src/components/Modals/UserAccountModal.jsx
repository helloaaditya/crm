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
          userModules = ['none'] // Keep 'none' as self-service only
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
      console.log('💾 Saving user account...');
      
      // Convert modules array to appropriate format for backend
      const submitData = {
        ...formData
      };
      
      // Handle module conversion for backend compatibility
      if (formData.modules.includes('all')) {
        submitData.module = 'all';
      } else if (formData.modules.includes('none') || formData.modules.length === 0) {
        submitData.module = 'none'; // Default to 'none' for self-service only access
      } else {
        // For multiple specific modules, join them with commas
        submitData.module = formData.modules.join(',');
      }
      
      delete submitData.modules;

      console.log('📤 Submitting data:', { ...submitData, password: submitData.password ? '***' : undefined });

      if (user) {
        // Update existing user
        if (!submitData.password) {
          delete submitData.password // Don't update password if empty
        }
        console.log('🔄 Updating user:', user._id);
        await API.auth.update(user._id, submitData)
        console.log('✅ User updated successfully');
        toast.success('User account updated successfully')
      } else {
        // Create new user with extended timeout (60 seconds)
        console.log('➕ Creating new user...');
        await API.auth.register(submitData)
        console.log('✅ User created successfully');
        toast.success('User account created successfully! Employee record also created.')
      }
      onSuccess()
      onClose()
    } catch (error) {
      console.error('❌ Error saving user account:', error)
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response?.data);
      
      // Handle timeout specifically
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error('Request timed out. Account may have been created - please refresh and check.', {
          duration: 5000
        });
      } else {
        const errorMessage = error.response?.data?.message || 
                            (error.response?.data?.errors ? 
                              error.response.data.errors.map(e => e.msg).join(', ') : 
                              'Failed to save user account');
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false)
    }
  }

  const handleModuleToggle = (moduleValue) => {
    setFormData(prev => {
      const newModules = [...prev.modules].filter(m => m !== 'all' && m !== 'none')
      
      // Define related pages for each base module
      const relatedPages = {
        'crm': ['crm:customers', 'crm:projects', 'crm:invoices', 'crm:payments', 'crm:work-orders'],
        'inventory': ['inventory:materials', 'inventory:machinery', 'inventory:vendors', 'inventory:vendor-payments'],
        'employee': ['employee:list', 'employee:management', 'employee:attendance', 'employee:salary', 'employee:leave'],
        'expense': ['expense:list', 'expense:approvals'],
        'employee_funds': []
      }
      
      if (newModules.includes(moduleValue)) {
        // Unchecking - remove this module and all its related pages
        let filtered = newModules.filter(m => m !== moduleValue)
        
        // If unchecking a base module, also remove all its sub-pages
        if (relatedPages[moduleValue]) {
          filtered = filtered.filter(m => !relatedPages[moduleValue].includes(m))
        }
        
        // If unchecking a sub-page, check if we should uncheck the base module too
        const baseModule = moduleValue.split(':')[0]
        if (moduleValue.includes(':') && relatedPages[baseModule]) {
          const remainingSubPages = relatedPages[baseModule].filter(p => filtered.includes(p))
          if (remainingSubPages.length === 0) {
            filtered = filtered.filter(m => m !== baseModule)
          }
        }
        
        return { ...prev, modules: filtered.length === 0 ? [] : filtered }
      } else {
        // Checking - add this module
        let updated = [...newModules, moduleValue]
        
        // If checking a base module, also add all its sub-pages
        if (relatedPages[moduleValue]) {
          updated = [...updated, ...relatedPages[moduleValue]]
        }
        
        // If checking a sub-page and all sub-pages are now selected, auto-select the base module
        const baseModule = moduleValue.split(':')[0]
        if (moduleValue.includes(':') && relatedPages[baseModule]) {
          const allSubPagesSelected = relatedPages[baseModule].every(p => 
            updated.includes(p) || p === moduleValue
          )
          if (allSubPagesSelected && !updated.includes(baseModule)) {
            updated.push(baseModule)
          }
        }
        
        // Remove duplicates
        return { ...prev, modules: [...new Set(updated)] }
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
              
              {/* Show specific page checkboxes only when "Specific Modules" is selected */}
              {!formData.modules.includes('all') && !formData.modules.includes('none') && (
                <div className="p-4 border-2 border-blue-300 rounded-lg bg-blue-50 max-h-96 overflow-y-auto">
                  <p className="text-sm font-medium text-gray-700 mb-3">Select specific pages to grant access:</p>
                  
                  {/* CRM Pages */}
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-blue-900 mb-2 uppercase">📊 CRM Module</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-2">
                      {[
                        { value: 'crm', label: '✓ All CRM Pages', description: 'Full CRM access' },
                        { value: 'crm:customers', label: 'Customers', description: 'Manage customers' },
                        { value: 'crm:projects', label: 'Projects', description: 'Project management' },
                        { value: 'crm:invoices', label: 'Invoices', description: 'Invoice management' },
                        { value: 'crm:payments', label: 'Payments', description: 'Payment tracking' },
                        { value: 'crm:work-orders', label: 'Work Orders', description: 'Work order management' }
                      ].map((page) => (
                        <label 
                          key={page.value}
                          className="flex items-start cursor-pointer p-2 rounded hover:bg-blue-100 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={formData.modules.includes(page.value)}
                            onChange={() => handleModuleToggle(page.value)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer mt-0.5 flex-shrink-0"
                          />
                          <div className="ml-2">
                            <span className="text-xs text-gray-800 font-medium block">{page.label}</span>
                            <span className="text-xs text-gray-500">{page.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Inventory Pages */}
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-blue-900 mb-2 uppercase">📦 Inventory Module</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-2">
                      {[
                        { value: 'inventory', label: '✓ All Inventory Pages', description: 'Full inventory access' },
                        { value: 'inventory:materials', label: 'Materials', description: 'Material inventory' },
                        { value: 'inventory:machinery', label: 'Machinery', description: 'Equipment management' },
                        { value: 'inventory:vendors', label: 'Vendors', description: 'Vendor management' },
                        { value: 'inventory:vendor-payments', label: 'Vendor Payments', description: 'Vendor payment tracking' }
                      ].map((page) => (
                        <label 
                          key={page.value}
                          className="flex items-start cursor-pointer p-2 rounded hover:bg-blue-100 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={formData.modules.includes(page.value)}
                            onChange={() => handleModuleToggle(page.value)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer mt-0.5 flex-shrink-0"
                          />
                          <div className="ml-2">
                            <span className="text-xs text-gray-800 font-medium block">{page.label}</span>
                            <span className="text-xs text-gray-500">{page.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Employee Pages */}
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-blue-900 mb-2 uppercase">👥 Employee Module</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-2">
                      {[
                        { value: 'employee', label: '✓ All Employee Pages', description: 'Full employee access' },
                        { value: 'employee:list', label: 'All Employees', description: 'Employee list' },
                        { value: 'employee:management', label: 'Employee Management', description: 'Hierarchy & availability' },
                        { value: 'employee:attendance', label: 'Attendance', description: 'Attendance tracking' },
                        { value: 'employee:salary', label: 'Salary', description: 'Salary management' },
                        { value: 'employee:leave', label: 'Leave Management', description: 'Leave approvals' }
                      ].map((page) => (
                        <label 
                          key={page.value}
                          className="flex items-start cursor-pointer p-2 rounded hover:bg-blue-100 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={formData.modules.includes(page.value)}
                            onChange={() => handleModuleToggle(page.value)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer mt-0.5 flex-shrink-0"
                          />
                          <div className="ml-2">
                            <span className="text-xs text-gray-800 font-medium block">{page.label}</span>
                            <span className="text-xs text-gray-500">{page.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Expense Pages */}
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-blue-900 mb-2 uppercase">💳 Expense Module</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-2">
                      {[
                        { value: 'expense', label: '✓ All Expense Pages', description: 'Full expense access' },
                        { value: 'expense:list', label: 'All Expenses', description: 'Expense list' },
                        { value: 'expense:approvals', label: 'Expense Approvals', description: 'Approve/reject expenses' }
                      ].map((page) => (
                        <label 
                          key={page.value}
                          className="flex items-start cursor-pointer p-2 rounded hover:bg-blue-100 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={formData.modules.includes(page.value)}
                            onChange={() => handleModuleToggle(page.value)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer mt-0.5 flex-shrink-0"
                          />
                          <div className="ml-2">
                            <span className="text-xs text-gray-800 font-medium block">{page.label}</span>
                            <span className="text-xs text-gray-500">{page.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Employee Funds Pages */}
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-blue-900 mb-2 uppercase">💰 Employee Funds Module</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-2">
                      {[
                        { value: 'employee_funds', label: 'Employee Funds Management', description: 'View and manage employee funds' }
                      ].map((page) => (
                        <label 
                          key={page.value}
                          className="flex items-start cursor-pointer p-2 rounded hover:bg-blue-100 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={formData.modules.includes(page.value)}
                            onChange={() => handleModuleToggle(page.value)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer mt-0.5 flex-shrink-0"
                          />
                          <div className="ml-2">
                            <span className="text-xs text-gray-800 font-medium block">{page.label}</span>
                            <span className="text-xs text-gray-500">{page.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Calendar Module */}
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-blue-900 mb-2 uppercase">📅 Calendar Module</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-2">
                      {[
                        { value: 'calendar', label: 'Calendar Access', description: 'View all calendar reminders and events' }
                      ].map((page) => (
                        <label 
                          key={page.value}
                          className="flex items-start cursor-pointer p-2 rounded hover:bg-blue-100 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={formData.modules.includes(page.value)}
                            onChange={() => handleModuleToggle(page.value)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer mt-0.5 flex-shrink-0"
                          />
                          <div className="ml-2">
                            <span className="text-xs text-gray-800 font-medium block">{page.label}</span>
                            <span className="text-xs text-gray-500">{page.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Shared Pages */}
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-blue-900 mb-2 uppercase">📁 Shared Pages</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-2">
                      {[
                        { value: 'shared:documents', label: 'Company Documents', description: 'Document repository' },
                        { value: 'shared:reminders', label: 'Reminders', description: 'Reminder management' }
                      ].map((page) => (
                        <label 
                          key={page.value}
                          className="flex items-start cursor-pointer p-2 rounded hover:bg-blue-100 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={formData.modules.includes(page.value)}
                            onChange={() => handleModuleToggle(page.value)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer mt-0.5 flex-shrink-0"
                          />
                          <div className="ml-2">
                            <span className="text-xs text-gray-800 font-medium block">{page.label}</span>
                            <span className="text-xs text-gray-500">{page.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Admin Pages */}
                  <div className="mb-2">
                    <h4 className="text-xs font-bold text-red-900 mb-2 uppercase">⚙️ Admin Pages</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-2">
                      {[
                        { value: 'admin:accounts', label: 'Accounts', description: 'User account management' },
                        { value: 'admin:settings', label: 'Settings', description: 'System settings' },
                        { value: 'admin:bulk-import', label: 'Bulk Import', description: 'Data import' },
                        { value: 'admin:live-tracking', label: 'Live Tracking', description: 'Employee location tracking' }
                      ].map((page) => (
                        <label 
                          key={page.value}
                          className="flex items-start cursor-pointer p-2 rounded hover:bg-blue-100 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={formData.modules.includes(page.value)}
                            onChange={() => handleModuleToggle(page.value)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer mt-0.5 flex-shrink-0"
                          />
                          <div className="ml-2">
                            <span className="text-xs text-gray-800 font-medium block">{page.label}</span>
                            <span className="text-xs text-gray-500">{page.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {formData.modules.length === 0 && (
                    <p className="text-xs text-orange-600 mt-3 p-2 bg-orange-50 border border-orange-200 rounded">⚠️ Please select at least one page</p>
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