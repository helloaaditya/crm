import { useState, useEffect } from 'react'
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'
import SearchableSelect from '../SearchableSelect'

const InvoiceModal = ({ isOpen, onClose, onSuccess, invoice = null }) => {
  const [customers, setCustomers] = useState([])
  const [projects, setProjects] = useState([])
  const [materials, setMaterials] = useState([])
  const [formData, setFormData] = useState({
    customer: '',
    project: '',
    invoiceType: 'tax_invoice',
    isGST: true,
    gstNumber: '',
    items: [{ material: '', description: '', quantity: 1, unit: 'pcs', rate: 0, gstRate: 18, stockAvailable: undefined }],
    discount: 0,
    dueDate: '',
    terms: 'Payment due within 30 days',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  // Load invoice data when editing
  useEffect(() => {
    if (invoice) {
      setFormData({
        customer: invoice.customer?._id || '',
        project: invoice.project?._id || '',
        invoiceType: invoice.invoiceType || 'tax_invoice',
        isGST: invoice.isGST ?? true,
        gstNumber: invoice.gstNumber || '',
        items: invoice.items?.map(item => ({
          material: item.material?._id || '',
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
    } else {
      // Reset form when adding new
      setFormData({
        customer: '',
        project: '',
        invoiceType: 'tax_invoice',
        isGST: true,
        gstNumber: '',
        items: [{ material: '', description: '', quantity: 1, unit: 'pcs', rate: 0, gstRate: 18, stockAvailable: undefined }],
        discount: 0,
        dueDate: '',
        terms: 'Payment due within 30 days',
        notes: ''
      })
    }
  }, [invoice, isOpen])

  useEffect(() => {
    if (isOpen) {
      fetchCustomers()
      fetchMaterials()
    }
  }, [isOpen])

  useEffect(() => {
    if (formData.customer) {
      fetchProjects(formData.customer)
    }
  }, [formData.customer])

  const fetchCustomers = async () => {
    try {
      const response = await API.customers.getAll({ limit: 100 })
      setCustomers(response.data.data)
    } catch (error) {
      console.error('Error fetching customers:', error)
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

  const fetchProjects = async (customerId) => {
    try {
      const response = await API.projects.getAll({ limit: 100 })
      const customerProjects = response.data.data.filter(p => p.customer._id === customerId)
      setProjects(customerProjects)
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // If we're in view mode, don't submit
    if (invoice) {
      onClose();
      return;
    }
    
    setLoading(true)

    // Check if any items have insufficient stock
    const insufficientStockItems = formData.items.filter(item => 
      item.material && item.stockAvailable !== undefined && item.quantity > item.stockAvailable
    )

    if (insufficientStockItems.length > 0) {
      toast.error('Please correct stock quantities before submitting')
      setLoading(false)
      return
    }

    try {
      const { subtotal, cgst, sgst, totalAmount } = calculateTotals()

      // Prepare items with calculated amounts
      const preparedItems = formData.items.map(item => ({
        ...(item.material && { material: item.material }), // Only include material if selected
        description: item.description,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        rate: parseFloat(item.rate),
        amount: parseFloat(item.quantity) * parseFloat(item.rate),
        gstRate: parseFloat(item.gstRate || 0),
        gstAmount: ((parseFloat(item.quantity) * parseFloat(item.rate)) * parseFloat(item.gstRate || 0)) / 100
      }))

      const invoiceData = {
        customer: formData.customer,
        project: formData.project,
        invoiceType: formData.invoiceType,
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

      // Only create new invoices, no updates allowed
      const response = await API.invoices.create(invoiceData)
      toast.success(`Invoice created! Number: ${response.data.data.invoiceNumber}`)
      
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-800">
            {isViewMode ? 'View Invoice' : (invoice ? 'Edit Invoice' : 'Create New Invoice')}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Customer & Project Selection */}
          <div className="grid grid-cols-2 gap-4">
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
                options={projects.map(p => ({ value: p._id, label: `${p.projectId} - ${p.description?.substring(0, 30) || ''}...` }))}
                value={formData.project}
                onChange={(val) => handleChange({ target: { name: 'project', value: val, type: 'text' } })}
                placeholder="Select Project (Optional)"
                disabled={!formData.customer || isViewMode}
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
              <h3 className="text-sm font-semibold text-gray-700">Invoice Items</h3>
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

            <div className="space-y-2">
              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-start p-3 border rounded-lg">
                  <div className="col-span-3 relative">
                    <SearchableSelect
                      options={materials.map(m => ({ value: m._id, label: `${m.name} - Stock: ${m.quantity} ${m.unit}` }))}
                      value={item.material}
                      onChange={(val) => handleItemChange(index, 'material', val)}
                      placeholder="Select Material"
                      disabled={isViewMode}
                      required
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
                    required
                    disabled={isViewMode}
                    className={`col-span-2 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  <div className="col-span-1 relative">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      required
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
                    <option value="sqft">Sqft</option>
                    <option value="box">Box</option>
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
                disabled={loading}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : invoice ? 'Update Invoice' : 'Create Invoice'}
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
