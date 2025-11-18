import { useState, useEffect } from 'react'
import { FiCreditCard, FiPlus, FiX, FiFileText, FiUpload, FiEye, FiTrash2, FiDollarSign, FiClock, FiRefreshCw, FiCheck } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'

function MyExpenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [viewModal, setViewModal] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    category: 'petrol',
    description: '',
    amount: 0, // Set to 0, admin will determine actual amount
    expenseDate: new Date().toISOString().split('T')[0],
    documents: [],
    notes: ''
  })
  
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    paid: 0,
    totalAmount: 0
  })
  const [availableFunds, setAvailableFunds] = useState(0)
  const [fundHistory, setFundHistory] = useState([])
  const [showFundHistory, setShowFundHistory] = useState(false)
  const [showFundModal, setShowFundModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [selectedExpenseForPayment, setSelectedExpenseForPayment] = useState(null)
  const [showDirectPayModal, setShowDirectPayModal] = useState(false) // Direct pay modal (create and pay)
  const [fundData, setFundData] = useState({
    amount: '',
    paymentMode: 'bank_transfer',
    transactionReference: '',
    remarks: ''
  })
  const [paymentData, setPaymentData] = useState({
    paymentMode: 'bank_transfer',
    transactionReference: '',
    remarks: ''
  })
  const [directPayData, setDirectPayData] = useState({ // Direct pay form data
    category: 'petrol',
    description: '',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMode: 'bank_transfer',
    transactionReference: '',
    remarks: '',
    notes: ''
  })
  
  const categories = [
    { value: 'petrol', label: '⛽ Petrol/Fuel' },
    { value: 'travel', label: '✈️ Travel' },
    { value: 'food', label: '🍽️ Food & Refreshments' },
    { value: 'accommodation', label: '🏨 Accommodation' },
    { value: 'materials', label: '📦 Materials' },
    { value: 'tools', label: '🔧 Tools & Equipment' },
    { value: 'medical', label: '💊 Medical' },
    { value: 'communication', label: '📞 Communication' },
    { value: 'other', label: '📝 Other' }
  ]
  
  useEffect(() => {
    fetchExpenses()
    fetchFunds()
  }, [])

  // Listen for refresh event from Header
  useEffect(() => {
    const handleRefresh = () => {
      fetchExpenses()
      fetchFunds()
    }

    window.addEventListener('app-refresh', handleRefresh)
    return () => window.removeEventListener('app-refresh', handleRefresh)
  }, [])
  
  const fetchExpenses = async () => {
    try {
      setLoading(true)
      const response = await API.expenses.getMyExpenses()
      const data = response.data.data || []
      setExpenses(data)
      
      // Calculate stats
      setStats({
        total: data.length,
        pending: data.filter(e => e.status === 'pending').length,
        approved: data.filter(e => e.status === 'approved').length,
        rejected: data.filter(e => e.status === 'rejected').length,
        paid: data.filter(e => e.status === 'paid').length,
        totalAmount: data.reduce((sum, e) => sum + (e.amount || 0), 0)
      })
    } catch (error) {
      console.error('Error fetching expenses:', error)
      toast.error('Failed to fetch expenses')
    } finally {
      setLoading(false)
    }
  }

  const fetchFunds = async () => {
    try {
      const response = await API.funds.getMyFunds()
      setAvailableFunds(response.data.data.availableFunds || 0)
    } catch (error) {
      console.error('Error fetching funds:', error)
    }
  }

  const fetchFundHistory = async () => {
    try {
      const response = await API.funds.getMyFundHistory({ limit: 100 })
      setFundHistory(response.data.data || [])
    } catch (error) {
      console.error('Error fetching fund history:', error)
      toast.error('Failed to load fund history')
    }
  }

  const handleAddFunds = async (e) => {
    e.preventDefault()
    
    const amount = Number(fundData.amount)
    
    if (!amount || amount <= 0 || isNaN(amount)) {
      toast.error('Please enter a valid amount')
      return
    }
    
    try {
      const response = await API.funds.addMyFunds({
        ...fundData,
        amount: amount
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

  const handlePayExpense = async (e) => {
    e.preventDefault()
    
    if (!selectedExpenseForPayment) {
      toast.error('No expense selected')
      return
    }
    
    if (Number(availableFunds) < Number(selectedExpenseForPayment.amount)) {
      toast.error(`Insufficient funds. Available: ₹${availableFunds.toLocaleString('en-IN')}, Required: ₹${selectedExpenseForPayment.amount.toLocaleString('en-IN')}`)
      return
    }
    
    try {
      const response = await API.expenses.payFromOwnFunds(selectedExpenseForPayment._id, {
        paymentMode: paymentData.paymentMode,
        transactionReference: paymentData.transactionReference,
        remarks: paymentData.remarks
      })
      toast.success(response.data.message || 'Expense paid successfully')
      setShowPayModal(false)
      setSelectedExpenseForPayment(null)
      setPaymentData({
        paymentMode: 'bank_transfer',
        transactionReference: '',
        remarks: ''
      })
      fetchExpenses()
      fetchFunds()
      fetchFundHistory()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to pay expense')
    }
  }

  const openPayModal = (expense) => {
    if (Number(availableFunds) < Number(expense.amount)) {
      toast.error(`Insufficient funds. Available: ₹${availableFunds.toLocaleString('en-IN')}, Required: ₹${expense.amount.toLocaleString('en-IN')}`)
      return
    }
    setSelectedExpenseForPayment(expense)
    setPaymentData({
      paymentMode: 'bank_transfer',
      transactionReference: '',
      remarks: ''
    })
    setShowPayModal(true)
  }

  const handleDirectPay = async (e) => {
    e.preventDefault()
    
    const amount = Number(directPayData.amount)
    
    if (!amount || amount <= 0 || isNaN(amount)) {
      toast.error('Please enter a valid amount')
      return
    }
    
    if (!directPayData.description.trim()) {
      toast.error('Please enter a reason/description')
      return
    }
    
    if (Number(availableFunds) < amount) {
      toast.error(`Insufficient funds. Available: ₹${availableFunds.toLocaleString('en-IN')}, Required: ₹${amount.toLocaleString('en-IN')}`)
      return
    }
    
    try {
      const response = await API.expenses.createAndPayDirect({
        category: directPayData.category,
        description: directPayData.description,
        amount: amount,
        expenseDate: directPayData.expenseDate,
        paymentMode: directPayData.paymentMode,
        transactionReference: directPayData.transactionReference,
        remarks: directPayData.remarks,
        notes: directPayData.notes
      })
      toast.success(response.data.message || 'Expense paid successfully')
      setShowDirectPayModal(false)
      setDirectPayData({
        category: 'petrol',
        description: '',
        amount: '',
        expenseDate: new Date().toISOString().split('T')[0],
        paymentMode: 'bank_transfer',
        transactionReference: '',
        remarks: '',
        notes: ''
      })
      fetchExpenses()
      fetchFunds()
      fetchFundHistory()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to pay expense')
    }
  }

  const openDirectPayModal = () => {
    setDirectPayData({
      category: 'petrol',
      description: '',
      amount: '',
      expenseDate: new Date().toISOString().split('T')[0],
      paymentMode: 'bank_transfer',
      transactionReference: '',
      remarks: '',
      notes: ''
    })
    setShowDirectPayModal(true)
  }
  
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    
    if (files.length > 5) {
      toast.error('Maximum 5 files allowed')
      return
    }
    
    try {
      setUploading(true)
      const uploadFormData = new FormData()
      files.forEach(file => uploadFormData.append('files', file))
      
      const response = await API.expenses.uploadDocuments(uploadFormData)
      const uploadedUrls = response.data.data || [] // Now just an array of URLs
      
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, ...uploadedUrls]
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
    
    if (!formData.description) {
      toast.error('Please fill in description')
      return
    }
    
    if (formData.documents.length === 0) {
      const confirm = window.confirm('No documents attached. Continue without receipts?')
      if (!confirm) return
    }
    
    try {
      setLoading(true)
      
      // Ensure documents is an array, not a string
      const submitData = {
        ...formData,
        documents: Array.isArray(formData.documents) ? formData.documents : []
      }
      
      console.log('Submitting expense:', submitData)
      
      await API.expenses.create(submitData)
      toast.success('Expense submitted successfully! 🎉')
      setShowModal(false)
      resetForm()
      fetchExpenses()
    } catch (error) {
      console.error('Submit error:', error)
      toast.error(error.response?.data?.message || 'Failed to submit expense')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDelete = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return
    
    try {
      await API.expenses.delete(expenseId)
      toast.success('Expense deleted')
      fetchExpenses()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete expense')
    }
  }
  
  const resetForm = () => {
    setFormData({
      category: 'petrol',
      description: '',
      amount: 0, // Set to 0, admin will determine actual amount
      expenseDate: new Date().toISOString().split('T')[0],
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

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Expenses</h1>
          <p className="text-sm text-gray-600 mt-1">Submit and track your expense claims</p>
        </div>
            <div className="flex gap-2">
              <button
                onClick={openDirectPayModal}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <FiCheck className="mr-2" />
                Pay Expense
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
              >
                <FiPlus className="mr-2" />
                Submit Expense
              </button>
            </div>
      </div>
      
      {/* Available Funds Box */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-lg p-4 sm:p-6 mb-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs sm:text-sm opacity-90 mb-1">My Available Funds</p>
            <p className="text-3xl sm:text-4xl font-bold">₹{availableFunds.toLocaleString('en-IN')}</p>
            <p className="text-xs opacity-75 mt-1">Your personal expense fund balance</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => {
                setShowFundHistory(true)
                fetchFundHistory()
              }}
              className="flex items-center justify-center px-3 sm:px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition text-sm sm:text-base"
            >
              <FiClock className="mr-2" size={16} />
              History
            </button>
            <button
              onClick={() => setShowFundModal(true)}
              className="flex items-center justify-center px-3 sm:px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-gray-100 font-semibold transition text-sm sm:text-base"
            >
              <FiPlus className="mr-2" size={16} />
              Add Funds
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Approved</p>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Paid</p>
          <p className="text-2xl font-bold text-blue-600">{stats.paid}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Amount</p>
          <p className="text-lg font-bold text-purple-600">₹{stats.totalAmount.toLocaleString()}</p>
        </div>
      </div>
      
      {/* Expenses List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            My Expense Claims ({expenses.length})
          </h2>
        </div>
        
        <div className="p-6">
          {loading ? (
            <p className="text-center text-gray-600 py-8">Loading...</p>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12">
              <FiCreditCard className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 mb-4">No expenses submitted yet</p>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
              >
                Submit Your First Expense
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4">Expense ID</th>
                      <th className="text-left py-3 px-4">Category</th>
                      <th className="text-left py-3 px-4">Description</th>
                      <th className="text-left py-3 px-4">Amount</th>
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense._id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{expense.expenseId}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 capitalize">
                            {expense.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate">{expense.description}</td>
                        <td className="py-3 px-4 font-semibold text-gray-900">
                          ₹{expense.amount?.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
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
                            {expense.status === 'approved' && expense.paymentStatus !== 'paid' && (
                              <button
                                onClick={() => openPayModal(expense)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded"
                                title="Pay from My Funds"
                              >
                                <FiCheck size={16} />
                              </button>
                            )}
                            {expense.status === 'pending' && (
                              <button
                                onClick={() => handleDelete(expense._id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <FiTrash2 size={16} />
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
              <div className="md:hidden space-y-4">
                {expenses.map((expense) => (
                  <div key={expense._id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">{expense.expenseId}</p>
                        <p className="text-sm text-gray-600 capitalize">{expense.category}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(expense.status)}`}>
                        {expense.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">{expense.description}</p>
                    
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-lg font-bold text-green-600">₹{expense.amount?.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(expense.expenseDate).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewModal(expense)}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-500 text-white rounded-lg text-sm"
                      >
                        <FiEye className="mr-2" size={14} />
                        View
                      </button>
                      {expense.status === 'approved' && expense.paymentStatus !== 'paid' && (
                        <button
                          onClick={() => openPayModal(expense)}
                          className="flex-1 flex items-center justify-center px-3 py-2 bg-green-500 text-white rounded-lg text-sm"
                        >
                          <FiCheck className="mr-2" size={14} />
                          Pay
                        </button>
                      )}
                      {expense.status === 'pending' && (
                        <button
                          onClick={() => handleDelete(expense._id)}
                          className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm"
                        >
                          <FiTrash2 size={14} />
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
      
      {/* Submit Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-800">Submit New Expense</h2>
              <button 
                onClick={() => { setShowModal(false); resetForm(); }} 
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (₹)
                  </label>
                  <input
                    type="text"
                    value="Admin will verify from receipts"
                    className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                    disabled
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Admin will determine the approved amount based on your submitted receipts
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Describe the expense in detail..."
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Receipts/Bills
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
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
                    <p className="text-sm text-gray-600 font-medium">
                      {uploading ? 'Uploading...' : 'Click to upload documents'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF (Max 5 files)</p>
                  </label>
                </div>
                
                {formData.documents.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Uploaded Documents ({formData.documents.length})</p>
                    {formData.documents.map((url, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-200">
                        <span className="text-sm text-gray-700 flex items-center">
                          <FiFileText className="mr-2 text-blue-600" />
                          Document {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            documents: formData.documents.filter((_, i) => i !== idx)
                          })}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
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
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="Any additional information..."
                />
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Please ensure you upload valid receipts/bills for your expense claim. 
                  Expenses without proper documentation may be rejected.
                </p>
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
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-800">Expense Details</h2>
              <button onClick={() => setViewModal(null)} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="font-medium text-gray-900 capitalize">{viewModal.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="text-xl font-bold text-green-600">₹{viewModal.amount?.toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Expense Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(viewModal.expenseDate).toLocaleDateString('en-IN', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Description</p>
                <p className="text-gray-900 bg-gray-50 p-4 rounded-lg border">{viewModal.description}</p>
              </div>
              
              {viewModal.notes && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Additional Notes</p>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg border">{viewModal.notes}</p>
                </div>
              )}
              
              {viewModal.documents && viewModal.documents.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-3">Uploaded Documents ({viewModal.documents.length})</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {viewModal.documents.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center p-4 border-2 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors"
                      >
                        <FiFileText className="mr-3 text-blue-600" size={24} />
                        <div>
                          <p className="text-sm font-medium text-blue-600">Document {idx + 1}</p>
                          <p className="text-xs text-gray-500">Click to view</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {viewModal.status === 'rejected' && viewModal.rejectionReason && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-2">❌ Rejection Reason</p>
                  <p className="text-sm text-red-700">{viewModal.rejectionReason}</p>
                </div>
              )}
              
              {viewModal.status === 'approved' && viewModal.paymentStatus === 'unpaid' && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <p className="text-sm font-medium text-green-800">✅ Expense Approved</p>
                  <p className="text-sm text-green-700 mt-1">Payment is being processed...</p>
                </div>
              )}
              
              {viewModal.status === 'paid' && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-3">💰 Payment Details</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-blue-700">Paid Amount:</span>
                      <span className="font-semibold ml-2">₹{viewModal.paidAmount?.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Payment Date:</span>
                      <span className="ml-2">{new Date(viewModal.paymentDate).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Payment Mode:</span>
                      <span className="ml-2 capitalize">{viewModal.paymentMode}</span>
                    </div>
                    {viewModal.transactionReference && (
                      <div className="col-span-2">
                        <span className="text-blue-700">Transaction Reference:</span>
                        <span className="ml-2 font-mono text-xs">{viewModal.transactionReference}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {viewModal.remarks && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <p className="text-sm font-medium text-gray-800 mb-1">Admin Remarks</p>
                  <p className="text-sm text-gray-700">{viewModal.remarks}</p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setViewModal(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fund History Modal */}
      {showFundHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Fund Transaction History</h2>
                <p className="text-sm text-gray-600 mt-1">Complete log of all fund transactions</p>
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
            
            <div className="p-6">
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
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded ${
                                transaction.transactionType === 'credit'
                                  ? 'bg-green-200 text-green-800'
                                  : 'bg-red-200 text-red-800'
                              }`}
                            >
                              {transaction.transactionType === 'credit' ? 'CREDIT' : 'DEBIT'}
                            </span>
                            <span className="text-sm text-gray-600">
                              {new Date(transaction.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="font-semibold text-gray-900 mb-1">{transaction.description}</p>
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
                        <div className="text-right">
                          <p
                            className={`text-lg font-bold ${
                              transaction.transactionType === 'credit' ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {transaction.transactionType === 'credit' ? '+' : '-'}₹{transaction.amount?.toLocaleString('en-IN')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Balance: ₹{transaction.balanceAfter?.toLocaleString('en-IN')}
                          </p>
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

      {/* Pay Expense Modal */}
      {showPayModal && selectedExpenseForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-lg my-4 max-h-[95vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sticky top-0 bg-white z-10">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Pay Expense from My Funds</h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
                  {selectedExpenseForPayment.expenseId} - {selectedExpenseForPayment.description}
                </p>
              </div>
              <button 
                onClick={() => setShowPayModal(false)} 
                className="text-gray-500 hover:text-gray-700 self-end sm:self-auto"
              >
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={handlePayExpense} className="p-4 sm:p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs sm:text-sm text-blue-800">
                  <strong>Expense Amount:</strong> ₹{selectedExpenseForPayment.amount.toLocaleString('en-IN')}
                </p>
                <p className="text-xs sm:text-sm text-blue-800 mt-1">
                  <strong>Available Funds:</strong> ₹{availableFunds.toLocaleString('en-IN')}
                </p>
                <p className="text-xs sm:text-sm text-blue-800 mt-1">
                  <strong>Balance After Payment:</strong> ₹{(availableFunds - selectedExpenseForPayment.amount).toLocaleString('en-IN')}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentData.paymentMode}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMode: e.target.value })}
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
                  value={paymentData.transactionReference}
                  onChange={(e) => setPaymentData({ ...paymentData, transactionReference: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="UTR/Transaction ID (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </label>
                <textarea
                  value={paymentData.remarks}
                  onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  rows="2"
                  placeholder="Any additional notes about this payment..."
                />
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm sm:text-base font-semibold"
                >
                  Pay ₹{selectedExpenseForPayment.amount.toLocaleString('en-IN')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct Pay Expense Modal (Create and Pay) */}
      {showDirectPayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-lg my-4 max-h-[95vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sticky top-0 bg-white z-10">
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Pay Expense from My Funds</h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Create and pay expense directly (no approval needed)</p>
              </div>
              <button 
                onClick={() => setShowDirectPayModal(false)} 
                className="text-gray-500 hover:text-gray-700 self-end sm:self-auto"
              >
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={handleDirectPay} className="p-4 sm:p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs sm:text-sm text-blue-800">
                  <strong>Available Funds:</strong> ₹{availableFunds.toLocaleString('en-IN')}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={directPayData.category}
                  onChange={(e) => setDirectPayData({ ...directPayData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason/Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={directPayData.description}
                  onChange={(e) => setDirectPayData({ ...directPayData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  rows="2"
                  placeholder="Enter reason for expense..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={directPayData.amount}
                  onChange={(e) => setDirectPayData({ ...directPayData, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                  required
                  autoFocus
                />
                {directPayData.amount && Number(directPayData.amount) > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    Balance after payment: ₹{(availableFunds - Number(directPayData.amount)).toLocaleString('en-IN')}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expense Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={directPayData.expenseDate}
                  onChange={(e) => setDirectPayData({ ...directPayData, expenseDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode <span className="text-red-500">*</span>
                </label>
                <select
                  value={directPayData.paymentMode}
                  onChange={(e) => setDirectPayData({ ...directPayData, paymentMode: e.target.value })}
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
                  value={directPayData.transactionReference}
                  onChange={(e) => setDirectPayData({ ...directPayData, transactionReference: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="UTR/Transaction ID (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </label>
                <textarea
                  value={directPayData.remarks}
                  onChange={(e) => setDirectPayData({ ...directPayData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  rows="2"
                  placeholder="Any additional notes..."
                />
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDirectPayModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-semibold"
                  disabled={!directPayData.amount || Number(directPayData.amount) <= 0 || Number(availableFunds) < Number(directPayData.amount)}
                >
                  Pay ₹{directPayData.amount ? Number(directPayData.amount).toLocaleString('en-IN') : '0'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyExpenses

