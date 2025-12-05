import { useState, useEffect } from 'react';
import { FiX, FiPackage, FiTruck, FiCalendar } from 'react-icons/fi';
import API from '../../api';
import { toast } from 'react-toastify';

const ProjectStockModal = ({ isOpen, onClose, project }) => {
  const [activeTab, setActiveTab] = useState('out'); // 'out' or 'in'
  const [materials, setMaterials] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form data for Stock Out
  const [stockOutForm, setStockOutForm] = useState({
    material: '',
    quantity: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Form data for Stock In
  const [stockInForm, setStockInForm] = useState({
    material: '',
    quantity: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (isOpen && project) {
      fetchMaterials();
      fetchStockHistory();
    }
  }, [isOpen, project]);

  const fetchMaterials = async () => {
    try {
      const response = await API.inventory.getMaterials({ limit: 10000 });
      setMaterials(response.data.data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Failed to load materials');
    }
  };

  const fetchStockHistory = async () => {
    if (!project?._id) return;
    
    try {
      setLoading(true);
      const response = await API.projects.getStockHistory(project._id);
      console.log('📊 Stock history fetched:', response.data.data);
      setStockHistory(response.data.data || []);
    } catch (error) {
      console.error('Error fetching stock history:', error);
      // Don't show error toast, just log it
    } finally {
      setLoading(false);
    }
  };

  const handleStockOut = async (e) => {
    e.preventDefault();
    
    if (!stockOutForm.material || !stockOutForm.quantity) {
      toast.error('Please fill all required fields');
      return;
    }

    // Validate available quantity
    const selectedMaterial = getSelectedMaterial(stockOutForm.material);
    const requestedQty = parseFloat(stockOutForm.quantity);
    
    if (!selectedMaterial) {
      toast.error('Selected material not found');
      return;
    }

    if (requestedQty > selectedMaterial.quantity) {
      toast.error(`Insufficient stock! Available: ${selectedMaterial.quantity} ${selectedMaterial.unit}`);
      return;
    }

    if (requestedQty <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      
      // Create date object with current time to preserve local timezone
      const dateWithTime = new Date(stockOutForm.date + 'T' + new Date().toTimeString().split(' ')[0]);
      
      await API.projects.stockOut(project._id, {
        materialId: stockOutForm.material,
        quantity: requestedQty,
        date: dateWithTime,
        notes: stockOutForm.notes
      });

      toast.success('Stock sent to project successfully');
      
      // Reset form
      setStockOutForm({
        material: '',
        quantity: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      
      // Refresh data with a small delay to ensure backend has updated
      setTimeout(() => {
        fetchStockHistory();
        fetchMaterials();
      }, 500);
    } catch (error) {
      console.error('Error recording stock out:', error);
      toast.error(error.response?.data?.message || 'Failed to record stock out');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockIn = async (e) => {
    e.preventDefault();
    
    if (!stockInForm.material || !stockInForm.quantity) {
      toast.error('Please fill all required fields');
      return;
    }

    const requestedQty = parseFloat(stockInForm.quantity);
    
    if (requestedQty <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      
      // Create date object with current time to preserve local timezone
      const dateWithTime = new Date(stockInForm.date + 'T' + new Date().toTimeString().split(' ')[0]);
      
      await API.projects.stockIn(project._id, {
        materialId: stockInForm.material,
        quantity: requestedQty,
        date: dateWithTime,
        notes: stockInForm.notes
      });

      toast.success('Stock returned from project successfully');
      
      // Reset form
      setStockInForm({
        material: '',
        quantity: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      
      // Refresh data with a small delay to ensure backend has updated
      setTimeout(() => {
        fetchStockHistory();
        fetchMaterials();
      }, 500);
    } catch (error) {
      console.error('Error recording stock in:', error);
      toast.error(error.response?.data?.message || 'Failed to record stock in');
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedMaterial = (materialId) => {
    return materials.find(m => m._id === materialId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Project Material Tracking</h2>
            <p className="text-sm text-gray-600 mt-1">
              {project?.projectId} - {project?.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 rounded"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('out')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === 'out'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FiTruck className="inline mr-2" />
            Stock Out (Send to Project)
          </button>
          <button
            onClick={() => setActiveTab('in')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === 'in'
                ? 'border-b-2 border-green-500 text-green-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FiPackage className="inline mr-2" />
            Stock In (Return from Project)
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Stock Out Tab */}
          {activeTab === 'out' && (
            <div className="space-y-6">
              <form onSubmit={handleStockOut} className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Send Material to Project</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Material <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={stockOutForm.material}
                      onChange={(e) => setStockOutForm({ ...stockOutForm, material: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Material</option>
                      {materials.map((material) => (
                        <option key={material._id} value={material._id}>
                          {material.materialId} - {material.name} (Stock: {material.quantity} {material.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={stockOutForm.material ? getSelectedMaterial(stockOutForm.material)?.quantity : undefined}
                      value={stockOutForm.quantity}
                      onChange={(e) => setStockOutForm({ ...stockOutForm, quantity: e.target.value })}
                      placeholder="Enter quantity"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        stockOutForm.material && parseFloat(stockOutForm.quantity) > getSelectedMaterial(stockOutForm.material)?.quantity
                          ? 'border-red-500'
                          : ''
                      }`}
                      required
                    />
                    {stockOutForm.material && (
                      <div className="mt-1">
                        <p className="text-xs text-gray-500">
                          Unit: {getSelectedMaterial(stockOutForm.material)?.unit || 'N/A'}
                        </p>
                        <p className={`text-xs font-semibold ${
                          parseFloat(stockOutForm.quantity) > getSelectedMaterial(stockOutForm.material)?.quantity
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}>
                          Available: {getSelectedMaterial(stockOutForm.material)?.quantity || 0} {getSelectedMaterial(stockOutForm.material)?.unit}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiCalendar className="inline mr-1" />
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={stockOutForm.date}
                      onChange={(e) => setStockOutForm({ ...stockOutForm, date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <input
                      type="text"
                      value={stockOutForm.notes}
                      onChange={(e) => setStockOutForm({ ...stockOutForm, notes: e.target.value })}
                      placeholder="Optional notes"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <><span className="spinner-sm mr-2"></span> Recording...</>
                    ) : (
                      'Send to Project'
                    )}
                  </button>
                </div>
              </form>

              {/* Stock Out History */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Stock Out History</h3>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="spinner"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stockHistory.filter(h => h.type === 'outward').length > 0 ? (
                          stockHistory.filter(h => h.type === 'outward').map((history, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                <div>{new Date(history.date).toLocaleDateString()}</div>
                                <div className="text-xs text-gray-500">{new Date(history.date).toLocaleTimeString()}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {history.material?.name || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {history.quantity} {history.material?.unit || ''}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {history.notes || '-'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                              No stock out records found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stock In Tab */}
          {activeTab === 'in' && (
            <div className="space-y-6">
              <form onSubmit={handleStockIn} className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Return Material from Project</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Material <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={stockInForm.material}
                      onChange={(e) => setStockInForm({ ...stockInForm, material: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select Material</option>
                      {materials.map((material) => (
                        <option key={material._id} value={material._id}>
                          {material.materialId} - {material.name} (Current Stock: {material.quantity} {material.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={stockInForm.quantity}
                      onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })}
                      placeholder="Enter quantity"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                    {stockInForm.material && (
                      <p className="text-xs text-gray-500 mt-1">
                        Unit: {getSelectedMaterial(stockInForm.material)?.unit || 'N/A'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiCalendar className="inline mr-1" />
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={stockInForm.date}
                      onChange={(e) => setStockInForm({ ...stockInForm, date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <input
                      type="text"
                      value={stockInForm.notes}
                      onChange={(e) => setStockInForm({ ...stockInForm, notes: e.target.value })}
                      placeholder="Optional notes"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <><span className="spinner-sm mr-2"></span> Recording...</>
                    ) : (
                      'Return to Inventory'
                    )}
                  </button>
                </div>
              </form>

              {/* Stock In History */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Stock In History</h3>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="spinner"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stockHistory.filter(h => h.type === 'return').length > 0 ? (
                          stockHistory.filter(h => h.type === 'return').map((history, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                <div>{new Date(history.date).toLocaleDateString()}</div>
                                <div className="text-xs text-gray-500">{new Date(history.date).toLocaleTimeString()}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {history.material?.name || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                +{history.quantity} {history.material?.unit || ''}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {history.notes || '-'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                              No stock in records found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectStockModal;

