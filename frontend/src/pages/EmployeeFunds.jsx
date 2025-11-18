import { useState, useEffect } from 'react'
import { FiPlus, FiClock, FiRefreshCw, FiX } from 'react-icons/fi'
import API from '../api'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'

const EmployeeFunds = () => {
  const { user } = useAuth()
  const hasEmployeeFundsAccess = user?.module?.includes('employee_funds') || user?.module?.includes('all') || user?.role === 'admin' || user?.role === 'main_admin'
  
  const [employeesFunds, setEmployeesFunds] = useState([])
  const [loading, setLoading] = useState(false)
  const [showEmployeeFundModal, setShowEmployeeFundModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedEmployeeForFund, setSelectedEmployeeForFund] = useState(null)
  const [selectedEmployeeHistory, setSelectedEmployeeHistory] = useState(null)
  const [employeeFundHistory, setEmployeeFundHistory] = useState([])
  const [employeeFundData, setEmployeeFundData] = useState({
    amount: '',
    paymentMode: 'bank_transfer',
    transactionReference: '',
    remarks: ''
  })

  useEffect(() => {
    if (hasEmployeeFundsAccess) {
      fetchAllEmployeesFunds()
    }
  }, [hasEmployeeFundsAccess])

  // Listen for refresh event from Header
  useEffect(() => {
    const handleRefresh = () => {
      if (hasEmployeeFundsAccess) {
        fetchAllEmployeesFunds()
      }
    }

    window.addEventListener('app-refresh', handleRefresh)
    return () => window.removeEventListener('app-refresh', handleRefresh)
  }, [hasEmployeeFundsAccess])

  const fetchAllEmployeesFunds = async () => {
    try {
      setLoading(true)
      const response = await API.funds.getAllEmployeesFunds()
      setEmployeesFunds(response.data.data || [])
    } catch (error) {
      console.error('Error fetching employees funds:', error)
      toast.error('Failed to load employee funds')
    } finally {
      setLoading(false)
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

  const openHistoryModal = async (employee) => {
    setSelectedEmployeeHistory(employee)
    setShowHistoryModal(true)
    await fetchEmployeeFundHistory(employee._id)
  }

  if (!hasEmployeeFundsAccess) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">You don't have permission to access Employee Funds Management.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Employee Funds Management</h1>
          <p className="text-sm text-gray-600 mt-1">View and manage funds for all employees</p>
        </div>
        <button
          onClick={fetchAllEmployeesFunds}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <FiRefreshCw className="mr-2" />
          Refresh
        </button>
      </div>

      {/* Employee Funds Summary */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Employee Funds Summary</h2>
          <p className="text-sm text-gray-600 mt-1">Available funds for each employee</p>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : employeesFunds.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No employee funds found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4">Employee</th>
                    <th className="text-left py-3 px-4">Available Funds</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employeesFunds
                    .sort((a, b) => b.availableFunds - a.availableFunds)
                    .map((emp) => (
                      <tr key={emp._id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{emp.name}</p>
                            <p className="text-sm text-gray-500">{emp.employeeId}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-green-600 text-lg">₹{emp.availableFunds.toLocaleString('en-IN')}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openHistoryModal(emp)}
                              className="flex items-center px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                            >
                              <FiClock className="mr-1" size={14} />
                              History
                            </button>
                            <button
                              onClick={() => openAddEmployeeFundModal(emp)}
                              className="flex items-center px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                            >
                              <FiPlus className="mr-1" size={14} />
                              Add Funds
                            </button>
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

      {/* Add Employee Funds Modal */}
      {showEmployeeFundModal && selectedEmployeeForFund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Add Funds to Employee</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedEmployeeForFund.name} ({selectedEmployeeForFund.employeeId})
                </p>
              </div>
              <button onClick={() => setShowEmployeeFundModal(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddEmployeeFunds} className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <strong>Current Balance:</strong> ₹{selectedEmployeeForFund.availableFunds.toLocaleString('en-IN')}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={employeeFundData.amount}
                  onChange={(e) => setEmployeeFundData({ ...employeeFundData, amount: e.target.value })}
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
                  value={employeeFundData.paymentMode}
                  onChange={(e) => setEmployeeFundData({ ...employeeFundData, paymentMode: e.target.value })}
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
                  value={employeeFundData.transactionReference}
                  onChange={(e) => setEmployeeFundData({ ...employeeFundData, transactionReference: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="UTR/Transaction ID (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for addition <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={employeeFundData.remarks}
                  onChange={(e) => setEmployeeFundData({ ...employeeFundData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  rows="2"
                  placeholder="Any notes about this fund addition..."
                  required
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEmployeeFundModal(false)}
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

      {/* Employee Fund History Modal */}
      {showHistoryModal && selectedEmployeeHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Fund Transaction History</h2>
                <p className="text-sm text-gray-600 mt-1">
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
            
            <div className="p-6">
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
    </div>
  )
}

export default EmployeeFunds

