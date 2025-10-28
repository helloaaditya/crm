import { useState, useEffect } from 'react'
import { FiX } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'
import SearchableSelect from '../SearchableSelect'

const ReturnStockModal = ({ isOpen, onClose, onSuccess, material }) => {
  const [formData, setFormData] = useState({
    quantity: '',
    invoiceId: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [invoices, setInvoices] = useState([])

  useEffect(() => {
    if (isOpen && material) {
      setFormData({
        quantity: '',
        invoiceId: '',
        notes: ''
      })
      fetchInvoices()
    }
  }, [isOpen, material])

  const fetchInvoices = async () => {
    try {
      const response = await API.invoices.getAll({ limit: 100 })
      setInvoices(response.data.data || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
      toast.error('Failed to load invoices')
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!formData.quantity || isNaN(formData.quantity) || parseFloat(formData.quantity) <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }
    
    if (!formData.invoiceId) {
      toast.error('Please select an invoice')
      return
    }
    
    if (!formData.notes.trim()) {
      toast.error('Please enter a reason for return')
      return
    }

    setLoading(true)

    try {
      await API.inventory.returnMaterial(material._id, {
        quantity: parseFloat(formData.quantity),
        invoiceId: formData.invoiceId,
        reference: 'Material Return',
        notes: formData.notes
      })
      
      toast.success(`${formData.quantity} ${material.unit} returned to stock`)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error returning material:', error)
      toast.error(error.response?.data?.message || 'Failed to return material')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !material) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-800">Return Stock</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material
              </label>
              <div className="px-3 py-2 bg-gray-100 rounded-lg">
                <div className="font-medium">{material.name}</div>
                <div className="text-sm text-gray-600">{material.materialId}</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="0.01"
                step="0.01"
                placeholder={`Enter quantity in ${material.unit}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <div className="text-sm text-gray-500 mt-1">
                Available stock: {material.quantity} {material.unit}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={invoices.map(inv => ({ value: inv._id, label: `${inv.invoiceNumber} - ${inv.customer?.name || ''}` }))}
                value={formData.invoiceId}
                onChange={(val) => setFormData(prev => ({ ...prev, invoiceId: val }))}
                placeholder="Select Invoice"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Return <span className="text-red-500">*</span>
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Enter reason for return"
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Return Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ReturnStockModal