import { useState, useEffect } from 'react'
import { FiX } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'

const MaterialModal = ({ isOpen, onClose, onSuccess, material = null }) => {
  const [vendors, setVendors] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    category: 'waterproofing',
    subCategory: '',
    brand: '',
    product: '',
    mrp: '',
    saleCost: '',
    quantity: 0,
    unit: 'pcs',
    minStockLevel: 10,
    batchCode: '',
    expiryDate: '',
    hsinNumber: '',
    vendor: ''
  })
  const [loading, setLoading] = useState(false)

  // Load material data when editing
  useEffect(() => {
    if (material) {
      setFormData({
        name: material.name || '',
        category: material.category || 'waterproofing',
        subCategory: material.subCategory || '',
        brand: material.brand || '',
        product: material.product || '',
        mrp: material.mrp || '',
        saleCost: material.saleCost || '',
        quantity: material.quantity || 0,
        unit: material.unit || 'pcs',
        minStockLevel: material.minStockLevel || 10,
        batchCode: material.batchCode || '',
        expiryDate: material.expiryDate?.split('T')[0] || '',
        hsinNumber: material.hsinNumber || '',
        vendor: material.vendor?._id || ''
      })
    } else {
      // Reset form when adding new
      setFormData({
        name: '',
        category: 'waterproofing',
        subCategory: '',
        brand: '',
        product: '',
        mrp: '',
        saleCost: '',
        quantity: 0,
        unit: 'pcs',
        minStockLevel: 10,
        batchCode: '',
        expiryDate: '',
        hsinNumber: '',
        vendor: ''
      })
    }
  }, [material, isOpen])

  useEffect(() => {
    if (isOpen) {
      fetchVendors()
    }
  }, [isOpen])

  const fetchVendors = async () => {
    try {
      const response = await API.inventory.getVendors({ limit: 100 })
      setVendors(response.data.data || [])
    } catch (error) {
      console.error('Error fetching vendors:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (material) {
        await API.inventory.updateMaterial(material._id, formData)
        toast.success('Material updated successfully!')
      } else {
        const response = await API.inventory.createMaterial(formData)
        toast.success(`Material created! ID: ${response.data.data.materialId}`)
      }
      
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving material:', error)
      toast.error(error.response?.data?.message || 'Failed to save material')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-800">
            {material ? 'Edit Material' : 'Add New Material'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Basic Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g., Dr. Fixit"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="waterproofing">Waterproofing</option>
                <option value="flooring">Flooring</option>
                <option value="painting">Painting</option>
                <option value="civil">Civil</option>
                <option value="tools">Tools</option>
                <option value="machinery">Machinery</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sub Category
              </label>
              <input
                type="text"
                name="subCategory"
                value={formData.subCategory}
                onChange={handleChange}
                placeholder="e.g., Liquid Coating"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="e.g., Pidilite"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product
              </label>
              <input
                type="text"
                name="product"
                value={formData.product}
                onChange={handleChange}
                placeholder="e.g., Dr. Fixit Newcoat"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor
              </label>
              <select
                name="vendor"
                value={formData.vendor}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Vendor</option>
                {vendors.map(vendor => (
                  <option key={vendor._id} value={vendor._id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MRP <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="mrp"
                value={formData.mrp}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="₹0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sale Cost <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="saleCost"
                value={formData.saleCost}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="₹0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Stock Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Stock {!material && <span className="text-red-500">*</span>}
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required={!material}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit <span className="text-red-500">*</span>
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="kg">Kg</option>
                <option value="ltr">Ltr</option>
                <option value="pcs">Pcs</option>
                <option value="box">Box</option>
                <option value="bag">Bag</option>
                <option value="sqft">Sqft</option>
                <option value="sqm">Sqm</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Stock Level
              </label>
              <input
                type="number"
                name="minStockLevel"
                value={formData.minStockLevel}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Code
              </label>
              <input
                type="text"
                name="batchCode"
                value={formData.batchCode}
                onChange={handleChange}
                placeholder="e.g., BATCH001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                HSN Number
              </label>
              <input
                type="text"
                name="hsinNumber"
                value={formData.hsinNumber}
                onChange={handleChange}
                placeholder="e.g., 3214"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Actions */}
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
              {loading ? 'Saving...' : material ? 'Update Material' : 'Add Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default MaterialModal
