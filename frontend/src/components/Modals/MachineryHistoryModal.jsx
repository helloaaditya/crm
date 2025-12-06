import { useState, useEffect } from 'react'
import { FiX, FiClock, FiTruck, FiRotateCcw, FiPlus, FiEdit, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'

const MachineryHistoryModal = ({ isOpen, onClose, machineryId }) => {
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && machineryId) {
      fetchHistory()
    }
  }, [isOpen, machineryId])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const response = await API.machinery.getHistory(machineryId)
      setHistory(response.data.data)
    } catch (error) {
      console.error('Error fetching machinery history:', error)
      toast.error('Failed to load machinery history')
    } finally {
      setLoading(false)
    }
  }

  const getHistoryIcon = (type) => {
    switch (type) {
      case 'created':
        return <FiPlus className="text-green-600" size={18} />
      case 'updated':
        return <FiEdit className="text-blue-600" size={18} />
      case 'assigned':
        return <FiTruck className="text-purple-600" size={18} />
      case 'returned':
        return <FiRotateCcw className="text-orange-600" size={18} />
      default:
        return <FiClock className="text-gray-600" size={18} />
    }
  }

  const getHistoryColor = (type) => {
    switch (type) {
      case 'created':
        return 'bg-green-100 border-green-300'
      case 'updated':
        return 'bg-blue-100 border-blue-300'
      case 'assigned':
        return 'bg-purple-100 border-purple-300'
      case 'returned':
        return 'bg-orange-100 border-orange-300'
      default:
        return 'bg-gray-100 border-gray-300'
    }
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto mobile-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Machinery History</h2>
            {history?.machinery && (
              <p className="text-sm text-gray-600 mt-1">
                {history.machinery.name} ({history.machinery.category})
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 rounded"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : history?.history && history.history.length > 0 ? (
            <div className="space-y-4">
              {/* Machinery Info */}
              {history.machinery && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-800 mb-3">Machinery Details</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Quantity:</span>
                      <p className="font-medium">{history.machinery.quantity} {history.machinery.unit}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Available:</span>
                      <p className="font-medium">{history.machinery.availableQuantity} {history.machinery.unit}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Condition:</span>
                      <p className="font-medium capitalize">{history.machinery.condition || 'N/A'}</p>
                    </div>
                    {history.machinery.location && (
                      <div>
                        <span className="text-gray-600">Location:</span>
                        <p className="font-medium">{history.machinery.location}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* History Timeline */}
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                <div className="space-y-6">
                  {history.history.map((item, index) => (
                    <div key={index} className="relative pl-12">
                      <div className={`absolute left-0 top-1 flex items-center justify-center w-8 h-8 rounded-full border-2 ${getHistoryColor(item.type)}`}>
                        {getHistoryIcon(item.type)}
                      </div>
                      
                      <div className={`border rounded-lg p-4 ${getHistoryColor(item.type)}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 mb-1">{item.description}</h4>
                            <p className="text-sm text-gray-600 flex items-center">
                              <FiClock className="mr-1" size={14} />
                              {formatDate(item.date)}
                            </p>
                          </div>
                          {item.performedBy && (
                            <div className="text-xs text-gray-500">
                              By: {item.performedBy?.name || 'System'}
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        {item.details && (
                          <div className="mt-3 pt-3 border-t border-gray-300 space-y-2">
                            {item.type === 'assigned' && (
                              <>
                                {item.project && (
                                  <div className="flex items-center text-sm">
                                    <span className="text-gray-600 w-24">Project:</span>
                                    <span className="font-medium">
                                      {item.project.projectId || item.details.projectId} - {item.project.name || item.details.projectName || 'N/A'}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center text-sm">
                                  <span className="text-gray-600 w-24">Quantity:</span>
                                  <span className="font-medium">{item.quantity} {history.machinery?.unit}</span>
                                </div>
                                {item.expectedReturnDate && (
                                  <div className="flex items-center text-sm">
                                    <span className="text-gray-600 w-24">Expected Return:</span>
                                    <span className="font-medium">{formatDate(item.expectedReturnDate)}</span>
                                  </div>
                                )}
                                {item.status && (
                                  <div className="flex items-center text-sm">
                                    <span className="text-gray-600 w-24">Status:</span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      item.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                                      item.status === 'in_use' ? 'bg-purple-100 text-purple-800' :
                                      item.status === 'returned' ? 'bg-green-100 text-green-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {item.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                            
                            {item.type === 'returned' && (
                              <>
                                {item.project && (
                                  <div className="flex items-center text-sm">
                                    <span className="text-gray-600 w-24">Project:</span>
                                    <span className="font-medium">
                                      {item.project.projectId || item.details.projectId} - {item.project.name || item.details.projectName || 'N/A'}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center text-sm">
                                  <span className="text-gray-600 w-24">Quantity Returned:</span>
                                  <span className="font-medium">{item.quantity} {history.machinery?.unit}</span>
                                </div>
                                {item.actualReturnDate && (
                                  <div className="flex items-center text-sm">
                                    <span className="text-gray-600 w-24">Return Date:</span>
                                    <span className="font-medium">{formatDate(item.actualReturnDate)}</span>
                                  </div>
                                )}
                              </>
                            )}

                            {item.type === 'created' && (
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-600">Category:</span>
                                  <p className="font-medium capitalize">{item.details.category}</p>
                                </div>
                                <div>
                                  <span className="text-gray-600">Initial Quantity:</span>
                                  <p className="font-medium">{item.details.quantity} {item.details.unit}</p>
                                </div>
                              </div>
                            )}

                            {item.type === 'updated' && (
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {item.details.quantity !== undefined && (
                                  <div>
                                    <span className="text-gray-600">Quantity:</span>
                                    <p className="font-medium">{item.details.quantity} {history.machinery?.unit}</p>
                                  </div>
                                )}
                                {item.details.availableQuantity !== undefined && (
                                  <div>
                                    <span className="text-gray-600">Available:</span>
                                    <p className="font-medium">{item.details.availableQuantity} {history.machinery?.unit}</p>
                                  </div>
                                )}
                                {item.details.condition && (
                                  <div>
                                    <span className="text-gray-600">Condition:</span>
                                    <p className="font-medium capitalize">{item.details.condition}</p>
                                  </div>
                                )}
                                {item.details.location && (
                                  <div>
                                    <span className="text-gray-600">Location:</span>
                                    <p className="font-medium">{item.details.location}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {item.notes && (
                              <div className="mt-2 pt-2 border-t border-gray-300">
                                <span className="text-gray-600 text-sm">Notes:</span>
                                <p className="text-sm text-gray-800 mt-1">{item.notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <FiClock className="mx-auto text-gray-400" size={48} />
              <p className="text-gray-600 mt-2">No history available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MachineryHistoryModal

