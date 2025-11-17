import { FiRefreshCw, FiMenu } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useState } from 'react'
import NotificationBell from '../NotificationBell'
import PushNotificationPrompt from '../PushNotificationPrompt'

const Header = () => {
  const { user } = useAuth()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = () => {
    setRefreshing(true)
    window.location.reload()
  }

  return (
    <header className="h-16 lg:h-20 bg-white shadow-sm flex items-center justify-between px-3 sm:px-4 lg:px-6">
      {/* Mobile Menu Button - Handled by Sidebar component */}

      {/* Page Title - Hidden on mobile, shown on larger screens */}
      <div className="hidden lg:flex flex-1 max-w-lg">
        <h1 className="text-lg font-semibold text-gray-800"></h1>
      </div>

      {/* Right Side */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Notifications */}
        <NotificationBell />
        
        {/* Push Notification Toggle */}
        <PushNotificationPrompt />

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh Page"
        >
          <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={20} />
        </button>
      </div>
    </header>
  )
}

export default Header
