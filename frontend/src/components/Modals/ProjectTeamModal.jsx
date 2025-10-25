import { useState, useEffect } from 'react'
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'

const ProjectTeamModal = ({ isOpen, onClose, project }) => {
  const [allEmployees, setAllEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedRole, setSelectedRole] = useState('worker')
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(false)

  // All available roles
  const availableRoles = [
    { value: 'supervisor', label: 'Supervisor', color: 'purple' },
    { value: 'engineer', label: 'Engineer', color: 'blue' },
    { value: 'worker', label: 'Worker', color: 'green' },
    { value: 'technician', label: 'Technician', color: 'orange' },
    { value: 'helper', label: 'Helper', color: 'yellow' },
    { value: 'driver', label: 'Driver', color: 'gray' }
  ]

  const fetchEmployees = async () => {
    try {
      // Fetch employees based on selected role
      const response = await API.employees.getAll({ 
        limit: 1000, 
        designation: selectedRole 
      })
      setAllEmployees(response.data.data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  // Update the useEffect to fetch employees when selectedRole changes
  useEffect(() => {
    if (isOpen && project) {
      fetchTeamMembers()
    }
  }, [isOpen, project])

  // Add another useEffect to fetch employees when selectedRole changes
  useEffect(() => {
    if (isOpen && project) {
      fetchEmployees()
      // Reset selected employee when role changes
      setSelectedEmployee('')
    }
  }, [selectedRole, isOpen, project])

  const fetchTeamMembers = async () => {
    try {
      const response = await API.projects.getById(project._id)
      const allMembers = [
        ...(response.data.data.supervisors || []).map(s => ({ 
          ...s, 
          employee: s.employee, 
          role: 'supervisor' 
        })),
        ...(response.data.data.workers || []).map(w => ({ 
          ...w, 
          employee: w.employee, 
          role: w.role || 'worker' 
        }))
      ]
      setTeamMembers(allMembers)
    } catch (error) {
      console.error('Error fetching team members:', error)
    }
  }

  const handleAssign = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee')
      return
    }

    try {
      setLoading(true)
      await API.projects.assignEmployee(project._id, {
        employeeId: selectedEmployee,
        role: selectedRole
      })
      toast.success(`Employee assigned as ${selectedRole}`)
      setSelectedEmployee('')
      fetchTeamMembers()
    } catch (error) {
      console.error('Error assigning employee:', error)
      toast.error(error.response?.data?.message || 'Failed to assign employee')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (employeeId) => {
    if (!employeeId) {
      toast.error('Employee ID not found')
      return
    }
    
    if (!window.confirm('Remove this team member from the project?')) return

    try {
      setLoading(true)
      await API.projects.removeEmployee(project._id, employeeId)
      toast.success('Employee removed from project')
      fetchTeamMembers()
    } catch (error) {
      console.error('Error removing employee:', error)
      toast.error(error.response?.data?.message || 'Failed to remove employee')
    } finally {
      setLoading(false)
    }
  }

  const getAvailableEmployees = () => {
    return allEmployees
  }

  const getRoleBadgeColor = (role) => {
    const roleConfig = availableRoles.find(r => r.value === role)
    const color = roleConfig?.color || 'gray'
    return `bg-${color}-100 text-${color}-800`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Manage Project Team</h2>
            <p className="text-sm text-gray-600 mt-1">Project: {project?.projectId}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        {/* Add Team Member */}
        <div className="p-6 border-b bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Add Team Member</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <select
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value)
                  setSelectedEmployee('')
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {availableRoles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Employee</option>
                {getAvailableEmployees().map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.employeeId})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <button
                onClick={handleAssign}
                disabled={loading}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                <FiPlus className="mr-1" />
                Assign
              </button>
            </div>
          </div>
        </div>

        {/* Team Members List */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Current Team ({teamMembers.length})</h3>
          <div className="space-y-2">
            {teamMembers.length > 0 ? (
              teamMembers.map((member, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {member.employee?.name || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {member.employee?.employeeId || 'N/A'} • <span className={`px-2 py-0.5 rounded-full text-xs ${
                        member.role === 'supervisor' ? 'bg-purple-100 text-purple-800' :
                        member.role === 'engineer' ? 'bg-blue-100 text-blue-800' :
                        member.role === 'technician' ? 'bg-orange-100 text-orange-800' :
                        member.role === 'helper' ? 'bg-yellow-100 text-yellow-800' :
                        member.role === 'driver' ? 'bg-gray-100 text-gray-800' :
                        'bg-green-100 text-green-800'
                      }`}>{member.role}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(member.employee?._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Remove"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No team members assigned yet</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProjectTeamModal
