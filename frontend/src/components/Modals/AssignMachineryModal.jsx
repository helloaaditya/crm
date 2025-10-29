import { useState, useEffect } from 'react'
import { FiX, FiSearch, FiChevronDown } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'

const AssignMachineryModal = ({ isOpen, onClose, onSuccess, machinery = null }) => {
  const [projects, setProjects] = useState([])
  const [filteredProjects, setFilteredProjects] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
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
        setSearchTerm('')
        setShowDropdown(false)
      }
    }
  }, [isOpen, machinery])

  // Filter projects based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = projects.filter(project => 
        project.projectId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredProjects(filtered)
    } else {
      setFilteredProjects(projects)
    }
  }, [searchTerm, projects])

  const fetchProjects = async () => {
    try {
      const response = await API.projects.getAll({ limit: 100, status: 'in_progress' })
      setProjects(response.data.data)
      setFilteredProjects(response.data.data)
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

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setShowDropdown(true)
    setSelectedIndex(-1)
  }

  const handleProjectSelect = (project) => {
    setFormData(prev => ({
      ...prev,
      projectId: project._id
    }))
    setSearchTerm(`${project.projectId} - ${project.customer?.name} - ${project.description}`)
    setShowDropdown(false)
    setSelectedIndex(-1)
  }

  const handleDropdownToggle = () => {
    setShowDropdown(!showDropdown)
  }

  const handleKeyDown = (e) => {
    if (!showDropdown) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredProjects.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredProjects.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && filteredProjects[selectedIndex]) {
          handleProjectSelect(filteredProjects[selectedIndex])
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.project-dropdown')) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

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

          {/* Project Selection with Search */}
          <div className="relative project-dropdown">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Project <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search projects by ID, customer, or description..."
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base min-h-44"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <FiSearch className="text-gray-400" size={18} />
              </div>
              <button
                type="button"
                onClick={handleDropdownToggle}
                className="absolute inset-y-0 right-8 flex items-center pr-2"
              >
                <FiChevronDown className="text-gray-400" size={18} />
              </button>
            </div>
            
            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((project, index) => (
                    <div
                      key={project._id}
                      onClick={() => handleProjectSelect(project)}
                      className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                        index === selectedIndex 
                          ? 'bg-blue-100 text-blue-900' 
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-medium text-sm text-gray-900">
                        {project.projectId}
                      </div>
                      <div className="text-xs text-gray-600">
                        {project.customer?.name} - {project.description}
                      </div>
                      <div className="text-xs text-gray-500">
                        Status: {project.status} | Start: {new Date(project.startDate).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    No projects found matching "{searchTerm}"
                  </div>
                )}
              </div>
            )}
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
