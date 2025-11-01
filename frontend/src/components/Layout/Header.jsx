import { FiBell, FiLogOut, FiSearch, FiMenu } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import NotificationBell from '../NotificationBell'

const Header = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-16 lg:h-20 bg-white shadow-sm flex items-center justify-between px-3 sm:px-4 lg:px-6">
      {/* Mobile Menu Button */}
      <button 
        className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        onClick={() => setShowMobileMenu(!showMobileMenu)}
      >
        <FiMenu size={20} />
      </button>

      {/* Page Title - Hidden on mobile, shown on larger screens */}
      <div className="hidden lg:flex flex-1 max-w-lg">
        <h1 className="text-lg font-semibold text-gray-800"></h1>
      </div>

      {/* Right Side */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Notifications */}
        <NotificationBell />

        {/* User Info - Mobile */}
        <div className="lg:hidden flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* User Info - Desktop */}
        <div className="hidden lg:flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-800">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center px-2 sm:px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <FiLogOut className="sm:mr-2" size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowMobileMenu(false)}>
          <div className="fixed top-16 left-0 right-0 bg-white shadow-lg mx-4 rounded-lg p-4" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 pb-3 border-b">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{user?.name}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <FiLogOut className="mr-3" size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header
