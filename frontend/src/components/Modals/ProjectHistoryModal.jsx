import { useState, useEffect } from 'react'
import { FiX, FiUser, FiFileText, FiImage, FiVideo, FiMic, FiClock, FiCheck, FiAlertCircle, FiPlay, FiDownload, FiEye } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'
import MediaViewer from '../MediaViewer'

const ProjectHistoryModal = ({ isOpen, onClose, projectId }) => {
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all') // all, activity, updates, comments
  const [mediaViewer, setMediaViewer] = useState({ isOpen: false, media: [], currentIndex: 0 })

  useEffect(() => {
    if (isOpen && projectId) {
      fetchHistory()
    }
  }, [isOpen, projectId])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const response = await API.projects.getHistory(projectId)
      setHistory(response.data.data)
    } catch (error) {
      console.error('Error fetching history:', error)
      toast.error('Failed to load project history')
    } finally {
      setLoading(false)
    }
  }

  const openMediaViewer = (mediaArray, startIndex = 0) => {
    const formattedMedia = mediaArray.map((url, index) => ({
      url,
      name: `Media ${index + 1}`,
      type: getMediaType(url)
    }))
    
    setMediaViewer({
      isOpen: true,
      media: formattedMedia,
      currentIndex: startIndex
    })
  }

  const getMediaType = (url) => {
    if (url.includes('.mp4') || url.includes('.webm') || url.includes('.avi')) return 'video'
    if (url.includes('.mp3') || url.includes('.wav') || url.includes('.m4a')) return 'audio'
    if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif')) return 'image'
    return 'file'
  }

  const getMediaIcon = (url) => {
    const type = getMediaType(url)
    switch (type) {
      case 'video': return <FiVideo className="text-blue-500" />
      case 'audio': return <FiMic className="text-green-500" />
      case 'image': return <FiImage className="text-purple-500" />
      default: return <FiFileText className="text-gray-500" />
    }
  }

  const MediaGallery = ({ mediaArray, title = "Media Files" }) => {
    if (!mediaArray || mediaArray.length === 0) return null

    return (
      <div className="mt-3">
        <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          {getMediaIcon(mediaArray[0])}
          {title} ({mediaArray.length})
        </h5>
        <div className="grid grid-cols-4 gap-2">
          {mediaArray.map((url, idx) => (
            <div key={idx} className="relative group">
              {getMediaType(url) === 'image' ? (
                <img 
                  src={url} 
                  alt={`Media ${idx + 1}`}
                  className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => openMediaViewer(mediaArray, idx)}
                />
              ) : (
                <div 
                  className="w-full h-20 bg-gray-100 rounded flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => openMediaViewer(mediaArray, idx)}
                >
                  {getMediaIcon(url)}
                </div>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded flex items-center justify-center transition-all">
                <FiEye className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => openMediaViewer(mediaArray)}
          className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <FiPlay size={12} />
          View All Media
        </button>
      </div>
    )
  }

  if (!isOpen) return null

  const getActionIcon = (action) => {
    const icons = {
      project_created: <FiCheck className="text-green-500" />,
      status_changed: <FiAlertCircle className="text-blue-500" />,
      employee_assigned: <FiUser className="text-purple-500" />,
      file_uploaded: <FiImage className="text-indigo-500" />,
      work_update: <FiFileText className="text-orange-500" />,
      comment_added: <FiFileText className="text-gray-500" />
    }
    return icons[action] || <FiClock className="text-gray-400" />
  }

  const renderTimelineItem = (item, type) => {
    if (type === 'activity') {
      return (
        <div key={item._id} className="flex gap-4 pb-6">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
              {getActionIcon(item.action)}
            </div>
            <div className="w-0.5 flex-1 bg-gray-200 mt-2"></div>
          </div>
          <div className="flex-1 pb-4">
            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-gray-800">{item.action.replace(/_/g, ' ').toUpperCase()}</h4>
                <span className="text-xs text-gray-500">
                  {new Date(item.date).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-2">{item.description}</p>
              <p className="text-xs text-gray-600">
                By: {item.performedBy?.name || 'Unknown'}
              </p>
              {/* Images */}
              {item.images && item.images.length > 0 && (
                <MediaGallery mediaArray={item.images} title="Images" />
              )}
              
              {/* Audio Notes */}
              {item.audioNotes && item.audioNotes.length > 0 && (
                <MediaGallery mediaArray={item.audioNotes} title="Audio Notes" />
              )}
              
              {/* Video Recordings */}
              {item.videoRecordings && item.videoRecordings.length > 0 && (
                <MediaGallery mediaArray={item.videoRecordings} title="Video Recordings" />
              )}
              
              {/* Documents */}
              {item.documents && item.documents.length > 0 && (
                <MediaGallery mediaArray={item.documents} title="Documents" />
              )}
            </div>
          </div>
        </div>
      )
    } else if (type === 'workUpdate') {
      return (
        <div key={item._id} className="flex gap-4 pb-6">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100">
              <FiFileText className="text-orange-600" />
            </div>
            <div className="w-0.5 flex-1 bg-gray-200 mt-2"></div>
          </div>
          <div className="flex-1 pb-4">
            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-gray-800">{item.title}</h4>
                <span className="text-xs text-gray-500">
                  {new Date(item.date).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-2">{item.description}</p>
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <span>By: {item.updatedBy?.name}</span>
                {item.status && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">{item.status}</span>}
              </div>
              {/* Images */}
              {item.images && item.images.length > 0 && (
                <MediaGallery mediaArray={item.images} title="Images" />
              )}
              
              {/* Audio Notes */}
              {item.audioNotes && item.audioNotes.length > 0 && (
                <MediaGallery mediaArray={item.audioNotes} title="Audio Notes" />
              )}
              
              {/* Video Recordings */}
              {item.videoRecordings && item.videoRecordings.length > 0 && (
                <MediaGallery mediaArray={item.videoRecordings} title="Video Recordings" />
              )}
              
              {/* Documents */}
              {item.documents && item.documents.length > 0 && (
                <MediaGallery mediaArray={item.documents} title="Documents" />
              )}
            </div>
          </div>
        </div>
      )
    } else if (type === 'comment') {
      return (
        <div key={item._id} className="flex gap-4 pb-6">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
              <FiFileText className="text-gray-600" />
            </div>
            <div className="w-0.5 flex-1 bg-gray-200 mt-2"></div>
          </div>
          <div className="flex-1 pb-4">
            <div className="bg-gray-50 border rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-2">{item.text}</p>
              <p className="text-xs text-gray-600">
                {item.createdBy?.name} • {new Date(item.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Project History & Activities</h2>
            <p className="text-sm text-gray-600 mt-1">Project: {history?.projectId}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        {/* Filter */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'all' ? 'bg-primary text-white' : 'bg-white text-gray-700 border'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('activity')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'activity' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 border'
              }`}
            >
              Activities
            </button>
            <button
              onClick={() => setFilter('updates')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'updates' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 border'
              }`}
            >
              Work Updates
            </button>
            <button
              onClick={() => setFilter('comments')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'comments' ? 'bg-gray-500 text-white' : 'bg-white text-gray-700 border'
              }`}
            >
              Comments
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-1">
              {(filter === 'all' || filter === 'activity') &&
                history?.activityHistory?.map(item => renderTimelineItem(item, 'activity'))}
              
              {(filter === 'all' || filter === 'updates') &&
                history?.workUpdates?.map(item => renderTimelineItem(item, 'workUpdate'))}
              
              {(filter === 'all' || filter === 'comments') &&
                history?.comments?.map(item => renderTimelineItem(item, 'comment'))}
            </div>
          )}
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
      
      {/* Media Viewer */}
      <MediaViewer
        isOpen={mediaViewer.isOpen}
        onClose={() => setMediaViewer({ isOpen: false, media: [], currentIndex: 0 })}
        media={mediaViewer.media}
        currentIndex={mediaViewer.currentIndex}
        onIndexChange={(index) => setMediaViewer(prev => ({ ...prev, currentIndex: index }))}
      />
    </>
  )
}

export default ProjectHistoryModal
