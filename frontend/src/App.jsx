import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Payments from './pages/CRM/Payments'
import LeaveManagement from './pages/Employee/LeaveManagement'
// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Customers from './pages/CRM/Customers'
import Projects from './pages/CRM/Projects'
import Invoices from './pages/CRM/Invoices'
import Materials from './pages/Inventory/Materials'
import Machinery from './pages/Inventory/Machinery'
import Vendors from './pages/Inventory/Vendors'
import VendorPayments from './pages/Inventory/VendorPayments'
import Employees from './pages/Employee/Employees'
import EmployeeManagement from './pages/Employee/EmployeeManagement'
import Attendance from './pages/Employee/Attendance'
import Salary from './pages/Employee/SalaryManagement'
import Accounts from './pages/Accounts'
import Reminders from './pages/Reminders'
import Settings from './pages/Settings'
import Expenses from './pages/Expenses'
import EmployeeFunds from './pages/EmployeeFunds'
import WorkOrders from './pages/WorkOrders'
import CompanyDocuments from './pages/CompanyDocuments'
import BulkImport from './pages/BulkImport'
import LiveTracking from './pages/LiveTracking'

// Employee Self-Service Pages
import MyDashboard from './pages/Employee/MyDashboard'
import MyAttendance from './pages/Employee/MyAttendance'
import MySalary from './pages/Employee/MySalary'
import MyLeave from './pages/Employee/MyLeave'
import MyProjects from './pages/Employee/MyProjects'
import WorkUpdates from './pages/Employee/WorkUpdates'
import CalendarReminders from './pages/Employee/CalendarReminders'
import MyExpenses from './pages/Employee/MyExpenses'

// Layout
import Layout from './components/Layout/Layout'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }
  
  // Only redirect to login if loading is complete and user is not found
  return user ? children : <Navigate to="/login" replace />
}

// Module Protected Route Component - Checks if user has access to specific module
const ModuleProtectedRoute = ({ children, requiredModule }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  // Parse user modules
  let userModules = []
  if (Array.isArray(user?.module)) {
    userModules = user.module
  } else if (user?.module) {
    userModules = user.module.includes(',') 
      ? user.module.split(',').map(m => m.trim())
      : [user.module]
  }
  
  // Check if user has 'all' access
  if (userModules.includes('all')) {
    return children
  }
  
  // Check if user has the required module access
  const hasAccess = userModules.some(userModule => {
    if (userModule === requiredModule) return true
    // If user has base module (e.g., 'crm'), grant access to all its pages (e.g., 'crm:payments')
    if (requiredModule && requiredModule.startsWith(userModule + ':')) return true
    return false
  })
  
  if (!hasAccess) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">You don't have permission to access this page.</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }
  
  return children
}

// Dashboard Router - Shows different dashboard based on role
const DashboardRouter = () => {
  const { user } = useAuth()
  const isMainAdmin = user?.role === 'main_admin'
  
  // Main admin sees Dashboard, others see My Dashboard
  return isMainAdmin ? <Dashboard /> : <MyDashboard />
}

function App() {
  const { user, loading } = useAuth()

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardRouter />} />
          
          {/* CRM Routes */}
          <Route path="customers" element={<Customers />} />
          <Route path="projects" element={<Projects />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="payments" element={<ModuleProtectedRoute requiredModule="crm:payments"><Payments /></ModuleProtectedRoute>} />
          <Route path="work-orders" element={<WorkOrders />} />
          
          {/* Inventory Routes */}
          <Route path="inventory/materials" element={<Materials />} />
          <Route path="inventory/machinery" element={<Machinery />} />
          <Route path="inventory/vendors" element={<Vendors />} />
          <Route path="inventory/vendor-payments" element={<VendorPayments />} />
          
          {/* Employee Routes */}
          <Route path="employees" element={<Employees />} />
          <Route path="employees/management" element={<EmployeeManagement />} />
          <Route path="employees/attendance" element={<Attendance />} />
          <Route path="employees/salary" element={<Salary />} />
          <Route path="employees/leave" element={<LeaveManagement />} />
          
          {/* Accounts Route (Admin Only) */}
          <Route path="accounts" element={<ModuleProtectedRoute requiredModule="admin:accounts"><Accounts /></ModuleProtectedRoute>} />
          {/* Expenses (Main Admin Only UI; menu restricts visibility) */}
          <Route path="expenses" element={<Expenses />} />
          {/* Employee Funds (Module-based access) */}
          <Route path="employee-funds" element={<EmployeeFunds />} />
          {/* Bulk Import (Admin Only via menu visibility) */}
          <Route path="bulk-import" element={<BulkImport />} />
          {/* Live Tracking (Admin Only) */}
          <Route path="live-tracking" element={<ModuleProtectedRoute requiredModule="admin:live-tracking"><LiveTracking /></ModuleProtectedRoute>} />
          
          {/* Employee Self-Service Routes */}
          <Route path="my-dashboard" element={<MyDashboard />} />
          <Route path="my-attendance" element={<MyAttendance />} />
          <Route path="my-salary" element={<MySalary />} />
          <Route path="my-leave" element={<MyLeave />} />
          <Route path="my-projects" element={<MyProjects />} />
          <Route path="work-updates" element={<WorkUpdates />} />
          <Route path="calendar-reminders" element={<CalendarReminders />} />
          <Route path="my-expenses" element={<MyExpenses />} />
          
          {/* Other Routes */}
          <Route path="reminders" element={<Reminders />} />
          <Route path="company-documents" element={<ModuleProtectedRoute requiredModule="shared:documents"><CompanyDocuments /></ModuleProtectedRoute>} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

export default App