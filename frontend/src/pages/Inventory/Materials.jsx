import { useState, useEffect } from 'react'
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiArrowUp, FiArrowDown, FiAlertCircle, FiClock, FiRotateCcw } from 'react-icons/fi'
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
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyMaterialId, setHistoryMaterialId] = useState(null)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnMaterial, setReturnMaterial] = useState(null)

  useEffect(() => {
    fetchMaterials()
  }, [page, category])

  const fetchMaterials = async () => {
    try {
      setLoading(true)
      const params = { page, limit: 10 }
      if (search) params.search = search
      if (category) params.category = category

      const response = await API.inventory.getMaterials(params)
      setMaterials(response.data.data || [])
      setTotalPages(response.data.totalPages || 1)
    } catch (error) {
      console.error('Error fetching materials:', error)
      toast.error('Failed to load materials')
    } finally {
      setLoading(false)
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
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Materials Inventory</h1>
        <button 
          onClick={handleAdd}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
        >
          <FiPlus className="mr-2" />
          Add Material
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <form onSubmit={handleSearch} className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search materials..."
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
            <option value="waterproofing">Waterproofing</option>
            <option value="flooring">Flooring</option>
            <option value="painting">Painting</option>
            <option value="civil">Civil</option>
            <option value="tools">Tools</option>
            <option value="machinery">Machinery</option>
            <option value="other">Other</option>
          </select>
          <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700">
            Search
          </button>
        </form>
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
            <div className="px-6 py-4 flex items-center justify-between border-t">
              <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
              <div className="flex space-x-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
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
