import { useState, useEffect } from 'react'
import { FiDownload, FiSmartphone, FiInfo, FiCheckCircle, FiUpload, FiX } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import API from '../api'
import { toast } from 'react-toastify'
import { format } from 'date-fns'

const Update = () => {
  const { user } = useAuth()
  const NEW_WEBSITE_URL = 'https://prod.sanjanawaterproofing.com/'
  
  const [apkInfo, setApkInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [version, setVersion] = useState('')

  const isAdmin = user?.role === 'admin' || user?.role === 'main_admin'

  useEffect(() => {
    fetchApkInfo()
  }, [])

  const fetchApkInfo = async () => {
    try {
      setLoading(true)
      const response = await API.apk.getInfo()
      if (response.data.success) {
        setApkInfo(response.data.data)
      }
    } catch (error) {
      // APK not found is okay, just don't show download button
      if (error.response?.status !== 404) {
        console.error('Error fetching APK info:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      setDownloading(true)
      
      // Get the API base URL
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://prod.sanjanawaterproofing.com/api'
      const downloadUrl = `${apiBaseUrl}/apk/download`
      
      // Open download link
      window.open(downloadUrl, '_blank')
      
      // Reset downloading state after a delay
      setTimeout(() => {
        setDownloading(false)
      }, 2000)
    } catch (error) {
      console.error('Error downloading APK:', error)
      toast.error('Failed to download APK')
      setDownloading(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.name.toLowerCase().endsWith('.apk')) {
        toast.error('Please select an APK file')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    
    if (!selectedFile) {
      toast.error('Please select an APK file')
      return
    }

    if (!version.trim()) {
      toast.error('Please enter a version number')
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('apk', selectedFile)
      formData.append('version', version)

      await API.apk.upload(formData)
      
      toast.success('APK uploaded successfully!')
      setShowUploadForm(false)
      setSelectedFile(null)
      setVersion('')
      fetchApkInfo()
    } catch (error) {
      console.error('Error uploading APK:', error)
      toast.error(error.response?.data?.message || 'Failed to upload APK')
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Mobile App Update
            </h1>
            <p className="text-gray-600">
              Download the latest version of the Sanjana CRM mobile app
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <FiUpload size={20} />
              {showUploadForm ? 'Cancel Upload' : 'Upload APK'}
            </button>
          )}
        </div>

        {/* Upload Form (Admin Only) */}
        {isAdmin && showUploadForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-2 border-green-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Upload New APK</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  APK File <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".apk"
                  onChange={handleFileSelect}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
                {selectedFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Version Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g., 1.0.0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={uploading || !selectedFile || !version.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <FiUpload size={18} />
                      <span>Upload APK</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadForm(false)
                    setSelectedFile(null)
                    setVersion('')
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-6">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 rounded-full p-4">
              <FiSmartphone className="text-blue-600" size={48} />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-900 mb-4">
            {apkInfo ? 'Latest Mobile App Version' : 'No APK Available'}
          </h2>

          {/* APK Info */}
          {apkInfo && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-700">Version:</span>
                  <span className="ml-2 text-gray-900">{apkInfo.version || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">File Size:</span>
                  <span className="ml-2 text-gray-900">{formatFileSize(apkInfo.fileSize)}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">File Name:</span>
                  <span className="ml-2 text-gray-900">{apkInfo.fileName}</span>
                </div>
                {apkInfo.uploadedAt && (
                  <div>
                    <span className="font-semibold text-gray-700">Uploaded:</span>
                    <span className="ml-2 text-gray-900">
                      {format(new Date(apkInfo.uploadedAt), 'dd MMM yyyy, hh:mm a')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <FiInfo className="text-blue-600 flex-shrink-0 mt-1" size={20} />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">New Server URL:</p>
                <p className="font-mono text-xs break-all bg-white p-2 rounded border border-blue-200">
                  {NEW_WEBSITE_URL}
                </p>
                <p className="mt-3">
                  The latest version of the app connects to the new server. Make sure to install this version for the best experience.
                </p>
              </div>
            </div>
          </div>

          {/* Download Button */}
          {apkInfo && (
            <div className="flex justify-center mb-6">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-4 px-8 rounded-lg transition-colors flex items-center gap-3 text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-transform"
              >
                {downloading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <FiDownload size={24} />
                    <span>Download APK</span>
                  </>
                )}
              </button>
            </div>
          )}

          {!apkInfo && !loading && (
            <div className="text-center py-8 text-gray-500">
              <p>No APK file has been uploaded yet.</p>
              {isAdmin && (
                <p className="mt-2">Click "Upload APK" above to add the latest version.</p>
              )}
            </div>
          )}

          {/* Instructions */}
          {apkInfo && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiCheckCircle className="text-green-600" size={20} />
                Installation Instructions
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm sm:text-base">
                <li>Click the "Download APK" button above</li>
                <li>Wait for the download to complete</li>
                <li>Open the downloaded APK file on your Android device</li>
                <li>If prompted, allow installation from unknown sources in your device settings</li>
                <li>Follow the installation prompts</li>
                <li>Open the app and log in with your credentials</li>
              </ol>
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Important Notes:</h3>
          <ul className="space-y-2 text-sm sm:text-base text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>This update includes connection to the new server URL</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Your existing data and login credentials will remain the same</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>If you encounter any issues, please contact support</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Make sure you have a stable internet connection during download</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Update
