import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

const VendorPayments = () => {
  const [payments, setPayments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
    notes: ''
  });
  const [poBillFile, setPoBillFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedVendorDetails, setSelectedVendorDetails] = useState(null);

  useEffect(() => {
    fetchVendors();
    fetchPayments();
  }, [selectedVendor, startDate, endDate]);

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

  const handleInputChange = async (e) => {
    const { name, value, type, checked } = e.target;
    
    // If vendor is selected, fetch and display vendor details
    if (name === 'vendor' && value) {
      try {
        const response = await api.get(`/inventory/vendors/${value}`);
        setSelectedVendorDetails(response.data.data);
      } catch (error) {
        console.error('Error fetching vendor details:', error);
        setSelectedVendorDetails(null);
      }
    } else if (name === 'vendor' && !value) {
      setSelectedVendorDetails(null);
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
      uploadFormData.append('type', 'vendor_po');

      const response = await api.post('/media/upload', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

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
        notes: ''
      });
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

  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vendor Payments</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Record Payment
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center">Loading...</td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Record Vendor Payment</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
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
    </div>
  );
};

export default VendorPayments;

