import { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import API from '../../api';
import { toast } from 'react-toastify';

const StockOutwardModal = ({ isOpen, onClose, onSuccess, material }) => {
  const [formData, setFormData] = useState({
    quantity: '',
    location: 'godown',
    reference: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && material) {
      setFormData({
        quantity: '',
        location: material.storageLocation || 'godown',
        reference: '',
        notes: ''
      });
    }
  }, [isOpen, material]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate quantity
    if (parseFloat(formData.quantity) > material.quantity) {
      toast.error(`Cannot deduct more than available stock (${material.quantity} ${material.unit})`);
      return;
    }

    setLoading(true);

    try {
      await API.inventory.materialOutward(material._id, {
        quantity: parseFloat(formData.quantity),
        location: formData.location,
        reference: formData.reference || 'Manual Entry',
        notes: formData.notes || `Stock deducted from ${formData.location}`
      });

      toast.success(`${formData.quantity} ${material.unit} deducted from stock at ${formData.location}`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error deducting stock:', error);
      toast.error(error.response?.data?.message || 'Failed to deduct stock');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !material) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Deduct Stock - {material.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity to Deduct <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                min="0.01"
                max={material.quantity}
                step="0.01"
                placeholder="Enter quantity"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-gray-600 font-medium">{material.unit}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Available stock: <strong>{material.quantity} {material.unit}</strong>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deducted From Location <span className="text-red-500">*</span>
            </label>
            <select
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="godown">Godown</option>
              <option value="office">Office</option>
              <option value="project_site">Project Site</option>
              <option value="warehouse">Warehouse</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference (Project/Invoice)
            </label>
            <input
              type="text"
              name="reference"
              value={formData.reference}
              onChange={handleChange}
              placeholder="e.g., PRJ-RES-00001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="2"
              placeholder="Reason for deduction..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
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
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Deducting...' : 'Deduct Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockOutwardModal;

