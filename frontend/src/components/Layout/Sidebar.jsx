import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { 
  FiHome, FiUsers, FiBriefcase, FiFileText, FiPackage, 
  FiTruck, FiUserCheck, FiCalendar, FiDollarSign, 
  FiBell, FiSettings, FiMenu, FiX, FiKey, FiClock, FiSend 
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../hooks/useNotifications'

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true)
  const { user } = useAuth()
  const { counts } = useNotifications()

  const menuItems = [
    { name: 'Dashboard', icon: FiHome, path: '/', module: 'all' },
    
    // CRM Section
    { name: 'Customers', icon: FiUsers, path: '/customers', module: 'crm' },
    { name: 'Projects', icon: FiBriefcase, path: '/projects', module: 'crm' },
    { name: 'Invoices', icon: FiFileText, path: '/invoices', module: 'crm', notificationCount: counts.invoices },
    { name: 'Payments', icon: FiDollarSign, path: '/payments', module: 'crm' },
    
    // Inventory Section
    { name: 'Materials', icon: FiPackage, path: '/inventory/materials', module: 'inventory', notificationCount: counts.lowStock },
    { name: 'Vendors', icon: FiTruck, path: '/inventory/vendors', module: 'inventory' },
    
    // Employee Section (Admin View)
    { name: 'Employees', icon: FiUserCheck, path: '/employees', module: 'employee', adminView: true },
    { name: 'Attendance', icon: FiCalendar, path: '/employees/attendance', module: 'employee', adminView: true, notificationCount: counts.attendance },
    { name: 'Salary', icon: FiDollarSign, path: '/employees/salary', module: 'employee', adminView: true },
    { name: 'Leave Management', icon: FiCalendar, path: '/employees/leave', module: 'employee', adminView: true, notificationCount: counts.leaves },
    
    // Employee Self-Service (Non-Admin) - Show separately for easy access
    { name: 'My Attendance', icon: FiClock, path: '/my-attendance', module: 'all', employeeOnly: true },
    { name: 'My Projects', icon: FiBriefcase, path: '/my-projects', module: 'all', employeeOnly: true },
    { name: 'My Salary', icon: FiDollarSign, path: '/my-salary', module: 'all', employeeOnly: true },
    { name: 'My Leave', icon: FiCalendar, path: '/my-leave', module: 'all', employeeOnly: true },
    { name: 'Work Updates', icon: FiSend, path: '/work-updates', module: 'all', employeeOnly: true },
    { name: 'Calendar', icon: FiBell, path: '/calendar-reminders', module: 'all', notificationCount: counts.reminders },
    
    // Accounts Section
    { name: 'Accounts', icon: FiKey, path: '/accounts', module: 'all', adminOnly: true },
    
    // Common
    { name: 'Settings', icon: FiSettings, path: '/settings', module: 'all' },
  ]

  // Filter menu items based on user module access
  const isAdmin = user?.role === 'admin' || user?.role === 'main_admin'
  const filteredMenuItems = menuItems.filter(item => {
    // Check admin-only items
    if (item.adminOnly && !isAdmin) {
      return false
    }
    // Check employee-only items (hide for admin)
    if (item.employeeOnly && isAdmin) {
      return false
    }
    // Check admin view items (hide for non-admin)
    if (item.adminView && !isAdmin) {
      return false
    }
    // Check module access
    // If user has 'none' module, only show items with module: 'all' (self-service)
    if (user?.module === 'none') {
      return item.module === 'all'
    }
    // Otherwise, normal module filtering
    return item.module === 'all' || user?.module === 'all' || user?.module === item.module
  })

  return (
    <>
      {/* Mobile Toggle - Hidden on desktop */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-primary text-white rounded-md shadow-lg"
      >
        {isOpen ? <FiX size={20} /> : <FiMenu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:static inset-y-0 left-0 z-40 w-64 sm:w-72 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex items-center justify-center h-16 lg:h-20 border-b px-4">
          <img 
            src="https://www.sanjanawaterproofing.com/assets/sanjana-enterprises-Ihc86Ddy.png" 
            alt="Sanjana Logo" 
            className="w-32 sm:w-40 lg:w-44 h-auto" 
          />
        </div>

        {/* Navigation */}
        <nav className="mt-4 lg:mt-6 px-3 sm:px-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          <div className="space-y-1">
            {filteredMenuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  // Close sidebar on mobile when navigating
                  if (window.innerWidth < 1024) {
                    setIsOpen(false)
                  }
                }}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <item.icon className="mr-2 sm:mr-3 flex-shrink-0" size={18} />
                <span className="font-medium truncate">{item.name}</span>
                {item.notificationCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center flex-shrink-0">
                    {item.notificationCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User Info - Hidden on mobile, shown on desktop */}
        <div className="hidden lg:block absolute bottom-0 w-full p-4 border-t">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-800">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role?.replace('_', ' ')}
                {user?.role === 'admin' && ' ✓'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
        />
      )}
    </>
  )
}

export default Sidebar
