import { useState, useEffect } from 'react'
import { FiPlus, FiSend, FiImage, FiFile, FiBriefcase } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'

function WorkUpdates() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    projectId: '',
    description: '',
    images: [],
    audioNotes: [],
    videoRecordings: []
  })

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await API.employees.myProjects()
      setProjects(response.data.data.activeProjects || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to fetch projects')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.projectId) {
      toast.error('Please select a project')
      return
    }

    if (!formData.description.trim()) {
      toast.error('Please enter work description')
      return
    }

    try {
      setLoading(true)
      await API.employees.myWorkUpdate(formData)
      toast.success('Work update submitted successfully')
      setShowModal(false)
      setFormData({
        projectId: '',
        description: '',
        images: [],
        audioNotes: [],
        videoRecordings: []
      })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit work update')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e, type) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    // In production, upload to server/S3 and get URLs
    // For now, we'll simulate with file names
    const fileUrls = files.map(file => URL.createObjectURL(file))
    
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], ...fileUrls]
    }))
    
    toast.success(`${files.length} file(s) added`)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Work Updates</h1>
          <p className="text-gray-600 mt-1">Submit your daily work progress</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
        >
          <FiPlus className="mr-2" />
          Submit Update
        </button>
      </div>

      {/* Active Projects */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-800">My Active Projects</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <p className="text-center text-gray-600">Loading projects...</p>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <FiBriefcase className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">No active projects assigned</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((assignment) => (
                <div
                  key={assignment._id}
                  className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {assignment.project?.projectId}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {assignment.project?.description}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      assignment.project?.status === 'completed' ? 'bg-green-100 text-green-800' :
                      assignment.project?.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {assignment.project?.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">My Role:</span>
                      <span className="font-medium text-gray-800 capitalize">{assignment.role}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Category:</span>
                      <span className="text-gray-800">{assignment.project?.category}</span>
                    </div>
                    {assignment.project?.startDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Start Date:</span>
                        <span className="text-gray-800">
                          {new Date(assignment.project.startDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setFormData({ ...formData, projectId: assignment.project._id })
                      setShowModal(true)
                    }}
                    className="w-full mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center justify-center"
                  >
                    <FiSend className="mr-2" size={16} />
                    Submit Update
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Submit Update Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Submit Work Update</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Project Selection */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Select Project <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">-- Select Project --</option>
                    {projects.map((assignment) => (
                      <option key={assignment._id} value={assignment.project._id}>
                        {assignment.project.projectId} - {assignment.project.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Work Description */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Work Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows="5"
                    placeholder="Describe the work you completed today..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Be specific about tasks completed, materials used, and any challenges faced
                  </p>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Upload Images (Optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-400">
                      <FiImage className="inline mr-2" />
                      <span className="text-sm text-gray-600">Choose images...</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFileUpload(e, 'images')}
                        className="hidden"
                      />
                    </label>
                    {formData.images.length > 0 && (
                      <span className="text-sm text-green-600">
                        {formData.images.length} file(s) selected
                      </span>
                    )}
                  </div>
                </div>

                {/* Audio Upload */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Voice Notes (Optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-400">
                      <FiFile className="inline mr-2" />
                      <span className="text-sm text-gray-600">Choose audio files...</span>
                      <input
                        type="file"
                        accept="audio/*"
                        multiple
                        onChange={(e) => handleFileUpload(e, 'audioNotes')}
                        className="hidden"
                      />
                    </label>
                    {formData.audioNotes.length > 0 && (
                      <span className="text-sm text-green-600">
                        {formData.audioNotes.length} file(s) selected
                      </span>
                    )}
                  </div>
                </div>

                {/* Video Upload */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Video Recordings (Optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-400">
                      <FiFile className="inline mr-2" />
                      <span className="text-sm text-gray-600">Choose video files...</span>
                      <input
                        type="file"
                        accept="video/*"
                        multiple
                        onChange={(e) => handleFileUpload(e, 'videoRecordings')}
                        className="hidden"
                      />
                    </label>
                    {formData.videoRecordings.length > 0 && (
                      <span className="text-sm text-green-600">
                        {formData.videoRecordings.length} file(s) selected
                      </span>
                    )}
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Tip:</strong> Include photos of completed work, voice notes for detailed explanations, and videos for demonstrations.
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center"
                >
                  <FiSend className="mr-2" />
                  Submit Update
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkUpdates
