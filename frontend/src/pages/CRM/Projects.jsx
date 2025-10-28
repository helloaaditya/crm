import { useState, useEffect } from 'react'
import { FiPlus, FiSearch, FiEye, FiEdit, FiTrash2, FiClock, FiUpload, FiUsers, FiDownload, FiFilter, FiCalendar, FiDollarSign } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'
import ProjectModal from '../../components/Modals/ProjectModal'
import ProjectHistoryModal from '../../components/Modals/ProjectHistoryModal'
import ProjectTeamModal from '../../components/Modals/ProjectTeamModal'

const Projects = () => {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [summary, setSummary] = useState({ totalProjects: 0, activeProjects: 0, completedProjects: 0 })
  const [showModal, setShowModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyProjectId, setHistoryProjectId] = useState(null)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [teamProject, setTeamProject] = useState(null)

  useEffect(() => {
    fetchProjects()
  }, [page, status, category, startDate, endDate])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const params = { 
        page, 
        limit: 10,
        ...(search && { search }),
        ...(status && { status }),
        ...(category && { category }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      }

      const response = await API.projects.getAll(params)
      setProjects(response.data.data)
      setTotalPages(response.data.totalPages)
      setTotalCount(response.data.total || 0)
      
      // Calculate summary
      const totalProjects = response.data.data.length
      const activeProjects = response.data.data.filter(p => p.status === 'active').length
      const completedProjects = response.data.data.filter(p => p.status === 'completed').length
      setSummary({ totalProjects, activeProjects, completedProjects })
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchProjects()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return

    try {
      await API.projects.delete(id)
      toast.success('Project deleted successfully')
      fetchProjects()
    } catch (error) {
      toast.error('Failed to delete project')
    }
  }

  const handleEdit = (project) => {
    setSelectedProject(project)
    setShowModal(true)
  }

  const handleAdd = () => {
    setSelectedProject(null)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setSelectedProject(null)
  }

  const handleModalSuccess = () => {
    fetchProjects()
  }

  const handleClearFilters = () => {
    setSearch('')
    setStatus('')
    setCategory('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const handleExportCSV = () => {
    const csvData = projects.map(project => ({
      'Project ID': project.projectId,
      'Name': project.name,
      'Customer': project.customer?.name || 'N/A',
      'Category': project.category,
      'Status': project.status,
      'Priority': project.priority,
      'Start Date': project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A',
      'End Date': project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A',
      'Budget': project.budget || 'N/A',
      'Progress': `${project.progress || 0}%`,
      'Team Size': project.team?.length || 0
    }))

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `projects-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Projects exported successfully')
  }

  const handleViewHistory = (project) => {
    setHistoryProjectId(project._id)
    setShowHistoryModal(true)
  }

  const handleManageTeam = (project) => {
    setTeamProject(project)
    setShowTeamModal(true)
  }
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Projects</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {totalCount} projects • Active: {summary.activeProjects} • Completed: {summary.completedProjects}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm sm:text-base"
            disabled={projects.length === 0}
          >
            <FiDownload className="mr-2" />
            Export CSV
          </button>
          <button 
            onClick={handleAdd}
            className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
          >
            <FiPlus className="mr-2" />
            New Project
          </button>
        </div>
      </div>

      {/* Advanced Search & Filter */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiSearch className="inline mr-1" />
              Search
            </label>
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select 
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Status</option>
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select 
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Categories</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={handleClearFilters}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiCalendar className="inline mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiCalendar className="inline mr-1" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, totalCount)} of {totalCount} projects
            </div>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : projects.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projects.map((project) => (
                    <tr key={project._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {project.projectId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {project.customer?.name}<br/>
                        <span className="text-xs text-gray-500">{project.customer?.contactNumber}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {project.category.charAt(0).toUpperCase() + project.category.slice(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {project.projectType === 'new' ? 'New' : 'Rework'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          project.status === 'completed' ? 'bg-green-100 text-green-800' :
                          project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ₹{project.estimatedCost?.toLocaleString() || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleViewHistory(project)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded"
                            title="View History"
                          >
                            <FiClock />
                          </button>
                          <button 
                            onClick={() => handleManageTeam(project)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"
                            title="Manage Team"
                          >
                            <FiUsers />
                          </button>
                          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="View Details"><FiEye /></button>
                          <button onClick={() => handleEdit(project)} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Edit"><FiEdit /></button>
                          <button onClick={() => handleDelete(project._id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete"><FiTrash2 /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden">
              {projects.map((project) => (
                <div key={project._id} className="p-4 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{project.projectId}</h3>
                      <p className="text-xs text-gray-500 mt-1">{project.customer?.name}</p>
                      <p className="text-xs text-gray-500">{project.customer?.contactNumber}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        project.status === 'completed' ? 'bg-green-100 text-green-800' :
                        project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Category:</span>
                      <span className="font-medium">{project.category.charAt(0).toUpperCase() + project.category.slice(1)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium">{project.projectType === 'new' ? 'New' : 'Rework'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Cost:</span>
                      <span className="font-medium">₹{project.estimatedCost?.toLocaleString() || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => handleViewHistory(project)}
                      className="flex items-center justify-center px-2 py-2 text-purple-600 hover:bg-purple-50 rounded-lg text-xs"
                    >
                      <FiClock className="mr-1" size={12} />
                      History
                    </button>
                    <button 
                      onClick={() => handleManageTeam(project)}
                      className="flex items-center justify-center px-2 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs"
                    >
                      <FiUsers className="mr-1" size={12} />
                      Team
                    </button>
                    <button 
                      onClick={() => handleEdit(project)}
                      className="flex items-center justify-center px-2 py-2 text-green-600 hover:bg-green-50 rounded-lg text-xs"
                    >
                      <FiEdit className="mr-1" size={12} />
                      Edit
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button 
                      className="flex items-center justify-center px-2 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-xs"
                    >
                      <FiEye className="mr-1" size={12} />
                      View Details
                    </button>
                    <button 
                      onClick={() => handleDelete(project._id)}
                      className="flex items-center justify-center px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg text-xs"
                    >
                      <FiTrash2 className="mr-1" size={12} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border-t bg-gray-50 gap-3">
              <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, totalCount)} of {totalCount} projects
              </div>
              <div className="flex space-x-2 justify-center sm:justify-end">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No projects found</p>
          </div>
        )}
      </div>

      {/* Project Modal */}
      <ProjectModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        project={selectedProject}
      />

      {/* Project History Modal */}
      <ProjectHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        projectId={historyProjectId}
      />

      {/* Project Team Modal */}
      <ProjectTeamModal
        isOpen={showTeamModal}
        onClose={() => { setShowTeamModal(false); setTeamProject(null); }}
        project={teamProject}
      />
    </div>
  )
}

export default Projects
