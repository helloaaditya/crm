import { useState, useEffect } from 'react'
import { FiCreditCard, FiPlus, FiCheck, FiX, FiDollarSign, FiSearch, FiFilter, FiFileText, FiUpload, FiDownload, FiEye } from 'react-icons/fi'
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
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [stats, setStats] = useState(null)
  const [uploading, setUploading] = useState(false)
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
    }
  }, [])
  
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
  
  const handleApprove = async (expenseId) => {
    try {
      await API.expenses.approve(expenseId, { remarks: 'Approved' })
      toast.success('Expense approved')
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
  
  const handlePay = async (expenseId, amount) => {
    const paymentMode = prompt('Enter payment mode (cash/bank_transfer/upi/cheque):') || 'bank_transfer'
    const transactionRef = prompt('Enter transaction reference (optional):') || ''
    
    try {
      await API.expenses.pay(expenseId, {
        paymentMode,
        transactionReference: transactionRef,
        paidAmount: amount
      })
      toast.success('Payment processed')
      fetchExpenses()
      fetchStats()
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
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Expense Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            {hasExpenseAccess ? 'Manage and approve employee expenses' : 'Submit and track your expenses'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
        >
          <FiPlus className="mr-2" />
          Submit Expense
        </button>
      </div>
      
      {/* Statistics (Admin Only) */}
      {hasExpenseAccess && stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Expenses</p>
            <p className="text-2xl font-bold text-gray-800">{stats.totalExpenses}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pendingExpenses}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Approved</p>
            <p className="text-2xl font-bold text-green-600">{stats.approvedExpenses}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Paid</p>
            <p className="text-2xl font-bold text-blue-600">{stats.paidExpenses}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-2xl font-bold text-purple-600">₹{stats.totalAmount?.total?.toLocaleString() || 0}</p>
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg"
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
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Expenses List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            Expenses ({filteredExpenses.length})
          </h2>
        </div>
        
        <div className="p-6">
          {loading ? (
            <p className="text-center text-gray-600">Loading...</p>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <FiCreditCard className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">No expenses found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4">Expense ID</th>
                    {hasExpenseAccess && <th className="text-left py-3 px-4">Employee</th>}
                    <th className="text-left py-3 px-4">Category</th>
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-left py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr key={expense._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{expense.expenseId}</td>
                      {hasExpenseAccess && (
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{expense.employee?.name}</p>
                            <p className="text-sm text-gray-500">{expense.employee?.employeeId}</p>
                          </div>
                        </td>
                      )}
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
                          
                          {hasExpenseAccess && expense.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(expense._id)}
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
                              onClick={() => handlePay(expense._id, expense.amount)}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
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
          )}
        </div>
      </div>
      
      {/* Submit Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-800">Submit New Expense</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
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
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
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
                  <div className="grid grid-cols-2 gap-2">
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
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-800 mb-3">💳 Payment Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-green-800 mb-2">Payment Details</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
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
    </div>
  )
}

export default Expenses
