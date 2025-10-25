import { useState, useEffect } from 'react'
import { FiX } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'

const ProjectModal = ({ isOpen, onClose, onSuccess, project = null }) => {
  const [customers, setCustomers] = useState([])
  const [supervisors, setSupervisors] = useState([])
  const [formData, setFormData] = useState({
    customer: '',
    projectType: 'new',
    category: 'residential',
    subCategory: 'waterproofing',
    description: '',
    siteAddress: {
      street: '',
      city: '',
      state: '',
      pincode: ''
    },
    startDate: '',
    expectedEndDate: '',
    estimatedCost: '',
    supervisor: ''
  })
  const [loading, setLoading] = useState(false)
  const [searchCustomer, setSearchCustomer] = useState('')

  // Load project data when editing
  useEffect(() => {
    if (project) {
      setFormData({
        customer: project.customer?._id || '',
        projectType: project.projectType || 'new',
        category: project.category || 'residential',
        subCategory: project.subCategory || 'waterproofing',
        description: project.description || '',
        siteAddress: {
          street: project.siteAddress?.street || '',
          city: project.siteAddress?.city || '',
          state: project.siteAddress?.state || '',
          pincode: project.siteAddress?.pincode || ''
        },
        startDate: project.startDate?.split('T')[0] || '',
        expectedEndDate: project.expectedEndDate?.split('T')[0] || '',
        estimatedCost: project.estimatedCost || '',
        supervisor: project.supervisors?.[0]?.employee?._id || project.supervisors?.[0]?.employee || ''
      })
    } else {
      // Reset form when adding new
      setFormData({
        customer: '',
        projectType: 'new',
        category: 'residential',
        subCategory: 'waterproofing',
        description: '',
        siteAddress: {
          street: '',
          city: '',
          state: '',
          pincode: ''
        },
        startDate: '',
        expectedEndDate: '',
        estimatedCost: '',
        supervisor: ''
      })
    }
  }, [project, isOpen])

  useEffect(() => {
    if (isOpen) {
      fetchCustomers()
      fetchSupervisors()
    }
  }, [isOpen])

  const fetchCustomers = async () => {
    try {
      const response = await API.customers.getAll({ limit: 100 })
      setCustomers(response.data.data)
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchSupervisors = async () => {
    try {
      const response = await API.employees.getByRole('supervisor')
      setSupervisors(response.data.data)
    } catch (error) {
      console.error('Error fetching supervisors:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      let projectId
      
      if (project) {
        await API.projects.update(project._id, formData)
        projectId = project._id
        toast.success('Project updated successfully!')
      } else {
        const response = await API.projects.create(formData)
        projectId = response.data.data._id
        toast.success(`Project created! ID: ${response.data.data.projectId}`)
      }

      // Assign supervisor if selected
      if (formData.supervisor && projectId) {
        try {
          await API.employees.assignProject(formData.supervisor, {
            projectId: projectId,
            role: 'supervisor'
          })
        } catch (error) {
          console.error('Error assigning supervisor:', error)
          toast.warning('Project created but supervisor assignment failed')
        }
      }
      
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving project:', error)
      toast.error(error.response?.data?.message || 'Failed to save project')
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
    c.contactNumber.includes(searchCustomer)
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-800">
            {project ? 'Edit Project' : 'Create New Project'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Search customer by name or mobile..."
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              name="customer"
              value={formData.customer}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Customer</option>
              {filteredCustomers.map(customer => (
                <option key={customer._id} value={customer._id}>
                  {customer.name} - {customer.contactNumber} ({customer.customerId})
                </option>
              ))}
            </select>
          </div>

          {/* Project Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Type <span className="text-red-500">*</span>
              </label>
              <select
                name="projectType"
                value={formData.projectType}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="new">New</option>
                <option value="rework">Rework</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sub Category <span className="text-red-500">*</span>
              </label>
              <select
                name="subCategory"
                value={formData.subCategory}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="waterproofing">Waterproofing</option>
                <option value="flooring">Flooring</option>
                <option value="repainting">Repainting</option>
                <option value="civil_work">Civil Work</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign Supervisor
              </label>
              <select
                name="supervisor"
                value={formData.supervisor}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Supervisor (Optional)</option>
                {supervisors.map(supervisor => (
                  <option key={supervisor._id} value={supervisor._id}>
                    {supervisor.name} ({supervisor.employeeId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Cost
              </label>
              <input
                type="number"
                name="estimatedCost"
                value={formData.estimatedCost}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected End Date
              </label>
              <input
                type="date"
                name="expectedEndDate"
                value={formData.expectedEndDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Site Address */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">Site Address</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <input
                  type="text"
                  name="siteAddress.street"
                  value={formData.siteAddress.street}
                  onChange={handleChange}
                  placeholder="Street Address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <input
                type="text"
                name="siteAddress.city"
                value={formData.siteAddress.city}
                onChange={handleChange}
                placeholder="City"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="text"
                name="siteAddress.state"
                value={formData.siteAddress.state}
                onChange={handleChange}
                placeholder="State"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="text"
                name="siteAddress.pincode"
                value={formData.siteAddress.pincode}
                onChange={handleChange}
                placeholder="Pincode"
                pattern="[0-9]{6}"
                maxLength="6"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProjectModal
