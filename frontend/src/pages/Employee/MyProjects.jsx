import { useState, useEffect, useMemo, useRef } from 'react'
import { FiCheckCircle, FiClock, FiUser, FiFileText, FiCalendar, FiSearch, FiFilter, FiX, FiSend, FiImage, FiFile, FiMic, FiMicOff, FiTrash2 } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'

const MyProjects = () => {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [completingProject, setCompletingProject] = useState(null)
  const { user } = useAuth()
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [updateForm, setUpdateForm] = useState({ description: '', images: [], audioNotes: [], videoRecordings: [] })
  
  // Filter and sort states
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    role: ''
  })
  const [sortBy, setSortBy] = useState('startDate')
  const [sortOrder, setSortOrder] = useState('desc')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchMyProjects()
  }, [])

  const fetchMyProjects = async () => {
    try {
      setLoading(true)
      const response = await API.employees.myProjects()
      // Add debugging to see what data is being returned
      console.log('MyProjects data:', response.data.data.activeProjects);
      setProjects(response.data.data.activeProjects || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const openUpdateModal = (projectId) => {
    setSelectedProjectId(projectId)
    setShowUpdateModal(true)
  }

  const handleUpload = async (e, type) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    try {
      const fd = new FormData()
      files.forEach(f => fd.append('files', f))
      fd.append('type', type)
      const res = await API.employees.uploadWorkUpdateFiles(fd)
      const uploadedUrls = res.data.data.map(f => f.url)
      setUpdateForm(prev => ({ ...prev, [type]: [...prev[type], ...uploadedUrls] }))
    } catch (err) {
      toast.error('File upload failed')
    }
  }

  const submitUpdate = async (e) => {
    e.preventDefault()
    if (!selectedProjectId) return toast.error('No project selected')
    if (!updateForm.description.trim()) return toast.error('Enter description')
    try {
      setSubmitting(true)
      await API.employees.myWorkUpdate({ projectId: selectedProjectId, ...updateForm })
      toast.success('Work update submitted')
      setShowUpdateModal(false)
      setUpdateForm({ description: '', images: [], audioNotes: [], videoRecordings: [] })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkComplete = async (projectId) => {
    if (!window.confirm('Are you sure you want to mark this project as complete?')) return

    try {
      setCompletingProject(projectId)
      await API.projects.markComplete(projectId)
      toast.success('Project marked as complete!')
      fetchMyProjects() // Refresh the list
    } catch (error) {
      console.error('Error marking project complete:', error)
      toast.error(error.response?.data?.message || 'Failed to mark project complete')
    } finally {
      setCompletingProject(null)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      planning: { bg: 'bg-gray-100 text-gray-800', icon: FiClock },
      in_progress: { bg: 'bg-blue-100 text-blue-800', icon: FiClock },
      on_hold: { bg: 'bg-yellow-100 text-yellow-800', icon: FiClock },
      completed: { bg: 'bg-green-100 text-green-800', icon: FiCheckCircle },
      cancelled: { bg: 'bg-red-100 text-red-800', icon: FiClock }
    }
    return badges[status] || badges.planning
  }

  // Get unique values for filter options
  const uniqueStatuses = useMemo(() => {
    const statuses = projects.map(p => p.project?.status).filter(Boolean)
    return [...new Set(statuses)]
  }, [projects])

  const uniqueCategories = useMemo(() => {
    const categories = projects.map(p => p.project?.category).filter(Boolean)
    return [...new Set(categories)]
  }, [projects])

  const uniqueRoles = useMemo(() => {
    const roles = projects.map(p => p.role).filter(Boolean)
    return [...new Set(roles)]
  }, [projects])

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    let result = [...projects]
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(p => 
        (p.project?.projectId && p.project.projectId.toLowerCase().includes(term)) ||
        (p.project?.description && p.project.description.toLowerCase().includes(term)) ||
        (p.project?.customer?.name && p.project.customer.name.toLowerCase().includes(term))
      )
    }
    
    // Apply filters
    if (filters.status) {
      result = result.filter(p => p.project?.status === filters.status)
    }
    if (filters.category) {
      result = result.filter(p => p.project?.category === filters.category)
    }
    if (filters.role) {
      result = result.filter(p => p.role === filters.role)
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let aValue, bValue
      
      switch (sortBy) {
        case 'projectId':
          aValue = a.project?.projectId || ''
          bValue = b.project?.projectId || ''
          break
        case 'startDate':
          aValue = new Date(a.project?.startDate || 0)
          bValue = new Date(b.project?.startDate || 0)
          break
        case 'category':
          aValue = a.project?.category || ''
          bValue = b.project?.category || ''
          break
        case 'status':
          aValue = a.project?.status || ''
          bValue = b.project?.status || ''
          break
        default:
          return 0
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
    
    return result
  }, [projects, searchTerm, filters, sortBy, sortOrder])

  const clearFilters = () => {
    setFilters({
      status: '',
      category: '',
      role: ''
    })
    setSearchTerm('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-800">My Projects</h1>
        
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <FiFilter />
            Filters
            {(filters.status || filters.category || filters.role) && (
              <span className="bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {Object.values(filters).filter(Boolean).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-800">Filter Projects</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
            >
              <FiX size={16} />
              Clear All
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Statuses</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>
                    {status?.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Categories</option>
                {uniqueCategories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">My Role</label>
              <select
                value={filters.role}
                onChange={(e) => setFilters({...filters, role: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Roles</option>
                {uniqueRoles.map(role => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Sort Options */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <div className="flex flex-wrap gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="startDate">Start Date</option>
                <option value="projectId">Project ID</option>
                <option value="category">Category</option>
                <option value="status">Status</option>
              </select>
              
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Projects List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredAndSortedProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredAndSortedProjects.map((project) => {
              const statusConfig = getStatusBadge(project.project?.status)
              const StatusIcon = statusConfig.icon
              
              return (
                <div key={project._id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{project.project?.projectId}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {project.project?.description}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full flex items-center ${statusConfig.bg}`}>
                      <StatusIcon className="mr-1" size={12} />
                      {project.project?.status?.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <FiUser className="mr-2" size={16} />
                      <span className="capitalize">{project.role || 'Worker'}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <FiCalendar className="mr-2" size={16} />
                      <span>
                        {project.project?.startDate 
                          ? new Date(project.project.startDate).toLocaleDateString() 
                          : 'Not set'}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <FiFileText className="mr-2" size={16} />
                      <span className="capitalize">{project.project?.category}</span>
                    </div>
                  </div>

                  {project.project?.status !== 'completed' && (
                    <div className="mt-6">
                      <button
                        onClick={() => handleMarkComplete(project.project?._id)}
                        disabled={completingProject === project.project?._id}
                        className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center justify-center"
                      >
                        {completingProject === project.project?._id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Marking Complete...
                          </>
                        ) : (
                          <>
                            <FiCheckCircle className="mr-2" />
                            Mark Complete
                          </>
                        )}
                      </button>
                    <button
                      onClick={() => openUpdateModal(project.project?._id)}
                      className="w-full mt-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center justify-center"
                    >
                      <FiSend className="mr-2" /> Submit Update
                    </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <FiFileText className="mx-auto text-gray-400 text-5xl mb-4" />
            <p className="text-gray-600">
              {searchTerm || filters.status || filters.category || filters.role
                ? 'No projects match your filters'
                : "You don't have any assigned projects"}
            </p>
            {(searchTerm || filters.status || filters.category || filters.role) && (
              <button
                onClick={clearFilters}
                className="mt-4 text-primary hover:text-primary-dark"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MyProjects

// Submit Update Modal
// Simple modal for sending work update
// Placed at end to avoid layout changes
function UpdateModal({ open, onClose, onSubmit, form, setForm, onUpload, submitting, projectId }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Submit Work Update</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><FiX /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Project</label>
              <input readOnly value={projectId} className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Work Description <span className="text-red-500">*</span></label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows="5"
                placeholder="Describe the work completed..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Upload Images</label>
              <div className="flex items-center gap-2">
                <label className="flex-1 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-400">
                  <FiImage className="inline mr-2" />
                  <span className="text-sm text-gray-600">Choose images...</span>
                  <input type="file" accept="image/*" multiple onChange={(e)=>onUpload(e,'images')} className="hidden" />
                </label>
                {form.images.length > 0 && <span className="text-sm text-green-600">{form.images.length} file(s)</span>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Upload Videos</label>
              <div className="flex items-center gap-2">
                <label className="flex-1 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-400">
                  <FiFile className="inline mr-2" />
                  <span className="text-sm text-gray-600">Choose videos...</span>
                  <input type="file" accept="video/*" multiple onChange={(e)=>onUpload(e,'videoRecordings')} className="hidden" />
                </label>
                {form.videoRecordings.length > 0 && <span className="text-sm text-green-600">{form.videoRecordings.length} file(s)</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center">
              <FiSend className="mr-2" /> {submitting ? 'Submitting...' : 'Submit Update'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}