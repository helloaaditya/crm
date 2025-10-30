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
import Employees from './pages/Employee/Employees'
import Attendance from './pages/Employee/Attendance'
import Salary from './pages/Employee/SalaryManagement'
import Accounts from './pages/Accounts'
import Reminders from './pages/Reminders'
import Settings from './pages/Settings'

// Employee Self-Service Pages
import MyDashboard from './pages/Employee/MyDashboard'
import MyAttendance from './pages/Employee/MyAttendance'
import MySalary from './pages/Employee/MySalary'
import MyLeave from './pages/Employee/MyLeave'
import MyProjects from './pages/Employee/MyProjects'
import CalendarReminders from './pages/Employee/CalendarReminders'

// Layout
import Layout from './components/Layout/Layout'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

// Dashboard Router - Shows different dashboard based on role
const DashboardRouter = () => {
  const { user } = useAuth()
  const isMainAdmin = user?.role === 'main_admin'
  
  // Main admin sees Dashboard, others see My Dashboard
  return isMainAdmin ? <Dashboard /> : <MyDashboard />
}

function App() {
  const { user } = useAuth()

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />

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
          <Route path="payments" element={<Payments />} />
          
          {/* Inventory Routes */}
          <Route path="inventory/materials" element={<Materials />} />
          <Route path="inventory/machinery" element={<Machinery />} />
          <Route path="inventory/vendors" element={<Vendors />} />
          
          {/* Employee Routes */}
          <Route path="employees" element={<Employees />} />
          <Route path="employees/attendance" element={<Attendance />} />
          <Route path="employees/salary" element={<Salary />} />
          <Route path="employees/leave" element={<LeaveManagement />} />
          
          {/* Accounts Route (Admin Only) */}
          <Route path="accounts" element={<Accounts />} />
          
          {/* Employee Self-Service Routes */}
          <Route path="my-dashboard" element={<MyDashboard />} />
          <Route path="my-attendance" element={<MyAttendance />} />
          <Route path="my-salary" element={<MySalary />} />
          <Route path="my-leave" element={<MyLeave />} />
          <Route path="my-projects" element={<MyProjects />} />
          <Route path="calendar-reminders" element={<CalendarReminders />} />
          
          {/* Other Routes */}
          <Route path="reminders" element={<Reminders />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

export default App
