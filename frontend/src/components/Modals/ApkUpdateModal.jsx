import { useState, useEffect } from 'react'
import { FiX, FiDownload, FiAlertCircle } from 'react-icons/fi'
import axios from 'axios'

const ApkUpdateModal = () => {
  const [showModal, setShowModal] = useState(false)
  const [isNative, setIsNative] = useState(false)

  // New API URL
  const NEW_API_URL = 'https://prod.sanjanawaterproofing.com/api'
  const NEW_WEBSITE_URL = 'https://prod.sanjanawaterproofing.com/'
  
  // APK download URL - Can be set via environment variable or use default
  const APK_DOWNLOAD_URL = import.meta.env.VITE_APK_DOWNLOAD_URL || 
                           'https://prod.sanjanawaterproofing.com/downloads/sanjana-crm.apk'

  useEffect(() => {
    // Check if running on native platform
    const checkNative = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core')
        const native = Capacitor.isNativePlatform()
        setIsNative(native)
        
        // Only proceed if native platform
        if (!native) return

        // Check if user has already updated
        const hasUpdated = localStorage.getItem('apk_updated')
        if (hasUpdated === 'true') {
          return // Don't show modal if already updated
        }

        // Check if dismissed recently (within 24 hours)
        const dismissedTime = localStorage.getItem('apk_update_dismissed')
        if (dismissedTime) {
          const hoursSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60)
          if (hoursSinceDismissed < 24) {
            return // Don't show if dismissed less than 24 hours ago
          }
        }

        // Get current API URL from multiple sources
        const envUrl = import.meta.env.VITE_API_URL || ''
        const storedUrl = localStorage.getItem('api_url') || ''
        const axiosUrl = axios?.defaults?.baseURL || ''
        
        // Use the first available URL
        const currentApiUrl = envUrl || storedUrl || axiosUrl || ''
        
        console.log('🔍 APK Update Check:', {
          isNative: native,
          envUrl,
          storedUrl,
          axiosUrl,
          currentApiUrl,
          newUrl: NEW_API_URL
        })
        
        // List of old URLs that should trigger update
        const oldUrls = [
          'crm-1ej7.onrender.com',
          'localhost:5000',
          '127.0.0.1:5000',
          'crm-chi-rouge.vercel.app',
          'http://localhost',
          'https://localhost'
        ]
        
        // Check if using old URL (not the new prod URL)
        // Show modal if:
        // 1. URL doesn't contain the new prod domain, OR
        // 2. URL matches any old URL pattern, OR
        // 3. URL is empty (might be old APK with hardcoded URL)
        const isOldUrl = !currentApiUrl.includes('prod.sanjanawaterproofing.com') &&
                         (oldUrls.some(oldUrl => currentApiUrl.includes(oldUrl)) || 
                          currentApiUrl === '' ||
                          currentApiUrl !== NEW_API_URL)

        // Show modal if using old URL
        if (isOldUrl) {
          setShowModal(true)
        }
      } catch (error) {
        console.error('Error checking for APK update:', error)
        setIsNative(false)
      }
    }
    checkNative()
  }, [])

  const handleDownload = () => {
    try {
      // Open download link (works on both web and mobile)
      // On mobile, this will trigger the browser/download manager
      window.open(APK_DOWNLOAD_URL, '_blank')
      
      // Mark as updated (user clicked download)
      localStorage.setItem('apk_updated', 'true')
      localStorage.setItem('api_url', NEW_API_URL)
      
      // Close modal
      setShowModal(false)
    } catch (error) {
      console.error('Error opening download link:', error)
      // Fallback: try direct link
      window.location.href = APK_DOWNLOAD_URL
      localStorage.setItem('apk_updated', 'true')
      setShowModal(false)
    }
  }

  const handleDismiss = () => {
    // Store that user dismissed (but don't mark as updated)
    // This allows showing again next time if still on old URL
    setShowModal(false)
  }

  const handleUpdateLater = () => {
    // Store timestamp to show again after 24 hours
    localStorage.setItem('apk_update_dismissed', Date.now().toString())
    setShowModal(false)
  }

  if (!showModal) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative animate-scale-in">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <FiX size={24} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-orange-100 rounded-full p-4">
            <FiAlertCircle className="text-orange-600" size={48} />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
          App Update Required
        </h2>

        {/* Message */}
        <div className="text-gray-700 mb-6 space-y-3">
          <p className="text-center">
            You are using an older version of the app with an outdated server URL.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm font-semibold text-gray-800 mb-2">Old URL:</p>
            <p className="text-xs text-gray-600 break-all mb-3">
              {import.meta.env.VITE_API_URL || 'Previous version'}
            </p>
            
            <p className="text-sm font-semibold text-green-700 mb-2">New URL:</p>
            <p className="text-xs text-green-600 break-all font-mono">
              {NEW_WEBSITE_URL}
            </p>
          </div>

          <p className="text-center text-sm">
            Please download and install the latest version to continue using the app with the new server.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleDownload}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <FiDownload size={20} />
            Download New APK
          </button>

          <button
            onClick={handleUpdateLater}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Remind Me Later
          </button>
        </div>

        {/* Info */}
        <p className="text-xs text-gray-500 text-center mt-4">
          After installing the new APK, your app will automatically connect to the new server.
        </p>
      </div>
    </div>
  )
}

export default ApkUpdateModal

