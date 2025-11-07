import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const CompanyDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'legal',
    subCategory: '',
    documentType: 'pdf',
    url: '',
    effectiveDate: '',
    expiryDate: '',
    accessLevel: 'internal',
    tags: '',
    notes: ''
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, [selectedCategory]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory) params.category = selectedCategory;

      const response = await api.get('/company-documents', { params });
      setDocuments(response.data.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchDocuments();
      return;
    }

    try {
      const response = await api.get(`/company-documents/search?q=${searchQuery}`);
      setDocuments(response.data.data);
    } catch (error) {
      console.error('Error searching documents:', error);
      toast.error('Search failed');
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

      const response = await api.post('/media/upload/company-doc', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('✅ Document uploaded to S3:', response.data.url);
      return response.data.url;
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

    if (!uploadFile && !editingDoc) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      let documentUrl = formData.url;

      // Upload file to S3 if a new file is selected
      if (uploadFile) {
        documentUrl = await uploadToS3();
        if (!documentUrl) return; // Upload failed
      }

      const submitData = {
        ...formData,
        url: documentUrl,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      };

      if (editingDoc) {
        // Update existing document
        await api.put(`/company-documents/${editingDoc._id}`, submitData);
        toast.success('Document updated successfully!');
      } else {
        // Create new document
        await api.post('/company-documents', submitData);
        toast.success('Document uploaded successfully!');
      }

      handleCloseModal();
      fetchDocuments();
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error(error.response?.data?.message || 'Failed to save document');
    }
  };

  const handleEdit = (doc) => {
    setEditingDoc(doc);
    setFormData({
      name: doc.name || '',
      description: doc.description || '',
      category: doc.category || 'legal',
      subCategory: doc.subCategory || '',
      documentType: doc.documentType || 'pdf',
      url: doc.url || '',
      effectiveDate: doc.effectiveDate ? doc.effectiveDate.split('T')[0] : '',
      expiryDate: doc.expiryDate ? doc.expiryDate.split('T')[0] : '',
      accessLevel: doc.accessLevel || 'internal',
      tags: doc.tags ? doc.tags.join(', ') : '',
      notes: doc.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await api.delete(`/company-documents/${id}`);
      toast.success('Document deleted successfully');
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDoc(null);
    setUploadFile(null);
    setFormData({
      name: '',
      description: '',
      category: 'legal',
      subCategory: '',
      documentType: 'pdf',
      url: '',
      effectiveDate: '',
      expiryDate: '',
      accessLevel: 'internal',
      tags: '',
      notes: ''
    });
  };

  const categories = [
    { value: 'legal', label: 'Legal' },
    { value: 'financial', label: 'Financial' },
    { value: 'hr', label: 'HR' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'contracts', label: 'Contracts' },
    { value: 'policies', label: 'Policies' },
    { value: 'certificates', label: 'Certificates' },
    { value: 'licenses', label: 'Licenses' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'tax', label: 'Tax' },
    { value: 'audit', label: 'Audit' },
    { value: 'project', label: 'Project' },
    { value: 'vendor', label: 'Vendor' },
    { value: 'customer', label: 'Customer' },
    { value: 'other', label: 'Other' }
  ];

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      archived: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Company Documents</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Upload Document
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="flex">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search documents..."
                className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2"
              />
              <button
                onClick={handleSearch}
                className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700"
              >
                Search
              </button>
            </div>
          </div>
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8">Loading...</div>
        ) : documents.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No documents found
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{doc.name}</h3>
                  <span className="text-xs text-gray-500">{doc.documentId}</span>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(doc.status)}`}>
                  {doc.status}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div>
                  <span className="font-medium">Category:</span> {doc.category.toUpperCase()}
                </div>
                <div>
                  <span className="font-medium">Type:</span> {doc.documentType.toUpperCase()}
                </div>
                {doc.uploadDate && (
                  <div>
                    <span className="font-medium">Uploaded:</span> {format(new Date(doc.uploadDate), 'dd MMM yyyy')}
                  </div>
                )}
                {doc.expiryDate && (
                  <div>
                    <span className="font-medium">Expires:</span> {format(new Date(doc.expiryDate), 'dd MMM yyyy')}
                  </div>
                )}
                {doc.uploadedBy && (
                  <div>
                    <span className="font-medium">By:</span> {doc.uploadedBy.name}
                  </div>
                )}
              </div>

              {doc.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {doc.description}
                </p>
              )}

              {doc.tags && doc.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {doc.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                  {doc.tags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded">
                      +{doc.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              <div className="flex space-x-2">
                {doc.url && (
                  <button
                    onClick={() => window.open(doc.url, '_blank')}
                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 text-sm font-medium"
                  >
                    📄 View
                  </button>
                )}
                <button
                  onClick={() => handleEdit(doc)}
                  className="flex-1 bg-green-50 text-green-600 px-3 py-2 rounded-lg hover:bg-green-100 text-sm font-medium"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(doc._id)}
                  className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 text-sm font-medium"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingDoc ? 'Edit Document' : 'Upload Document'}</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload File {!editingDoc && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
                {uploadFile && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ {uploadFile.name} ({(uploadFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
                {editingDoc && !uploadFile && formData.url && (
                  <p className="text-sm text-gray-500 mt-1">
                    Current file: {formData.url.split('/').pop()}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Supported: PDF, DOC, DOCX, JPG, PNG, XLSX (Max 10MB)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Type *
                  </label>
                  <select
                    name="documentType"
                    value={formData.documentType}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="pdf">PDF</option>
                    <option value="word">Word</option>
                    <option value="excel">Excel</option>
                    <option value="image">Image</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sub Category
                </label>
                <input
                  type="text"
                  name="subCategory"
                  value={formData.subCategory}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
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
                  placeholder="Brief description..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Access Level
                  </label>
                  <select
                    name="accessLevel"
                    value={formData.accessLevel}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="internal">Internal</option>
                    <option value="confidential">Confidential</option>
                    <option value="public">Public</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="policy, hr, 2025"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
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
                  {uploading ? 'Uploading...' : editingDoc ? 'Update' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDocuments;

