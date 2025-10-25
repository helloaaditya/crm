import { FiBell, FiLogOut, FiSearch } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const Header = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-20 bg-white shadow-sm flex items-center justify-between px-6">
      <div className="flex-1 max-w-lg">
        
      </div>

      {/* Right Side */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
          <FiBell size={22} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User Info
        <div className="flex items-center space-x-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-gray-800">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </div> */}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <FiLogOut className="mr-2" size={18} />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </header>
  )
}

export default Header
