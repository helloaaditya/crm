import { useState, useEffect } from 'react'
import { FiX } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'

const EmployeeModal = ({ isOpen, onClose, onSuccess, employee = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    gender: 'male',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: ''
    },
    designation: 'worker',
    role: 'worker',
    department: 'construction',
    joiningDate: new Date().toISOString().split('T')[0],
    employmentType: 'full_time',
    basicSalary: ''
  })

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        phone: employee.phone || '',
        email: employee.email || '',
        dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : '',
        gender: employee.gender || 'male',
        address: {
          street: employee.address?.street || '',
          city: employee.address?.city || '',
          state: employee.address?.state || '',
          pincode: employee.address?.pincode || ''
        },
        designation: employee.designation || 'worker',
        role: employee.role || employee.designation || 'worker',
        department: employee.department || 'construction',
        joiningDate: employee.joiningDate ? new Date(employee.joiningDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        employmentType: employee.employmentType || 'full_time',
        basicSalary: employee.basicSalary || ''
      })
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        dateOfBirth: '',
        gender: 'male',
        address: { street: '', city: '', state: '', pincode: '' },
        designation: 'worker',
        role: 'worker',
        department: 'construction',
        joiningDate: new Date().toISOString().split('T')[0],
        employmentType: 'full_time',
        basicSalary: ''
      })
    }
  }, [employee, isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (employee) {
        await API.employees.update(employee._id, formData)
        toast.success('Employee updated successfully')
      } else {
        await API.employees.create(formData)
        toast.success('Employee created successfully')
      }
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving employee:', error)
      toast.error(error.response?.data?.message || 'Failed to save employee')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl m-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            {employee ? 'Edit Employee' : 'Add New Employee'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-4">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Personal Details Section */}
            <div className="col-span-2 border-b pb-2 mb-4">
              <h3 className="text-lg font-medium text-gray-800">Personal Details</h3>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                pattern="[0-9]{10}"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Address Fields */}
            <div className="col-span-2 border-b pb-2 my-4">
              <h3 className="text-lg font-medium text-gray-800">Address</h3>
            </div>

            {/* Street */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
              <input
                type="text"
                value={formData.address.street}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  address: { ...formData.address, street: e.target.value } 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={formData.address.city}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  address: { ...formData.address, city: e.target.value } 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={formData.address.state}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  address: { ...formData.address, state: e.target.value } 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Pincode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
              <input
                type="text"
                value={formData.address.pincode}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  address: { ...formData.address, pincode: e.target.value } 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Employment Details Section */}
            <div className="col-span-2 border-b pb-2 my-4">
              <h3 className="text-lg font-medium text-gray-800">Employment Details</h3>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value, designation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="worker">Worker</option>
                <option value="engineer">Engineer</option>
                <option value="supervisor">Supervisor</option>
                <option value="technician">Technician</option>
                <option value="helper">Helper</option>
                <option value="driver">Driver</option>
                <option value="manager">Manager</option>
                <option value="accountant">Accountant</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="construction">Construction</option>
                <option value="sales">Sales</option>
                <option value="inventory">Inventory</option>
                <option value="admin">Admin</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Joining Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
              <input
                type="date"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Employment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
              <select
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="daily_wage">Daily Wage</option>
              </select>
            </div>

            {/* Basic Salary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Basic Salary <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                value={formData.basicSalary}
                onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
            >
              {employee ? 'Update' : 'Create'} Employee
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EmployeeModal
