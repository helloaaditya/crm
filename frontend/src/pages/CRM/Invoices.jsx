import { useState, useEffect } from 'react'
import { FiPlus, FiDownload, FiMail, FiTrash2, FiDollarSign, FiSearch, FiCalendar, FiFilter, FiCheck, FiUpload, FiEye, FiX, FiFileText } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import API from '../../api'
import { toast } from 'react-toastify'
import PaymentModal from '../../components/Modals/PaymentModal'
import InvoiceModal from '../../components/Modals/InvoiceModal'
import QuotationModal from '../../components/Modals/QuotationModal'

const Invoices = () => {
  const [activeTab, setActiveTab] = useState('quotation') // 'quotation' or 'invoice'
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPaymentInvoice, setSelectedPaymentInvoice] = useState(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [showQuotationModal, setShowQuotationModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingInvoice, setViewingInvoice] = useState(null)
  const [quotationToConvert, setQuotationToConvert] = useState(null)

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [summary, setSummary] = useState({ totalAmount: 0, paidAmount: 0, pendingAmount: 0 })
  const [downloadingPDF, setDownloadingPDF] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchInvoices()
  }, [page, searchTerm, statusFilter, paymentStatusFilter, startDate, endDate, activeTab])

  // Listen for refresh event from Header
  useEffect(() => {
    const handleRefresh = () => {
      fetchInvoices()
    }

    window.addEventListener('app-refresh', handleRefresh)
    return () => window.removeEventListener('app-refresh', handleRefresh)
  }, [page, searchTerm, statusFilter, paymentStatusFilter, startDate, endDate])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const params = { 
        page: 1, 
        limit: 10000, // Get all records to filter client-side
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(paymentStatusFilter && { paymentStatus: paymentStatusFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      };
      
      const response = await API.invoices.getAll(params);
      
      // Filter based on active tab
      let filteredData = response.data.data || [];
      if (activeTab === 'quotation') {
        filteredData = filteredData.filter(inv => inv.invoiceType === 'quotation');
      } else if (activeTab === 'invoice') {
        // In invoice tab, show both invoices and unconverted quotations (for conversion)
        filteredData = filteredData.filter(inv => 
          inv.invoiceType !== 'quotation' || !inv.isConvertedToInvoice
        );
      }
      
      // Apply pagination
      const startIndex = (page - 1) * 10;
      const endIndex = startIndex + 10;
      const paginatedData = filteredData.slice(startIndex, endIndex);
      
      setInvoices(paginatedData);
      setTotalPages(Math.ceil(filteredData.length / 10));
      setTotalCount(filteredData.length);
      
      // Calculate summary for current tab
      const totalAmount = filteredData.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const paidAmount = filteredData.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      setSummary({
        totalAmount,
        paidAmount,
        pendingAmount: totalAmount - paidAmount
      });
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
    
    if (!invoice) return;
    
    const isQuotation = invoice.invoiceType === 'quotation';
    const docType = isQuotation ? 'quotation' : 'invoice';
    const docNumber = isQuotation ? (invoice.quotationNumber || invoice.invoiceNumber) : invoice.invoiceNumber;
    
    // Prevent deletion of paid invoices
    if (!isQuotation && invoice.paymentStatus === 'paid' && invoice.paidAmount > 0) {
      toast.error('Cannot delete invoice that has been fully paid');
      return;
    }
    
    // Prevent deletion of invoices with partial payments
    if (!isQuotation && invoice.paymentStatus === 'partial' && invoice.paidAmount > 0) {
      toast.error('Cannot delete invoice that has partial payments');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to permanently delete this ${docType} (${docNumber})? This action cannot be undone and will:\n\n- Permanently remove the ${docType} from the system\n- Restore inventory stock (if applicable)\n- Delete associated files\n\nThis action is irreversible!`)) return

    try {
      await API.invoices.delete(id)
      toast.success(`${isQuotation ? 'Quotation' : 'Invoice'} deleted successfully`)
      fetchInvoices()
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error(error.response?.data?.message || `Failed to delete ${docType}`)
    }
  }

  const handleConvertToInvoice = async (id) => {
    const quotation = invoices.find(inv => inv._id === id);
    if (!quotation) return;

    try {
      // Fetch full quotation data with all populated fields including quotationFileUrl
      const response = await API.invoices.getById(id);
      const fullQuotation = response.data.data;
      
      // Open InvoiceModal with quotation data pre-filled
      setQuotationToConvert(fullQuotation);
      setSelectedInvoice(null); // Clear any existing invoice
      setShowInvoiceModal(true);
    } catch (error) {
      console.error('Error fetching quotation:', error);
      toast.error('Failed to load quotation details');
    }
  }

  const handleGeneratePDF = async (id, forceRegenerate = false) => {
    try {
      setDownloadingPDF(id)
      
      // Add force regenerate parameter to URL
      const url = forceRegenerate ? `${id}?force=true` : id
      const response = await API.invoices.generatePDF(url)
      
      if (response.data.data.cached && !forceRegenerate) {
        toast.success('PDF loaded from cache!')
      } else {
        toast.success('PDF generated successfully!')
      }
      
      window.open(response.data.data.pdfUrl, '_blank')
    } catch (error) {
      console.error('PDF generation error:', error)
      toast.error(error.response?.data?.message || 'Failed to generate PDF')
    } finally {
      setDownloadingPDF(null)
    }
  }

  const handleSendEmail = async (id) => {
    const invoice = invoices.find(inv => inv._id === id);
    if (!invoice) return;

    // Check if cancelled
    if (invoice.status === 'cancelled') {
      toast.error(`Cannot send email for cancelled ${invoice.invoiceType === 'quotation' ? 'quotation' : 'invoice'}`);
      return;
    }

    // Check if PDF exists
    if (!invoice.pdfUrl) {
      toast.error(`Please generate ${invoice.invoiceType === 'quotation' ? 'Quotation' : 'Invoice'} PDF first before sending email`);
      return;
    }

    // Get customer email
    if (!invoice.customer?.email) {
      toast.error('Customer email not found');
      return;
    }

    const isQuotation = invoice.invoiceType === 'quotation';
    const docNumber = isQuotation ? (invoice.quotationNumber || invoice.invoiceNumber) : invoice.invoiceNumber;
    const docType = isQuotation ? 'Quotation' : 'Invoice';
    
    // Email subject
    const subject = isQuotation 
      ? `Quotation ${docNumber} from Sanjana Enterprises`
      : `Invoice ${docNumber} from Sanjana Enterprises`;
    
    // Email body
    const body = isQuotation ? `Dear ${invoice.customer.name},

Please find attached our quotation for your reference.

Quotation Number: ${docNumber}
Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}
Total Amount: ₹${invoice.totalAmount.toLocaleString()}

${invoice.project?.projectId ? `Project: ${invoice.project.projectId}\n` : ''}
View/Download Quotation: ${invoice.pdfUrl}

This quotation is valid for 30 days from the date of issue.

Please feel free to contact us for any clarifications.

Best Regards,
Sanjana Enterprises`
    : `Dear ${invoice.customer.name},

Please find attached your invoice for payment.

Invoice Number: ${docNumber}
Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}
${invoice.dueDate ? `Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}\n` : ''}
Total Amount: ₹${invoice.totalAmount.toLocaleString()}
Paid Amount: ₹${invoice.paidAmount.toLocaleString()}
Balance Due: ₹${(invoice.totalAmount - invoice.paidAmount).toLocaleString()}

${invoice.project?.projectId ? `Project: ${invoice.project.projectId}\n` : ''}
View/Download Invoice: ${invoice.pdfUrl}

Please make the payment by the due date.

Thank you for your business!

Best Regards,
Sanjana Enterprises`;

    // Create mailto link
    const mailtoLink = `mailto:${invoice.customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open email client
    window.location.href = mailtoLink;
    toast.success(`Email client opened with ${docType} details!`);
  }

  const handleView = async (invoice) => {
    try {
      // Fetch full invoice data to ensure all fields including quotationFileUrl are loaded
      const response = await API.invoices.getById(invoice._id)
      const fullInvoice = response.data.data
      
      // Debug: Log quotation file URL
      if (fullInvoice.invoiceType === 'quotation') {
        console.log('📄 Quotation file URL:', fullInvoice.quotationFileUrl)
        console.log('📄 Full invoice data:', JSON.stringify(fullInvoice, null, 2))
      }
      
      setViewingInvoice(fullInvoice)
      setShowViewModal(true)
    } catch (error) {
      console.error('Error fetching invoice details:', error)
      // Fallback to using the invoice from list if fetch fails
      setViewingInvoice(invoice)
      setShowViewModal(true)
    }
  }

  const handleAdd = () => {
    setSelectedInvoice(null)
    setQuotationToConvert(null)
    setShowInvoiceModal(true)
  }

  const handleAddQuotation = () => {
    setShowQuotationModal(true)
  }

  const handleWhatsAppReminder = async (invoice) => {
    // Check if invoice is cancelled
    if (invoice.status === 'cancelled') {
      toast.error(`Cannot send WhatsApp for cancelled ${invoice.invoiceType === 'quotation' ? 'quotation' : 'invoice'}`);
      return;
    }

    // Check if PDF exists - IMPORTANT VALIDATION
    if (!invoice.pdfUrl) {
      toast.error(`Please generate ${invoice.invoiceType === 'quotation' ? 'Quotation' : 'Invoice'} PDF first before sending WhatsApp`);
      return;
    }

    // Get customer phone number
    const phone = invoice.customer?.contactNumber?.replace(/\D/g, ''); // Remove non-digits
    
    if (!phone || phone.length !== 10) {
      toast.error('Invalid customer phone number');
      return;
    }

    const isQuotation = invoice.invoiceType === 'quotation';
    const docNumber = isQuotation ? (invoice.quotationNumber || invoice.invoiceNumber) : invoice.invoiceNumber;
    
    // Calculate payment details
    const balance = invoice.balanceAmount || invoice.totalAmount - invoice.paidAmount;
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Not set';
    
    // Format currency
    const totalAmount = `₹${invoice.totalAmount.toLocaleString()}`;
    const paidAmount = `₹${invoice.paidAmount.toLocaleString()}`;
    const balanceAmount = `₹${balance.toLocaleString()}`;

    // Create WhatsApp message based on document type
    const message = isQuotation ? `*Quotation from Sanjana Enterprises* 📋

Dear ${invoice.customer?.name},

We are pleased to share our quotation for your requirements:

*Quotation Number:* ${docNumber}
*Date:* ${new Date(invoice.invoiceDate).toLocaleDateString()}
${invoice.project?.projectId ? `*Project:* ${invoice.project.projectId}\n` : ''}
*Total Amount:* ${totalAmount}

📄 *View/Download Quotation:*
${invoice.pdfUrl}

This quotation is valid for 30 days from the date of issue.

Please feel free to contact us for any clarifications or modifications.

We look forward to working with you! 🤝

Best Regards,
*Sanjana Enterprises*`
    : `*Invoice ${balance > 0 ? 'Payment Reminder' : 'Receipt'}* 💰

Dear ${invoice.customer?.name},

${balance > 0 ? 'This is a friendly reminder about your invoice:' : 'Thank you for your payment! Here are your invoice details:'}

*Invoice Number:* ${docNumber}
*Invoice Date:* ${new Date(invoice.invoiceDate).toLocaleDateString()}
${invoice.dueDate ? `*Due Date:* ${dueDate}\n` : ''}
${invoice.project?.projectId ? `*Project:* ${invoice.project.projectId}\n` : ''}
*Total Amount:* ${totalAmount}
*Paid Amount:* ${paidAmount}
*Balance Due:* ${balanceAmount}

${balance > 0 ? `⚠️ *Payment of ${balanceAmount} is pending*

Please make the payment at your earliest convenience.` : '✅ *Payment completed. Thank you!*'}

📄 *View/Download Invoice:*
${invoice.pdfUrl}

Thank you for your business! 🙏

Best Regards,
*Sanjana Enterprises*`;

    // Format for Indian number: add country code
    const whatsappNumber = `91${phone}`; // India country code
    
    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    // Open WhatsApp in new window
    window.open(whatsappUrl, '_blank');
    toast.success(`WhatsApp opened with ${isQuotation ? 'Quotation' : 'Invoice'} details!`);
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
    setQuotationToConvert(null)
  }

  const handleModalSuccess = () => {
    fetchInvoices()
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setPaymentStatusFilter('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const handleExportCSV = () => {
    const csvData = invoices.map(invoice => ({
      'Invoice Number': invoice.invoiceNumber,
      'Customer': invoice.customer?.name || 'N/A',
      'Customer Phone': invoice.customer?.contactNumber || 'N/A',
      'Type': invoice.invoiceType,
      'Date': new Date(invoice.invoiceDate).toLocaleDateString(),
      'Due Date': invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A',
      'Total Amount': invoice.totalAmount,
      'Paid Amount': invoice.paidAmount,
      'Balance': invoice.totalAmount - invoice.paidAmount,
      'Status': invoice.status,
      'Payment Status': invoice.paymentStatus
    }))

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Invoices exported successfully')
  }

  const handleDownloadSample = async () => {
    setDownloading(true)
    try {
      const response = await API.invoices.bulk.sample()
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'invoices-sample.csv'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Sample file downloaded successfully')
    } catch (error) {
      console.error('Error downloading sample:', error)
      toast.error('Failed to download sample file')
    } finally {
      setDownloading(false)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await API.invoices.bulk.upload(formData)
      toast.success(response.data.message || 'Invoices imported successfully')
      
      // Show error details if available
      if (response.data.errorDetails) {
        console.error('Error Details:', response.data.errorDetails)
        toast.error(`Errors: ${response.data.errorDetails.join('; ')}`, { autoClose: 10000 })
      }
      
      // Refresh invoices list
      fetchInvoices()
    } catch (error) {
      console.error('Error uploading file:', error)
      const errorMsg = error.response?.data?.message || 'Failed to upload invoices'
      toast.error(errorMsg)
      
      // Show error details if available
      if (error.response?.data?.errorDetails) {
        console.error('Error Details:', error.response.data.errorDetails)
        toast.error(`Errors: ${error.response.data.errorDetails.join('; ')}`, { autoClose: 10000 })
      }
    } finally {
      setUploading(false)
      e.target.value = '' // Reset file input
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Invoices & Quotations</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {totalCount} {activeTab === 'quotation' ? 'quotations' : 'invoices'} • Total: ₹{summary.totalAmount?.toLocaleString() || '0'} • 
            Paid: ₹{summary.paidAmount?.toLocaleString() || '0'} • 
            Pending: ₹{summary.pendingAmount?.toLocaleString() || '0'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {activeTab === 'invoice' && (
            <>
              <button 
                onClick={handleDownloadSample}
                disabled={downloading}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <FiDownload className="mr-2" />
                {downloading ? 'Downloading...' : 'Download Sample'}
              </button>
              <label className="w-full sm:w-auto">
                <div className={`flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 cursor-pointer disabled:opacity-50 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <FiUpload className="mr-2" />
                  {uploading ? 'Uploading...' : 'Bulk Upload'}
                </div>
                <input 
                  type="file" 
                  accept=".csv,.xls,.xlsx" 
                  onChange={handleUpload} 
                  className="hidden" 
                  disabled={uploading} 
                />
              </label>
              <button 
                onClick={handleExportCSV}
                className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                disabled={invoices.length === 0}
              >
                <FiDownload className="mr-2" />
                Export CSV
              </button>
            </>
          )}
          {activeTab === 'quotation' ? (
            <button 
              onClick={handleAddQuotation}
              className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base w-full sm:w-auto"
            >
              <FiPlus className="mr-2" />
              Create Quotation
            </button>
          ) : (
            <button 
              onClick={handleAdd}
              className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base w-full sm:w-auto"
            >
              <FiPlus className="mr-2" />
              Create Invoice
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('quotation')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'quotation'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Quotations ({invoices.filter(inv => inv.invoiceType === 'quotation').length})
            </button>
            <button
              onClick={() => setActiveTab('invoice')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'invoice'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Invoices ({invoices.filter(inv => inv.invoiceType !== 'quotation').length})
            </button>
          </nav>
        </div>
      </div>

      {/* Advanced Search and Filters */}
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
              placeholder="Search by invoice #, customer..."
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
              onClick={handleClearFilters}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Clear All Filters
            </button>
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
            <div className="text-sm text-gray-600">
              Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, totalCount)} of {totalCount} invoices
            </div>
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
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
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
                        <div className="flex items-center gap-2">
                          {invoice.invoiceType === 'quotation' 
                            ? (invoice.quotationNumber || 'Generating...') 
                            : (invoice.invoiceNumber || 'Generating...')
                          }
                          {invoice.invoiceType === 'quotation' && invoice.quotationFileUrl && (
                            <FiFileText className="text-green-600" size={16} title="Quotation file uploaded" />
                          )}
                        </div>
                        {invoice.invoiceType === 'quotation' && invoice.isConvertedToInvoice && (
                          <span className="ml-2 text-xs text-gray-500">(Converted)</span>
                        )}
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
                            onClick={() => handleView(invoice)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="View Details"
                          >
                            <FiEye />
                          </button>
                          {/* Convert to Invoice button - Only show in Invoice tab for quotations that haven't been converted */}
                          {activeTab === 'invoice' && invoice.invoiceType === 'quotation' && !invoice.isConvertedToInvoice && (
                            <button 
                              onClick={() => handleConvertToInvoice(invoice._id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              title="Convert to Invoice"
                              disabled={loading}
                            >
                              <FiCheck />
                            </button>
                          )}
                          <button 
                            onClick={() => handleRecordPayment(invoice)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title="Record Payment"
                            disabled={invoice.status === 'cancelled' || invoice.invoiceType === 'quotation'}
                          >
                            <FiDollarSign />
                          </button>
                          <button 
                            onClick={() => handleGeneratePDF(invoice._id)}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              if (invoice.pdfUrl) {
                                handleGeneratePDF(invoice._id, true)
                              }
                            }}
                            className={`p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed ${
                              invoice.pdfUrl 
                                ? 'text-green-600 hover:bg-green-50' 
                                : 'text-blue-600 hover:bg-blue-50'
                            }`}
                            title={invoice.pdfUrl 
                              ? `Left-click: Download ${invoice.invoiceType === 'quotation' ? 'Quotation' : 'Invoice'} PDF (Cached) | Right-click: Force Regenerate` 
                              : `Generate & Download ${invoice.invoiceType === 'quotation' ? 'Quotation' : 'Invoice'} PDF`
                            }
                            disabled={downloadingPDF === invoice._id}
                          >
                            {downloadingPDF === invoice._id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            ) : invoice.pdfUrl ? (
                              <FiDownload className="text-green-600" />
                            ) : (
                              <FiDownload />
                            )}
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
                            title={invoice.invoiceType === 'quotation' ? 'Delete Quotation' : 'Delete Invoice'}
                            disabled={(!invoice.invoiceType || invoice.invoiceType !== 'quotation') && invoice.paymentStatus === 'paid'}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden">
              {invoices.map((invoice) => (
                <div key={invoice._id} className="p-4 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-gray-900">
                          {invoice.invoiceType === 'quotation' 
                            ? (invoice.quotationNumber || 'Generating...') 
                            : (invoice.invoiceNumber || 'Generating...')
                          }
                        </h3>
                        {invoice.invoiceType === 'quotation' && invoice.quotationFileUrl && (
                          <FiFileText className="text-green-600" size={14} title="Quotation file uploaded" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{invoice.customer?.name}</p>
                      <p className="text-xs text-gray-500">{invoice.customer?.contactNumber}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">₹{invoice.totalAmount.toLocaleString()}</div>
                      <div className="flex space-x-1 mt-1">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          invoice.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {invoice.paymentStatus}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium">{invoice.invoiceType.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{new Date(invoice.invoiceDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Paid:</span>
                      <span className="font-medium">₹{invoice.paidAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Due:</span>
                      <span className="font-medium">₹{(invoice.totalAmount - invoice.paidAmount).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button 
                      onClick={() => handleView(invoice)}
                      className="flex items-center justify-center px-2 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-xs"
                    >
                      <FiEye className="mr-1" size={12} />
                      View
                    </button>
                    <button 
                      onClick={() => handleRecordPayment(invoice)}
                      className="flex items-center justify-center px-2 py-2 text-green-600 hover:bg-green-50 rounded-lg text-xs"
                      disabled={invoice.status === 'cancelled'}
                    >
                      <FiDollarSign className="mr-1" size={12} />
                      Payment
                    </button>
                    <button 
                      onClick={() => handleGeneratePDF(invoice._id)}
                      className={`flex items-center justify-center px-2 py-2 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed ${
                        invoice.pdfUrl 
                          ? 'text-green-600 hover:bg-green-50' 
                          : 'text-blue-600 hover:bg-blue-50'
                      }`}
                      disabled={downloadingPDF === invoice._id}
                      title={invoice.pdfUrl ? 'Download PDF (Cached)' : 'Generate & Download PDF'}
                    >
                      {downloadingPDF === invoice._id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                      ) : (
                        <FiDownload className="mr-1" size={12} />
                      )}
                      {invoice.pdfUrl ? 'PDF ✓' : 'PDF'}
                    </button>
                    <button 
                      onClick={() => handleSendEmail(invoice._id)}
                      className="flex items-center justify-center px-2 py-2 text-green-600 hover:bg-green-50 rounded-lg text-xs"
                      disabled={invoice.status === 'cancelled'}
                    >
                      <FiMail className="mr-1" size={12} />
                      Email
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button 
                      onClick={() => handleWhatsAppReminder(invoice)}
                      className="flex items-center justify-center px-2 py-2 text-green-600 hover:bg-green-50 rounded-lg text-xs"
                      disabled={invoice.status === 'cancelled'}
                    >
                      <FaWhatsapp className="mr-1" size={12} />
                      WhatsApp
                    </button>
                    <button 
                      onClick={() => handleDelete(invoice._id)}
                      className="flex items-center justify-center px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg text-xs"
                      disabled={(!invoice.invoiceType || invoice.invoiceType !== 'quotation') && invoice.paymentStatus === 'paid'}
                      title={invoice.invoiceType === 'quotation' ? 'Delete Quotation' : 'Delete Invoice'}
                    >
                      <FiTrash2 className="mr-1" size={12} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border-t bg-gray-50 gap-3">
              <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, totalCount)} of {totalCount} invoices
              </div>
              <div className="flex space-x-2 justify-center sm:justify-end">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
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
        quotation={quotationToConvert}
      />

      {/* View Invoice Modal */}
      {showViewModal && viewingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mobile-modal">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-800">
                {viewingInvoice.invoiceType === 'quotation' ? 'Quotation' : 'Invoice'} Details
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 mobile-modal-content">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {viewingInvoice.invoiceType === 'quotation' ? 'Quotation' : 'Invoice'} Number
                  </label>
                  <p className="text-gray-900">
                    {viewingInvoice.invoiceType === 'quotation' 
                      ? (viewingInvoice.quotationNumber || 'N/A')
                      : (viewingInvoice.invoiceNumber || 'N/A')
                    }
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <p className="text-gray-900">{viewingInvoice.customer?.name || 'N/A'}</p>
                  {viewingInvoice.customer?.contactNumber && (
                    <p className="text-sm text-gray-600">{viewingInvoice.customer.contactNumber}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <p className="text-gray-900 capitalize">{viewingInvoice.invoiceType?.replace('_', ' ') || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <p className="text-gray-900">
                    {viewingInvoice.invoiceDate ? new Date(viewingInvoice.invoiceDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                  <p className="text-gray-900 font-semibold">₹{viewingInvoice.totalAmount?.toLocaleString() || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount</label>
                  <p className="text-gray-900">₹{viewingInvoice.paidAmount?.toLocaleString() || '0'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Amount</label>
                  <p className="text-gray-900">
                    ₹{((viewingInvoice.totalAmount || 0) - (viewingInvoice.paidAmount || 0)).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    viewingInvoice.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                    viewingInvoice.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {viewingInvoice.paymentStatus || 'N/A'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    viewingInvoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                    viewingInvoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {viewingInvoice.status || 'N/A'}
                  </span>
                </div>
                {viewingInvoice.project && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                    <p className="text-gray-900">{viewingInvoice.project?.name || viewingInvoice.projectId || 'N/A'}</p>
                  </div>
                )}
              </div>

              {viewingInvoice.items && viewingInvoice.items.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="space-y-2">
                      {viewingInvoice.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm border-b pb-2 last:border-b-0">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.name || item.description || 'Item'}</p>
                            {item.quantity && (
                              <p className="text-xs text-gray-600">Qty: {item.quantity} × ₹{item.rate?.toLocaleString()}</p>
                            )}
                          </div>
                          <p className="font-medium text-gray-900">₹{item.amount?.toLocaleString() || '0'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {viewingInvoice.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{viewingInvoice.notes}</p>
                </div>
              )}

              {viewingInvoice.quotationFileUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Uploaded Quotation File
                  </label>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <FiFileText className="text-blue-600" size={20} />
                    <a
                      href={viewingInvoice.quotationFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:underline flex-1"
                    >
                      View Uploaded Quotation File
                    </a>
                    <button
                      onClick={() => window.open(viewingInvoice.quotationFileUrl, '_blank')}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      title="Open in new tab"
                    >
                      Open
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Click the link above to view or download the quotation file.
                  </p>
                </div>
              )}
              {viewingInvoice.invoiceType === 'quotation' && !viewingInvoice.quotationFileUrl && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ No quotation file uploaded for this quotation.
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Debug: quotationFileUrl = {viewingInvoice.quotationFileUrl ? `"${viewingInvoice.quotationFileUrl}"` : 'undefined/null'}
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Invoices
