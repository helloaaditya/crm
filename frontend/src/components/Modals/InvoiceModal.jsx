import { useState, useEffect } from 'react'
import { FiX, FiPlus, FiTrash2, FiUpload, FiFile, FiLoader } from 'react-icons/fi'
import API from '../../api'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import SearchableSelect from '../SearchableSelect'

const InvoiceModal = ({ isOpen, onClose, onSuccess, invoice = null, quotation = null }) => {
  const [customers, setCustomers] = useState([])
  const [projects, setProjects] = useState([])
  const [materials, setMaterials] = useState([])
  const [formData, setFormData] = useState({
    customer: '',
    project: '',
    invoiceType: 'tax_invoice',
    billType: 'service_bill',
    isGST: true,
    gstNumber: '',
    items: [{ material: '', description: '', quantity: 1, unit: 'pcs', rate: 0, gstRate: 18, stockAvailable: undefined }],
    discount: 0,
    dueDate: '',
    terms: 'Payment due within 30 days',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [quotationFile, setQuotationFile] = useState(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [quotationFileUrl, setQuotationFileUrl] = useState('')

  // Load invoice or quotation data when editing/converting
  useEffect(() => {
    if (quotation) {
      // Pre-fill form with quotation data for conversion
      setFormData({
        customer: quotation.customer?._id || quotation.customer || '',
        project: quotation.project?._id || quotation.project || '',
        invoiceType: 'tax_invoice', // Convert to tax invoice
        billType: quotation.billType || 'service_bill',
        isGST: quotation.isGST ?? true,
        gstNumber: quotation.gstNumber || '',
        items: [{ material: '', description: '', quantity: 1, unit: 'pcs', rate: 0, gstRate: 18, stockAvailable: undefined }], // Start with empty items
        discount: quotation.discount || 0,
        dueDate: quotation.dueDate?.split('T')[0] || '',
        terms: quotation.terms || 'Payment due within 30 days',
        notes: quotation.notes ? `${quotation.notes}\n\nConverted from Quotation: ${quotation.quotationNumber || quotation.invoiceNumber}` : `Converted from Quotation: ${quotation.quotationNumber || quotation.invoiceNumber}`
      })
      setQuotationFileUrl(quotation.quotationFileUrl || '')
      setQuotationFile(null)
    } else if (invoice) {
      setFormData({
        customer: invoice.customer?._id || invoice.customer || '',
        project: invoice.project?._id || invoice.project || '',
        invoiceType: invoice.invoiceType || 'tax_invoice',
        billType: invoice.billType || 'service_bill',
        isGST: invoice.isGST ?? true,
        gstNumber: invoice.gstNumber || '',
        items: invoice.items?.map(item => ({
          material: item.material?._id || item.material || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          unit: item.unit || 'pcs',
          rate: item.rate || 0,
          gstRate: item.gstRate || 18,
          stockAvailable: undefined // Will be set when material is selected
        })) || [{ material: '', description: '', quantity: 1, unit: 'pcs', rate: 0, gstRate: 18, stockAvailable: undefined }],
        discount: invoice.discount || 0,
        dueDate: invoice.dueDate?.split('T')[0] || '',
        terms: invoice.terms || 'Payment due within 30 days',
        notes: invoice.notes || ''
      })
      setQuotationFileUrl(invoice.quotationFileUrl || '')
      setQuotationFile(null)
    } else {
      // Reset form when adding new
      setFormData({
        customer: '',
        project: '',
        invoiceType: 'tax_invoice',
        billType: 'service_bill',
        isGST: true,
        gstNumber: '',
        items: [{ material: '', description: '', quantity: 1, unit: 'pcs', rate: 0, gstRate: 18, stockAvailable: undefined }],
        discount: 0,
        dueDate: '',
        terms: 'Payment due within 30 days',
        notes: ''
      })
      setQuotationFileUrl('')
      setQuotationFile(null)
    }
  }, [invoice, quotation, isOpen])

  useEffect(() => {
    if (isOpen) {
      fetchCustomers()
      fetchMaterials()
      // Fetch all projects when modal opens
      fetchProjects()
    }
  }, [isOpen])

  // Update projects when customer changes (optional filtering)
  useEffect(() => {
    if (formData.customer) {
      fetchProjects(formData.customer)
    } else {
      // If customer is cleared, show all projects
      fetchProjects()
    }
  }, [formData.customer])

  // Auto-load project items when Service Bill and project is selected (only if items are empty)
  useEffect(() => {
    if (formData.billType === 'service_bill' && formData.project && 
        (formData.items.length === 0 || (formData.items.length === 1 && !formData.items[0].material && !formData.items[0].description))) {
      // Only auto-load if items are empty or have default empty values
      loadProjectItems(formData.project)
    }
  }, [formData.project, formData.billType])

  const fetchCustomers = async () => {
    try {
      // Fetch all customers with a high limit to get all records
      const response = await API.customers.getAll({ limit: 10000, page: 1 })
      setCustomers(response.data.data)
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('Failed to load customers')
    }
  }

  const fetchMaterials = async () => {
    try {
      const response = await API.inventory.getMaterials({ limit: 1000, isActive: true })
      setMaterials(response.data.data || [])
    } catch (error) {
      console.error('Error fetching materials:', error)
    }
  }

  const fetchProjects = async (customerId = null) => {
    try {
      // Fetch all projects with a high limit to get all records
      const response = await API.projects.getAll({ limit: 10000, page: 1 })
      // If customer is selected, filter by customer, otherwise show all projects
      const filteredProjects = customerId 
        ? response.data.data.filter(p => p.customer?._id === customerId)
        : response.data.data
      setProjects(filteredProjects)
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to load projects')
    }
  }

  const loadProjectItems = async (projectId) => {
    try {
      const response = await API.projects.getById(projectId)
      const project = response.data.data
      
      // Load items from project's material requirements
      if (project.materialRequirements && project.materialRequirements.length > 0) {
        const projectItems = project.materialRequirements.map(item => ({
          material: item.material?._id || '',
          description: item.material?.name || 'Project Material',
          quantity: item.quantityRequired || 0,
          unit: item.unit || 'pcs',
          rate: item.material?.saleCost || 0,
          gstRate: 18,
          stockAvailable: item.material?.quantity
        }))
        
        setFormData(prev => ({
          ...prev,
          items: projectItems
        }))
        
        toast.success(`Loaded ${projectItems.length} item(s) from project`)
      } else {
        toast.info('No materials found in this project. Add items manually.')
      }
    } catch (error) {
      console.error('Error loading project items:', error)
      toast.error('Failed to load project items')
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    
    // If changing billType to sales_bill, reset items to allow manual entry
    if (name === 'billType' && value === 'sales_bill') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        items: [{ material: '', description: '', quantity: 1, unit: 'pcs', rate: 0, gstRate: 18, stockAvailable: undefined }]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items]
    newItems[index][field] = value
    
    // If material is selected, auto-fill details
    if (field === 'material' && value) {
      const selectedMaterial = materials.find(m => m._id === value)
      if (selectedMaterial) {
        newItems[index].description = selectedMaterial.name
        newItems[index].unit = selectedMaterial.unit
        newItems[index].rate = selectedMaterial.saleCost
        // Add stock information to the item for validation display
        newItems[index].stockAvailable = selectedMaterial.quantity
      }
    }
    
    // Calculate amount
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate
      newItems[index].gstAmount = (newItems[index].amount * newItems[index].gstRate) / 100
    }
    
    setFormData(prev => ({ ...prev, items: newItems }))
  }

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { material: '', description: '', quantity: 1, unit: 'pcs', rate: 0, gstRate: 18, stockAvailable: undefined }]
    }))
  }

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => {
      const amount = item.quantity * item.rate
      return sum + amount
    }, 0)

    const totalGST = formData.items.reduce((sum, item) => {
      const amount = item.quantity * item.rate
      const gst = (amount * (item.gstRate || 0)) / 100
      return sum + gst
    }, 0)

    const cgst = formData.isGST ? totalGST / 2 : 0
    const sgst = formData.isGST ? totalGST / 2 : 0
    const discount = parseFloat(formData.discount) || 0
    const totalAmount = subtotal + (formData.isGST ? totalGST : 0) - discount

    return { subtotal, cgst, sgst, totalAmount }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type - allow Excel, PDF, Word, and other common formats
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
    if (!quotationFile) return quotationFileUrl

    try {
      setUploadingFile(true)
      const uploadFormData = new FormData()
      uploadFormData.append('file', quotationFile)

      const response = await api.post('/media/upload/quotation-files', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      return response.data.url
    } catch (error) {
      console.error('Error uploading quotation file:', error)
      toast.error('Failed to upload quotation file')
      return null
    } finally {
      setUploadingFile(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    setLoading(true)

    // For quotations, items are optional - allow creation with just uploaded file
    if (formData.invoiceType === 'quotation') {
      // Check if quotation has either items or uploaded file
      const hasItems = formData.items && formData.items.length > 0 && 
        formData.items.some(item => (item.material || item.description) && item.quantity > 0 && item.rate > 0);
      const hasFile = quotationFile || quotationFileUrl;
      
      if (!hasItems && !hasFile) {
        toast.error('Please either add items or upload a quotation file')
        setLoading(false)
        return
      }
      
      // If quotation has items, validate stock (but don't require items)
      const insufficientStockItems = formData.items.filter(item => 
        item.material && item.stockAvailable !== undefined && item.quantity > item.stockAvailable
      )

      if (insufficientStockItems.length > 0) {
        toast.error('Please correct stock quantities before submitting')
        setLoading(false)
        return
      }
    } else {
      // For non-quotations, items are required
      // Check if any items have insufficient stock
      const insufficientStockItems = formData.items.filter(item => 
        item.material && item.stockAvailable !== undefined && item.quantity > item.stockAvailable
      )

      if (insufficientStockItems.length > 0) {
        toast.error('Please correct stock quantities before submitting')
        setLoading(false)
        return
      }
      
      // Validate that items exist for non-quotations
      const hasValidItems = formData.items && formData.items.length > 0 && 
        formData.items.some(item => (item.material || item.description) && item.quantity > 0 && item.rate > 0);
      
      if (!hasValidItems) {
        toast.error('At least one item is required')
        setLoading(false)
        return
      }
    }

    try {
      // Upload quotation file if it's a quotation and file is selected
      let finalQuotationFileUrl = quotationFileUrl
      if (formData.invoiceType === 'quotation' && quotationFile) {
        const uploadedUrl = await uploadQuotationFile()
        if (!uploadedUrl) {
          setLoading(false)
          return // Stop if upload failed
        }
        finalQuotationFileUrl = uploadedUrl
      }

      // For quotations without items, use empty array and zero amounts
      let preparedItems = [];
      let subtotal = 0;
      let cgst = 0;
      let sgst = 0;
      let totalAmount = 0;
      
      // Only calculate totals if there are valid items
      const hasValidItems = formData.items && formData.items.length > 0 && 
        formData.items.some(item => (item.material || item.description) && item.quantity > 0 && item.rate > 0);
      
      if (hasValidItems) {
        const calculated = calculateTotals();
        subtotal = calculated.subtotal;
        cgst = calculated.cgst;
        sgst = calculated.sgst;
        totalAmount = calculated.totalAmount;
        
        // Prepare items with calculated amounts
        preparedItems = formData.items
          .filter(item => (item.material || item.description) && item.quantity > 0 && item.rate > 0)
          .map(item => ({
            ...(item.material && { material: item.material }), // Only include material if selected
            description: item.description,
            quantity: parseFloat(item.quantity),
            unit: item.unit,
            rate: parseFloat(item.rate),
            amount: parseFloat(item.quantity) * parseFloat(item.rate),
            gstRate: parseFloat(item.gstRate || 0),
            gstAmount: ((parseFloat(item.quantity) * parseFloat(item.rate)) * parseFloat(item.gstRate || 0)) / 100
          }));
      }

      const invoiceData = {
        customer: formData.customer,
        project: formData.project,
        invoiceType: formData.invoiceType,
        billType: formData.billType,
        isGST: formData.isGST,
        gstNumber: formData.gstNumber,
        items: preparedItems,
        subtotal,
        cgst,
        sgst,
        igst: 0,
        discount: parseFloat(formData.discount) || 0,
        totalAmount,
        dueDate: formData.dueDate,
        terms: formData.terms,
        notes: formData.notes
      }

      // If converting from quotation, mark the quotation as converted
      if (quotation) {
        invoiceData.sourceQuotationId = quotation._id
        // Preserve quotation file URL if exists
        if (quotation.quotationFileUrl) {
          invoiceData.quotationFileUrl = quotation.quotationFileUrl
        }
      }

      // If editing an invoice, update it. Otherwise create new.
      // Check if we have an invoice to edit (and it's not a quotation conversion)
      const isEditingInvoice = invoice && !quotation && invoice.invoiceType !== 'quotation'
      
      if (isEditingInvoice) {
        // Update existing invoice (including converted invoices)
        const response = await API.invoices.update(invoice._id, invoiceData)
        toast.success(`Invoice updated! Number: ${response.data.data.invoiceNumber}`)
      } else {
        // Create new invoice
        const response = await API.invoices.create(invoiceData)
        toast.success(`Invoice created! Number: ${response.data.data.invoiceNumber}`)
        
        // Mark quotation as converted if converting
        if (quotation) {
          try {
            await API.invoices.update(quotation._id, {
              isConvertedToInvoice: true,
              convertedInvoiceId: response.data.data._id,
              status: 'sent'
            })
          } catch (error) {
            console.error('Error marking quotation as converted:', error)
            // Don't fail the invoice creation if this fails
          }
        }
      }
      
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving invoice:', error)
      // Handle stock validation errors
      if (error.response?.data?.errors) {
        const stockErrors = error.response.data.errors
        stockErrors.forEach(err => toast.error(err))
      } else {
        toast.error(error.response?.data?.message || 'Failed to save invoice')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  // Determine if we're in view mode (when invoice is provided but we're not editing)
  const isViewMode = !!invoice;

  const { subtotal, cgst, sgst, totalAmount } = calculateTotals()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto mobile-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">
            {isViewMode 
              ? `View ${formData.invoiceType === 'quotation' ? 'Quotation' : 'Invoice'}` 
              : quotation
                ? `Convert Quotation to Invoice`
                : invoice 
                  ? `Edit ${formData.invoiceType === 'quotation' ? 'Quotation' : 'Invoice'}` 
                  : `Create New Invoice`
            }
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
                disabled={isViewMode}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project
              </label>
              <SearchableSelect
                options={projects.map(p => ({ 
                  value: p._id, 
                  label: `${p.projectId} - ${p.customer?.name || 'No Customer'} - ${p.description?.substring(0, 20) || ''}...` 
                }))}
                value={formData.project}
                onChange={(val) => handleChange({ target: { name: 'project', value: val, type: 'text' } })}
                placeholder="Select Project (Optional)"
                disabled={isViewMode}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Type <span className="text-red-500">*</span>
              </label>
              <select
                name="invoiceType"
                value={formData.invoiceType}
                onChange={handleChange}
                required
                disabled={isViewMode}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="quotation">Quotation</option>
                <option value="proforma">Proforma Invoice</option>
                <option value="tax_invoice">Tax Invoice</option>
                <option value="final">Final Invoice</option>
                <option value="dc">DC (Delivery Challan)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bill Type <span className="text-red-500">*</span>
              </label>
              <select
                name="billType"
                value={formData.billType}
                onChange={handleChange}
                required
                disabled={isViewMode}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="service_bill">Service Bill</option>
                <option value="sales_bill">Sales Bill</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                disabled={isViewMode}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            </div>

            <div className="col-span-2 flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isGST"
                  checked={formData.isGST}
                  onChange={handleChange}
                  disabled={isViewMode}
                  className={`mr-2 ${isViewMode ? 'cursor-not-allowed' : ''}`}
                />
                <span className="text-sm font-medium text-gray-700">Include GST</span>
              </label>
              {formData.isGST && (
                <input
                  type="text"
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleChange}
                  placeholder="Customer GST Number"
                  disabled={isViewMode}
                  className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
              )}
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">
                {formData.invoiceType === 'quotation' ? 'Quotation Items (Optional)' : 'Invoice Items'}
                {formData.invoiceType === 'quotation' && (
                  <span className="text-xs text-gray-500 font-normal ml-2">
                    - You can upload a file instead
                  </span>
                )}
              </h3>
              {!isViewMode && (
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center px-3 py-1 text-sm bg-primary text-white rounded hover:bg-blue-700"
                >
                  <FiPlus className="mr-1" size={16} />
                  Add Item
                </button>
              )}
            </div>

            {/* Info message for Service Bill */}
            {formData.billType === 'service_bill' && formData.project && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  ℹ️ <strong>Service Bill:</strong> Items can be automatically loaded from the selected project's materials, or you can add items manually.
                </p>
                {formData.items.length === 0 || (formData.items.length === 1 && !formData.items[0].material) && (
                  <button
                    type="button"
                    onClick={() => loadProjectItems(formData.project)}
                    className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Load Project Items
                  </button>
                )}
              </div>
            )}

            {/* Info message for Sales Bill */}
            {formData.billType === 'sales_bill' && (
              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  📦 <strong>Sales Bill:</strong> Add items manually from inventory or custom items.
                </p>
              </div>
            )}

            {/* Info message for Quotations */}
            {formData.invoiceType === 'quotation' && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  📄 <strong>Quotation:</strong> Items are optional. You can either add items below or upload a quotation file. Both are optional, but at least one should be provided.
                </p>
              </div>
            )}

            <div className="space-y-2">
              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-start p-3 border rounded-lg">
                  <div className="col-span-3 relative">
                    <SearchableSelect
                      options={materials.map(m => ({ value: m._id, label: `${m.name} - Stock: ${m.quantity} ${m.unit}` }))}
                      value={item.material}
                      onChange={(val) => handleItemChange(index, 'material', val)}
                      placeholder="Select Material (Optional)"
                      disabled={isViewMode}
                    />
                    {/* Stock warning indicator */}
                    {item.material && item.stockAvailable !== undefined && item.quantity > item.stockAvailable && !isViewMode && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        !
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    required={formData.invoiceType !== 'quotation'}
                    disabled={isViewMode}
                    className={`col-span-2 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  <div className="col-span-1 relative">
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    required={formData.invoiceType !== 'quotation'}
                    min="0.01"
                    step="0.01"
                    disabled={isViewMode}
                    className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary ${
                        item.material && item.stockAvailable !== undefined && item.quantity > item.stockAvailable && !isViewMode
                          ? 'border-red-500 bg-red-50' 
                          : ''
                      } ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    />
                    {/* Stock info display */}
                    {item.material && item.stockAvailable !== undefined && (
                      <div className="text-xs text-gray-500 mt-1">
                        Available: {item.stockAvailable} {item.unit}
                      </div>
                    )}
                    {/* Stock warning message */}
                    {item.material && item.stockAvailable !== undefined && item.quantity > item.stockAvailable && !isViewMode && (
                      <div className="text-xs text-red-500 mt-1">
                        Insufficient stock!
                      </div>
                    )}
                  </div>
                  <select
                    value={item.unit}
                    onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                    disabled={isViewMode}
                    className={`col-span-1 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="pcs">Pcs</option>
                    <option value="kg">Kg</option>
                    <option value="ltr">Ltr</option>
                    <option value="litre">Litre</option>
                    <option value="grams">Grams</option>
                    <option value="box">Box</option>
                    <option value="bag">Bag</option>
                    <option value="kit">KIT</option>
                    <option value="sqft">Sqft</option>
                    <option value="sqm">Sqm</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Rate"
                    value={item.rate}
                    onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    disabled={isViewMode}
                    className={`col-span-2 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  {formData.isGST && (
                    <input
                      type="number"
                      placeholder="GST%"
                      value={item.gstRate}
                      onChange={(e) => handleItemChange(index, 'gstRate', e.target.value)}
                      min="0"
                      max="28"
                      disabled={isViewMode}
                      className={`col-span-1 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    />
                  )}
                  {!isViewMode && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="col-span-1 p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Remove item"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-medium">₹{subtotal.toFixed(2)}</span>
            </div>
            {formData.isGST && (
              <>
                <div className="flex justify-between text-sm">
                  <span>CGST:</span>
                  <span className="font-medium">₹{cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>SGST:</span>
                  <span className="font-medium">₹{sgst.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm">Discount:</span>
              <input
                type="number"
                name="discount"
                value={formData.discount}
                onChange={handleChange}
                min="0"
                step="0.01"
                disabled={isViewMode}
                className={`w-32 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total Amount:</span>
              <span className="text-primary">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Terms & Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Terms & Conditions
              </label>
              <textarea
                name="terms"
                value={formData.terms}
                onChange={handleChange}
                rows="2"
                disabled={isViewMode}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="2"
                disabled={isViewMode}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>

          {/* Quotation File Upload - Only for quotations */}
          {formData.invoiceType === 'quotation' && (
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Quotation File (Excel, PDF, Word, etc.)
              </label>
              <div className="space-y-2">
                {quotationFileUrl && !quotationFile && (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FiFile className="text-green-600" size={20} />
                      <a
                        href={quotationFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-700 hover:underline"
                      >
                        View Uploaded File
                      </a>
                    </div>
                    {!isViewMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuotationFileUrl('')
                          setQuotationFile(null)
                        }}
                        className="text-red-600 hover:text-red-800"
                        title="Remove file"
                      >
                        <FiX size={18} />
                      </button>
                    )}
                  </div>
                )}
                {quotationFile && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FiFile className="text-blue-600" size={20} />
                      <span className="text-sm text-blue-700">{quotationFile.name}</span>
                    </div>
                    {!isViewMode && (
                      <button
                        type="button"
                        onClick={() => setQuotationFile(null)}
                        className="text-red-600 hover:text-red-800"
                        title="Remove file"
                      >
                        <FiX size={18} />
                      </button>
                    )}
                  </div>
                )}
                {!isViewMode && !quotationFileUrl && !quotationFile && (
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
                Upload your quotation file manually. This file will be attached to the quotation and preserved when converting to invoice.
              </p>
            </div>
          )}

          {/* Actions */}
          {!isViewMode && (
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || uploadingFile}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading || uploadingFile ? (
                  <>
                    <FiLoader className="animate-spin" size={16} />
                    {uploadingFile ? 'Uploading...' : 'Saving...'}
                  </>
                ) : (
                  invoice ? 'Update Invoice' : 'Create Invoice'
                )}
              </button>
            </div>
          )}
          
          {isViewMode && (
            <div className="flex justify-end pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default InvoiceModal
