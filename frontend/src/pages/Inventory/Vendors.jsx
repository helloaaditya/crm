import { useState, useEffect } from 'react'
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiEye } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'
import VendorModal from '../../components/Modals/VendorModal'

const Vendors = () => {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState(null)

  useEffect(() => {
    fetchVendors()
  }, [page, category])

  const fetchVendors = async () => {
    try {
      setLoading(true)
      const params = { page, limit: 10 }
      if (search) params.search = search
      if (category) params.category = category

      const response = await API.inventory.getVendors(params)
      setVendors(response.data.data || [])
      setTotalPages(response.data.totalPages || 1)
    } catch (error) {
      console.error('Error fetching vendors:', error)
      toast.error('Failed to load vendors')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchVendors()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return

    try {
      await API.inventory.deleteVendor(id)
      toast.success('Vendor deleted successfully')
      fetchVendors()
    } catch (error) {
      toast.error('Failed to delete vendor')
    }
  }

  const handleEdit = (vendor) => {
    setSelectedVendor(vendor)
    setShowModal(true)
  }

  const handleAdd = () => {
    setSelectedVendor(null)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setSelectedVendor(null)
  }

  const handleModalSuccess = () => {
    fetchVendors()
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Vendors</h1>
        <button 
          onClick={handleAdd}
          className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
        >
          <FiPlus className="mr-2" />
          Add Vendor
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select 
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Categories</option>
            <option value="materials">Materials</option>
            <option value="tools">Tools</option>
            <option value="machinery">Machinery</option>
            <option value="services">Services</option>
            <option value="other">Other</option>
          </select>
          <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700">
            Search
          </button>
        </form>
      </div>

      {/* Vendors Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : vendors.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact Person</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vendors.map((vendor) => (
                    <tr key={vendor._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {vendor.vendorId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vendor.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {vendor.contactPerson}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {vendor.contactNumber}
                        {vendor.email && (
                          <div className="text-xs text-gray-500">{vendor.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {vendor.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {vendor.gstNumber || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="View">
                            <FiEye />
                          </button>
                          <button 
                            onClick={() => handleEdit(vendor)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title="Edit"
                          >
                            <FiEdit />
                          </button>
                          <button 
                            onClick={() => handleDelete(vendor._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden">
              {vendors.map((vendor) => (
                <div key={vendor._id} className="p-4 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{vendor.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">ID: {vendor.vendorId}</p>
                      <p className="text-xs text-gray-500">{vendor.contactPerson}</p>
                    </div>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {vendor.category}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Contact:</span>
                      <span className="font-medium">{vendor.contactNumber}</span>
                    </div>
                    {vendor.email && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium text-xs">{vendor.email}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">GST:</span>
                      <span className="font-medium">{vendor.gstNumber || '-'}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      className="flex items-center justify-center px-2 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-xs"
                    >
                      <FiEye className="mr-1" size={12} />
                      View
                    </button>
                    <button 
                      onClick={() => handleEdit(vendor)}
                      className="flex items-center justify-center px-2 py-2 text-green-600 hover:bg-green-50 rounded-lg text-xs"
                    >
                      <FiEdit className="mr-1" size={12} />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(vendor._id)}
                      className="flex items-center justify-center px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg text-xs"
                    >
                      <FiTrash2 className="mr-1" size={12} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border-t gap-3">
              <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">Page {page} of {totalPages}</div>
              <div className="flex space-x-2 justify-center sm:justify-end">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50 text-sm"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50 text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No vendors found</p>
          </div>
        )}
      </div>

      {/* Vendor Modal */}
      <VendorModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        vendor={selectedVendor}
      />
    </div>
  )
}

export default Vendors
