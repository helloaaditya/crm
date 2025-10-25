import { useState, useEffect } from 'react'
import { FiX, FiPackage, FiTrendingDown, FiTrendingUp, FiRotateCcw, FiEdit } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'

const MaterialHistoryModal = ({ isOpen, onClose, materialId }) => {
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all') // all, inward, outward, return

  useEffect(() => {
    if (isOpen && materialId) {
      fetchHistory()
    }
  }, [isOpen, materialId])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const response = await API.inventory.getMaterialHistory(materialId)
      setHistory(response.data.data)
    } catch (error) {
      console.error('Error fetching history:', error)
      toast.error('Failed to load stock history')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const filteredHistory = history?.history?.filter(h => 
    filter === 'all' || h.type === filter
  ) || []

  const getTypeIcon = (type) => {
    switch(type) {
      case 'inward': return <FiTrendingUp className="text-green-500" />
      case 'outward': return <FiTrendingDown className="text-red-500" />
      case 'return': return <FiRotateCcw className="text-blue-500" />
      case 'adjustment': return <FiEdit className="text-orange-500" />
      default: return <FiPackage />
    }
  }

  const getTypeColor = (type) => {
    switch(type) {
      case 'inward': return 'bg-green-100 text-green-800'
      case 'outward': return 'bg-red-100 text-red-800'
      case 'return': return 'bg-blue-100 text-blue-800'
      case 'adjustment': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Stock Movement History</h2>
            {history && (
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-semibold">{history.material.name}</span> 
                <span className="ml-3">ID: {history.material.materialId}</span>
                <span className="ml-3 text-green-600 font-semibold">
                  Current Stock: {history.material.currentStock} {history.material.unit}
                </span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        {/* Filter */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'all' ? 'bg-primary text-white' : 'bg-white text-gray-700 border'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('inward')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'inward' ? 'bg-green-500 text-white' : 'bg-white text-gray-700 border'
              }`}
            >
              <FiTrendingUp className="inline mr-1" /> Inward
            </button>
            <button
              onClick={() => setFilter('outward')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'outward' ? 'bg-red-500 text-white' : 'bg-white text-gray-700 border'
              }`}
            >
              <FiTrendingDown className="inline mr-1" /> Outward
            </button>
            <button
              onClick={() => setFilter('return')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'return' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 border'
              }`}
            >
              <FiRotateCcw className="inline mr-1" /> Returns
            </button>
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <FiPackage size={48} className="mx-auto mb-4 opacity-50" />
              <p>No stock movements found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    {/* Left side - Type and Details */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className="mt-1">
                        {getTypeIcon(item.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(item.type)}`}>
                            {item.type.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(item.date).toLocaleString()}
                          </span>
                        </div>
                        
                        {/* Project Info */}
                        {item.project && (
                          <p className="text-sm text-gray-700 mb-1">
                            <span className="font-semibold">Project:</span> {item.project.projectId} - {item.project.description}
                          </p>
                        )}
                        
                        {/* Customer Info */}
                        {item.customer && (
                          <p className="text-sm text-gray-700 mb-1">
                            <span className="font-semibold">Customer:</span> {item.customer.name} ({item.customer.contactNumber})
                          </p>
                        )}
                        
                        {/* Invoice Info */}
                        {item.invoice && (
                          <p className="text-sm text-gray-700 mb-1">
                            <span className="font-semibold">Invoice:</span> {item.invoice.invoiceNumber}
                          </p>
                        )}
                        
                        {/* Reference */}
                        {item.reference && (
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-semibold">Reference:</span> {item.reference}
                          </p>
                        )}
                        
                        {/* Notes */}
                        {item.notes && (
                          <p className="text-sm text-gray-600 italic">
                            {item.notes}
                          </p>
                        )}
                        
                        {/* Handled By */}
                        {item.handledBy && (
                          <p className="text-xs text-gray-500 mt-2">
                            Handled by: {item.handledBy.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right side - Quantity and Balance */}
                    <div className="text-right ml-4">
                      <div className={`text-2xl font-bold mb-1 ${
                        item.quantity >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.quantity > 0 ? '+' : ''}{item.quantity} {history.material.unit}
                      </div>
                      <div className="text-sm text-gray-500">
                        Balance: {item.balanceAfter} {history.material.unit}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default MaterialHistoryModal
