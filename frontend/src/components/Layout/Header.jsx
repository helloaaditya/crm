import { FiRefreshCw, FiMenu } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import NotificationBell from '../NotificationBell'
import PushNotificationPrompt from '../PushNotificationPrompt'
import { toast } from 'react-toastify'
import API from '../../api'

const Header = () => {
  const { user, loadUser } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const handleRefresh = async () => {
    setRefreshing(true)
    
    try {
      // Refresh user data
      await loadUser()
      
      // Refresh notifications (only on manual refresh, not polling)
      try {
        await API.dashboard.getNotificationCounts()
      } catch (error) {
        // Silently fail for notifications
        console.error('Failed to refresh notifications:', error.message)
      }
      
      // Dispatch custom event for pages to listen and refresh their data
      window.dispatchEvent(new CustomEvent('app-refresh', { 
        detail: { 
          path: location.pathname,
          timestamp: Date.now()
        } 
      }))
      
      // Force a soft refresh by navigating to the same route
      // This will trigger useEffect hooks in all components
      const currentPath = location.pathname
      navigate(currentPath, { replace: true, state: { refresh: Date.now() } })
      
      toast.success('Website refreshed successfully')
    } catch (error) {
      console.error('Refresh error:', error)
      toast.error('Failed to refresh data')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <header className="h-16 lg:h-20 bg-white shadow-sm flex items-center justify-between px-3 sm:px-4 lg:px-6">
      {/* Left Side - Empty on mobile, page title on desktop */}
      <div className="hidden lg:flex flex-1 max-w-lg">
        <h1 className="text-lg font-semibold text-gray-800"></h1>
      </div>
      <div className="lg:hidden flex-1"></div>

      {/* Right Side - Notifications and Refresh (always on right) */}
      <div className="flex items-center space-x-2 sm:space-x-4 ml-auto">
        {/* Notifications */}
        <NotificationBell />
        
        {/* Push Notification Toggle */}
        <PushNotificationPrompt />

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh Data"
        >
          <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={20} />
        </button>
      </div>
    </header>
  )
}

export default Header
