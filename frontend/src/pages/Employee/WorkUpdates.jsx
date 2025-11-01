import { useState, useEffect, useRef, useMemo } from 'react'
import { FiPlus, FiSend, FiImage, FiFile, FiBriefcase, FiMic, FiMicOff, FiPlay, FiTrash2, FiSearch, FiFilter, FiX } from 'react-icons/fi'
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

  // Filter and sort states
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    category: '',
    role: '',
    status: ''
  })
  const [sortBy, setSortBy] = useState('startDate')
  const [sortOrder, setSortOrder] = useState('desc')
  const [showFilters, setShowFilters] = useState(false)

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [recordedAudio, setRecordedAudio] = useState(null)
  const [audioBlob, setAudioBlob] = useState(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(null)
  const recordingInterval = useRef(null)
  const audioBlobRef = useRef(null) // Store blob in ref for immediate access

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await API.employees.myProjects()
      // Add debugging to see what data is being returned
      console.log('WorkUpdates projects data:', response.data.data.activeProjects);
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
      
      // If we have a recorded audio blob, upload it first
      let uploadedAudioUrls = [...formData.audioNotes]
      
      // Use ref for immediate access (state might not be updated yet)
      const currentAudioBlob = audioBlobRef.current || audioBlob
      
      console.log('🎤 AUDIO CHECK - audioBlob from ref:', !!audioBlobRef.current)
      console.log('🎤 AUDIO CHECK - audioBlob from state:', !!audioBlob)
      console.log('🎤 AUDIO CHECK - using blob:', !!currentAudioBlob)
      console.log('🎤 AUDIO CHECK - blob type:', currentAudioBlob?.type)
      console.log('🎤 AUDIO CHECK - blob size:', currentAudioBlob?.size)
      
      if (currentAudioBlob) {
        console.log('✅ Starting audio upload to S3...')
        const audioFormData = new FormData()
        // Convert blob to file with proper name and type
        const audioFile = new File([currentAudioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' })
        audioFormData.append('files', audioFile)
        
        console.log('📤 Uploading audio file:', audioFile.name, 'Size:', audioFile.size)
        
        try {
          const uploadResponse = await API.employees.uploadWorkUpdateFiles(audioFormData)
          console.log('✅ Upload response:', uploadResponse.data)
          const uploadedFiles = uploadResponse.data.data || []
          uploadedAudioUrls = [...uploadedAudioUrls, ...uploadedFiles.map(f => f.url)]
          console.log('✅ S3 URLs:', uploadedAudioUrls)
          toast.success('Audio uploaded successfully to S3!')
        } catch (uploadError) {
          console.error('❌ Audio upload error:', uploadError)
          toast.error('Failed to upload audio recording')
          setLoading(false)
          return
        }
      } else {
        console.log('⚠️ No audioBlob found, skipping audio upload')
      }
      
      // Submit work update with all data
      const submitData = {
        projectId: formData.projectId,
        description: formData.description,
        images: formData.images,
        audioNotes: uploadedAudioUrls,
        videoRecordings: formData.videoRecordings
      }
      
      await API.employees.myWorkUpdate(submitData)
      toast.success('Work update submitted successfully')
      setShowModal(false)
      setFormData({
        projectId: '',
        description: '',
        images: [],
        audioNotes: [],
        videoRecordings: []
      })
      // Reset recording states
      setRecordedAudio(null)
      setAudioBlob(null)
      audioBlobRef.current = null // Clear ref too
      setRecordingTime(0)
      setIsPlaying(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit work update')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e, type) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    try {
      setLoading(true)
      
      // Create FormData for file upload
      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })
      formData.append('type', type)
      formData.append('projectId', formData.projectId)
      formData.append('description', formData.description)

      // Upload files to server (which will upload to S3)
      const response = await API.employees.uploadWorkUpdateFiles(formData)
      
      // Update form data with uploaded URLs
      const uploadedUrls = response.data.data.map(file => file.url)
      
      setFormData(prev => ({
        ...prev,
        [type]: [...prev[type], ...uploadedUrls]
      }))
      
      toast.success(`${files.length} file(s) uploaded successfully`)
    } catch (error) {
      console.error('File upload error:', error)
      toast.error('Failed to upload files')
    } finally {
      setLoading(false)
    }
  }

  // Voice recording functions
  const startRecording = async () => {
    try {
      console.log('🎤 START RECORDING...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      setMediaRecorder(recorder)
      setIsRecording(true)

      const chunks = []
      recorder.ondataavailable = e => {
        console.log('🎤 Data available, chunk size:', e.data.size)
        chunks.push(e.data)
      }
      recorder.onstop = () => {
        console.log('🎤 STOP RECORDING - Total chunks:', chunks.length)
        const blob = new Blob(chunks, { type: 'audio/webm' })
        console.log('🎤 Created blob - Type:', blob.type, 'Size:', blob.size)
        
        // Store in BOTH ref (immediate) and state (for UI)
        audioBlobRef.current = blob
        setAudioBlob(blob)
        console.log('🎤 audioBlob stored in ref AND state!')
        
        const audioUrl = URL.createObjectURL(blob)
        setRecordedAudio(audioUrl)
        console.log('🎤 Audio URL created:', audioUrl)
      }

      recorder.start()
      console.log('🎤 Recorder started')
      
      // Start timer
      setRecordingTime(0)
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      toast.error('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    console.log('🛑 STOP RECORDING called')
    if (mediaRecorder && isRecording) {
      console.log('🛑 Stopping mediaRecorder...')
      mediaRecorder.stop()
      setIsRecording(false)
      clearInterval(recordingInterval.current)
      
      // Stop all tracks
      mediaRecorder.stream.getTracks().forEach(track => track.stop())
      console.log('🛑 MediaRecorder stopped, waiting for onstop event...')
    } else {
      console.log('⚠️ Cannot stop - mediaRecorder:', !!mediaRecorder, 'isRecording:', isRecording)
    }
  }

  const playRecording = () => {
    if (recordedAudio && audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const pauseRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const deleteRecording = () => {
    setRecordedAudio(null)
    setAudioBlob(null)
    audioBlobRef.current = null // Clear ref too
    setRecordingTime(0)
    setIsPlaying(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  const addRecordingToForm = async () => {
    const currentBlob = audioBlobRef.current || audioBlob
    if (currentBlob) {
      console.log('📤 Uploading audio from "Add to Update" button...')
      setLoading(true)
      
      try {
        // Upload to S3
        const audioFormData = new FormData()
        const audioFile = new File([currentBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' })
        audioFormData.append('files', audioFile)
        
        const uploadResponse = await API.employees.uploadWorkUpdateFiles(audioFormData)
        const uploadedFiles = uploadResponse.data.data || []
        const s3Url = uploadedFiles[0]?.url
        
        if (s3Url) {
          console.log('✅ Audio uploaded to S3:', s3Url)
          setFormData(prev => ({
            ...prev,
            audioNotes: [...prev.audioNotes, s3Url]  // ← S3 URL, not blob!
          }))
          toast.success('Voice note uploaded to S3 and added to your update!')
          deleteRecording()
        } else {
          toast.error('Failed to get S3 URL')
        }
      } catch (error) {
        console.error('❌ Audio upload error:', error)
        toast.error('Failed to upload audio')
      } finally {
        setLoading(false)
      }
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Get unique values for filter options
  const uniqueCategories = useMemo(() => {
    const categories = projects.map(p => p.project?.category).filter(Boolean)
    return [...new Set(categories)]
  }, [projects])

  const uniqueRoles = useMemo(() => {
    const roles = projects.map(p => p.role).filter(Boolean)
    return [...new Set(roles)]
  }, [projects])

  const uniqueStatuses = useMemo(() => {
    const statuses = projects.map(p => p.project?.status).filter(Boolean)
    return [...new Set(statuses)]
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
    if (filters.category) {
      result = result.filter(p => p.project?.category === filters.category)
    }
    if (filters.role) {
      result = result.filter(p => p.role === filters.role)
    }
    if (filters.status) {
      result = result.filter(p => p.project?.status === filters.status)
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
      category: '',
      role: '',
      status: ''
    })
    setSearchTerm('')
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Work Updates</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Submit your daily work progress</p>
        </div>
        
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
            {(filters.category || filters.role || filters.status) && (
              <span className="bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {Object.values(filters).filter(Boolean).length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
          >
            <FiPlus className="mr-2" />
            Submit Update
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
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

      {/* Active Projects */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-800">My Active Projects</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <p className="text-center text-gray-600">Loading projects...</p>
          ) : filteredAndSortedProjects.length === 0 ? (
            <div className="text-center py-12">
              <FiBriefcase className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">
                {searchTerm || filters.category || filters.role || filters.status
                  ? 'No projects match your filters'
                  : 'No active projects assigned'}
              </p>
              {(searchTerm || filters.category || filters.role || filters.status) && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-primary hover:text-primary-dark"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedProjects.map((assignment) => (
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
                      {assignment.project?.status?.replace('_', ' ')}
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

                {/* Voice Recording */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Voice Notes (Optional)
                  </label>
                  
                  {/* Recording Controls */}
                  <div className="mb-3">
                    {!isRecording && !recordedAudio && (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        <FiMic className="mr-2" />
                        Start Recording
                      </button>
                    )}
                    
                    {isRecording && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                        >
                          <FiMicOff className="mr-2" />
                          Stop Recording
                        </button>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
                          <span className="font-mono">{formatTime(recordingTime)}</span>
                        </div>
                      </div>
                    )}
                    
                    {recordedAudio && (
                      <div className="flex items-center gap-3 mt-2">
                        <audio ref={audioRef} src={recordedAudio} onEnded={() => setIsPlaying(false)} />
                        {!isPlaying ? (
                          <button
                            type="button"
                            onClick={playRecording}
                            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                          >
                            <FiPlay className="mr-2" />
                            Play
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={pauseRecording}
                            className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                          >
                            <FiMicOff className="mr-2" />
                            Pause
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={addRecordingToForm}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                          Add to Update
                        </button>
                        <button
                          type="button"
                          onClick={deleteRecording}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Uploaded Audio Files */}
                  {formData.audioNotes.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-2">
                        Uploaded voice notes:
                      </p>
                      <div className="space-y-2">
                        {formData.audioNotes.map((audio, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="text-sm">Voice note {index + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newAudioNotes = [...formData.audioNotes]
                                newAudioNotes.splice(index, 1)
                                setFormData(prev => ({ ...prev, audioNotes: newAudioNotes }))
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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