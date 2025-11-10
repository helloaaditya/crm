import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { 
  FiHome, FiUsers, FiBriefcase, FiFileText, FiPackage, 
  FiTruck, FiUserCheck, FiCalendar, FiDollarSign, 
  FiBell, FiSettings, FiMenu, FiX, FiKey, FiClock, FiSend, FiTool, FiCreditCard, FiDatabase, FiNavigation, FiShoppingCart, FiFolder, FiClipboard, FiLogOut 
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../hooks/useNotifications'

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true)
  const { user, logout } = useAuth()
  const { counts } = useNotifications()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems = [
    { name: 'Dashboard', icon: FiHome, path: '/', module: 'all' },
    
    // CRM Section
    { name: 'Customers', icon: FiUsers, path: '/customers', module: 'crm' },
    { name: 'Projects', icon: FiBriefcase, path: '/projects', module: 'crm' },
    { name: 'Invoices', icon: FiFileText, path: '/invoices', module: 'crm', notificationCount: counts.invoices },
    { name: 'Payments', icon: FiDollarSign, path: '/payments', module: 'all' ,adminOnly: true },
    
    // Inventory Section
    { name: 'Materials', icon: FiPackage, path: '/inventory/materials', module: 'inventory', notificationCount: counts.lowStock },
    { name: 'Machinery', icon: FiTool, path: '/inventory/machinery', module: 'inventory' },
    { name: 'Vendors', icon: FiTruck, path: '/inventory/vendors', module: 'inventory' },
    { name: 'Vendor Payments', icon: FiShoppingCart, path: '/inventory/vendor-payments', module: 'inventory' },
    
    // Employee Section
    { name: 'Employees', icon: FiUserCheck, path: '/employees', module: 'employee' },
    { name: 'Attendance', icon: FiCalendar, path: '/employees/attendance', module: 'employee', notificationCount: counts.attendance },
    { name: 'Salary', icon: FiDollarSign, path: '/employees/salary', module: 'employee' },
    { name: 'Leave Management', icon: FiCalendar, path: '/employees/leave', module: 'employee', notificationCount: counts.leaves },
    { name: 'Employee Planning', icon: FiUsers, path: '/employees/management', module: 'employee' },
    { name: 'Live Location', icon: FiNavigation, path: '/employees/live-location', module: 'employee', adminOnly: true },

    
    // Employee Self-Service (Non-Admin) - Show separately for easy access
    { name: 'My Projects', icon: FiBriefcase, path: '/my-projects', module: 'all', employeeOnly: true },
    { name: 'Work Updates', icon: FiSend, path: '/work-updates', module: 'all', employeeOnly: true },
    { name: 'My Attendance', icon: FiClock, path: '/my-attendance', module: 'all', employeeOnly: true },
    { name: 'My Salary', icon: FiDollarSign, path: '/my-salary', module: 'all', employeeOnly: true },
    { name: 'My Leave', icon: FiCalendar, path: '/my-leave', module: 'all', employeeOnly: true },
    { name: 'My Expenses', icon: FiCreditCard, path: '/my-expenses', module: 'all', employeeOnly: true },
    { name: 'My Location', icon: FiNavigation, path: '/my-location', module: 'all', employeeOnly: true },
    { name: 'Calendar', icon: FiBell, path: '/calendar-reminders', module: 'all', notificationCount: counts.reminders },
    
    // Accounts Section
    { name: 'Accounts', icon: FiKey, path: '/accounts', module: 'all', adminOnly: true },
    
    // Expense Section
    { name: 'Expenses', icon: FiCreditCard, path: '/expenses', module: 'expense' },
    
    // Live Tracking - admin/main_admin only
    { name: 'Live Tracking', icon: FiNavigation, path: '/live-tracking', module: 'all', adminOnly: true },
    

    { name: 'Work Orders', icon: FiClipboard, path: '/work-orders', module: 'crm' },

    
    // Company Documents - accessible to all modules
    { name: 'Documents', icon: FiFolder, path: '/company-documents', module: 'all' },
    // { name: 'Bulk Import', icon: FiDatabase, path: '/bulk-import', module: 'all', adminOnly: true },
    
    // Common
    { name: 'Settings', icon: FiSettings, path: '/settings', module: 'all'},
  ]

  // Filter menu items based on user module access
  const isAdmin = user?.role === 'admin' || user?.role === 'main_admin'
  const filteredMenuItems = menuItems.filter(item => {
    // Main admin only items
    if (item.mainAdminOnly && user?.role !== 'main_admin') {
      return false
    }
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
    // Handle both array and string module formats for backward compatibility
    let userModules = []
    if (Array.isArray(user?.module)) {
      userModules = user.module
    } else if (user?.module) {
      // If it's a string, split by comma for multiple modules
      userModules = user.module.includes(',') 
        ? user.module.split(',').map(m => m.trim())
        : [user.module]
    }
    
    // If user has 'none' module, only show items with employeeOnly flag (self-service)
    if (userModules.includes('none')) {
      return item.module === 'all' && (item.employeeOnly || !item.adminView)
    }
    // If user has 'all' access, show all allowed items
    if (userModules.includes('all')) {
      return true
    }
    
    // Check for granular page-level access (e.g., 'crm:customers', 'inventory:materials')
    // Also check base module access (e.g., 'crm', 'inventory')
    const itemModule = item.module
    
    // Map paths to their page identifiers
    const pathToPageId = {
      '/customers': 'crm:customers',
      '/projects': 'crm:projects',
      '/invoices': 'crm:invoices',
      '/payments': 'crm:payments',
      '/work-orders': 'crm:work-orders',
      '/inventory/materials': 'inventory:materials',
      '/inventory/machinery': 'inventory:machinery',
      '/inventory/vendors': 'inventory:vendors',
      '/inventory/vendor-payments': 'inventory:vendor-payments',
      '/employees': 'employee:list',
      '/employees/management': 'employee:management',
      '/employees/attendance': 'employee:attendance',
      '/employees/salary': 'employee:salary',
      '/employees/leave': 'employee:leave',
      '/expenses': 'expense:list',
      '/company-documents': 'shared:documents',
      '/accounts': 'admin:accounts',
      '/settings': 'admin:settings',
      '/bulk-import': 'admin:bulk-import',
      '/live-tracking': 'admin:live-tracking'
    }
    
    const pageId = pathToPageId[item.path]
    
    // Check if user has access to this specific page or the base module
    const hasAccess = userModules.some(userModule => {
      if (userModule === itemModule) return true // Base module match
      if (pageId && userModule === pageId) return true // Specific page match
      // If user has base module (e.g., 'crm'), grant access to all its pages (e.g., 'crm:customers')
      if (pageId && pageId.startsWith(userModule + ':')) return true
      return false
    })
    
    // Otherwise, check if item's module is in user's allowed modules or specific page access
    return item.module === 'all' || hasAccess
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
        } fixed lg:relative inset-y-0 left-0 z-40 w-64 sm:w-72 lg:w-64 xl:w-72 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex-shrink-0`}
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
          <nav className="mt-4 lg:mt-6 px-3 sm:px-4 pb-24 overflow-y-auto" style={{ maxHeight: 'calc(100svh - 200px)' }}>
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

        {/* Logout Button at Bottom */}
        <div className="absolute bottom-0 w-full p-4 border-t bg-white">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2.5 sm:px-4 sm:py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm sm:text-base font-medium"
          >
            <FiLogOut className="mr-2 sm:mr-3 flex-shrink-0" size={18} />
            <span>Logout</span>
          </button>
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
