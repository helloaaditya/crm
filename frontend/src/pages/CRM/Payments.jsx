import { useState, useEffect } from 'react'
import { FiPlus, FiEdit, FiTrash2, FiDollarSign, FiFilter, FiDownload, FiSearch, FiCalendar } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'
import PaymentModal from '../../components/Modals/PaymentModal'
import SearchableSelect from '../../components/SearchableSelect'

const Payments = () => {
  const [payments, setPayments] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)
  
  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterInvoice, setFilterInvoice] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Summary
  const [summary, setSummary] = useState({ totalAmount: 0, count: 0 })

  useEffect(() => {
    fetchPayments()
    fetchInvoices()
  }, [page, searchTerm, filterInvoice, filterStatus, filterPaymentMethod, startDate, endDate])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const params = {
        page,
        limit: 10,
        ...(searchTerm && { search: searchTerm }),
        ...(filterInvoice && { invoiceId: filterInvoice }),
        ...(filterStatus && { status: filterStatus }),
        ...(filterPaymentMethod && { paymentMethod: filterPaymentMethod }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      }
      
      const response = await API.payments.getAll(params)
      setPayments(response.data.data || [])
      setTotalPages(response.data.pagination?.totalPages || 1)
      setTotalCount(response.data.pagination?.total || 0)
      setSummary(response.data.summary || { totalAmount: 0, count: 0 })
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  const fetchInvoices = async () => {
    try {
      const response = await API.invoices.getAll()
      setInvoices(response.data.data || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
      toast.error('Failed to load invoices')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return

    try {
      await API.payments.delete(id)
      toast.success('Payment deleted successfully')
      fetchPayments()
    } catch (error) {
      toast.error('Failed to delete payment')
    }
  }

  const handleAdd = () => {
    setSelectedPayment(null)
    setShowModal(true)
  }

  const handleEdit = (payment) => {
    setSelectedPayment(payment)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setSelectedPayment(null)
  }

  const handleModalSuccess = () => {
    fetchPayments()
    handleModalClose()
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setFilterInvoice('')
    setFilterStatus('')
    setFilterPaymentMethod('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const getStatusBadge = (status) => {
    const badges = {
      paid: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-red-100 text-red-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  const getPaymentModeBadge = (mode) => {
    const badges = {
      cash: 'bg-blue-100 text-blue-800',
      bank_transfer: 'bg-purple-100 text-purple-800',
      cheque: 'bg-indigo-100 text-indigo-800',
      upi: 'bg-green-100 text-green-800',
      razorpay: 'bg-yellow-100 text-yellow-800',
      card: 'bg-pink-100 text-pink-800'
    }
    return badges[mode] || 'bg-gray-100 text-gray-800'
  }

  const displayPaymentMethod = (mode) => {
    if (mode === 'razorpay') return 'Online'
    return (mode || '').replace('_', ' ')
  }

  const handleExportCSV = () => {
    const csvData = payments.map(payment => ({
      'Invoice Number': payment.invoice?.invoiceNumber || 'N/A',
      'Customer': payment.invoice?.customer?.name || payment.customer?.name || 'N/A',
      'Date': new Date(payment.paymentDate).toLocaleDateString(),
      'Amount': payment.amount,
      'Payment Method': displayPaymentMethod(payment.paymentMethod),
      'Status': payment.status,
      'Notes': payment.notes || ''
    }))

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Payments exported successfully')
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Payments</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {totalCount} payments • Total: ₹{summary.totalAmount?.toLocaleString() || '0'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm sm:text-base"
            disabled={payments.length === 0}
          >
            <FiDownload className="mr-2" />
            Export CSV
          </button>
          <button 
            onClick={handleAdd}
            className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
          >
            <FiPlus className="mr-2" />
            Record Payment
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiSearch className="inline mr-1" />
              Search
            </label>
            <input
              type="text"
              placeholder="Search notes, transaction ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Invoice Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice</label>
            <SearchableSelect
              options={invoices.map(inv => ({ 
                value: inv._id, 
                label: `${inv.invoiceNumber} - ${inv.customer?.name || 'N/A'}` 
              }))}
              value={filterInvoice}
              onChange={setFilterInvoice}
              placeholder="All Invoices"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Methods</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="upi">UPI</option>
              <option value="razorpay">Online</option>
              <option value="card">Card</option>
            </select>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiCalendar className="inline mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiCalendar className="inline mr-1" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleClearFilters}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : payments.length > 0 ? (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Mode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference / Txn</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {payment.invoice?.invoiceNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.invoice?.customer?.name || payment.customer?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{payment.amount?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${getPaymentModeBadge(payment.paymentMethod)}`}>
                        {displayPaymentMethod(payment.paymentMethod) || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 max-w-xs truncate">
                      {payment.paymentMethod === 'cheque' ? (
                        payment.chequeDetails?.chequeNumber || '-'
                      ) : (
                        payment.transactionId || payment.referenceNumber || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(payment.status)}`}>
                        {payment.status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 max-w-xs truncate">
                      {payment.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEdit(payment)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                          title="Edit"
                        >
                          <FiEdit />
                        </button>
                        <button 
                          onClick={() => handleDelete(payment._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-6 py-4 flex items-center justify-between border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, totalCount)} of {totalCount} payments
              </div>
              <div className="flex space-x-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <FiDollarSign className="mx-auto text-gray-400 text-5xl mb-4" />
            <p className="text-gray-600">No payments found</p>
            <button 
              onClick={handleAdd}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
            >
              Record First Payment
            </button>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        payment={selectedPayment}
        invoices={invoices}
      />
    </div>
  )
}

export default Payments