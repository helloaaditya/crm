import { useState, useEffect } from 'react'
import { FiX, FiSearch, FiChevronDown } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'

const ReturnMachineryModal = ({ isOpen, onClose, onSuccess, machinery = null }) => {
  const [assignments, setAssignments] = useState([])
  const [filteredAssignments, setFilteredAssignments] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [formData, setFormData] = useState({
    assignmentId: '',
    actualReturnDate: '',
    condition: 'good',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  const conditions = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
    { value: 'damaged', label: 'Damaged' }
  ]

  useEffect(() => {
    if (isOpen && machinery) {
      // Filter only active assignments (assigned or in_use)
      const activeAssignments = machinery.assignedProjects.filter(
        assignment => assignment.status === 'assigned' || assignment.status === 'in_use'
      )
      setAssignments(activeAssignments)
      setFilteredAssignments(activeAssignments)
      
      // Reset form
      setFormData({
        assignmentId: '',
        actualReturnDate: new Date().toISOString().split('T')[0],
        condition: 'good',
        notes: ''
      })
      setSearchTerm('')
      setShowDropdown(false)
      setSelectedIndex(-1)
    }
  }, [isOpen, machinery])

  // Filter assignments based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = assignments.filter(assignment => 
        assignment.project.projectId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.project.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.status.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredAssignments(filtered)
    } else {
      setFilteredAssignments(assignments)
    }
  }, [searchTerm, assignments])

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

  const handleAssignmentSelect = (assignment) => {
    setFormData(prev => ({
      ...prev,
      assignmentId: assignment._id
    }))
    setSearchTerm(`${assignment.project.projectId} - ${assignment.project.customer?.name} (${assignment.quantity} ${machinery.unit}) - ${assignment.status}`)
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
          prev < filteredAssignments.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredAssignments.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && filteredAssignments[selectedIndex]) {
          handleAssignmentSelect(filteredAssignments[selectedIndex])
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
      if (showDropdown && !event.target.closest('.assignment-dropdown')) {
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
    
    if (!formData.assignmentId) {
      toast.error('Please select an assignment to return')
      return
    }

    try {
      setLoading(true)
      
      const assignment = assignments.find(a => a._id.toString() === formData.assignmentId)
      
      await API.machinery.returnFromProject(machinery._id, {
        projectId: assignment.project._id,
        actualReturnDate: formData.actualReturnDate,
        condition: formData.condition,
        notes: formData.notes
      })
      
      toast.success('Machinery returned successfully')
      onSuccess()
    } catch (error) {
      console.error('Error returning machinery:', error)
      toast.error(error.response?.data?.message || 'Failed to return machinery')
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
            Return Machinery
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
              <p><span className="font-medium">Current Available:</span> {machinery.availableQuantity} {machinery.unit}</p>
            </div>
          </div>

          {/* Active Assignments with Search */}
          {assignments.length > 0 ? (
            <div className="relative assignment-dropdown">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Assignment to Return <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onFocus={() => setShowDropdown(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search assignments by project ID, customer, or status..."
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
                  {filteredAssignments.length > 0 ? (
                    filteredAssignments.map((assignment, index) => (
                      <div
                        key={assignment._id}
                        onClick={() => handleAssignmentSelect(assignment)}
                        className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                          index === selectedIndex 
                            ? 'bg-blue-100 text-blue-900' 
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="font-medium text-sm text-gray-900">
                          {assignment.project.projectId}
                        </div>
                        <div className="text-xs text-gray-600">
                          {assignment.project.customer?.name} - {assignment.project.description}
                        </div>
                        <div className="text-xs text-gray-500">
                          Quantity: {assignment.quantity} {machinery.unit} | 
                          Status: {assignment.status === 'assigned' ? 'Assigned' : 'In Use'} | 
                          Assigned: {new Date(assignment.assignedDate).toLocaleDateString()}
                        </div>
                        {assignment.expectedReturnDate && (
                          <div className="text-xs text-gray-500">
                            Expected Return: {new Date(assignment.expectedReturnDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No assignments found matching "{searchTerm}"
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">No active assignments found for this machinery</p>
            </div>
          )}

          {/* Return Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actual Return Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="actualReturnDate"
              value={formData.actualReturnDate}
              onChange={handleChange}
              required
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base min-h-44"
            />
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Return Condition
            </label>
            <select
              name="condition"
              value={formData.condition}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base min-h-44"
            >
              {conditions.map(cond => (
                <option key={cond.value} value={cond.value}>{cond.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Return Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Any notes about the return condition, damage, or other observations..."
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
              disabled={loading || assignments.length === 0}
              className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-44"
            >
              {loading ? 'Returning...' : 'Return Machinery'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ReturnMachineryModal
