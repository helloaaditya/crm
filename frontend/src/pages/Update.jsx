import { useState } from 'react'
import { FiDownload, FiSmartphone, FiInfo, FiCheckCircle } from 'react-icons/fi'

const Update = () => {
  // APK download URL - Can be set via environment variable or use default
  const APK_DOWNLOAD_URL = import.meta.env.VITE_APK_DOWNLOAD_URL || 
                           'https://prod.sanjanawaterproofing.com/downloads/sanjana-crm.apk'
  
  const NEW_WEBSITE_URL = 'https://prod.sanjanawaterproofing.com/'
  const [downloading, setDownloading] = useState(false)

  const handleDownload = () => {
    setDownloading(true)
    try {
      // Open download link
      window.open(APK_DOWNLOAD_URL, '_blank')
      
      // Reset downloading state after a delay
      setTimeout(() => {
        setDownloading(false)
      }, 2000)
    } catch (error) {
      console.error('Error opening download link:', error)
      setDownloading(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Mobile App Update
          </h1>
          <p className="text-gray-600">
            Download the latest version of the Sanjana CRM mobile app
          </p>
        </div>

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
            Latest Mobile App Version
          </h2>

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

          {/* Instructions */}
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

