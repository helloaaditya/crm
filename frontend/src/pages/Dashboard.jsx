import { useEffect, useState } from 'react'
import { FiUsers, FiBriefcase, FiPackage, FiUserCheck, FiDollarSign, FiTrendingUp, FiAlertCircle } from 'react-icons/fi'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import API from '../api'
import { toast } from 'react-toastify'

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [revenueData, setRevenueData] = useState([])
  const [projectData, setProjectData] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch all dashboard data in parallel
      const [overviewRes, revenueRes, crmRes, activitiesRes] = await Promise.all([
        API.dashboard.getOverview(),
        API.dashboard.getRevenueStats(6),
        API.dashboard.getCRMStats(),
        API.dashboard.getRecentActivities(10)
      ])

      setStats(overviewRes.data.data)
      
      // Format revenue data for chart
      const revenueByMonth = revenueRes.data.data.revenueByMonth
      const formattedRevenue = Object.entries(revenueByMonth || {}).map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
        revenue: data.total
      }))
      setRevenueData(formattedRevenue)

      // Format project data for chart
      const projectsByCategory = crmRes.data.data.projectsByCategory || []
      const formattedProjects = projectsByCategory.map(item => ({
        name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
        value: item.count
      }))
      setProjectData(formattedProjects)

      setActivities(activitiesRes.data.data || [])
      
    } catch (error) {
      console.error('Dashboard error:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner"></div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Unable to load dashboard data</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Dashboard</h1>
        <div className="text-xs sm:text-sm text-gray-600">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Total Customers */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-gray-600 text-xs sm:text-sm font-medium">Total Customers</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1 sm:mt-2">{stats.totalCustomers}</p>
              <p className="text-green-600 text-xs sm:text-sm mt-1 sm:mt-2">+12% from last month</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FiUsers className="text-primary" size={20} />
            </div>
          </div>
        </div>

        {/* Total Projects */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-gray-600 text-xs sm:text-sm font-medium">Active Projects</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1 sm:mt-2">{stats.totalProjects}</p>
              <p className="text-green-600 text-xs sm:text-sm mt-1 sm:mt-2">+8% from last month</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FiBriefcase className="text-secondary" size={20} />
            </div>
          </div>
        </div>

        {/* Total Materials */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-gray-600 text-xs sm:text-sm font-medium">Materials in Stock</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1 sm:mt-2">{stats.totalMaterials}</p>
              <p className="text-red-600 text-xs sm:text-sm mt-1 sm:mt-2">{stats.lowStockCount} items low stock</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FiPackage className="text-accent" size={20} />
            </div>
          </div>
        </div>

        {/* Total Employees */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-gray-600 text-xs sm:text-sm font-medium">Total Employees</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1 sm:mt-2">{stats.totalEmployees}</p>
              <p className="text-gray-600 text-xs sm:text-sm mt-1 sm:mt-2">Active employees</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FiUserCheck className="text-warning" size={20} />
            </div>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-gray-600 text-xs sm:text-sm font-medium">Total Revenue</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1 sm:mt-2">₹{(stats.totalRevenue / 100000).toFixed(1)}L</p>
              <p className="text-green-600 text-xs sm:text-sm mt-1 sm:mt-2">₹{(stats.paidRevenue / 100000).toFixed(1)}L paid</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FiDollarSign className="text-success" size={20} />
            </div>
          </div>
        </div>

        {/* Pending Invoices */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-gray-600 text-xs sm:text-sm font-medium">Pending Invoices</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1 sm:mt-2">{stats.pendingInvoices}</p>
              <p className="text-orange-600 text-xs sm:text-sm mt-1 sm:mt-2">Action required</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FiAlertCircle className="text-warning" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Revenue Trend (6 Months)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(value) => `₹${(value / 100000).toFixed(1)}L`} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Project Distribution */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Project Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={projectData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {projectData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Recent Activities</h2>
        <div className="space-y-3 sm:space-y-4">
          {activities.length > 0 ? (
            activities.map((activity, index) => (
              <div key={index} className="flex items-start sm:items-center p-3 bg-gray-50 rounded-lg">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  activity.type === 'customer' ? 'bg-blue-100' :
                  activity.type === 'project' ? 'bg-green-100' :
                  'bg-yellow-100'
                }`}>
                  {activity.type === 'customer' && <FiUsers className="text-primary" size={16} />}
                  {activity.type === 'project' && <FiBriefcase className="text-secondary" size={16} />}
                  {activity.type === 'payment' && <FiDollarSign className="text-warning" size={16} />}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{activity.title}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    <span className="hidden sm:inline">{activity.description} - </span>
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-600 text-center py-4">No recent activities</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
