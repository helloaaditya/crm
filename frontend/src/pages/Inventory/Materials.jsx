import { useState, useEffect } from 'react'
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiArrowUp, FiArrowDown, FiAlertCircle, FiClock, FiRotateCcw, FiDownload, FiFilter, FiCalendar, FiTrendingUp, FiTrendingDown, FiPackage } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'
import MaterialModal from '../../components/Modals/MaterialModal'
import MaterialHistoryModal from '../../components/Modals/MaterialHistoryModal'
import ReturnStockModal from '../../components/Modals/ReturnStockModal'

const Materials = () => {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [summary, setSummary] = useState({ 
    totalMaterials: 0, 
    totalValue: 0, 
    lowStockCount: 0,
    byCategory: {}
  })
  const [showModal, setShowModal] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyMaterialId, setHistoryMaterialId] = useState(null)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnMaterial, setReturnMaterial] = useState(null)

  useEffect(() => {
    fetchMaterials()
    fetchStockSummary()
  }, [page, category, stockFilter, startDate, endDate])

  const fetchMaterials = async () => {
    try {
      setLoading(true)
      const params = { 
        page, 
        limit: 10,
        ...(search && { search }),
        ...(category && { category }),
        ...(stockFilter && { lowStock: stockFilter === 'low' }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      }

      const response = await API.inventory.getMaterials(params)
      setMaterials(response.data.data || [])
      setTotalPages(response.data.totalPages || 1)
      setTotalCount(response.data.total || 0)
    } catch (error) {
      console.error('Error fetching materials:', error)
      toast.error('Failed to load materials')
    } finally {
      setLoading(false)
    }
  }

  const fetchStockSummary = async () => {
    try {
      const response = await API.inventory.getStockSummary()
      setSummary(response.data.data || {})
    } catch (error) {
      console.error('Error fetching stock summary:', error)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchMaterials()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return

    try {
      await API.inventory.deleteMaterial(id)
      toast.success('Material deleted successfully')
      fetchMaterials()
    } catch (error) {
      toast.error('Failed to delete material')
    }
  }

  const handleEdit = (material) => {
    setSelectedMaterial(material)
    setShowModal(true)
  }

  const handleAdd = () => {
    setSelectedMaterial(null)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setSelectedMaterial(null)
  }

  const handleModalSuccess = () => {
    fetchMaterials()
  }

  const handleInward = async (material) => {
    const quantity = prompt(`Enter quantity to add (${material.unit}):`)
    if (!quantity || isNaN(quantity)) return

    try {
      await API.inventory.materialInward(material._id, {
        quantity: parseFloat(quantity),
        reference: 'Manual Entry',
        notes: 'Stock added manually'
      })
      toast.success(`${quantity} ${material.unit} added to stock`)
      fetchMaterials()
    } catch (error) {
      toast.error('Failed to update stock')
    }
  }

  const handleOutward = async (material) => {
    const quantity = prompt(`Enter quantity to deduct (${material.unit}):`)
    if (!quantity || isNaN(quantity)) return

    try {
      await API.inventory.materialOutward(material._id, {
        quantity: parseFloat(quantity),
        reference: 'Manual Entry',
        notes: 'Stock deducted manually'
      })
      toast.success(`${quantity} ${material.unit} deducted from stock`)
      fetchMaterials()
    } catch (error) {
      toast.error('Failed to update stock')
    }
  }

  const handleReturn = (material) => {
    setReturnMaterial(material)
    setShowReturnModal(true)
  }

  const handleViewHistory = (material) => {
    setHistoryMaterialId(material._id)
    setShowHistoryModal(true)
  }

  const handleReturnModalClose = () => {
    setShowReturnModal(false)
    setReturnMaterial(null)
  }

  const handleReturnSuccess = () => {
    fetchMaterials()
    fetchStockSummary()
  }

  const handleClearFilters = () => {
    setSearch('')
    setCategory('')
    setStockFilter('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const handleExportCSV = () => {
    const csvData = materials.map(material => ({
      'Material ID': material.materialId,
      'Name': material.name,
      'Category': material.category,
      'Brand': material.brand || 'N/A',
      'Product': material.product || 'N/A',
      'Current Stock': material.quantity,
      'Unit': material.unit,
      'Min Stock Level': material.minStockLevel,
      'Sale Cost': material.saleCost,
      'MRP': material.mrp,
      'Stock Value': (material.quantity * material.saleCost).toFixed(2),
      'Status': material.quantity <= material.minStockLevel ? 'Low Stock' : 'Normal',
      'Vendor': material.vendor?.name || 'N/A',
      'Created Date': new Date(material.createdAt).toLocaleDateString()
    }))

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `materials-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Materials exported successfully')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Materials Inventory</h1>
          <p className="text-gray-600 mt-1">
            {totalCount} materials • Total Value: ₹{summary.totalValue?.toLocaleString() || '0'} • 
            Low Stock: {summary.lowStockCount || 0}
          </p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            disabled={materials.length === 0}
          >
            <FiDownload className="mr-2" />
            Export CSV
          </button>
          <button 
            onClick={handleAdd}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
          >
            <FiPlus className="mr-2" />
            Add Material
          </button>
        </div>
      </div>

      {/* Advanced Search & Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiSearch className="inline mr-1" />
              Search
            </label>
            <input
              type="text"
              placeholder="Search materials..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select 
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Categories</option>
              <option value="waterproofing">Waterproofing</option>
              <option value="flooring">Flooring</option>
              <option value="painting">Painting</option>
              <option value="civil">Civil</option>
              <option value="tools">Tools</option>
              <option value="machinery">Machinery</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Stock Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock Status</label>
            <select 
              value={stockFilter}
              onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Stock</option>
              <option value="low">Low Stock</option>
              <option value="normal">Normal Stock</option>
              <option value="zero">Out of Stock</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={handleClearFilters}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiCalendar className="inline mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiCalendar className="inline mr-1" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, totalCount)} of {totalCount} materials
            </div>
          </div>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : materials.length > 0 ? (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {materials.map((material) => (
                  <tr key={material._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {material.materialId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>{material.name}</div>
                      {material.product && (
                        <div className="text-xs text-gray-500">{material.product}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {material.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {material.brand || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <span className={`font-medium ${
                          material.quantity <= material.minStockLevel 
                            ? 'text-red-600' 
                            : 'text-gray-900'
                        }`}>
                          {material.quantity} {material.unit}
                        </span>
                        {material.quantity <= material.minStockLevel && (
                          <FiAlertCircle className="ml-2 text-red-600" title="Low Stock" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Min: {material.minStockLevel} {material.unit}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{material.saleCost}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleViewHistory(material)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded" 
                          title="View History"
                        >
                          <FiClock />
                        </button>
                        <button 
                          onClick={() => handleInward(material)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded" 
                          title="Add Stock"
                        >
                          <FiArrowDown />
                        </button>
                        <button 
                          onClick={() => handleOutward(material)}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded" 
                          title="Deduct Stock"
                        >
                          <FiArrowUp />
                        </button>
                        <button 
                          onClick={() => handleReturn(material)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded" 
                          title="Return Stock"
                        >
                          <FiRotateCcw />
                        </button>
                        <button 
                          onClick={() => handleEdit(material)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <FiEdit />
                        </button>
                        <button 
                          onClick={() => handleDelete(material._id)}
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

            {/* Pagination */}
            <div className="px-6 py-4 flex items-center justify-between border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, totalCount)} of {totalCount} materials
              </div>
              <div className="flex space-x-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No materials found</p>
          </div>
        )}
      </div>

      {/* Material Modal */}
      <MaterialModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        material={selectedMaterial}
      />

      {/* Return Stock Modal */}
      <ReturnStockModal
        isOpen={showReturnModal}
        onClose={handleReturnModalClose}
        onSuccess={handleReturnSuccess}
        material={returnMaterial}
      />
      
      {/* Material History Modal */}
      <MaterialHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        materialId={historyMaterialId}
      />
    </div>
  )
}

export default Materials
