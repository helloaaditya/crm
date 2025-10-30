import { useState, useEffect } from 'react'
import { FiX } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'
import SearchableSelect from '../SearchableSelect'

const PaymentModal = ({ isOpen, onClose, onSuccess, payment = null, invoices = [] }) => {
  const [formData, setFormData] = useState({
    invoiceId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'cash',
    referenceNumber: '',
    chequeNumber: '',
    bankName: '',
    chequeDate: '',
    notes: '',
    status: 'paid'
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (payment) {
      setFormData({
        invoiceId: payment.invoice?._id || '',
        amount: payment.amount || '',
        paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        paymentMode: payment.paymentMode || payment.paymentMethod || 'cash',
        referenceNumber: payment.referenceNumber || payment.transactionId || '',
        chequeNumber: payment.chequeDetails?.chequeNumber || '',
        bankName: payment.chequeDetails?.bankName || '',
        chequeDate: payment.chequeDetails?.chequeDate ? new Date(payment.chequeDetails.chequeDate).toISOString().split('T')[0] : '',
        notes: payment.notes || '',
        status: payment.status || 'paid'
      })
    } else {
      setFormData({
        invoiceId: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMode: 'cash',
        referenceNumber: '',
        chequeNumber: '',
        bankName: '',
        chequeDate: '',
        notes: '',
        status: 'paid'
      })
    }
  }, [payment, isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.invoiceId) {
      toast.error('Please select an invoice')
      return
    }

    if (!formData.amount || formData.amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    try {
      setLoading(true)
      
      const payload = {
        invoiceId: formData.invoiceId,
        amount: parseFloat(formData.amount),
        paymentDate: formData.paymentDate,
        paymentMethod: formData.paymentMode,
        notes: formData.notes,
        status: formData.status
      };
      if (formData.paymentMode === 'cheque') {
        payload.chequeNumber = formData.chequeNumber || formData.referenceNumber;
        payload.bankName = formData.bankName;
        payload.chequeDate = formData.chequeDate;
      } else if (['bank_transfer','upi','card'].includes(formData.paymentMode)) {
        payload.referenceNumber = formData.referenceNumber;
      } else if (formData.paymentMode === 'razorpay') {
        // referenceNumber not needed here; razorpay flow uses verify endpoint
      }

      await API.payments.recordManual(payload)
      toast.success(payment ? 'Payment updated successfully' : 'Payment recorded successfully')
      
      onSuccess()
    } catch (error) {
      console.error('Error saving payment:', error)
      toast.error(error.response?.data?.message || 'Failed to save payment')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            {payment ? 'Edit Payment' : 'Record Payment'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Invoice Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={invoices.map(inv => ({ value: inv._id, label: `${inv.invoiceNumber} - ${inv.customer?.name || ''} (₹${inv.totalAmount?.toLocaleString() || 0})` }))}
                value={formData.invoiceId}
                onChange={(val) => setFormData({ ...formData, invoiceId: val })}
                placeholder="-- Select Invoice --"
                required
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="razorpay">Online Payment</option>
              </select>
            </div>

            {/* Reference / Cheque Details */}
            {['bank_transfer','upi','card'].includes(formData.paymentMode) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference / Transaction Number
                </label>
                <input
                  type="text"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., UTR, UPI txn ID, card auth"
                />
              </div>
            )}

            {formData.paymentMode === 'cheque' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cheque Number
                  </label>
                  <input
                    type="text"
                    value={formData.chequeNumber}
                    onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cheque Date
                  </label>
                  <input
                    type="date"
                    value={formData.chequeDate}
                    onChange={(e) => setFormData({ ...formData, chequeDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows="3"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : (payment ? 'Update' : 'Record')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PaymentModal