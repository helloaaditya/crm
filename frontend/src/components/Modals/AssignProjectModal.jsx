import { useState, useEffect } from 'react'
import { FiX } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'

const AssignProjectModal = ({ isOpen, onClose, onSuccess, employee }) => {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [role, setRole] = useState(employee?.role || 'worker')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchProjects()
      setRole(employee?.role || 'worker')
    }
  }, [isOpen, employee])

  const fetchProjects = async () => {
    try {
      const response = await API.projects.getAll({ limit: 100, status: 'planning,in_progress' })
      setProjects(response.data.data)
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to load projects')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!selectedProject) {
      toast.error('Please select a project')
      return
    }

    try {
      setLoading(true)
      await API.employees.assignProject(employee._id, {
        projectId: selectedProject,
        role: role
      })
      toast.success(`Project assigned successfully as ${role}`)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error assigning project:', error)
      toast.error(error.response?.data?.message || 'Failed to assign project')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Assign Project</h2>
            <p className="text-sm text-gray-600 mt-1">Employee: {employee?.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Select Project */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Project <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Choose a project...</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.projectId} - {project.description} ({project.customer?.name})
                </option>
              ))}
            </select>
          </div>

          {/* Role in Project */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role in Project <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="supervisor">Supervisor</option>
              <option value="engineer">Engineer</option>
              <option value="worker">Worker</option>
              <option value="helper">Helper</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              This is the role for this specific project assignment
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Assigning...' : 'Assign Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AssignProjectModal
