import { useEffect, useState } from 'react'
import { FiUsers, FiBriefcase, FiPackage, FiUserCheck, FiDollarSign, FiTrendingUp, FiAlertCircle, FiCalendar, FiArrowDown, FiArrowUp } from 'react-icons/fi'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import API from '../api'
import { toast } from 'react-toastify'
import { format } from 'date-fns'

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [revenueData, setRevenueData] = useState([])
  const [projectData, setProjectData] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Daily revenue trends state
  const [dailyRevenueData, setDailyRevenueData] = useState([])
  const [revenueLoading, setRevenueLoading] = useState(false)
  const [revenueStartDate, setRevenueStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [revenueEndDate, setRevenueEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [revenueTotals, setRevenueTotals] = useState({ received: 0, sent: 0, net: 0 })
  
  // Payment reminders state
  const [paymentReminders, setPaymentReminders] = useState([])
  const [remindersLoading, setRemindersLoading] = useState(false)
  const [reminderStartDate, setReminderStartDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [reminderEndDate, setReminderEndDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 30)
    return date.toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchDashboardData()
    // Load revenue trends and reminders independently (non-blocking)
    fetchDailyRevenueTrends()
    fetchPaymentReminders()
  }, [])

  useEffect(() => {
    fetchDailyRevenueTrends()
  }, [revenueStartDate, revenueEndDate])

  useEffect(() => {
    fetchPaymentReminders()
  }, [reminderStartDate, reminderEndDate])

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

  const fetchDailyRevenueTrends = async () => {
    try {
      setRevenueLoading(true)
      const response = await API.dashboard.getDailyRevenueTrends({
        startDate: revenueStartDate,
        endDate: revenueEndDate
      })
      
      // Backend returns: { success: true, data: { trends: [...], summary: {...} } }
      const trends = response.data?.data?.trends || []
      const summary = response.data?.data?.summary || {}
      
      const formatted = Array.isArray(trends) ? trends.map(item => ({
        date: format(new Date(item.date), 'dd MMM'),
        received: item.received || 0,
        sent: item.sent || 0,
        net: item.net || 0
      })) : []
      
      setDailyRevenueData(formatted)
      setRevenueTotals({
        received: summary.totalReceived || 0,
        sent: summary.totalSent || 0,
        net: summary.netRevenue || 0
      })
    } catch (error) {
      console.error('Error fetching daily revenue trends:', error)
      toast.error('Failed to load revenue trends')
      setDailyRevenueData([])
      setRevenueTotals({ received: 0, sent: 0, net: 0 })
    } finally {
      setRevenueLoading(false)
    }
  }

  const fetchPaymentReminders = async () => {
    try {
      setRemindersLoading(true)
      const response = await API.dashboard.getPaymentReminders({
        startDate: reminderStartDate,
        endDate: reminderEndDate
      })
      
      // Backend returns: { success: true, data: { reminders: [...], summary: {...} } }
      const reminders = response.data?.data?.reminders || []
      setPaymentReminders(Array.isArray(reminders) ? reminders : [])
    } catch (error) {
      console.error('Error fetching payment reminders:', error)
      toast.error('Failed to load payment reminders')
      setPaymentReminders([])
    } finally {
      setRemindersLoading(false)
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
        {/* Daily Revenue Trend with Date Filters */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Daily Revenue Trend</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="date"
                value={revenueStartDate}
                onChange={(e) => setRevenueStartDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={revenueEndDate}
                onChange={(e) => setRevenueEndDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-green-700 mb-1">
                <FiArrowDown size={16} />
                <span className="text-xs font-semibold">Received</span>
              </div>
              <p className="text-sm font-bold text-green-800">₹{(revenueTotals.received / 1000).toFixed(1)}K</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-red-700 mb-1">
                <FiArrowUp size={16} />
                <span className="text-xs font-semibold">Paid</span>
              </div>
              <p className="text-sm font-bold text-red-800">₹{(revenueTotals.sent / 1000).toFixed(1)}K</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${revenueTotals.net >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
              <div className={`flex items-center justify-center gap-1 mb-1 ${revenueTotals.net >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                <FiDollarSign size={16} />
                <span className="text-xs font-semibold">Net</span>
              </div>
              <p className={`text-sm font-bold ${revenueTotals.net >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                ₹{(revenueTotals.net / 1000).toFixed(1)}K
              </p>
            </div>
          </div>

          {revenueLoading ? (
            <div className="flex items-center justify-center h-[250px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : dailyRevenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip 
                  formatter={(value, name) => {
                    const formatted = `₹${(value / 1000).toFixed(1)}K`
                    const label = name === 'received' ? 'Received' : name === 'sent' ? 'Paid' : 'Net'
                    return [formatted, label]
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="received" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  name="Received Money"
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sent" 
                  stroke="#ef4444" 
                  strokeWidth={2} 
                  name="Paid to Vendors"
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="net" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  name="Net Amount"
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-500">
              <p>No data available for selected date range</p>
            </div>
          )}
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

      {/* Payment Reminders */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">Date-wise Payment Reminders</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="date"
              value={reminderStartDate}
              onChange={(e) => setReminderStartDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={reminderEndDate}
              onChange={(e) => setReminderEndDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {remindersLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : paymentReminders.length > 0 ? (
          <div className="space-y-4">
            {paymentReminders.map((reminder, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FiCalendar className="text-blue-600" size={18} />
                    <h3 className="font-semibold text-gray-800">
                      {format(new Date(reminder.date), 'dd MMM yyyy')}
                    </h3>
                    <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                      {reminder.invoices?.length || 0} Invoice(s)
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total Pending</p>
                    <p className="text-lg font-bold text-orange-600">
                      ₹{reminder.totalPending?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>

                {reminder.invoices && reminder.invoices.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {reminder.invoices.map((invoice, invIndex) => (
                      <div 
                        key={invIndex} 
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">
                              {invoice.invoiceType === 'quotation' 
                                ? invoice.quotationNumber || invoice.invoiceNumber 
                                : invoice.invoiceNumber
                              }
                            </p>
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              invoice.paymentStatus === 'unpaid' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {invoice.paymentStatus}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {invoice.customer?.name || 'Customer'} • 
                            {invoice.project?.projectId ? ` Project: ${invoice.project.projectId}` : ''}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm text-gray-600">Due Amount</p>
                          <p className="font-semibold text-gray-900">
                            ₹{(invoice.totalAmount - invoice.paidAmount).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Total: ₹{invoice.totalAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FiAlertCircle className="mx-auto mb-2" size={32} />
            <p>No payment reminders for the selected date range</p>
          </div>
        )}
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
