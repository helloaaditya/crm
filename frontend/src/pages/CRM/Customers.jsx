import { useState, useEffect } from 'react'
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiDownload, FiUpload } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'
import CustomerModal from '../../components/Modals/CustomerModal'

const Customers = () => {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [leadStatus, setLeadStatus] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchCustomers()
  }, [page, leadStatus])

  // Listen for refresh event from Header
  useEffect(() => {
    const handleRefresh = () => {
      fetchCustomers()
    }

    window.addEventListener('app-refresh', handleRefresh)
    return () => window.removeEventListener('app-refresh', handleRefresh)
  }, [page, leadStatus])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const params = { page, limit: 10 }
      if (search) params.search = search
      if (leadStatus) params.leadStatus = leadStatus

      const response = await API.customers.getAll(params)
      setCustomers(response.data.data)
      setTotalPages(response.data.totalPages)
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchCustomers()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return

    try {
      await API.customers.delete(id)
      toast.success('Customer deleted successfully')
      fetchCustomers()
    } catch (error) {
      toast.error('Failed to delete customer')
    }
  }

  const handleEdit = (customer) => {
    setSelectedCustomer(customer)
    setShowModal(true)
  }

  const handleAdd = () => {
    setSelectedCustomer(null)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setSelectedCustomer(null)
  }

  const handleModalSuccess = () => {
    fetchCustomers()
  }

  const handleDownloadSample = async () => {
    setDownloading(true)
    try {
      const response = await API.customers.bulk.sample()
      
      // When responseType is 'text', res.data should be a string
      let csvContent = response.data
      
      // Fallback handling if data is not a string
      if (typeof csvContent !== 'string') {
        console.warn('Response is not a string:', typeof csvContent, csvContent)
        // Try to extract from object
        if (response.data?.data) csvContent = response.data.data
        else csvContent = String(csvContent)
      }
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'customers-sample.csv'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }, 100)
      
      toast.success('Sample file downloaded successfully')
    } catch (error) {
      console.error('Download error:', error)
      const errorMsg = error.response?.data?.message || error.message || 'Failed to download sample'
      toast.error(errorMsg)
    } finally {
      setDownloading(false)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file type
    const validExtensions = ['.csv', '.xls', '.xlsx']
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
    if (!validExtensions.includes(fileExtension)) {
      toast.error('Please upload a CSV or Excel file')
      e.target.value = ''
      return
    }
    
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await API.customers.bulk.upload(formData)
      
      // Show success message
      const message = response.data?.message || 'Bulk import completed successfully'
      toast.success(message)
      
      // Show error details if any
      if (response.data?.errorDetails && response.data.errorDetails.length > 0) {
        const errorCount = response.data.errorDetails.length
        const errorPreview = response.data.errorDetails.slice(0, 5).join('\n')
        const moreErrors = errorCount > 5 ? `\n... and ${errorCount - 5} more errors` : ''
        
        // Show detailed error in console and as a warning toast
        console.error('Import Errors:', response.data.errorDetails)
        toast.warning(
          `${errorCount} error(s) occurred:\n${errorPreview}${moreErrors}`,
          { autoClose: 10000 }
        )
      }
      
      fetchCustomers() // Refresh the customer list
    } catch (error) {
      console.error('Upload error:', error)
      const errorMsg = error.response?.data?.message || 'Bulk import failed'
      toast.error(errorMsg)
      
      // Show error details if available
      if (error.response?.data?.errorDetails) {
        console.error('Error Details:', error.response.data.errorDetails)
        toast.error(`Errors: ${error.response.data.errorDetails.join('; ')}`, { autoClose: 10000 })
      }
    } finally {
      setUploading(false)
      e.target.value = '' // Reset file input
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Customers</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button 
            onClick={handleDownloadSample}
            disabled={downloading}
            className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            <FiDownload className="mr-2" />
            {downloading ? 'Downloading...' : 'Download Sample'}
          </button>
          <label className="w-full sm:w-auto">
            <div className={`flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 cursor-pointer disabled:opacity-50 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <FiUpload className="mr-2" />
              {uploading ? 'Uploading...' : 'Bulk Upload'}
            </div>
            <input 
              type="file" 
              accept=".csv,.xls,.xlsx" 
              onChange={handleUpload} 
              className="hidden" 
              disabled={uploading} 
            />
          </label>
          <button 
            onClick={handleAdd}
            className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
          >
            <FiPlus className="mr-2" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <form onSubmit={handleSearch} className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:space-x-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
            />
          </div>
          <div className="flex space-x-2 sm:space-x-4">
            <select 
              value={leadStatus}
              onChange={(e) => { setLeadStatus(e.target.value); setPage(1); }}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
            >
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
            <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base">
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : customers.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map((customer) => (
                    <tr key={customer._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.customerId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{customer.contactNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{customer.email || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          customer.leadStatus === 'won' ? 'bg-green-100 text-green-800' :
                          customer.leadStatus === 'qualified' ? 'bg-blue-100 text-blue-800' :
                          customer.leadStatus === 'new' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {customer.leadStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleEdit(customer)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title="Edit"
                          >
                            <FiEdit />
                          </button>
                          <button 
                            onClick={() => handleDelete(customer._id)}
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
              {customers.map((customer) => (
                <div key={customer._id} className="p-4 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{customer.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">ID: {customer.customerId}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      customer.leadStatus === 'won' ? 'bg-green-100 text-green-800' :
                      customer.leadStatus === 'qualified' ? 'bg-blue-100 text-blue-800' :
                      customer.leadStatus === 'new' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {customer.leadStatus}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium w-16">Phone:</span>
                      <span>{customer.contactNumber}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium w-16">Email:</span>
                      <span className="truncate">{customer.email || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleEdit(customer)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg text-sm"
                    >
                      <FiEdit className="mr-1" size={14} />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(customer._id)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                    >
                      <FiTrash2 className="mr-1" size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border-t gap-3">
              <div className="text-sm text-gray-600 text-center sm:text-left">
                Page {page} of {totalPages}
              </div>
              <div className="flex space-x-2 justify-center sm:justify-end">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No customers found</p>
          </div>
        )}
      </div>

      {/* Customer Modal */}
      <CustomerModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        customer={selectedCustomer}
      />
    </div>
  )
}

export default Customers
