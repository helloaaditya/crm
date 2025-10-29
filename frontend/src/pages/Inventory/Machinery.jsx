import { useState, useEffect } from 'react'
import { FiPlus, FiSearch, FiEye, FiEdit, FiTrash2, FiPackage, FiTruck, FiTool, FiAlertTriangle, FiCheckCircle, FiXCircle, FiFilter, FiX, FiRotateCcw } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'
import MachineryModal from '../../components/Modals/MachineryModal'
import AssignMachineryModal from '../../components/Modals/AssignMachineryModal'
import ReturnMachineryModal from '../../components/Modals/ReturnMachineryModal'

const Machinery = () => {
  const [machinery, setMachinery] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [condition, setCondition] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState({
    totalMachinery: 0,
    totalQuantity: 0,
    totalAvailable: 0,
    totalAssigned: 0,
    lowStockCount: 0
  })
  const [showModal, setShowModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [selectedMachinery, setSelectedMachinery] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const categories = [
    { value: 'construction', label: 'Construction' },
    { value: 'waterproofing', label: 'Waterproofing' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'painting', label: 'Painting' },
    { value: 'other', label: 'Other' }
  ]

  const conditions = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
    { value: 'out_of_order', label: 'Out of Order' }
  ]

  const statusOptions = [
    { value: 'available', label: 'Available' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'low_stock', label: 'Low Stock' }
  ]

  // Debounce search to prevent too many API calls
  useEffect(() => {
    if (search) {
      setIsSearching(true)
    }
    
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setIsSearching(false)
    }, 500) // 500ms delay

    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    fetchMachinery()
  }, [page, category, condition, status, debouncedSearch])

  const fetchMachinery = async () => {
    try {
      setLoading(true)
      const params = { 
        page, 
        limit: 10,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(category && { category }),
        ...(condition && { condition }),
        ...(status && { status })
      }

      const response = await API.machinery.getAll(params)
      setMachinery(response.data.data)
      setTotalPages(response.data.pagination.totalPages)
      setTotalCount(response.data.pagination.totalItems)
      setStats(response.data.stats)
    } catch (error) {
      console.error('Error fetching machinery:', error)
      toast.error('Failed to load machinery')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    setSearch(e.target.value)
    setPage(1) // Reset to first page when searching
  }

  const handleFilterChange = (filterType, value) => {
    switch (filterType) {
      case 'category':
        setCategory(value)
        break
      case 'condition':
        setCondition(value)
        break
      case 'status':
        setStatus(value)
        break
      default:
        break
    }
    setPage(1)
  }

  const clearFilters = () => {
    setCategory('')
    setCondition('')
    setStatus('')
    setSearch('')
    setDebouncedSearch('')
    setPage(1)
  }

  const clearSearch = () => {
    setSearch('')
    setDebouncedSearch('')
    setPage(1)
  }

  const handleEdit = (machinery) => {
    setSelectedMachinery(machinery)
    setShowModal(true)
  }

  const handleAssign = (machinery) => {
    setSelectedMachinery(machinery)
    setShowAssignModal(true)
  }

  const handleReturn = (machinery) => {
    setSelectedMachinery(machinery)
    setShowReturnModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this machinery?')) return

    try {
      await API.machinery.delete(id)
      toast.success('Machinery deleted successfully')
      fetchMachinery()
    } catch (error) {
      toast.error('Failed to delete machinery')
    }
  }

  const getConditionBadge = (condition) => {
    const badges = {
      excellent: { bg: 'bg-green-100 text-green-800', icon: FiCheckCircle },
      good: { bg: 'bg-blue-100 text-blue-800', icon: FiCheckCircle },
      fair: { bg: 'bg-yellow-100 text-yellow-800', icon: FiAlertTriangle },
      poor: { bg: 'bg-orange-100 text-orange-800', icon: FiAlertTriangle },
      out_of_order: { bg: 'bg-red-100 text-red-800', icon: FiXCircle }
    }
    return badges[condition] || badges.good
  }

  const getStatusBadge = (machinery) => {
    if (machinery.availableQuantity === 0) {
      return { bg: 'bg-red-100 text-red-800', text: 'Assigned' }
    } else if (machinery.availableQuantity <= 2) {
      return { bg: 'bg-yellow-100 text-yellow-800', text: 'Low Stock' }
    } else {
      return { bg: 'bg-green-100 text-green-800', text: 'Available' }
    }
  }

  const getCategoryIcon = (category) => {
    const icons = {
      construction: FiPackage,
      waterproofing: FiTool,
      electrical: FiPackage,
      plumbing: FiTool,
      painting: FiPackage,
      other: FiPackage
    }
    return icons[category] || FiPackage
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Machinery & Tools</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage construction machinery and tools inventory</p>
        </div>
        <button 
          onClick={() => {
            setSelectedMachinery(null)
            setShowModal(true)
          }}
          className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
        >
          <FiPlus className="mr-2" />
          Add Machinery
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total Machinery</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-800">{stats.totalMachinery}</p>
            </div>
            <FiPackage className="text-blue-500" size={20} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total Quantity</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-800">{stats.totalQuantity}</p>
            </div>
            <FiPackage className="text-green-500" size={20} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Available</p>
              <p className="text-xl sm:text-2xl font-bold text-green-800">{stats.totalAvailable}</p>
            </div>
            <FiCheckCircle className="text-green-500" size={20} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Assigned</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-800">{stats.totalAssigned}</p>
            </div>
            <FiTruck className="text-blue-500" size={20} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Low Stock</p>
              <p className="text-xl sm:text-2xl font-bold text-red-800">{stats.lowStockCount}</p>
            </div>
            <FiAlertTriangle className="text-red-500" size={20} />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search machinery..."
              value={search}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base"
            />
            {search && !isSearching && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                type="button"
              >
                <FiX size={18} />
              </button>
            )}
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              </div>
            )}
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm sm:text-base"
          >
            <FiFilter className="mr-2" size={16} />
            Filters
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base min-h-44"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select
                  value={condition}
                  onChange={(e) => handleFilterChange('condition', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base min-h-44"
                >
                  <option value="">All Conditions</option>
                  {conditions.map(cond => (
                    <option key={cond.value} value={cond.value}>{cond.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base min-h-44"
                >
                  <option value="">All Status</option>
                  {statusOptions.map(stat => (
                    <option key={stat.value} value={stat.value}>{stat.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm sm:text-base min-h-44"
                >
                  <FiX className="mr-2" size={16} />
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Machinery Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : machinery.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Machinery</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {machinery.map((item) => {
                    const CategoryIcon = getCategoryIcon(item.category)
                    const conditionBadge = getConditionBadge(item.condition)
                    const statusBadge = getStatusBadge(item)
                    const ConditionIcon = conditionBadge.icon

                    return (
                      <tr key={item._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <CategoryIcon className="text-gray-400 mr-3" size={20} />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              <div className="text-sm text-gray-500">{item.brand} {item.model}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                          {item.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {item.availableQuantity} {item.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${conditionBadge.bg}`}>
                            <ConditionIcon className="mr-1" size={12} />
                            {item.condition}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${statusBadge.bg}`}>
                            {statusBadge.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleEdit(item)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit"
                            >
                              <FiEdit size={16} />
                            </button>
                            {item.availableQuantity > 0 && (
                              <button 
                                onClick={() => handleAssign(item)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded"
                                title="Assign to Project"
                              >
                                <FiTruck size={16} />
                              </button>
                            )}
                            {item.assignedProjects && item.assignedProjects.some(assignment => 
                              assignment.status === 'assigned' || assignment.status === 'in_use'
                            ) && (
                              <button 
                                onClick={() => handleReturn(item)}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded"
                                title="Return from Project"
                              >
                                <FiRotateCcw size={16} />
                              </button>
                            )}
                            <button 
                              onClick={() => handleDelete(item._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden">
              {machinery.map((item) => {
                const CategoryIcon = getCategoryIcon(item.category)
                const conditionBadge = getConditionBadge(item.condition)
                const statusBadge = getStatusBadge(item)
                const ConditionIcon = conditionBadge.icon

                return (
                  <div key={item._id} className="p-4 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center flex-1">
                        <CategoryIcon className="text-gray-400 mr-3" size={20} />
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                          <p className="text-xs text-gray-600">{item.brand} {item.model}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${conditionBadge.bg}`}>
                          <ConditionIcon className="mr-1" size={10} />
                          {item.condition}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${statusBadge.bg}`}>
                          {statusBadge.text}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Category:</span>
                        <span className="text-xs text-gray-700 capitalize">{item.category}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Total Quantity:</span>
                        <span className="text-xs text-gray-700">{item.quantity} {item.unit}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Available:</span>
                        <span className="text-xs text-gray-700">{item.availableQuantity} {item.unit}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleEdit(item)}
                        className="flex items-center justify-center px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-medium min-h-44"
                      >
                        <FiEdit className="mr-1" size={14} />
                        Edit
                      </button>
                      {item.availableQuantity > 0 && (
                        <button 
                          onClick={() => handleAssign(item)}
                          className="flex items-center justify-center px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg text-xs font-medium min-h-44"
                        >
                          <FiTruck className="mr-1" size={14} />
                          Assign
                        </button>
                      )}
                      {item.assignedProjects && item.assignedProjects.some(assignment => 
                        assignment.status === 'assigned' || assignment.status === 'in_use'
                      ) && (
                        <button 
                          onClick={() => handleReturn(item)}
                          className="flex items-center justify-center px-3 py-2 text-orange-600 hover:bg-orange-50 rounded-lg text-xs font-medium min-h-44"
                        >
                          <FiRotateCcw className="mr-1" size={14} />
                          Return
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(item._id)}
                        className="flex items-center justify-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium min-h-44"
                      >
                        <FiTrash2 className="mr-1" size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <FiPackage className="mx-auto text-gray-400" size={48} />
            <p className="text-gray-600 mt-2">No machinery found</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border-t bg-gray-50 gap-3">
            <div className="text-sm text-gray-700">
              Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, totalCount)} of {totalCount} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <MachineryModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            fetchMachinery()
          }}
          machinery={selectedMachinery}
        />
      )}

      {showAssignModal && (
        <AssignMachineryModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            setShowAssignModal(false)
            fetchMachinery()
          }}
          machinery={selectedMachinery}
        />
      )}

      {showReturnModal && (
        <ReturnMachineryModal
          isOpen={showReturnModal}
          onClose={() => setShowReturnModal(false)}
          onSuccess={() => {
            setShowReturnModal(false)
            fetchMachinery()
          }}
          machinery={selectedMachinery}
        />
      )}
    </div>
  )
}

export default Machinery
