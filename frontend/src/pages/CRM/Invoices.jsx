import { useState, useEffect } from 'react'
import { FiPlus, FiDownload, FiMail, FiTrash2, FiDollarSign } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import API from '../../api'
import { toast } from 'react-toastify'
import PaymentModal from '../../components/Modals/PaymentModal'
import InvoiceModal from '../../components/Modals/InvoiceModal'

const Invoices = () => {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPaymentInvoice, setSelectedPaymentInvoice] = useState(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('')

  useEffect(() => {
    fetchInvoices()
  }, [page, searchTerm, statusFilter, paymentStatusFilter])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const params = { page, limit: 10 };
      
      // Add search term if provided
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      // Add status filter if provided
      if (statusFilter) {
        params.status = statusFilter;
      }
      
      // Add payment status filter if provided
      if (paymentStatusFilter) {
        params.paymentStatus = paymentStatusFilter;
      }
      
      const response = await API.invoices.getAll(params);
      setInvoices(response.data.data);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    // Find the invoice to check its payment status
    const invoice = invoices.find(inv => inv._id === id);
    
    // Prevent cancellation of already cancelled invoices
    if (invoice && invoice.status === 'cancelled') {
      toast.error('Invoice is already cancelled');
      return;
    }
    
    // Prevent cancellation of paid invoices
    if (invoice && invoice.paymentStatus === 'paid') {
      toast.error('Cannot cancel invoice that has been fully paid');
      return;
    }
    
    // Prevent cancellation of partially paid invoices
    if (invoice && invoice.paymentStatus === 'partial') {
      toast.error('Cannot cancel invoice that has partial payments');
      return;
    }
    
    if (!window.confirm('Are you sure you want to cancel this invoice? This action cannot be undone.')) return

    try {
      await API.invoices.delete(id)
      toast.success('Invoice cancelled successfully')
      fetchInvoices()
    } catch (error) {
      toast.error('Failed to cancel invoice')
    }
  }

  const handleGeneratePDF = async (id) => {
    try {
      const response = await API.invoices.generatePDF(id)
      toast.success('PDF generated successfully!')
      window.open(response.data.data.pdfUrl, '_blank')
    } catch (error) {
      toast.error('Failed to generate PDF')
    }
  }

  const handleSendEmail = async (id) => {
    // Check if invoice is cancelled
    const invoice = invoices.find(inv => inv._id === id);
    if (invoice && invoice.status === 'cancelled') {
      toast.error('Cannot send email for cancelled invoice');
      return;
    }
    
    try {
      await API.invoices.sendEmail(id)
      toast.success('Invoice sent via email!')
    } catch (error) {
      toast.error('Failed to send email')
    }
  }

  const handleAdd = () => {
    setSelectedInvoice(null)
    setShowInvoiceModal(true)
  }

  const handleWhatsAppReminder = async (invoice) => {
    // Check if invoice is cancelled
    if (invoice.status === 'cancelled') {
      toast.error('Cannot send WhatsApp reminder for cancelled invoice');
      return;
    }
    
    try {
      // Generate PDF if not exists
      if (!invoice.pdfUrl) {
        await API.invoices.generatePDF(invoice._id)
      }

      // Calculate payment details
      const balance = invoice.balanceAmount || invoice.totalAmount - invoice.paidAmount
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Not set'
      
      // Format currency
      const totalAmount = `₹${invoice.totalAmount.toLocaleString()}`
      const paidAmount = `₹${invoice.paidAmount.toLocaleString()}`
      const balanceAmount = `₹${balance.toLocaleString()}`

      // Create WhatsApp message
      const message = `*Invoice Payment Reminder*

Dear ${invoice.customer?.name},

This is a friendly reminder about your invoice:

*Invoice Number:* ${invoice.invoiceNumber}
*Invoice Date:* ${new Date(invoice.invoiceDate).toLocaleDateString()}
*Due Date:* ${dueDate}

*Total Amount:* ${totalAmount}
*Paid Amount:* ${paidAmount}
*Balance Due:* ${balanceAmount}

${balance > 0 ? `⚠️ *Payment of ${balanceAmount} is pending*` : '✅ Payment completed. Thank you!'}

Please make the payment at your earliest convenience.

Thank you for your business!

Regards,
Sanjana CRM Team`

      // Get customer phone number
      const phone = invoice.customer?.contactNumber?.replace(/\D/g, '') // Remove non-digits
      
      if (!phone || phone.length !== 10) {
        toast.error('Invalid customer phone number')
        return
      }

      // Format for Indian number: add country code
      const whatsappNumber = `91${phone}` // India country code
      
      // Encode message for URL
      const encodedMessage = encodeURIComponent(message)
      
      // Create WhatsApp URL
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`
      
      // Open WhatsApp in new window
      window.open(whatsappUrl, '_blank')
      
      toast.success('Opening WhatsApp...')
    } catch (error) {
      console.error('Error sending WhatsApp reminder:', error)
      toast.error('Failed to open WhatsApp')
    }
  }

  const handleRecordPayment = (invoice) => {
    // Check if invoice is cancelled
    if (invoice.status === 'cancelled') {
      toast.error('Cannot record payment for cancelled invoice');
      return;
    }
    
    setSelectedPaymentInvoice(invoice)
    setShowPaymentModal(true)
  }

  const handlePaymentModalClose = () => {
    setShowPaymentModal(false)
    setSelectedPaymentInvoice(null)
  }

  const handleInvoiceModalClose = () => {
    setShowInvoiceModal(false)
    setSelectedInvoice(null)
  }

  const handleModalSuccess = () => {
    fetchInvoices()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Invoices</h1>
        <button 
          onClick={handleAdd}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
        >
          <FiPlus className="mr-2" />
          Create Invoice
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by invoice #"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="viewed">Viewed</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Payment Status</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setPaymentStatusFilter('');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : invoices.length > 0 ? (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.customer?.name}<br/>
                      <span className="text-xs text-gray-500">{invoice.customer?.contactNumber}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {invoice.invoiceType.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{invoice.totalAmount.toLocaleString()}
                      <div className="text-xs text-gray-500 mt-1">
                        Paid: ₹{invoice.paidAmount.toLocaleString()}
                        <br />
                        Due: ₹{(invoice.totalAmount - invoice.paidAmount).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        invoice.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {invoice.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleRecordPayment(invoice)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                          title="Record Payment"
                          disabled={invoice.status === 'cancelled'}
                        >
                          <FiDollarSign />
                        </button>
                        <button 
                          onClick={() => handleGeneratePDF(invoice._id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded" 
                          title="Download PDF"
                        >
                          <FiDownload />
                        </button>
                        <button 
                          onClick={() => handleSendEmail(invoice._id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                          title="Send Email"
                          disabled={invoice.status === 'cancelled'}
                        >
                          <FiMail />
                        </button>
                        <button 
                          onClick={() => handleWhatsAppReminder(invoice)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                          title="WhatsApp Reminder"
                          disabled={invoice.status === 'cancelled'}
                        >
                          <FaWhatsapp className="text-lg" />
                        </button>
                        <button 
                          onClick={() => handleDelete(invoice._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Cancel Invoice"
                          disabled={invoice.status === 'cancelled'}
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
            <div className="px-6 py-4 flex items-center justify-between border-t">
              <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
              <div className="flex space-x-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No invoices found</p>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={handlePaymentModalClose}
        onSuccess={handleModalSuccess}
        payment={null}
        invoices={[selectedPaymentInvoice].filter(Boolean)}
      />
      
      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={handleInvoiceModalClose}
        onSuccess={handleModalSuccess}
        invoice={selectedInvoice}
      />
    </div>
  )
}

export default Invoices
