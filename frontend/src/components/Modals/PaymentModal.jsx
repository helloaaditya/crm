import { useState, useEffect, useMemo } from 'react'
import { FiX, FiInfo } from 'react-icons/fi'
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
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  // Get selected invoice details
  const selectedInvoice = useMemo(() => {
    if (!formData.invoiceId) return null
    return invoices.find(inv => inv._id === formData.invoiceId)
  }, [formData.invoiceId, invoices])

  // Calculate balance info
  const invoiceInfo = useMemo(() => {
    if (!selectedInvoice) return null
    const totalAmount = selectedInvoice.totalAmount || 0
    const paidAmount = selectedInvoice.paidAmount || 0
    // If editing existing payment, add the original payment amount back to balance
    const originalPaymentAmount = (payment && payment.invoice?._id === formData.invoiceId) ? (payment.amount || 0) : 0
    const effectivePaid = paidAmount - originalPaymentAmount
    const balanceDue = Math.max(0, totalAmount - effectivePaid)
    return { totalAmount, paidAmount: effectivePaid, balanceDue }
  }, [selectedInvoice, payment, formData.invoiceId])

  // Auto-calculate status based on amount and balance
  const computedStatus = useMemo(() => {
    if (!invoiceInfo || !formData.amount) return 'pending'
    const payingAmount = parseFloat(formData.amount) || 0
    if (payingAmount <= 0) return 'pending'
    if (payingAmount >= invoiceInfo.balanceDue) return 'success'
    return 'success' // individual payment is always success, invoice tracks partial/paid
  }, [invoiceInfo, formData.amount])

  // Remaining after this payment
  const remainingAfterPayment = useMemo(() => {
    if (!invoiceInfo) return 0
    const payingAmount = parseFloat(formData.amount) || 0
    return Math.max(0, invoiceInfo.balanceDue - payingAmount)
  }, [invoiceInfo, formData.amount])

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
        notes: payment.notes || ''
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
        notes: ''
      })
    }
  }, [payment, isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.invoiceId) {
      toast.error('Please select an invoice')
      return
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    // Warn if paying more than balance due
    if (invoiceInfo && parseFloat(formData.amount) > invoiceInfo.balanceDue) {
      if (!window.confirm(`Payment amount (₹${parseFloat(formData.amount).toLocaleString('en-IN')}) exceeds the balance due (₹${invoiceInfo.balanceDue.toLocaleString('en-IN')}). Continue anyway?`)) {
        return
      }
    }

    try {
      setLoading(true)
      
      const payload = {
        invoiceId: formData.invoiceId,
        amount: parseFloat(formData.amount),
        paymentDate: formData.paymentDate,
        paymentMethod: formData.paymentMode,
        notes: formData.notes,
        status: computedStatus
      }
      if (formData.paymentMode === 'cheque') {
        payload.chequeNumber = formData.chequeNumber || formData.referenceNumber
        payload.bankName = formData.bankName
        payload.chequeDate = formData.chequeDate
      } else if (['bank_transfer','upi','card'].includes(formData.paymentMode)) {
        payload.referenceNumber = formData.referenceNumber
      } else if (formData.paymentMode === 'razorpay') {
        payload.transactionId = formData.referenceNumber
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10 rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-800">
            {payment ? 'Edit Payment' : 'Record Payment'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <FiX size={22} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Invoice Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Invoice <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={invoices
                .filter(inv => inv.invoiceType !== 'quotation')
                .map(inv => {
                  const balance = Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0))
                  return {
                    value: inv._id,
                    label: `${inv.invoiceNumber || 'N/A'} - ${inv.customer?.name || ''} (Total: ₹${inv.totalAmount?.toLocaleString('en-IN') || 0} | Due: ₹${balance.toLocaleString('en-IN')})`
                  }
                })}
              value={formData.invoiceId}
              onChange={(val) => {
                setFormData(prev => ({ ...prev, invoiceId: val, amount: '' }))
              }}
              placeholder="-- Select Invoice --"
              required
            />
          </div>

          {/* Invoice Balance Info Card */}
          {invoiceInfo && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <FiInfo className="text-blue-600" size={16} />
                <h3 className="text-sm font-bold text-blue-800">Invoice Summary</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Total Amount</p>
                  <p className="text-base font-extrabold text-gray-800">₹{invoiceInfo.totalAmount.toLocaleString('en-IN')}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Already Paid</p>
                  <p className="text-base font-extrabold text-green-700">₹{invoiceInfo.paidAmount.toLocaleString('en-IN')}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Balance Due</p>
                  <p className={`text-base font-extrabold ${invoiceInfo.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{invoiceInfo.balanceDue.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              {invoiceInfo.balanceDue === 0 && (
                <div className="mt-2 text-center">
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full font-bold bg-green-100 text-green-700 border border-green-200">
                    ✓ Invoice Fully Paid
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Payment Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder={invoiceInfo ? `Balance due: ₹${invoiceInfo.balanceDue.toLocaleString('en-IN')}` : 'Enter amount'}
                required
              />
            </div>
            {invoiceInfo && formData.amount && (
              <div className="mt-1.5 flex items-center gap-2">
                {remainingAfterPayment > 0 ? (
                  <p className="text-xs text-orange-600 font-medium">
                    ⚠ ₹{remainingAfterPayment.toLocaleString('en-IN')} will remain pending after this payment
                  </p>
                ) : (
                  <p className="text-xs text-green-600 font-medium">
                    ✓ Invoice will be fully paid after this payment
                  </p>
                )}
              </div>
            )}
            {invoiceInfo && invoiceInfo.balanceDue > 0 && (
              <button type="button"
                onClick={() => setFormData(prev => ({ ...prev, amount: invoiceInfo.balanceDue.toString() }))}
                className="mt-1 text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline">
                Pay full balance (₹{invoiceInfo.balanceDue.toLocaleString('en-IN')})
              </button>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              required
            />
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Payment Mode <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.paymentMode}
              onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              required
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="upi">UPI</option>
              <option value="cheque">Cheque</option>
              <option value="razorpay">Online (Razorpay)</option>
              <option value="card">Card</option>
            </select>
          </div>

          {/* Reference / Cheque Details */}
          {['bank_transfer','upi','card','razorpay'].includes(formData.paymentMode) && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {formData.paymentMode === 'razorpay' ? 'Transaction ID' : 'Reference / Transaction Number'}
              </label>
              <input
                type="text"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder={formData.paymentMode === 'razorpay' ? 'e.g., RZP_Payment_ID' : formData.paymentMode === 'upi' ? 'e.g., UPI Ref Number' : 'e.g., UTR / NEFT Ref'}
              />
            </div>
          )}

          {formData.paymentMode === 'cheque' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cheque Number</label>
                <input
                  type="text"
                  value={formData.chequeNumber}
                  onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bank Name</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cheque Date</label>
                <input
                  type="date"
                  value={formData.chequeDate}
                  onChange={(e) => setFormData({ ...formData, chequeDate: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              rows="2"
              placeholder="Add any remarks about this payment..."
            />
          </div>

          {/* Payment Summary */}
          {formData.amount && invoiceInfo && (
            <div className={`rounded-xl p-4 border ${remainingAfterPayment > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">After This Payment</p>
                  <p className={`text-sm font-bold ${remainingAfterPayment > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                    {remainingAfterPayment > 0
                      ? `₹${remainingAfterPayment.toLocaleString('en-IN')} will remain pending`
                      : 'Invoice will be fully paid'}
                  </p>
                </div>
                <div className={`px-3 py-1.5 text-xs rounded-full font-bold ${remainingAfterPayment > 0 ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                  {remainingAfterPayment > 0 ? 'Partial' : 'Full Payment'}
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold text-sm transition-colors"
              disabled={loading}
            >
              {loading ? 'Saving...' : (payment ? 'Update Payment' : `Record Payment${formData.amount ? ` - ₹${parseFloat(formData.amount).toLocaleString('en-IN')}` : ''}`)}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PaymentModal
