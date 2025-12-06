import { useState, useEffect } from 'react'
import { FiCreditCard, FiPlus, FiCheck, FiX, FiDollarSign, FiSearch, FiFilter, FiFileText, FiUpload, FiDownload, FiEye, FiTrendingUp, FiClock, FiRefreshCw, FiEdit, FiTrash2 } from 'react-icons/fi'
import API from '../api'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'

const Expenses = () => {
  const { user } = useAuth()
  const hasExpenseAccess = user?.module?.includes('expense') || user?.module?.includes('all') || user?.role === 'admin' || user?.role === 'main_admin'
  
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [viewModal, setViewModal] = useState(null)
  const [paymentModal, setPaymentModal] = useState(null)
  const [approvalModal, setApprovalModal] = useState(null)
  const [approvalData, setApprovalData] = useState({
    amount: '',
    remarks: ''
  })
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMode: 'bank_transfer',
    transactionReference: '',
    remarks: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [stats, setStats] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [availableFunds, setAvailableFunds] = useState(0)
  const [fundHistory, setFundHistory] = useState([])
  const [showFundModal, setShowFundModal] = useState(false)
  const [showFundHistory, setShowFundHistory] = useState(false)
  const [showEditFundModal, setShowEditFundModal] = useState(false)
  const [employeesFunds, setEmployeesFunds] = useState([])
  const [loadingEmployeesFunds, setLoadingEmployeesFunds] = useState(false)
  const [showEmployeeFundsSummary, setShowEmployeeFundsSummary] = useState(false)
  const [showEmployeeFundModal, setShowEmployeeFundModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedEmployeeForFund, setSelectedEmployeeForFund] = useState(null)
  const [selectedEmployeeHistory, setSelectedEmployeeHistory] = useState(null)
  const [employeeFundHistory, setEmployeeFundHistory] = useState([])
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [activeTab, setActiveTab] = useState('expenses') // 'expenses' or 'funds'
  const [editTransactionData, setEditTransactionData] = useState({
    amount: '',
    paymentMode: 'bank_transfer',
    transactionReference: '',
    remarks: ''
  })
  const [employeeFundData, setEmployeeFundData] = useState({
    amount: '',
    paymentMode: 'bank_transfer',
    transactionReference: '',
    remarks: ''
  })
  const [fundData, setFundData] = useState({
    amount: '',
    paymentMode: 'bank_transfer',
    transactionReference: '',
    remarks: ''
  })
  const [editFundData, setEditFundData] = useState({
    amount: '',
    paymentMode: 'bank_transfer',
    transactionReference: '',
    remarks: ''
  })
  const [formData, setFormData] = useState({
    category: 'petrol',
    description: '',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    project: '',
    documents: [],
    notes: ''
  })
  
  const categories = [
    { value: 'petrol', label: 'Petrol/Fuel' },
    { value: 'travel', label: 'Travel' },
    { value: 'food', label: 'Food & Refreshments' },
    { value: 'accommodation', label: 'Accommodation' },
    { value: 'materials', label: 'Materials' },
    { value: 'tools', label: 'Tools & Equipment' },
    { value: 'medical', label: 'Medical' },
    { value: 'communication', label: 'Communication' },
    { value: 'other', label: 'Other' }
  ]
  
  useEffect(() => {
    fetchExpenses()
    if (hasExpenseAccess) {
      fetchStats()
      fetchFunds()
      // Employee funds are fetched on-demand when user clicks "Show All Employee Funds"
    }
  }, [])

  // Listen for refresh event from Header
  useEffect(() => {
    const handleRefresh = () => {
      fetchExpenses()
      if (hasExpenseAccess) {
        fetchStats()
        fetchFunds()
        // Only refresh employee funds if the summary is currently visible
        if (showEmployeeFundsSummary) {
          fetchAllEmployeesFunds()
        }
      }
    }

    window.addEventListener('app-refresh', handleRefresh)
    return () => window.removeEventListener('app-refresh', handleRefresh)
  }, [hasExpenseAccess, showEmployeeFundsSummary])
  
  const fetchExpenses = async () => {
    try {
      setLoading(true)
      const response = hasExpenseAccess 
        ? await API.expenses.getAll()
        : await API.expenses.getMyExpenses()
      setExpenses(response.data.data || [])
    } catch (error) {
      console.error('Error fetching expenses:', error)
      toast.error('Failed to fetch expenses')
    } finally {
      setLoading(false)
    }
  }
  
  const fetchStats = async () => {
    try {
      const response = await API.expenses.getStats()
      setStats(response.data.data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }
  
  const fetchFunds = async () => {
    try {
      const response = await API.funds.getFunds()
      setAvailableFunds(response.data.data.availableFunds || 0)
    } catch (error) {
      console.error('Error fetching funds:', error)
    }
  }
  
  const fetchFundHistory = async () => {
    try {
      const response = await API.funds.getHistory({ limit: 100 })
      setFundHistory(response.data.data || [])
    } catch (error) {
      console.error('Error fetching fund history:', error)
      toast.error('Failed to load fund history')
    }
  }

  const fetchAllEmployeesFunds = async () => {
    try {
      setLoadingEmployeesFunds(true)
      const response = await API.funds.getAllEmployeesFunds()
      setEmployeesFunds(response.data.data || [])
    } catch (error) {
      console.error('Error fetching employees funds:', error)
      toast.error('Failed to load employee funds')
    } finally {
      setLoadingEmployeesFunds(false)
    }
  }

  const fetchEmployeeFundHistory = async (employeeId) => {
    try {
      const response = await API.funds.getEmployeeFundHistory(employeeId, { limit: 100 })
      setEmployeeFundHistory(response.data.data || [])
    } catch (error) {
      console.error('Error fetching employee fund history:', error)
      toast.error('Failed to load fund history')
    }
  }

  const openHistoryModal = async (employee) => {
    setSelectedEmployeeHistory(employee)
    setShowHistoryModal(true)
    await fetchEmployeeFundHistory(employee._id)
  }

  const handleAddEmployeeFunds = async (e) => {
    e.preventDefault()
    
    const amount = Number(employeeFundData.amount)
    
    if (!amount || amount <= 0 || isNaN(amount)) {
      toast.error('Please enter a valid amount')
      return
    }
    
    try {
      const response = await API.funds.addEmployeeFunds(selectedEmployeeForFund._id, {
        ...employeeFundData,
        amount: amount
      })
      toast.success(response.data.data.message || 'Funds added successfully')
      setShowEmployeeFundModal(false)
      setSelectedEmployeeForFund(null)
      setEmployeeFundData({
        amount: '',
        paymentMode: 'bank_transfer',
        transactionReference: '',
        remarks: ''
      })
      fetchAllEmployeesFunds()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add funds')
    }
  }

  const openAddEmployeeFundModal = (employee) => {
    setSelectedEmployeeForFund(employee)
    setEmployeeFundData({
      amount: '',
      paymentMode: 'bank_transfer',
      transactionReference: '',
      remarks: ''
    })
    setShowEmployeeFundModal(true)
  }
  
  const handleAddFunds = async (e) => {
    e.preventDefault()
    
    // Convert amount to number to prevent string concatenation
    const amount = Number(fundData.amount)
    
    if (!amount || amount <= 0 || isNaN(amount)) {
      toast.error('Please enter a valid amount')
      return
    }
    
    try {
      const response = await API.funds.addFunds({
        ...fundData,
        amount: amount // Ensure it's a number
      })
      toast.success(response.data.data.message || 'Funds added successfully')
      setShowFundModal(false)
      setFundData({
        amount: '',
        paymentMode: 'bank_transfer',
        transactionReference: '',
        remarks: ''
      })
      fetchFunds()
      fetchFundHistory()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add funds')
    }
  }
  
  const handleEditFunds = async (e) => {
    e.preventDefault()
    
    // Convert amount to number to prevent string concatenation
    const amount = Number(editFundData.amount)
    
    if (!amount || amount <= 0 || isNaN(amount)) {
      toast.error('Please enter a valid amount')
      return
    }
    
    // Calculate the difference to add/subtract
    const currentAmount = Number(availableFunds) || 0
    const newAmount = amount
    const difference = newAmount - currentAmount
    
    if (difference === 0) {
      toast.info('No change in amount')
      return
    }
    
    try {
      if (difference > 0) {
        // Add the difference
        await API.funds.addFunds({
          amount: difference,
          paymentMode: editFundData.paymentMode,
          transactionReference: editFundData.transactionReference,
          remarks: editFundData.remarks || `Manual adjustment: Set to ₹${newAmount.toLocaleString('en-IN')}`
        })
        toast.success(`Funds adjusted: Added ₹${difference.toLocaleString('en-IN')}`)
      } else {
        // Deduct the difference
        await API.funds.deductFunds({
          amount: Math.abs(difference),
          paymentMode: editFundData.paymentMode,
          transactionReference: editFundData.transactionReference,
          remarks: editFundData.remarks || `Manual adjustment: Set to ₹${newAmount.toLocaleString('en-IN')}`
        })
        toast.success(`Funds adjusted: Deducted ₹${Math.abs(difference).toLocaleString('en-IN')}`)
      }
      
      setShowEditFundModal(false)
      setEditFundData({
        amount: '',
        paymentMode: 'bank_transfer',
        transactionReference: '',
        remarks: ''
      })
      fetchFunds()
      fetchFundHistory()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to edit funds')
    }
  }
  
  const openEditFundModal = () => {
    setEditFundData({
      amount: availableFunds.toString(),
      paymentMode: 'bank_transfer',
      transactionReference: '',
      remarks: ''
    })
    setShowEditFundModal(true)
  }
  
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    
    try {
      setUploading(true)
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      
      const response = await API.expenses.uploadDocuments(formData)
      const uploadedDocs = response.data.data || []
      
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, ...uploadedDocs]
      }))
      
      toast.success(`${files.length} document(s) uploaded`)
    } catch (error) {
      toast.error('Failed to upload documents')
    } finally {
      setUploading(false)
    }
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.description || !formData.amount) {
      toast.error('Please fill in all required fields')
      return
    }
    
    try {
      setLoading(true)
      await API.expenses.create(formData)
      toast.success('Expense submitted successfully')
      setShowModal(false)
      resetForm()
      fetchExpenses()
      if (hasExpenseAccess) fetchStats()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit expense')
    } finally {
      setLoading(false)
    }
  }
  
  const openApprovalModal = (expense) => {
    setApprovalModal(expense)
    setApprovalData({
      amount: expense.amount || '',
      remarks: ''
    })
  }

  const handleApprove = async (e) => {
    e.preventDefault()
    
    if (!approvalData.amount || approvalData.amount <= 0) {
      toast.error('Please enter approved amount')
      return
    }
    
    try {
      await API.expenses.approve(approvalModal._id, {
        approvedAmount: Number(approvalData.amount),
        remarks: approvalData.remarks || 'Approved'
      })
      toast.success('Expense approved successfully')
      setApprovalModal(null)
      fetchExpenses()
      fetchStats()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve expense')
    }
  }
  
  const handleReject = async (expenseId) => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return
    
    try {
      await API.expenses.reject(expenseId, { reason })
      toast.success('Expense rejected')
      fetchExpenses()
      fetchStats()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject expense')
    }
  }
  
  const openPaymentModal = (expense) => {
    setPaymentModal(expense)
    setPaymentData({
      amount: expense.amount || '',
      paymentMode: 'bank_transfer',
      transactionReference: '',
      remarks: ''
    })
  }

  const handlePay = async (e) => {
    e.preventDefault()
    
    if (!paymentData.amount || paymentData.amount <= 0) {
      toast.error('Please enter valid payment amount')
      return
    }
    
    try {
      await API.expenses.pay(paymentModal._id, {
        paidAmount: Number(paymentData.amount),
        paymentMode: paymentData.paymentMode,
        transactionReference: paymentData.transactionReference,
        remarks: paymentData.remarks
      })
      toast.success('Payment processed successfully')
      setPaymentModal(null)
      fetchExpenses()
      fetchStats()
      fetchFunds() // Refresh funds after payment
      if (showFundHistory) {
        fetchFundHistory() // Refresh history if modal is open
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process payment')
    }
  }
  
  const resetForm = () => {
    setFormData({
      category: 'petrol',
      description: '',
      amount: '',
      expenseDate: new Date().toISOString().split('T')[0],
      project: '',
      documents: [],
      notes: ''
    })
  }
  
  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-blue-100 text-blue-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }
  
  const getCategoryIcon = (category) => {
    return FiCreditCard
  }
  
  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = !searchTerm || 
      expense.expenseId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || expense.status === filterStatus
    const matchesCategory = filterCategory === 'all' || expense.category === filterCategory
    
    return matchesSearch && matchesStatus && matchesCategory
  })

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Expense Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            {hasExpenseAccess ? 'Manage and approve employee expenses' : 'Submit and track your expenses'}
          </p>
        </div>
        {activeTab === 'expenses' && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
          >
            <FiPlus className="mr-2" />
            Submit Expense
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'expenses'
                ? 'text-primary border-b-2 border-primary bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Expenses Requests
          </button>
          {hasExpenseAccess && (
            <button
              onClick={() => {
                setActiveTab('funds')
                if (employeesFunds.length === 0) {
                  fetchAllEmployeesFunds()
                }
              }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'funds'
                  ? 'text-primary border-b-2 border-primary bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Employee Funds
            </button>
          )}
        </div>
      </div>

      {/* Expenses Requests Tab Content */}
      {activeTab === 'expenses' && (
        <>
          {/* Statistics (Admin Only) */}
          {hasExpenseAccess && stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <p className="text-xs sm:text-sm text-gray-600">Total Expenses</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-800">{stats.totalExpenses}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <p className="text-xs sm:text-sm text-gray-600">Pending</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.pendingExpenses}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <p className="text-xs sm:text-sm text-gray-600">Approved</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.approvedExpenses}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <p className="text-xs sm:text-sm text-gray-600">Paid</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.paidExpenses}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 sm:p-6 col-span-2 sm:col-span-1">
                <p className="text-xs sm:text-sm text-gray-600">Total Amount</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600">₹{stats.totalAmount?.total?.toLocaleString() || 0}</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Employee Funds Tab Content */}
      {activeTab === 'funds' && hasExpenseAccess && (
        <>
          {/* Available Funds Box */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-lg p-4 sm:p-6 mb-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs sm:text-sm opacity-90 mb-1">Available Funds</p>
                <p className="text-2xl sm:text-4xl font-bold">₹{availableFunds.toLocaleString('en-IN')}</p>
                <p className="text-xs opacity-75 mt-1">Auto-deducted when expenses are paid</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setShowFundHistory(true)
                    fetchFundHistory()
                  }}
                  className="flex items-center justify-center px-3 sm:px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition text-sm"
                >
                  <FiClock className="mr-1 sm:mr-2" size={16} />
                  <span className="hidden sm:inline">History</span>
                </button>
                <button
                  onClick={openEditFundModal}
                  className="flex items-center justify-center px-3 sm:px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition text-sm"
                  title="Edit/Adjust Funds"
                >
                  <FiEdit className="mr-1 sm:mr-2" size={16} />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  onClick={() => setShowFundModal(true)}
                  className="flex items-center justify-center px-3 sm:px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-gray-100 font-semibold transition text-sm"
                >
                  <FiPlus className="mr-1 sm:mr-2" size={16} />
                  Add Funds
                </button>
              </div>
            </div>
          </div>

          {/* Employee Funds Summary */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-4 sm:p-6 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Employee Funds Summary</h2>
                <p className="text-sm text-gray-600 mt-1">Available funds for each employee</p>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {loadingEmployeesFunds ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : employeesFunds.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No employee funds found</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Employee</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Available Funds</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeesFunds
                          .sort((a, b) => b.availableFunds - a.availableFunds)
                          .map((emp) => (
                            <tr key={emp._id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">{emp.name}</p>
                                  <p className="text-xs text-gray-500">{emp.employeeId}</p>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <p className="font-semibold text-green-600 text-sm">₹{emp.availableFunds?.toLocaleString('en-IN') || 0}</p>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => openAddEmployeeFundModal(emp)}
                                    className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                  >
                                    Add Funds
                                  </button>
                                  <button
                                    onClick={() => openHistoryModal(emp)}
                                    className="px-3 py-1.5 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                                  >
                                    History
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden space-y-3">
                    {employeesFunds
                      .sort((a, b) => b.availableFunds - a.availableFunds)
                      .map((emp) => (
                        <div key={emp._id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{emp.name}</p>
                              <p className="text-xs text-gray-500">{emp.employeeId}</p>
                            </div>
                            <p className="font-semibold text-green-600">₹{emp.availableFunds?.toLocaleString('en-IN') || 0}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openAddEmployeeFundModal(emp)}
                              className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            >
                              Add Funds
                            </button>
                            <button
                              onClick={() => openHistoryModal(emp)}
                              className="flex-1 px-3 py-2 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                            >
                              History
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Employee Funds Summary (Old Section - Remove this) */}
      {false && hasExpenseAccess && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Employee Funds Summary</h2>
              <p className="text-sm text-gray-600 mt-1">Available funds for each employee</p>
            </div>
            <button
              onClick={() => {
                setShowEmployeeFundsSummary(!showEmployeeFundsSummary)
                if (!showEmployeeFundsSummary && employeesFunds.length === 0) {
                  fetchAllEmployeesFunds()
                }
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              {showEmployeeFundsSummary ? (
                <>
                  <FiX className="mr-2" size={16} />
                  Hide
                </>
              ) : (
                <>
                  <FiDollarSign className="mr-2" size={16} />
                  Show All Employee Funds
                </>
              )}
            </button>
          </div>
          {showEmployeeFundsSummary && (
            <div className="p-4 sm:p-6">
              {loadingEmployeesFunds ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : employeesFunds.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No employee funds found</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Employee</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Available Funds</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeesFunds
                          .sort((a, b) => b.availableFunds - a.availableFunds)
                          .map((emp) => (
                            <tr key={emp._id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">{emp.name}</p>
                                  <p className="text-xs text-gray-500">{emp.employeeId}</p>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-bold text-green-600 text-lg">₹{emp.availableFunds.toLocaleString('en-IN')}</span>
                              </td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => openHistoryModal(emp)}
                                  className="flex items-center px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                                >
                                  <FiClock className="mr-1" size={14} />
                                  History
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden space-y-4">
                    {employeesFunds
                      .sort((a, b) => b.availableFunds - a.availableFunds)
                      .map((emp) => (
                        <div key={emp._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 text-sm">{emp.name}</p>
                              <p className="text-xs text-gray-500 mt-1">{emp.employeeId}</p>
                            </div>
                            <span className="font-bold text-green-600 text-lg">₹{emp.availableFunds.toLocaleString('en-IN')}</span>
                          </div>
                          <button
                            onClick={() => openHistoryModal(emp)}
                            className="w-full flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                          >
                            <FiClock className="mr-2" size={16} />
                            View History
                          </button>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Employee Expense Summary (Admin Only)
      {hasExpenseAccess && expenses.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-800">Employee Expense Summary</h2>
            <p className="text-sm text-gray-600 mt-1">Expense totals by employee</p>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4">Employee</th>
                    <th className="text-left py-3 px-4">Total Expenses</th>
                    <th className="text-left py-3 px-4">Pending</th>
                    <th className="text-left py-3 px-4">Approved</th>
                    <th className="text-left py-3 px-4">Paid</th>
                    <th className="text-left py-3 px-4">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(
                    expenses.reduce((acc, expense) => {
                      const empId = expense.employee?._id || expense.employee || 'unknown'
                      const empName = expense.employee?.name || 'Unknown Employee'
                      const empIdStr = expense.employee?.employeeId || 'N/A'
                      
                      if (!acc[empId]) {
                        acc[empId] = {
                          name: empName,
                          employeeId: empIdStr,
                          total: 0,
                          pending: 0,
                          approved: 0,
                          paid: 0,
                          totalAmount: 0
                        }
                      }
                      
                      acc[empId].total++
                      if (expense.status === 'pending') acc[empId].pending++
                      if (expense.status === 'approved') acc[empId].approved++
                      if (expense.status === 'paid') acc[empId].paid++
                      acc[empId].totalAmount += expense.amount || 0
                      
                      return acc
                    }, {})
                  )
                    .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
                    .map(([empId, summary]) => (
                      <tr key={empId} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{summary.name}</p>
                            <p className="text-sm text-gray-500">{summary.employeeId}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-800">{summary.total}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-yellow-600 font-semibold">{summary.pending}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-green-600 font-semibold">{summary.approved}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-blue-600 font-semibold">{summary.paid}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-purple-600">₹{summary.totalAmount.toLocaleString('en-IN')}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )} */}
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm sm:text-base"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 sm:px-4 py-2 border rounded-lg text-sm sm:text-base"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </select>
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 sm:px-4 py-2 border rounded-lg text-sm sm:text-base"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Expenses List - Only show in Expenses Requests tab */}
      {activeTab === 'expenses' && (
        <>
          {/* Expenses List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            Expenses ({filteredExpenses.length})
          </h2>
        </div>
        
        <div className="p-4 sm:p-6">
          {loading ? (
            <p className="text-center text-gray-600 py-8">Loading...</p>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <FiCreditCard className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">No expenses found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Expense ID</th>
                      {hasExpenseAccess && <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Employee</th>}
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Category</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Description</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((expense) => (
                      <tr key={expense._id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900 text-sm">{expense.expenseId}</td>
                        {hasExpenseAccess && (
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{expense.employee?.name}</p>
                              <p className="text-xs text-gray-500">{expense.employee?.employeeId}</p>
                            </div>
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 capitalize">
                            {expense.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-sm">{expense.description}</td>
                        <td className="py-3 px-4 font-semibold text-gray-900 text-sm">
                          ₹{expense.amount?.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {new Date(expense.expenseDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(expense.status)}`}>
                            {expense.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewModal(expense)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              title="View Details"
                            >
                              <FiEye size={16} />
                            </button>
                            
                            {hasExpenseAccess && expense.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => openApprovalModal(expense)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded"
                                  title="Approve"
                                >
                                  <FiCheck size={16} />
                                </button>
                                <button
                                  onClick={() => handleReject(expense._id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                                  title="Reject"
                                >
                                  <FiX size={16} />
                                </button>
                              </>
                            )}
                            
                            {hasExpenseAccess && expense.status === 'approved' && expense.paymentStatus === 'unpaid' && (
                              <button
                                onClick={() => openPaymentModal(expense)}
                                className="px-3 py-1 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Pay
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-4">
                {filteredExpenses.map((expense) => (
                  <div key={expense._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{expense.expenseId}</p>
                        {hasExpenseAccess && (
                          <p className="text-xs text-gray-600 mt-1">
                            {expense.employee?.name} ({expense.employee?.employeeId})
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(expense.status)}`}>
                        {expense.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Category:</span>
                        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 capitalize">
                          {expense.category}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Amount:</span>
                        <span className="font-semibold text-gray-900">₹{expense.amount?.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Date:</span>
                        <span className="text-sm text-gray-900">{new Date(expense.expenseDate).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600 block mb-1">Description:</span>
                        <p className="text-sm text-gray-900">{expense.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => setViewModal(expense)}
                        className="flex-1 flex items-center justify-center px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm"
                      >
                        <FiEye className="mr-1" size={16} />
                        View
                      </button>
                      
                      {hasExpenseAccess && expense.status === 'pending' && (
                        <>
                          <button
                            onClick={() => openApprovalModal(expense)}
                            className="flex-1 flex items-center justify-center px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg text-sm"
                          >
                            <FiCheck className="mr-1" size={16} />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(expense._id)}
                            className="flex-1 flex items-center justify-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                          >
                            <FiX className="mr-1" size={16} />
                            Reject
                          </button>
                        </>
                      )}
                      
                      {hasExpenseAccess && expense.status === 'approved' && expense.paymentStatus === 'unpaid' && (
                        <button
                          onClick={() => openPaymentModal(expense)}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Pay
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
        </>
      )}
      
      {/* Submit Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto mobile-modal">
            <div className="p-4 sm:p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Submit New Expense</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Enter amount"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                  placeholder="Describe the expense..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expense Date
                </label>
                <input
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Receipts/Bills
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    multiple
                    accept="image/*,.pdf"
                    className="hidden"
                    id="expense-docs"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="expense-docs"
                    className="flex flex-col items-center cursor-pointer"
                  >
                    <FiUpload className="text-gray-400 mb-2" size={32} />
                    <p className="text-sm text-gray-600">
                      {uploading ? 'Uploading...' : 'Click to upload documents'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF (Max 5 files)</p>
                  </label>
                </div>
                
                {formData.documents.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {formData.documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700 flex items-center">
                          <FiFileText className="mr-2" />
                          Document {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            documents: formData.documents.filter((_, i) => i !== idx)
                          })}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="2"
                  placeholder="Additional notes..."
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || uploading}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* View Details Modal */}
      {viewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto mobile-modal">
            <div className="p-4 sm:p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Expense Details</h2>
              <button onClick={() => setViewModal(null)} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Expense ID</p>
                  <p className="font-semibold text-gray-900">{viewModal.expenseId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-block px-3 py-1 text-sm rounded-full ${getStatusBadge(viewModal.status)}`}>
                    {viewModal.status}
                  </span>
                </div>
                {hasExpenseAccess && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600 mb-1">Employee</p>
                    <p className="font-medium text-gray-900">{viewModal.employee?.name}</p>
                    <p className="text-sm text-gray-500">{viewModal.employee?.employeeId}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="font-medium text-gray-900 capitalize">{viewModal.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="text-xl font-bold text-green-600">₹{viewModal.amount?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Expense Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(viewModal.expenseDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Description</p>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{viewModal.description}</p>
              </div>
              
              {viewModal.documents && viewModal.documents.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Attachments ({viewModal.documents.length})</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {viewModal.documents.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <FiFileText className="mr-2 text-gray-600" />
                        <span className="text-sm text-blue-600">Document {idx + 1}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {viewModal.notes && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Notes</p>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{viewModal.notes}</p>
                </div>
              )}
              
              {/* Bank Details for Payment Processing (Admin Only) */}
              {hasExpenseAccess && viewModal.employee?.bankDetails?.accountNumber && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm font-semibold text-gray-800 mb-3">💳 Payment Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                    <div>
                      <p className="text-gray-600">Account Holder</p>
                      <p className="font-semibold text-gray-900">{viewModal.employee.bankDetails.accountHolderName || viewModal.employee.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Bank Name</p>
                      <p className="font-semibold text-gray-900">{viewModal.employee.bankDetails.bankName}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Account Number</p>
                      <p className="font-mono font-bold text-gray-900">{viewModal.employee.bankDetails.accountNumber}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">IFSC Code</p>
                      <p className="font-mono font-semibold text-gray-900">{viewModal.employee.bankDetails.ifscCode}</p>
                    </div>
                    {viewModal.employee.bankDetails.branch && (
                      <div>
                        <p className="text-gray-600">Branch</p>
                        <p className="font-medium text-gray-900">{viewModal.employee.bankDetails.branch}</p>
                      </div>
                    )}
                    {viewModal.employee.bankDetails.upiId && (
                      <div>
                        <p className="text-gray-600">UPI ID</p>
                        <p className="font-mono font-semibold text-blue-700">{viewModal.employee.bankDetails.upiId}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {viewModal.status === 'rejected' && viewModal.rejectionReason && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-700">{viewModal.rejectionReason}</p>
                </div>
              )}
              
              {viewModal.status === 'paid' && (
                <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                  <p className="text-xs sm:text-sm font-medium text-green-800 mb-2">Payment Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div>
                      <span className="text-green-700">Paid Amount:</span>
                      <span className="font-semibold ml-2">₹{viewModal.paidAmount?.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-green-700">Payment Date:</span>
                      <span className="ml-2">{new Date(viewModal.paymentDate).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-green-700">Mode:</span>
                      <span className="ml-2 capitalize">{viewModal.paymentMode}</span>
                    </div>
                    {viewModal.transactionReference && (
                      <div>
                        <span className="text-green-700">Reference:</span>
                        <span className="ml-2">{viewModal.transactionReference}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Approval Modal */}
      {approvalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg mobile-modal">
            <div className="p-4 sm:p-6 border-b">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Approve Expense</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Expense ID: {approvalModal.expenseId} - {approvalModal.employee?.name}
              </p>
            </div>
            
            <form onSubmit={handleApprove} className="p-4 sm:p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Category:</strong> {approvalModal.category} • 
                  <strong> Date:</strong> {new Date(approvalModal.expenseDate).toLocaleDateString()} • 
                  <strong> Docs:</strong> {approvalModal.documents?.length || 0} file(s)
                </p>
                <p className="text-sm text-blue-900 mt-1">
                  <strong>Description:</strong> {approvalModal.description}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approved Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={approvalData.amount}
                  onChange={(e) => setApprovalData({ ...approvalData, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter approved amount after reviewing receipts"
                  min="0"
                  step="0.01"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Requested amount: ₹{approvalModal.amount?.toLocaleString() || 0}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Remarks
                </label>
                <textarea
                  value={approvalData.remarks}
                  onChange={(e) => setApprovalData({ ...approvalData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="Any notes or conditions..."
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setApprovalModal(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Approve Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg mobile-modal">
            <div className="p-4 sm:p-6 border-b">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Process Payment</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Expense ID: {paymentModal.expenseId} - {paymentModal.employee?.name}
              </p>
            </div>
            
            <form onSubmit={handlePay} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount to pay"
                  min="0"
                  step="0.01"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Requested amount: ₹{paymentModal.amount?.toLocaleString() || 0}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentData.paymentMode}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMode: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Reference
                </label>
                <input
                  type="text"
                  value={paymentData.transactionReference}
                  onChange={(e) => setPaymentData({ ...paymentData, transactionReference: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="UTR/Transaction ID (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Remarks
                </label>
                <textarea
                  value={paymentData.remarks}
                  onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="Any notes about the payment..."
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setPaymentModal(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Process Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Add Funds Modal */}
      {showFundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg mobile-modal">
            <div className="p-4 sm:p-6 border-b flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Add Funds</h2>
              <button onClick={() => setShowFundModal(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddFunds} className="p-4 sm:p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <strong>Current Balance:</strong> ₹{availableFunds.toLocaleString('en-IN')}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={fundData.amount}
                  onChange={(e) => setFundData({ ...fundData, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Enter amount to add"
                  min="0"
                  step="0.01"
                  required
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode <span className="text-red-500">*</span>
                </label>
                <select
                  value={fundData.paymentMode}
                  onChange={(e) => setFundData({ ...fundData, paymentMode: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Reference
                </label>
                <input
                  type="text"
                  value={fundData.transactionReference}
                  onChange={(e) => setFundData({ ...fundData, transactionReference: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="UTR/Transaction ID (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for addition
                  <span className="text-red-500">*</span></label>
                <textarea
                  value={fundData.remarks}
                  onChange={(e) => setFundData({ ...fundData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  rows="2"
                  placeholder="Any notes about this fund addition..."
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFundModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Add Funds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Funds Modal */}
      {showEditFundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg mobile-modal">
            <div className="p-4 sm:p-6 border-b flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Edit/Adjust Funds</h2>
              <button onClick={() => setShowEditFundModal(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={handleEditFunds} className="p-4 sm:p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Current Balance:</strong> ₹{availableFunds.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Enter the new total amount you want to set. The system will automatically calculate the difference.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Total Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={editFundData.amount}
                  onChange={(e) => setEditFundData({ ...editFundData, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new total amount"
                  min="0"
                  step="0.01"
                  required
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode <span className="text-red-500">*</span>
                </label>
                <select
                  value={editFundData.paymentMode}
                  onChange={(e) => setEditFundData({ ...editFundData, paymentMode: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Reference
                </label>
                <input
                  type="text"
                  value={editFundData.transactionReference}
                  onChange={(e) => setEditFundData({ ...editFundData, transactionReference: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="UTR/Transaction ID (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </label>
                <textarea
                  value={editFundData.remarks}
                  onChange={(e) => setEditFundData({ ...editFundData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="Reason for adjustment..."
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditFundModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Update Funds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Fund History Modal */}
      {showFundHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto mobile-modal">
            <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sticky top-0 bg-white">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Fund Transaction History</h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Complete log of all fund transactions</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    fetchFundHistory()
                    fetchFunds()
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                  title="Refresh"
                >
                  <FiRefreshCw size={20} />
                </button>
                <button onClick={() => setShowFundHistory(false)} className="text-gray-500 hover:text-gray-700">
                  <FiX size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              {fundHistory.length === 0 ? (
                <div className="text-center py-12">
                  <FiClock className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-600">No transaction history found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fundHistory.map((transaction, idx) => (
                    <div
                      key={idx}
                      className={`border-l-4 rounded-lg p-4 ${
                        transaction.transactionType === 'credit'
                          ? 'border-green-500 bg-green-50'
                          : 'border-red-500 bg-red-50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded ${
                                transaction.transactionType === 'credit'
                                  ? 'bg-green-200 text-green-800'
                                  : 'bg-red-200 text-red-800'
                              }`}
                            >
                              {transaction.transactionType === 'credit' ? 'CREDIT' : 'DEBIT'}
                            </span>
                            <span className="text-xs sm:text-sm text-gray-600">
                              {new Date(transaction.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="font-semibold text-sm sm:text-base text-gray-900 mb-1">{transaction.description}</p>
                          {transaction.referenceType === 'expense' && transaction.referenceId && (
                            <p className="text-xs text-gray-600 mb-1">
                              Expense: {typeof transaction.referenceId === 'object' && transaction.referenceId.expenseId 
                                ? transaction.referenceId.expenseId 
                                : transaction.referenceId || 'N/A'}
                            </p>
                          )}
                          {transaction.performedBy && (
                            <p className="text-xs text-gray-500">
                              By: {transaction.performedBy.name || 'System'}
                            </p>
                          )}
                          {transaction.remarks && (
                            <p className="text-xs text-gray-600 mt-1 italic">{transaction.remarks}</p>
                          )}
                          {transaction.transactionReference && (
                            <p className="text-xs text-gray-500 mt-1">
                              Ref: {transaction.transactionReference}
                            </p>
                          )}
                        </div>
                        <div className="text-left sm:text-right flex flex-col sm:flex-row sm:items-end gap-2">
                          <div>
                            <p
                              className={`text-base sm:text-lg font-bold ${
                                transaction.transactionType === 'credit' ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {transaction.transactionType === 'credit' ? '+' : '-'}₹
                              {transaction.amount.toLocaleString('en-IN')}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              Balance: ₹{transaction.balanceAfter.toLocaleString('en-IN')}
                            </p>
                          </div>
                          {transaction.referenceType !== 'expense' && hasExpenseAccess && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setEditingTransaction({ ...transaction, type: 'company' })
                                  setEditTransactionData({
                                    amount: transaction.amount.toString(),
                                    paymentMode: transaction.paymentMode || 'bank_transfer',
                                    transactionReference: transaction.transactionReference || '',
                                    remarks: transaction.remarks || ''
                                  })
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                                title="Edit transaction"
                              >
                                <FiEdit size={16} />
                              </button>
                              <button
                                onClick={async () => {
                                  if (window.confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
                                    try {
                                      await API.funds.deleteTransaction(transaction._id)
                                      toast.success('Transaction deleted successfully')
                                      fetchFundHistory()
                                      fetchFunds()
                                    } catch (error) {
                                      toast.error(error.response?.data?.message || 'Failed to delete transaction')
                                    }
                                  }
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                                title="Delete transaction"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg mobile-modal">
            <div className="p-4 sm:p-6 border-b flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Edit Transaction</h2>
              <button onClick={() => setEditingTransaction(null)} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault()
              
              const amount = Number(editTransactionData.amount)
              if (!amount || amount <= 0) {
                toast.error('Please enter a valid amount')
                return
              }
              
              try {
                // Delete the old transaction
                if (editingTransaction.type === 'company') {
                  await API.funds.deleteTransaction(editingTransaction._id)
                  // Create new transaction with updated data
                  if (editingTransaction.transactionType === 'credit') {
                    await API.funds.addFunds({
                      amount,
                      paymentMode: editTransactionData.paymentMode,
                      transactionReference: editTransactionData.transactionReference,
                      remarks: editTransactionData.remarks || `Edited transaction - originally: ${editingTransaction.description}`
                    })
                  } else {
                    await API.funds.deductFunds({
                      amount,
                      paymentMode: editTransactionData.paymentMode,
                      transactionReference: editTransactionData.transactionReference,
                      remarks: editTransactionData.remarks || `Edited transaction - originally: ${editingTransaction.description}`
                    })
                  }
                  fetchFundHistory()
                  fetchFunds()
                } else {
                  // For employee funds, delete old and recreate
                  await API.funds.deleteEmployeeTransaction(editingTransaction.employeeId, editingTransaction._id)
                  
                  // Recreate transaction with updated data
                  // For credits, use addEmployeeFunds; for debits, we need to manually adjust
                  if (editingTransaction.transactionType === 'credit') {
                    await API.funds.addEmployeeFunds(editingTransaction.employeeId, {
                      amount,
                      paymentMode: editTransactionData.paymentMode,
                      transactionReference: editTransactionData.transactionReference,
                      remarks: editTransactionData.remarks || `Edited transaction - originally: ${editingTransaction.description}`
                    })
                  } else {
                    // For debits, we need to manually adjust the balance
                    // Get current funds first
                    const currentFunds = await API.funds.getEmployeeFunds(editingTransaction.employeeId)
                    const currentBalance = currentFunds.data.data.availableFunds
                    const originalAmount = editingTransaction.amount
                    const newAmount = amount
                    const difference = originalAmount - newAmount // How much to add back
                    
                    // Add the difference back (since we deleted the debit)
                    if (difference !== 0) {
                      await API.funds.addEmployeeFunds(editingTransaction.employeeId, {
                        amount: difference,
                        paymentMode: editTransactionData.paymentMode,
                        transactionReference: editTransactionData.transactionReference,
                        remarks: editTransactionData.remarks || `Edited debit transaction - adjusted by ₹${difference.toLocaleString('en-IN')}`
                      })
                    }
                  }
                  
                  const response = await API.funds.getEmployeeFundHistory(editingTransaction.employeeId, { limit: 100 })
                  setEmployeeFundHistory(response.data.data || [])
                  fetchAllEmployeesFunds()
                }
                
                toast.success('Transaction updated successfully')
                setEditingTransaction(null)
                setEditTransactionData({
                  amount: '',
                  paymentMode: 'bank_transfer',
                  transactionReference: '',
                  remarks: ''
                })
              } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to update transaction')
              }
            }} className="p-4 sm:p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Transaction Type:</strong> {editingTransaction.transactionType === 'credit' ? 'Credit' : 'Debit'}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Original Amount: ₹{editingTransaction.amount?.toLocaleString('en-IN')}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={editTransactionData.amount}
                  onChange={(e) => setEditTransactionData({ ...editTransactionData, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                  required
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode <span className="text-red-500">*</span>
                </label>
                <select
                  value={editTransactionData.paymentMode}
                  onChange={(e) => setEditTransactionData({ ...editTransactionData, paymentMode: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Reference
                </label>
                <input
                  type="text"
                  value={editTransactionData.transactionReference}
                  onChange={(e) => setEditTransactionData({ ...editTransactionData, transactionReference: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="UTR/Transaction ID (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </label>
                <textarea
                  value={editTransactionData.remarks}
                  onChange={(e) => setEditTransactionData({ ...editTransactionData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="Transaction remarks..."
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Update Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Fund History Modal */}
      {showHistoryModal && selectedEmployeeHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto mobile-modal">
            <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sticky top-0 bg-white">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Fund Transaction History</h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {selectedEmployeeHistory.name} ({selectedEmployeeHistory.employeeId})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    fetchEmployeeFundHistory(selectedEmployeeHistory._id)
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                  title="Refresh"
                >
                  <FiRefreshCw size={20} />
                </button>
                <button onClick={() => setShowHistoryModal(false)} className="text-gray-500 hover:text-gray-700">
                  <FiX size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              {employeeFundHistory.length === 0 ? (
                <div className="text-center py-12">
                  <FiClock className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-600">No transaction history found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {employeeFundHistory.map((transaction, idx) => (
                    <div
                      key={idx}
                      className={`border-l-4 rounded-lg p-3 sm:p-4 ${
                        transaction.transactionType === 'credit'
                          ? 'border-green-500 bg-green-50'
                          : 'border-red-500 bg-red-50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded ${
                                transaction.transactionType === 'credit'
                                  ? 'bg-green-200 text-green-800'
                                  : 'bg-red-200 text-red-800'
                              }`}
                            >
                              {transaction.transactionType === 'credit' ? 'CREDIT' : 'DEBIT'}
                            </span>
                            <span className="text-xs sm:text-sm text-gray-600">
                              {new Date(transaction.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="font-semibold text-sm sm:text-base text-gray-900 mb-1">{transaction.description}</p>
                          {transaction.referenceType === 'expense' && transaction.referenceId && (
                            <p className="text-xs text-gray-600 mb-1">
                              Expense: {typeof transaction.referenceId === 'object' && transaction.referenceId.expenseId 
                                ? transaction.referenceId.expenseId 
                                : transaction.referenceId || 'N/A'}
                            </p>
                          )}
                          {transaction.performedBy && (
                            <p className="text-xs text-gray-500">
                              By: {transaction.performedBy.name || 'System'}
                            </p>
                          )}
                          {transaction.remarks && (
                            <p className="text-xs text-gray-600 mt-1 italic">{transaction.remarks}</p>
                          )}
                          {transaction.transactionReference && (
                            <p className="text-xs text-gray-500 mt-1">
                              Ref: {transaction.transactionReference}
                            </p>
                          )}
                        </div>
                        <div className="text-left sm:text-right flex flex-col sm:flex-row sm:items-end gap-2">
                          <div>
                            <p
                              className={`text-base sm:text-lg font-bold ${
                                transaction.transactionType === 'credit' ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {transaction.transactionType === 'credit' ? '+' : '-'}₹{transaction.amount?.toLocaleString('en-IN')}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Balance: ₹{transaction.balanceAfter?.toLocaleString('en-IN')}
                            </p>
                          </div>
                          {transaction.referenceType !== 'expense' && hasExpenseAccess && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setEditingTransaction({ ...transaction, type: 'employee', employeeId: selectedEmployeeHistory._id })
                                  setEditTransactionData({
                                    amount: transaction.amount.toString(),
                                    paymentMode: transaction.paymentMode || 'bank_transfer',
                                    transactionReference: transaction.transactionReference || '',
                                    remarks: transaction.remarks || ''
                                  })
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                                title="Edit transaction"
                              >
                                <FiEdit size={16} />
                              </button>
                              <button
                                onClick={async () => {
                                  if (window.confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
                                    try {
                                      await API.funds.deleteEmployeeTransaction(selectedEmployeeHistory._id, transaction._id)
                                      toast.success('Transaction deleted successfully')
                                      const response = await API.funds.getEmployeeFundHistory(selectedEmployeeHistory._id, { limit: 100 })
                                      setEmployeeFundHistory(response.data.data || [])
                                      fetchAllEmployeesFunds()
                                    } catch (error) {
                                      toast.error(error.response?.data?.message || 'Failed to delete transaction')
                                    }
                                  }
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                                title="Delete transaction"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Expenses
