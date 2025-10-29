import { useState, useEffect } from 'react'
import { FiX } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'

const AssignMachineryModal = ({ isOpen, onClose, onSuccess, machinery = null }) => {
  const [projects, setProjects] = useState([])
  const [formData, setFormData] = useState({
    projectId: '',
    quantity: 1,
    expectedReturnDate: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchProjects()
      if (machinery) {
        setFormData({
          projectId: '',
          quantity: 1,
          expectedReturnDate: '',
          notes: ''
        })
      }
    }
  }, [isOpen, machinery])

  const fetchProjects = async () => {
    try {
      const response = await API.projects.getAll({ limit: 100, status: 'in_progress' })
      setProjects(response.data.data)
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to fetch projects')
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.projectId) {
      toast.error('Please select a project')
      return
    }

    if (formData.quantity > machinery.availableQuantity) {
      toast.error(`Only ${machinery.availableQuantity} units available`)
      return
    }

    try {
      setLoading(true)
      
      await API.machinery.assignToProject(machinery._id, {
        projectId: formData.projectId,
        quantity: parseInt(formData.quantity),
        expectedReturnDate: formData.expectedReturnDate,
        notes: formData.notes
      })
      
      toast.success('Machinery assigned to project successfully')
      onSuccess()
    } catch (error) {
      console.error('Error assigning machinery:', error)
      toast.error(error.response?.data?.message || 'Failed to assign machinery')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !machinery) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto mobile-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">
            Assign Machinery to Project
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1">
            <FiX size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 mobile-modal-content">
          {/* Machinery Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Machinery Details</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Name:</span> {machinery.name}</p>
              <p><span className="font-medium">Brand:</span> {machinery.brand} {machinery.model}</p>
              <p><span className="font-medium">Available:</span> {machinery.availableQuantity} {machinery.unit}</p>
              <p><span className="font-medium">Condition:</span> <span className="capitalize">{machinery.condition}</span></p>
            </div>
          </div>

          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Project <span className="text-red-500">*</span>
            </label>
            <select
              name="projectId"
              value={formData.projectId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base min-h-44"
            >
              <option value="">Choose a project...</option>
              {projects.map(project => (
                <option key={project._id} value={project._id}>
                  {project.projectId} - {project.customer?.name} - {project.description}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="1"
              max={machinery.availableQuantity}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base min-h-44"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum available: {machinery.availableQuantity} {machinery.unit}
            </p>
          </div>

          {/* Expected Return Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Return Date
            </label>
            <input
              type="date"
              name="expectedReturnDate"
              value={formData.expectedReturnDate}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base min-h-44"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Any additional notes about this assignment..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base"
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
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
              className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-44"
            >
              {loading ? 'Assigning...' : 'Assign to Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AssignMachineryModal
