import { useState, useEffect } from 'react'
import { FiCheckCircle, FiClock, FiUser, FiFileText, FiCalendar } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'

const MyProjects = () => {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [completingProject, setCompletingProject] = useState(null)
  const { user } = useAuth()

  useEffect(() => {
    fetchMyProjects()
  }, [])

  const fetchMyProjects = async () => {
    try {
      setLoading(true)
      const response = await API.employees.myProjects()
      setProjects(response.data.data.activeProjects || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">My Projects</h1>
      </div>

      {/* Projects List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {projects.map((project) => {
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
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <FiFileText className="mx-auto text-gray-400 text-5xl mb-4" />
            <p className="text-gray-600">You don't have any assigned projects</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyProjects