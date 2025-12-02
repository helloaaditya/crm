import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../../api/axios';
import API from '../../api';
import { toast } from 'react-hot-toast';
import { FiEye, FiTrash2, FiPlus, FiEdit, FiX, FiFileText, FiLink } from 'react-icons/fi';

const VendorPayments = () => {
  const [activeTab, setActiveTab] = useState('payments'); // 'payments' or 'invoices'
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showLinkPaymentModal, setShowLinkPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [invoiceLocation, setInvoiceLocation] = useState('');
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [formData, setFormData] = useState({
    vendor: '',
    amount: '',
    paymentMode: 'bank_transfer',
    referenceNumber: '',
    poBillNumber: '',
    poBillDate: '',
    poBillUrl: '',
    purpose: 'material_purchase',
    description: '',
    isGST: false,
    gstAmount: 0,
    tdsAmount: 0,
    notes: '',
    vendorInvoice: ''
  });
  const [availableInvoices, setAvailableInvoices] = useState([]);
  const [poBillFile, setPoBillFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedVendorDetails, setSelectedVendorDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [invoiceFormData, setInvoiceFormData] = useState({
    invoiceNumber: '',
    vendor: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    amount: '',
    location: '',
    invoiceUrl: '',
    description: '',
    notes: ''
  });

  useEffect(() => {
    fetchVendors();
    if (activeTab === 'payments') {
      fetchPayments();
    } else {
      fetchInvoices();
    }
  }, [selectedVendor, startDate, endDate, activeTab, invoiceLocation]);

  const fetchVendors = async () => {
    try {
      const response = await api.get('/inventory/vendors');
      setVendors(response.data.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedVendor) params.vendor = selectedVendor;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await api.get('/vendor-payments', { params });
      setPayments(response.data.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setInvoiceLoading(true);
      const params = {};
      if (selectedVendor) params.vendor = selectedVendor;
      if (invoiceLocation) params.location = invoiceLocation;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await API.vendorInvoices.getAll(params);
      setInvoices(response.data.data || []);
      setTotalOutstanding(response.data.totalOutstanding || 0);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleInputChange = async (e) => {
    const { name, value, type, checked } = e.target;
    
    // If vendor is selected, fetch and display vendor details
    if (name === 'vendor' && value) {
      try {
        const response = await api.get(`/inventory/vendors/${value}`);
        setSelectedVendorDetails(response.data.data);
        
        // Fetch outstanding invoices for this vendor
        const invoicesResponse = await API.vendorInvoices.getAll({
          vendor: value,
          status: 'pending,partial,overdue'
        });
        setAvailableInvoices(invoicesResponse.data.data || []);
      } catch (error) {
        console.error('Error fetching vendor details:', error);
        setSelectedVendorDetails(null);
        setAvailableInvoices([]);
      }
    } else if (name === 'vendor' && !value) {
      setSelectedVendorDetails(null);
      setAvailableInvoices([]);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload only PDF or image files');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setPoBillFile(file);
    toast.success('File selected: ' + file.name);
  };

  const uploadPoBill = async () => {
    if (!poBillFile) return null;

    try {
      setUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append('file', poBillFile);

      const response = await api.post('/media/upload/vendor-po', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('✅ PO Bill uploaded to S3:', response.data.url);
      return response.data.url;
    } catch (error) {
      console.error('Error uploading PO bill:', error);
      toast.error('Failed to upload PO bill');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let poBillUrl = formData.poBillUrl;

      // Upload PO bill if file is selected
      if (poBillFile) {
        const uploadedUrl = await uploadPoBill();
        if (uploadedUrl) {
          poBillUrl = uploadedUrl;
        }
      }

      const submitData = {
        ...formData,
        poBillUrl
      };

      await api.post('/vendor-payments', submitData);
      toast.success('Payment recorded successfully!');
      setShowModal(false);
      setPoBillFile(null);
      setSelectedVendorDetails(null);
      setFormData({
        vendor: '',
        amount: '',
        paymentMode: 'bank_transfer',
        referenceNumber: '',
        poBillNumber: '',
        poBillDate: '',
        poBillUrl: '',
        purpose: 'material_purchase',
        description: '',
        isGST: false,
        gstAmount: 0,
        tdsAmount: 0,
        notes: '',
        vendorInvoice: ''
      });
      setAvailableInvoices([]);
      fetchPayments();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedVendorDetails(null);
    setPoBillFile(null);
  };

  const handleViewPayment = (payment) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to cancel this payment? This action cannot be undone.')) {
      return;
    }

    try {
      await api.put(`/vendor-payments/${paymentId}/cancel`, {
        notes: 'Cancelled by user'
      });
      toast.success('Payment cancelled successfully');
      fetchPayments();
    } catch (error) {
      console.error('Error cancelling payment:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel payment');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      paid: 'bg-green-100 text-green-800',
      partial: 'bg-orange-100 text-orange-800',
      overdue: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedInvoice) {
        await API.vendorInvoices.update(selectedInvoice._id, invoiceFormData);
        toast.success('Invoice updated successfully!');
      } else {
        await API.vendorInvoices.create(invoiceFormData);
        toast.success('Invoice created successfully!');
      }
      setShowInvoiceModal(false);
      setSelectedInvoice(null);
      setInvoiceFormData({
        invoiceNumber: '',
        vendor: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        amount: '',
        location: '',
        invoiceUrl: '',
        description: '',
        notes: ''
      });
      fetchInvoices();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error(error.response?.data?.message || 'Failed to save invoice');
    }
  };

  const handleEditInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceFormData({
      invoiceNumber: invoice.invoiceNumber || '',
      vendor: invoice.vendor._id || '',
      invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
      amount: invoice.amount || '',
      location: invoice.location || '',
      invoiceUrl: invoice.invoiceUrl || '',
      description: invoice.description || '',
      notes: invoice.notes || ''
    });
    setShowInvoiceModal(true);
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await API.vendorInvoices.delete(invoiceId);
      toast.success('Invoice deleted successfully');
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete invoice');
    }
  };

  const handleLinkPayment = async (invoiceId, paymentId) => {
    try {
      await API.vendorInvoices.linkPayment(invoiceId, { paymentId });
      toast.success('Payment linked to invoice successfully');
      fetchInvoices();
      fetchPayments();
      setShowLinkPaymentModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to link payment');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vendor Payments & Invoices</h1>
        <div className="flex gap-2">
          {activeTab === 'payments' && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <FiPlus className="inline mr-1" />
              Record Payment
            </button>
          )}
          {activeTab === 'invoices' && (
            <button
              onClick={() => {
                setSelectedInvoice(null);
                setInvoiceFormData({
                  invoiceNumber: '',
                  vendor: '',
                  invoiceDate: new Date().toISOString().split('T')[0],
                  dueDate: '',
                  amount: '',
                  location: '',
                  invoiceUrl: '',
                  description: '',
                  notes: ''
                });
                setShowInvoiceModal(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <FiPlus className="inline mr-1" />
              Add Invoice
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'payments'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Payments
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'invoices'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Vendor Invoices
            {totalOutstanding > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                ₹{totalOutstanding.toLocaleString()}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className={`grid grid-cols-1 md:grid-cols-${activeTab === 'invoices' ? '4' : '3'} gap-4`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vendor
            </label>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All Vendors</option>
              {vendors.map(vendor => (
                <option key={vendor._id} value={vendor._id}>
                  {vendor.vendorId} - {vendor.name}
                </option>
              ))}
            </select>
          </div>
          {activeTab === 'invoices' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={invoiceLocation}
                onChange={(e) => setInvoiceLocation(e.target.value)}
                placeholder="Filter by location"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Payments Section */}
      {activeTab === 'payments' && (
        <>
      {/* Payments Table - Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Mode</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Bill No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="8" className="px-6 py-4 text-center">Loading...</td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                  No payments found
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {payment.paymentId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{payment.vendor?.name}</div>
                      <div className="text-gray-500">{payment.vendor?.vendorId}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{payment.amount.toLocaleString()}
                    {payment.isGST && (
                      <div className="text-xs text-gray-500">GST: ₹{payment.gstAmount}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.paymentMode.replace('_', ' ').toUpperCase()}
                    {payment.referenceNumber && (
                      <div className="text-xs text-gray-500">Ref: {payment.referenceNumber}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      {payment.poBillNumber || '-'}
                      {payment.poBillUrl && (
                        <a
                          href={payment.poBillUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-xs block mt-1"
                        >
                          📄 View Bill
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(payment.paymentDate), 'dd MMM yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-4">
                      <button
                        onClick={() => handleViewPayment(payment)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                        title="View Details"
                      >
                        <FiEye className="text-blue-600 hover:text-blue-800 font-medium" />
                      </button>
                      {payment.status !== 'cancelled' && (
                        <button
                          onClick={() => handleDeletePayment(payment._id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                          title="Cancel Payment"
                        >
                        <FiTrash2 className="text-red-600 hover:text-red-800 font-medium" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payments Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : payments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            No payments found
          </div>
        ) : (
          payments.map((payment) => (
            <div key={payment._id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-gray-900">{payment.paymentId}</div>
                  <div className="text-sm text-gray-600 mt-1">{payment.vendor?.name}</div>
                  <div className="text-xs text-gray-500">{payment.vendor?.vendorId}</div>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                  {payment.status}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold text-gray-900">₹{payment.amount.toLocaleString()}</span>
                </div>
                {payment.isGST && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">GST:</span>
                    <span className="text-gray-700">₹{payment.gstAmount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Mode:</span>
                  <span className="text-gray-900">{payment.paymentMode.replace('_', ' ').toUpperCase()}</span>
                </div>
                {payment.referenceNumber && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Ref:</span>
                    <span className="text-gray-700">{payment.referenceNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">PO Bill:</span>
                  <span className="text-gray-900">
                    {payment.poBillNumber || '-'}
                    {payment.poBillUrl && (
                      <a
                        href={payment.poBillUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs ml-2"
                      >
                        📄 View
                      </a>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="text-gray-900">{format(new Date(payment.paymentDate), 'dd MMM yyyy')}</span>
                </div>
              </div>

              <div className="flex gap-3 mt-4 pt-3 border-t">
                <button
                  onClick={() => handleViewPayment(payment)}
                  className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium text-sm"
                >
                  <FiEye className="inline mr-1" /> View
                </button>
                {payment.status !== 'cancelled' && (
                  <button
                    onClick={() => handleDeletePayment(payment._id)}
                    className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium text-sm"
                  >
                    <FiTrash2 className="inline mr-1" /> Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

        </>
      )}

      {/* Invoices Section */}
      {activeTab === 'invoices' && (
        <>
          {/* Outstanding Summary */}
          {totalOutstanding > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-red-800">Total Outstanding</h3>
                  <p className="text-2xl font-bold text-red-600">₹{totalOutstanding.toLocaleString('en-IN')}</p>
                </div>
                <div className="text-sm text-red-700">
                  {invoices.filter(inv => inv.status !== 'paid').length} unpaid invoices
                </div>
              </div>
            </div>
          )}

          {/* Invoices Table - Desktop */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remainder</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoiceLoading ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-4 text-center">Loading...</td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                      No invoices found
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{invoice.vendor?.name}</div>
                          <div className="text-gray-500">{invoice.vendor?.vendorId}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{invoice.amount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{invoice.paidAmount?.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                        ₹{invoice.remainder?.toLocaleString() || invoice.amount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(invoice.invoiceDate), 'dd MMM yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditInvoice(invoice)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <FiEdit />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowLinkPaymentModal(true);
                            }}
                            className="text-green-600 hover:text-green-800"
                            title="Link Payment"
                          >
                            <FiLink />
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(invoice._id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Invoices Cards - Mobile */}
          <div className="md:hidden space-y-4">
            {invoiceLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : invoices.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                No invoices found
              </div>
            ) : (
              invoices.map((invoice) => (
                <div key={invoice._id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-gray-900">{invoice.invoiceNumber}</div>
                      <div className="text-sm text-gray-600 mt-1">{invoice.vendor?.name}</div>
                      <div className="text-xs text-gray-500">{invoice.location}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-semibold text-gray-900">₹{invoice.amount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Paid:</span>
                      <span className="text-gray-900">₹{invoice.paidAmount?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remainder:</span>
                      <span className="font-semibold text-red-600">₹{invoice.remainder?.toLocaleString() || invoice.amount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="text-gray-900">{format(new Date(invoice.invoiceDate), 'dd MMM yyyy')}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-3 border-t">
                    <button
                      onClick={() => handleEditInvoice(invoice)}
                      className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium text-sm"
                    >
                      <FiEdit className="inline mr-1" /> Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setShowLinkPaymentModal(true);
                      }}
                      className="flex-1 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 font-medium text-sm"
                    >
                      <FiLink className="inline mr-1" /> Link
                    </button>
                    <button
                      onClick={() => handleDeleteInvoice(invoice._id)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium text-sm"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Record Vendor Payment</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor *
                  </label>
                  <select
                    name="vendor"
                    value={formData.vendor}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map(vendor => (
                      <option key={vendor._id} value={vendor._id}>
                        {vendor.vendorId} - {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vendor Bank Details Display */}
                {selectedVendorDetails && selectedVendorDetails.bankDetails && (
                  <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                      🏦 Vendor Bank Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Account Name</label>
                        <p className="font-medium text-gray-900">
                          {selectedVendorDetails.bankDetails.accountName || '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Bank Name</label>
                        <p className="font-medium text-gray-900">
                          {selectedVendorDetails.bankDetails.bankName || '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Account Number</label>
                        <p className="font-medium text-gray-900 font-mono">
                          {selectedVendorDetails.bankDetails.accountNumber || '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">IFSC Code</label>
                        <p className="font-medium text-gray-900 font-mono">
                          {selectedVendorDetails.bankDetails.ifscCode || '-'}
                        </p>
                      </div>
                      {selectedVendorDetails.bankDetails.branch && (
                        <div className="col-span-2">
                          <label className="text-xs text-gray-600 block mb-1">Branch</label>
                          <p className="font-medium text-gray-900">
                            {selectedVendorDetails.bankDetails.branch}
                          </p>
                        </div>
                      )}
                      {selectedVendorDetails.gstNumber && (
                        <div className="col-span-2">
                          <label className="text-xs text-gray-600 block mb-1">GST Number</label>
                          <p className="font-medium text-gray-900 font-mono">
                            {selectedVendorDetails.gstNumber}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-blue-800">
                        <span>
                          📞 Contact: <strong>{selectedVendorDetails.contactPerson}</strong> - {selectedVendorDetails.contactNumber}
                        </span>
                        {selectedVendorDetails.outstandingBalance > 0 && (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            Outstanding: ₹{selectedVendorDetails.outstandingBalance?.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Show message if vendor has no bank details */}
                {selectedVendorDetails && !selectedVendorDetails.bankDetails?.accountNumber && (
                  <div className="col-span-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      ⚠️ No bank details available for this vendor. Please update vendor information.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Mode *
                  </label>
                  <select
                    name="paymentMode"
                    value={formData.paymentMode}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    name="referenceNumber"
                    value={formData.referenceNumber}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                {availableInvoices.length > 0 && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Link to Invoice (Optional)
                    </label>
                    <select
                      name="vendorInvoice"
                      value={formData.vendorInvoice}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">None - General Payment</option>
                      {availableInvoices.map(invoice => (
                        <option key={invoice._id} value={invoice._id}>
                          {invoice.invoiceNumber} - {invoice.location} - ₹{invoice.remainder?.toLocaleString()} remaining
                        </option>
                      ))}
                    </select>
                    {formData.vendorInvoice && (
                      <p className="text-xs text-blue-600 mt-1">
                        Payment will be linked to selected invoice and remainder will be updated automatically
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PO Bill Number
                  </label>
                  <input
                    type="text"
                    name="poBillNumber"
                    value={formData.poBillNumber}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PO Bill Date
                  </label>
                  <input
                    type="date"
                    name="poBillDate"
                    value={formData.poBillDate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload PO Bill (PDF or Image)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                  {poBillFile && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ Selected: {poBillFile.name}
                    </p>
                  )}
                  {uploading && (
                    <p className="text-sm text-blue-600 mt-1">
                      ⏳ Uploading...
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purpose
                  </label>
                  <select
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="material_purchase">Material Purchase</option>
                    <option value="service">Service</option>
                    <option value="rent">Rent</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="isGST"
                      checked={formData.isGST}
                      onChange={handleInputChange}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">GST Applicable</span>
                  </label>
                </div>

                {formData.isGST && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        GST Amount
                      </label>
                      <input
                        type="number"
                        name="gstAmount"
                        value={formData.gstAmount}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        TDS Amount
                      </label>
                      <input
                        type="number"
                        name="tdsAmount"
                        value={formData.tdsAmount}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                  </>
                )}

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {showDetailsModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold">Payment Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Payment Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Payment ID</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedPayment.paymentId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                  <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedPayment.status)}`}>
                    {selectedPayment.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Vendor Details */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Vendor Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Vendor Name</label>
                    <p className="text-gray-900">{selectedPayment.vendor?.name}</p>
                    <p className="text-sm text-gray-500">{selectedPayment.vendor?.vendorId}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Contact</label>
                    <p className="text-gray-900">{selectedPayment.vendor?.contactPerson}</p>
                    <p className="text-sm text-gray-500">{selectedPayment.vendor?.contactNumber}</p>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Amount</label>
                    <p className="text-2xl font-bold text-gray-900">₹{selectedPayment.amount?.toLocaleString()}</p>
                    {selectedPayment.isGST && (
                      <p className="text-sm text-gray-500">GST: ₹{selectedPayment.gstAmount?.toLocaleString()}</p>
                    )}
                    {selectedPayment.tdsAmount > 0 && (
                      <p className="text-sm text-gray-500">TDS: ₹{selectedPayment.tdsAmount?.toLocaleString()}</p>
                    )}
                    {selectedPayment.netAmount && (
                      <p className="text-sm font-medium text-green-600">Net: ₹{selectedPayment.netAmount?.toLocaleString()}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Payment Date</label>
                    <p className="text-gray-900">{format(new Date(selectedPayment.paymentDate), 'dd MMM yyyy, hh:mm a')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Payment Mode</label>
                    <p className="text-gray-900">{selectedPayment.paymentMode?.replace('_', ' ').toUpperCase()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Reference Number</label>
                    <p className="text-gray-900 font-mono">{selectedPayment.referenceNumber || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Purpose</label>
                    <p className="text-gray-900">{selectedPayment.purpose?.replace('_', ' ').toUpperCase()}</p>
                  </div>
                </div>
              </div>

              {/* PO Bill Details */}
              {(selectedPayment.poBillNumber || selectedPayment.poBillUrl) && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">PO Bill Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedPayment.poBillNumber && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">PO Bill Number</label>
                        <p className="text-gray-900">{selectedPayment.poBillNumber}</p>
                      </div>
                    )}
                    {selectedPayment.poBillDate && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">PO Bill Date</label>
                        <p className="text-gray-900">{format(new Date(selectedPayment.poBillDate), 'dd MMM yyyy')}</p>
                      </div>
                    )}
                    {selectedPayment.poBillUrl && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-500 mb-2">PO Bill Document</label>
                        <a
                          href={selectedPayment.poBillUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                        >
                          📄 View/Download PO Bill
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description & Notes */}
              {(selectedPayment.description || selectedPayment.notes) && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Additional Information</h3>
                  {selectedPayment.description && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
                      <p className="text-gray-900">{selectedPayment.description}</p>
                    </div>
                  )}
                  {selectedPayment.notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Notes</label>
                      <p className="text-gray-900">{selectedPayment.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Created By */}
              {selectedPayment.createdBy && (
                <div className="border-t pt-4">
                  <div className="text-sm text-gray-500">
                    Created by <strong>{selectedPayment.createdBy.name}</strong> on{' '}
                    {format(new Date(selectedPayment.createdAt), 'dd MMM yyyy, hh:mm a')}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              {selectedPayment.poBillUrl && (
                <a
                  href={selectedPayment.poBillUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  📥 Download PO Bill
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedInvoice ? 'Edit Invoice' : 'Add Vendor Invoice'}</h2>
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedInvoice(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX size={24} />
              </button>
            </div>

            <form onSubmit={handleInvoiceSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor *
                  </label>
                  <select
                    value={invoiceFormData.vendor}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, vendor: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map(vendor => (
                      <option key={vendor._id} value={vendor._id}>
                        {vendor.vendorId} - {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Number *
                  </label>
                  <input
                    type="text"
                    value={invoiceFormData.invoiceNumber}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoiceNumber: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={invoiceFormData.location}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, location: e.target.value })}
                    required
                    placeholder="e.g., Location 1, Location 2"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    value={invoiceFormData.invoiceDate}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoiceDate: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={invoiceFormData.dueDate}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, dueDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    value={invoiceFormData.amount}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, amount: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice URL
                  </label>
                  <input
                    type="url"
                    value={invoiceFormData.invoiceUrl}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoiceUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={invoiceFormData.description}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, description: e.target.value })}
                    rows="3"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={invoiceFormData.notes}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, notes: e.target.value })}
                    rows="2"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInvoiceModal(false);
                    setSelectedInvoice(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {selectedInvoice ? 'Update Invoice' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Payment Modal */}
      {showLinkPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Link Payment to Invoice</h2>
              <button
                onClick={() => {
                  setShowLinkPaymentModal(false);
                  setSelectedInvoice(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Invoice: {selectedInvoice.invoiceNumber}</p>
              <p className="text-sm text-blue-700">Vendor: {selectedInvoice.vendor?.name}</p>
              <p className="text-sm text-blue-700">Location: {selectedInvoice.location}</p>
              <p className="text-sm text-blue-700">Amount: ₹{selectedInvoice.amount?.toLocaleString()}</p>
              <p className="text-sm text-blue-700">Remainder: ₹{selectedInvoice.remainder?.toLocaleString()}</p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Payment to Link
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleLinkPayment(selectedInvoice._id, e.target.value);
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select a payment...</option>
                {payments
                  .filter(p => p.vendor?._id?.toString() === selectedInvoice.vendor?._id?.toString() && !p.vendorInvoice)
                  .map(payment => (
                    <option key={payment._id} value={payment._id}>
                      {payment.paymentId} - ₹{payment.amount?.toLocaleString()} - {format(new Date(payment.paymentDate), 'dd MMM yyyy')}
                    </option>
                  ))}
              </select>
              {payments.filter(p => p.vendor?._id?.toString() === selectedInvoice.vendor?._id?.toString() && !p.vendorInvoice).length === 0 && (
                <p className="text-sm text-gray-500">No unlinked payments available for this vendor</p>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowLinkPaymentModal(false);
                  setSelectedInvoice(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPayments;

