import { useState, useEffect } from 'react'
import { FiX, FiUpload, FiFile, FiLoader } from 'react-icons/fi'
import API from '../../api'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import SearchableSelect from '../SearchableSelect'

const QuotationModal = ({ isOpen, onClose, onSuccess, quotation = null }) => {
  const [customers, setCustomers] = useState([])
  const [projects, setProjects] = useState([])
  const [formData, setFormData] = useState({
    customer: '',
    project: ''
  })
  const [quotationFile, setQuotationFile] = useState(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [loading, setLoading] = useState(false)
  const [existingQuotationFileUrl, setExistingQuotationFileUrl] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchCustomers()
      fetchProjects()
      
      // Load quotation data if editing
      if (quotation) {
        setFormData({
          customer: quotation.customer?._id || quotation.customer || '',
          project: quotation.project?._id || quotation.project || ''
        })
        setExistingQuotationFileUrl(quotation.quotationFileUrl || '')
        setQuotationFile(null)
      } else {
        // Reset form when creating new
        setFormData({
          customer: '',
          project: ''
        })
        setExistingQuotationFileUrl('')
        setQuotationFile(null)
      }
    }
  }, [isOpen, quotation])

  const fetchCustomers = async () => {
    try {
      const response = await API.customers.getAll({ limit: 10000, page: 1 })
      setCustomers(response.data.data)
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('Failed to load customers')
    }
  }

  const fetchProjects = async (customerId = null) => {
    try {
      const params = customerId ? { customer: customerId } : {}
      const response = await API.projects.getAll(params)
      setProjects(response.data.data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to load projects')
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Update projects when customer changes
    if (name === 'customer') {
      fetchProjects(value || null)
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ]
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xls|xlsx|doc|docx|pdf|txt|jpg|jpeg|png)$/i)) {
      toast.error('Please upload Excel, PDF, Word, or image files only')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setQuotationFile(file)
    toast.success('File selected: ' + file.name)
  }

  const uploadQuotationFile = async () => {
    if (!quotationFile) {
      console.error('❌ No quotation file to upload')
      return null
    }

    try {
      setUploadingFile(true)
      console.log('📤 Starting file upload:', quotationFile.name, quotationFile.size, 'bytes')
      const uploadFormData = new FormData()
      uploadFormData.append('file', quotationFile)

      const response = await api.post('/media/upload/quotation-files', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      console.log('✅ Upload response:', response.data)
      const fileUrl = response.data.url
      console.log('📄 Extracted file URL:', fileUrl)
      
      if (!fileUrl) {
        console.error('❌ No URL in upload response:', response.data)
        toast.error('Upload succeeded but no file URL returned')
        return null
      }

      return fileUrl
    } catch (error) {
      console.error('❌ Error uploading quotation file:', error)
      console.error('❌ Error details:', error.response?.data || error.message)
      toast.error(error.response?.data?.message || 'Failed to upload quotation file')
      return null
    } finally {
      setUploadingFile(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.customer) {
      toast.error('Please select a customer')
      return
    }

    // For new quotations, file is required. For editing, use existing file if no new file uploaded
    if (!quotation && !quotationFile) {
      toast.error('Please upload a quotation file')
      return
    }

    setLoading(true)

    try {
      let quotationFileUrl = existingQuotationFileUrl
      
      // Upload new file if one was selected
      if (quotationFile) {
        console.log('🔄 Starting file upload...')
        quotationFileUrl = await uploadQuotationFile()
        
        if (!quotationFileUrl) {
          console.error('❌ File upload failed or returned no URL')
          setLoading(false)
          toast.error('File upload failed. Please try again.')
          return
        }
        console.log('✅ Uploaded quotation file URL:', quotationFileUrl)
      }

      // Prepare quotation data
      const quotationData = {
        customer: formData.customer,
        project: formData.project || undefined,
        invoiceType: 'quotation',
        billType: 'service_bill',
        isGST: true,
        items: quotation?.items || [], // Keep existing items if editing
        subtotal: quotation?.subtotal || 0,
        cgst: quotation?.cgst || 0,
        sgst: quotation?.sgst || 0,
        igst: quotation?.igst || 0,
        discount: quotation?.discount || 0,
        totalAmount: quotation?.totalAmount || 0,
        quotationFileUrl: quotationFileUrl // Use new or existing URL
      }

      if (quotation) {
        // Update existing quotation
        console.log('📝 Updating quotation:', quotation._id)
        const response = await API.invoices.update(quotation._id, quotationData)
        toast.success(`Quotation updated! Number: ${response.data.data.quotationNumber || response.data.data.invoiceNumber}`)
      } else {
        // Create new quotation
        console.log('📝 Creating new quotation')
        const response = await API.invoices.create(quotationData)
        toast.success(`Quotation created! Number: ${response.data.data.quotationNumber || response.data.data.invoiceNumber}`)
      }
      
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving quotation:', error)
      toast.error(error.response?.data?.message || `Failed to ${quotation ? 'update' : 'create'} quotation`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mobile-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">
            {quotation ? 'Edit Quotation' : 'Create New Quotation'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1">
            <FiX size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 mobile-modal-content">
          {/* Customer & Project Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={customers.map(c => ({ value: c._id, label: `${c.name} - ${c.contactNumber || ''}` }))}
                value={formData.customer}
                onChange={(val) => handleChange({ target: { name: 'customer', value: val, type: 'text' } })}
                placeholder="Select Customer"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project (Optional)
              </label>
              <SearchableSelect
                options={projects.map(p => ({ 
                  value: p._id, 
                  label: `${p.projectId} - ${p.customer?.name || 'No Customer'} - ${p.description?.substring(0, 20) || ''}...` 
                }))}
                value={formData.project}
                onChange={(val) => handleChange({ target: { name: 'project', value: val, type: 'text' } })}
                placeholder="Select Project (Optional)"
              />
            </div>
          </div>

          {/* File Upload */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Quotation File {!quotation && <span className="text-red-500">*</span>}
            </label>
            <div className="space-y-2">
              {existingQuotationFileUrl && !quotationFile && (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FiFile className="text-green-600" size={20} />
                    <a
                      href={existingQuotationFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-700 hover:underline"
                    >
                      Current Quotation File
                    </a>
                  </div>
                  <span className="text-xs text-green-600">(Existing)</span>
                </div>
              )}
              {quotationFile && (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FiFile className="text-blue-600" size={20} />
                    <span className="text-sm text-blue-700">{quotationFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuotationFile(null)}
                    className="text-red-600 hover:text-red-800"
                    title="Remove file"
                  >
                    <FiX size={18} />
                  </button>
                </div>
              )}
              {!quotationFile && (
                <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FiUpload className="text-gray-400 mb-2" size={24} />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      Excel, PDF, Word, Images (MAX. 10MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".xls,.xlsx,.doc,.docx,.pdf,.txt,.jpg,.jpeg,.png"
                    className="hidden"
                    disabled={uploadingFile || loading}
                    required={!quotation}
                  />
                </label>
              )}
              {uploadingFile && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <FiLoader className="animate-spin text-blue-600" size={20} />
                  <span className="text-sm text-blue-700">Uploading file...</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {quotation ? 'Upload a new file to replace the existing one, or leave empty to keep the current file.' : 'Upload your quotation file. You can add items and details when converting to invoice.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading || uploadingFile}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadingFile}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[120px]"
            >
              {loading || uploadingFile ? (
                <>
                  <FiLoader className="animate-spin" size={16} />
                  {uploadingFile ? 'Uploading...' : 'Creating...'}
                </>
              ) : (
                quotation ? 'Update Quotation' : 'Create Quotation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default QuotationModal

