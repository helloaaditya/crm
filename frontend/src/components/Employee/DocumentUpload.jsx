import { useState } from 'react';
import { FiUpload, FiX, FiFile, FiDownload, FiTrash2, FiCheckCircle, FiClock } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { format } from 'date-fns';

const DocumentUpload = ({ employee, onSuccess }) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    documentType: 'certificate',
    documentName: '',
    file: null,
    expiryDate: '',
    notes: ''
  });

  const documentTypes = [
    { value: 'aadhar', label: 'Aadhar Card' },
    { value: 'pan', label: 'PAN Card' },
    { value: 'driving_license', label: 'Driving License' },
    { value: 'certificate', label: 'Certificate' },
    { value: 'experience_letter', label: 'Experience Letter' },
    { value: 'offer_letter', label: 'Offer Letter' },
    { value: 'relieving_letter', label: 'Relieving Letter' },
    { value: 'educational_document', label: 'Educational Document' },
    { value: 'medical_certificate', label: 'Medical Certificate' },
    { value: 'police_verification', label: 'Police Verification' },
    { value: 'other', label: 'Other' }
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        toast.error('Only PDF, JPG, and PNG files are allowed');
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should be less than 5MB');
        return;
      }

      setFormData(prev => ({ ...prev, file }));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!formData.file) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!formData.documentName.trim()) {
      toast.error('Please enter document name');
      return;
    }

    setUploading(true);

    try {
      // First upload the file to S3
      const uploadFormData = new FormData();
      uploadFormData.append('file', formData.file);

      const uploadResponse = await api.post('/media/upload/employee-document', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Then save document details to employee
      await api.post(`/employee/employees/${employee._id}/documents`, {
        name: formData.documentName,
        type: formData.documentType,
        url: uploadResponse.data.url,
        fileSize: formData.file.size,
        mimeType: formData.file.type,
        expiryDate: formData.expiryDate || null,
        notes: formData.notes
      });

      toast.success('Document uploaded successfully!');
      setShowUploadModal(false);
      setFormData({
        documentType: 'certificate',
        documentName: '',
        file: null,
        expiryDate: '',
        notes: ''
      });
      onSuccess();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await api.delete(`/employee/employees/${employee._id}/documents/${documentId}`);
      toast.success('Document deleted successfully');
      onSuccess();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const getDocumentIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('image')) return '🖼️';
    return '📎';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Documents</h3>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <FiUpload className="mr-2" />
          Upload Document
        </button>
      </div>

      {/* Documents List */}
      <div className="space-y-3">
        {employee.documents && employee.documents.length > 0 ? (
          employee.documents.map((doc) => (
            <div
              key={doc._id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="text-2xl">{getDocumentIcon(doc.mimeType)}</div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">{doc.name}</h4>
                    {doc.isVerified && (
                      <span className="flex items-center text-xs text-green-600">
                        <FiCheckCircle className="mr-1" /> Verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-500 mt-1">
                    <span className="capitalize">{doc.type?.replace('_', ' ')}</span>
                    {doc.uploadDate && (
                      <span>Uploaded: {format(new Date(doc.uploadDate), 'dd MMM yyyy')}</span>
                    )}
                    {doc.expiryDate && (
                      <span className="flex items-center text-orange-600">
                        <FiClock className="mr-1" />
                        Expires: {format(new Date(doc.expiryDate), 'dd MMM yyyy')}
                      </span>
                    )}
                  </div>
                  {doc.notes && (
                    <p className="text-xs text-gray-600 mt-1">{doc.notes}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  title="Download"
                >
                  <FiDownload />
                </a>
                <button
                  onClick={() => handleDelete(doc._id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FiFile className="mx-auto text-4xl mb-2" />
            <p>No documents uploaded yet</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-gray-800">Upload Document</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.documentType}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentType: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {documentTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.documentName}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentName: e.target.value }))}
                  required
                  placeholder="e.g., B.Tech Degree Certificate"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload File <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Accepted: PDF, JPG, PNG (Max 5MB)
                </p>
                {formData.file && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ {formData.file.name} ({(formData.file.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date (if applicable)
                </label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows="2"
                  placeholder="Additional notes about this document..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;

