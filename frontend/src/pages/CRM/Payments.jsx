import { useState, useEffect } from 'react'
import { FiPlus, FiEdit, FiTrash2, FiDollarSign, FiFilter } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'
import PaymentModal from '../../components/Modals/PaymentModal'

const Payments = () => {
  const [payments, setPayments] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [filterInvoice, setFilterInvoice] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    fetchPayments()
    fetchInvoices()
  }, [])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const response = await API.payments.getAll()
      setPayments(response.data.data || [])
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

  const filteredPayments = payments.filter(payment => {
    if (filterInvoice && payment.invoice?._id !== filterInvoice) return false
    if (filterStatus && payment.status !== filterStatus) return false
    return true
  })

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Payments</h1>
        <button 
          onClick={handleAdd}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
        >
          <FiPlus className="mr-2" />
          Record Payment
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Invoice</label>
            <select
              value={filterInvoice}
              onChange={(e) => setFilterInvoice(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">All Invoices</option>
              {invoices.map(invoice => (
                <option key={invoice._id} value={invoice._id}>
                  {invoice.invoiceNumber} - {invoice.customer?.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => { setFilterInvoice(''); setFilterStatus('') }}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Clear Filters
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
        ) : filteredPayments.length > 0 ? (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Mode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {payment.invoice?.invoiceNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.invoice?.customer?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{payment.amount?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${getPaymentModeBadge(payment.paymentMethod)}`}>
                        {payment.paymentMethod?.replace('_', ' ') || 'N/A'}
                      </span>
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