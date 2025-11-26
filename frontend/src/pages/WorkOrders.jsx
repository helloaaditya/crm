import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { FiEye, FiX } from 'react-icons/fi';

const WorkOrders = () => {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'installation',
    startDate: '',
    expectedCompletionDate: '',
    estimatedCost: '',
    terms: '',
    notes: '',
    documents: []
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);

  useEffect(() => {
    fetchWorkOrders();
  }, [selectedStatus]);

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedStatus) params.status = selectedStatus;

      const response = await api.get('/work-orders', { params });
      setWorkOrders(response.data.data);
    } catch (error) {
      console.error('Error fetching work orders:', error);
      toast.error('Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size should be less than 10MB');
        return;
      }
      setUploadFile(file);
      toast.success(`File selected: ${file.name}`);
    }
  };

  const uploadToS3 = async () => {
    if (!uploadFile) return null;

    try {
      setUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append('file', uploadFile);

      const response = await api.post('/media/upload/work-order-doc', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('✅ Document uploaded to S3:', response.data.url);
      return response.data;
    } catch (error) {
      console.error('Error uploading to S3:', error);
      toast.error('Failed to upload file');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      let documents = [...(formData.documents || [])];

      // Upload file to S3 if a new file is selected
      if (uploadFile) {
        const uploadResult = await uploadToS3();
        if (!uploadResult) return; // Upload failed
        
        documents.push({
          name: uploadFile.name,
          url: uploadResult.url,
          fileSize: uploadFile.size,
          mimeType: uploadFile.type,
          uploadDate: new Date()
        });
      }

      const submitData = {
        ...formData,
        documents
      };

      if (editingOrder) {
        // Update existing work order
        await api.put(`/work-orders/${editingOrder._id}`, submitData);
        toast.success('Work order updated successfully!');
      } else {
        // Create new work order
        await api.post('/work-orders', submitData);
        toast.success('Work order created successfully!');
      }

      handleCloseModal();
      fetchWorkOrders();
    } catch (error) {
      console.error('Error saving work order:', error);
      toast.error(error.response?.data?.message || 'Failed to save work order');
    }
  };

  const handleView = (order) => {
    setViewingOrder(order);
    setShowViewModal(true);
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({
      title: order.title || '',
      description: order.description || '',
      type: order.type || 'installation',
      startDate: order.startDate ? order.startDate.split('T')[0] : '',
      expectedCompletionDate: order.expectedCompletionDate ? order.expectedCompletionDate.split('T')[0] : '',
      estimatedCost: order.estimatedCost || '',
      terms: order.terms || '',
      notes: order.notes || '',
      documents: order.documents || []
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this work order?')) {
      return;
    }

    try {
      await api.delete(`/work-orders/${id}`);
      toast.success('Work order deleted successfully');
      fetchWorkOrders();
    } catch (error) {
      console.error('Error deleting work order:', error);
      toast.error('Failed to delete work order');
    }
  };

  const handleDeleteDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
    toast.success('Document removed');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingOrder(null);
    setUploadFile(null);
    setFormData({
      title: '',
      description: '',
      type: 'installation',
      startDate: '',
      expectedCompletionDate: '',
      estimatedCost: '',
      terms: '',
      notes: '',
      documents: []
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      issued: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Work Orders</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Create Work Order
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Work Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8">Loading...</div>
        ) : workOrders.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No work orders found
          </div>
        ) : (
          workOrders.map((wo) => (
            <div key={wo._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{wo.title}</h3>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(wo.status)}`}>
                  {wo.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div>
                  <span className="font-medium">ID:</span> {wo.workOrderId}
                </div>
                <div>
                  <span className="font-medium">Type:</span> {wo.type.replace('_', ' ').toUpperCase()}
                </div>
                {wo.estimatedCost && (
                  <div>
                    <span className="font-medium">Estimated Cost:</span> ₹{wo.estimatedCost.toLocaleString()}
                  </div>
                )}
                {wo.issueDate && (
                  <div>
                    <span className="font-medium">Issue Date:</span> {format(new Date(wo.issueDate), 'dd MMM yyyy')}
                  </div>
                )}
                {wo.expectedCompletionDate && (
                  <div>
                    <span className="font-medium">Expected Completion:</span> {format(new Date(wo.expectedCompletionDate), 'dd MMM yyyy')}
                  </div>
                )}
              </div>

              {wo.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {wo.description}
                </p>
              )}

              {wo.documents && wo.documents.length > 0 && (
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {wo.documents.length} Document(s)
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={() => handleView(wo)}
                  className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 text-sm font-medium"
                >
                  👁️ View
                </button>
                <button
                  onClick={() => handleEdit(wo)}
                  className="flex-1 bg-green-50 text-green-600 px-3 py-2 rounded-lg hover:bg-green-100 text-sm font-medium"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(wo._id)}
                  className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 text-sm font-medium"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingOrder ? 'Edit Work Order' : 'Create Work Order'}</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Installation at Site ABC"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="installation">Installation</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="repair">Repair</option>
                  <option value="inspection">Inspection</option>
                  <option value="supply">Supply</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="Work order description..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Completion
                  </label>
                  <input
                    type="date"
                    name="expectedCompletionDate"
                    value={formData.expectedCompletionDate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Cost
                </label>
                <input
                  type="number"
                  name="estimatedCost"
                  value={formData.estimatedCost}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="₹"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {/* Document Upload Section */}
              <div className="border-t pt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attach Document
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                {uploadFile && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ {uploadFile.name} ({(uploadFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}

                {/* Attached Documents List */}
                {formData.documents && formData.documents.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium text-gray-700">Attached ({formData.documents.length}):</p>
                    {formData.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded text-xs">
                        <span className="truncate">📎 {doc.name}</span>
                        <div className="flex gap-2 ml-2">
                          {doc.url && (
                            <button
                              type="button"
                              onClick={() => window.open(doc.url, '_blank')}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              View
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm w-full sm:w-auto order-1 sm:order-2"
                >
                  {uploading ? 'Uploading...' : editingOrder ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Work Order Modal */}
      {showViewModal && viewingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mobile-modal">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-800">Work Order Details</h2>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <p className="text-gray-900">{viewingOrder.title || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <p className="text-gray-900 capitalize">{viewingOrder.type || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    viewingOrder.status === 'completed' ? 'bg-green-100 text-green-800' :
                    viewingOrder.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    viewingOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {viewingOrder.status ? viewingOrder.status.replace('_', ' ') : 'N/A'}
                  </span>
                </div>
                {viewingOrder.startDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <p className="text-gray-900">{format(new Date(viewingOrder.startDate), 'MMM dd, yyyy')}</p>
                  </div>
                )}
                {viewingOrder.expectedCompletionDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected Completion Date</label>
                    <p className="text-gray-900">{format(new Date(viewingOrder.expectedCompletionDate), 'MMM dd, yyyy')}</p>
                  </div>
                )}
                {viewingOrder.estimatedCost && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost</label>
                    <p className="text-gray-900">₹{viewingOrder.estimatedCost.toLocaleString()}</p>
                  </div>
                )}
              </div>

              {viewingOrder.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{viewingOrder.description}</p>
                </div>
              )}

              {viewingOrder.terms && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Terms</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{viewingOrder.terms}</p>
                </div>
              )}

              {viewingOrder.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{viewingOrder.notes}</p>
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
  );
};

export default WorkOrders;

