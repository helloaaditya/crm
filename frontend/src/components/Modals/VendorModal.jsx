import { useState, useEffect } from 'react'
import { FiX } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'

const VendorModal = ({ isOpen, onClose, onSuccess, vendor = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    contactNumber: '',
    alternateContact: '',
    email: '',
    gstNumber: '',
    panNumber: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: ''
    },
    bankDetails: {
      accountName: '',
      accountNumber: '',
      bankName: '',
      ifscCode: '',
      branch: ''
    },
    category: 'materials',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  // Load vendor data when editing
  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name || '',
        contactPerson: vendor.contactPerson || '',
        contactNumber: vendor.contactNumber || '',
        alternateContact: vendor.alternateContact || '',
        email: vendor.email || '',
        gstNumber: vendor.gstNumber || '',
        panNumber: vendor.panNumber || '',
        address: {
          street: vendor.address?.street || '',
          city: vendor.address?.city || '',
          state: vendor.address?.state || '',
          pincode: vendor.address?.pincode || ''
        },
        bankDetails: {
          accountName: vendor.bankDetails?.accountName || '',
          accountNumber: vendor.bankDetails?.accountNumber || '',
          bankName: vendor.bankDetails?.bankName || '',
          ifscCode: vendor.bankDetails?.ifscCode || '',
          branch: vendor.bankDetails?.branch || ''
        },
        category: vendor.category || 'materials',
        notes: vendor.notes || ''
      })
    } else {
      // Reset form when adding new
      setFormData({
        name: '',
        contactPerson: '',
        contactNumber: '',
        alternateContact: '',
        email: '',
        gstNumber: '',
        panNumber: '',
        address: {
          street: '',
          city: '',
          state: '',
          pincode: ''
        },
        bankDetails: {
          accountName: '',
          accountNumber: '',
          bankName: '',
          ifscCode: '',
          branch: ''
        },
        category: 'materials',
        notes: ''
      })
    }
  }, [vendor, isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (vendor) {
        await API.inventory.updateVendor(vendor._id, formData)
        toast.success('Vendor updated successfully!')
      } else {
        const response = await API.inventory.createVendor(formData)
        toast.success(`Vendor created! ID: ${response.data.data.vendorId}`)
      }
      
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving vendor:', error)
      toast.error(error.response?.data?.message || 'Failed to save vendor')
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
            {vendor ? 'Edit Vendor' : 'Add New Vendor'}
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
                Vendor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g., ABC Suppliers"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleChange}
                required
                placeholder="e.g., John Doe"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                required
                pattern="[0-9]{10}"
                maxLength="10"
                placeholder="10-digit mobile number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alternate Contact
              </label>
              <input
                type="text"
                name="alternateContact"
                value={formData.alternateContact}
                onChange={handleChange}
                pattern="[0-9]{10}"
                maxLength="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="vendor@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="materials">Materials</option>
                <option value="tools">Tools</option>
                <option value="machinery">Machinery</option>
                <option value="services">Services</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GST Number
              </label>
              <input
                type="text"
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleChange}
                placeholder="22AAAAA0000A1Z5"
                maxLength="15"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PAN Number
              </label>
              <input
                type="text"
                name="panNumber"
                value={formData.panNumber}
                onChange={handleChange}
                placeholder="AAAAA0000A"
                maxLength="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">Address</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleChange}
                  placeholder="Street Address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <input
                type="text"
                name="address.city"
                value={formData.address.city}
                onChange={handleChange}
                placeholder="City"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="text"
                name="address.state"
                value={formData.address.state}
                onChange={handleChange}
                placeholder="State"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="text"
                name="address.pincode"
                value={formData.address.pincode}
                onChange={handleChange}
                placeholder="Pincode"
                pattern="[0-9]{6}"
                maxLength="6"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Bank Details */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">Bank Details (Optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  name="bankDetails.accountName"
                  value={formData.bankDetails.accountName}
                  onChange={handleChange}
                  placeholder="Account Holder Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <input
                  type="text"
                  name="bankDetails.accountNumber"
                  value={formData.bankDetails.accountNumber}
                  onChange={handleChange}
                  placeholder="Account Number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <input
                  type="text"
                  name="bankDetails.bankName"
                  value={formData.bankDetails.bankName}
                  onChange={handleChange}
                  placeholder="Bank Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <input
                  type="text"
                  name="bankDetails.ifscCode"
                  value={formData.bankDetails.ifscCode}
                  onChange={handleChange}
                  placeholder="IFSC Code"
                  maxLength="11"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="text"
                  name="bankDetails.branch"
                  value={formData.bankDetails.branch}
                  onChange={handleChange}
                  placeholder="Branch Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Additional notes about the vendor..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
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
              {loading ? 'Saving...' : vendor ? 'Update Vendor' : 'Add Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default VendorModal
