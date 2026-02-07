import { useState, useEffect } from 'react'
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiCalendar, FiDownload, FiClock, FiCheckCircle, FiXCircle, FiChevronDown, FiChevronUp, FiFileText, FiGrid } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function MySalary() {
  const [salaryData, setSalaryData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [hold, setHold] = useState(null)
  const [requesting, setRequesting] = useState(false)
  const [requestAmount, setRequestAmount] = useState('')
  const [activeView, setActiveView] = useState('overview') // 'overview' or 'sheet'
  const [expandedPayment, setExpandedPayment] = useState(null)

  useEffect(() => {
    fetchSalary()
    fetchHold()
  }, [])

  const fetchSalary = async () => {
    try {
      setLoading(true)
      const response = await API.employees.mySalary()
      setSalaryData(response.data.data)
    } catch (error) {
      console.error('Error fetching salary:', error)
      toast.error('Failed to fetch salary information')
    } finally {
      setLoading(false)
    }
  }

  const downloadPayslip = async (month) => {
    try {
      const response = await API.employees.myPayslip(month)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Payslip_${month.replace('-', '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Payslip downloaded successfully')
    } catch (error) {
      console.error('Error downloading payslip:', error)
      toast.error(error.response?.data?.message || 'Failed to download payslip')
    }
  }

  const fetchHold = async () => {
    try {
      const res = await API.employees.myHold.get()
      setHold(res.data.data)
    } catch (e) {
      console.error('Error fetching hold:', e)
    }
  }

  const requestWithdraw = async () => {
    if (!hold) return
    const amt = Number(requestAmount)
    if (!amt || amt <= 0) return toast.error('Enter a valid amount')
    if (amt > hold.withdrawable) return toast.error(`Max withdrawable is ₹${hold.withdrawable}`)
    try {
      setRequesting(true)
      await API.employees.myHold.request({ amount: amt })
      toast.success('Withdrawal request submitted')
      setRequestAmount('')
      fetchHold()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to submit request')
    } finally {
      setRequesting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading salary information...</p>
        </div>
      </div>
    )
  }

  if (!salaryData) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiDollarSign className="text-gray-400" size={32} />
          </div>
          <p className="text-gray-600 font-medium">No salary data available</p>
          <p className="text-gray-400 text-sm mt-1">Please contact your admin</p>
        </div>
      </div>
    )
  }

  const modeColors = {
    bank_transfer: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: '🏦', label: 'Bank Transfer' },
    upi: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: '📱', label: 'UPI' },
    cheque: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '📝', label: 'Cheque' },
    cash: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: '💵', label: 'Cash' }
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Salary</h1>
          <p className="text-sm text-gray-500 mt-1">View your salary breakdown, monthly sheets, and payment history</p>
        </div>
        {/* Tab Switcher */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button onClick={() => setActiveView('overview')}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'overview' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <FiDollarSign className="mr-1.5" size={15} />Overview
          </button>
          <button onClick={() => setActiveView('sheet')}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'sheet' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <FiGrid className="mr-1.5" size={15} />Monthly Sheets
          </button>
        </div>
      </div>

      {/* =============== OVERVIEW TAB =============== */}
      {activeView === 'overview' && (
        <>
          {/* Hero Salary Card */}
          <div className="bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 text-white rounded-2xl p-6 sm:p-8 mb-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white bg-opacity-5 rounded-full -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white bg-opacity-5 rounded-full -ml-8 -mb-8"></div>
            <div className="relative z-10">
              <p className="text-green-100 text-sm font-medium mb-1">Net Monthly Salary</p>
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">₹{salaryData.netSalary?.toLocaleString('en-IN')}</h2>
              <div className="flex flex-wrap gap-4 mt-4 text-sm">
                <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-lg px-4 py-2">
                  <span className="text-green-100 text-xs block">Basic</span>
                  <span className="font-bold">₹{salaryData.basicSalary?.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-lg px-4 py-2">
                  <span className="text-green-100 text-xs block">Allowances</span>
                  <span className="font-bold">+₹{salaryData.totalAllowances?.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-lg px-4 py-2">
                  <span className="text-green-100 text-xs block">Deductions</span>
                  <span className="font-bold">-₹{salaryData.totalDeductions?.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Earnings & Deductions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Earnings Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                    <FiTrendingUp className="text-green-600" size={18} />
                  </div>
                  <h3 className="font-bold text-gray-800">Earnings</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2.5 border-b border-gray-50">
                    <span className="text-gray-600 text-sm">Basic Salary</span>
                    <span className="font-bold text-gray-800">₹{salaryData.basicSalary?.toLocaleString('en-IN')}</span>
                  </div>
                  {salaryData.allowances && Object.entries(salaryData.allowances).map(([key, value]) => (
                    value > 0 && (
                      <div key={key} className="flex justify-between items-center py-2.5 border-b border-gray-50">
                        <span className="text-gray-600 text-sm capitalize">{key === 'hra' ? 'HRA' : key === 'ot' ? 'OT (Overtime)' : key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="font-semibold text-green-600">+₹{value?.toLocaleString('en-IN')}</span>
                      </div>
                    )
                  ))}
                  <div className="flex justify-between items-center py-3 bg-green-50 px-4 rounded-xl mt-3">
                    <span className="font-bold text-gray-800">Total Earnings</span>
                    <span className="font-extrabold text-green-700 text-lg">₹{(salaryData.basicSalary + salaryData.totalAllowances)?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Deductions Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-red-50 to-rose-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                    <FiTrendingDown className="text-red-600" size={18} />
                  </div>
                  <h3 className="font-bold text-gray-800">Deductions</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {salaryData.deductions && Object.entries(salaryData.deductions).map(([key, value]) => (
                    value > 0 && (
                      <div key={key} className="flex justify-between items-center py-2.5 border-b border-gray-50">
                        <span className="text-gray-600 text-sm uppercase">{key}</span>
                        <span className="font-semibold text-red-600">-₹{value?.toLocaleString('en-IN')}</span>
                      </div>
                    )
                  ))}
                  {salaryData.totalDeductions === 0 && (
                    <p className="text-gray-400 text-center py-6 text-sm">No deductions applied</p>
                  )}
                  <div className="flex justify-between items-center py-3 bg-red-50 px-4 rounded-xl mt-3">
                    <span className="font-bold text-gray-800">Total Deductions</span>
                    <span className="font-extrabold text-red-700 text-lg">₹{salaryData.totalDeductions?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hold (Retention) Section */}
          {hold && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FiClock className="text-blue-600" size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">Salary Hold (Retention)</h3>
                    <p className="text-xs text-gray-500">{hold.holdPercent}% of paid salary is held. Withdrawable after qualifying period.</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Total Accrued</p>
                    <p className="text-xl font-extrabold text-gray-800">₹{hold.totalAccrued?.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Current Balance</p>
                    <p className="text-xl font-extrabold text-gray-800">₹{hold.holdBalance?.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                    <p className="text-[10px] uppercase tracking-wider text-green-600 font-semibold mb-1">Withdrawable</p>
                    <p className="text-xl font-extrabold text-green-700">₹{hold.withdrawable?.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-100">
                    <p className="text-[10px] uppercase tracking-wider text-orange-600 font-semibold mb-1">Pending Requests</p>
                    <p className="text-xl font-extrabold text-orange-700">₹{hold.pendingRequestsAmount?.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {!hold.canWithdraw ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FiClock className="text-amber-600" size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-800 text-sm">Withdrawal Not Available Yet</p>
                      <p className="text-xs text-amber-700 mt-1">You need <strong>6 months of employment</strong> to request withdrawal.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2">
                      <FiCheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={16} />
                      <div className="text-xs text-green-800">
                        <strong>Eligible for Withdrawal</strong> - You can withdraw up to 3 months worth of hold amount.
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Withdrawal Amount</label>
                        <input type="number" min="0" value={requestAmount} onChange={(e) => setRequestAmount(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder={`Max ₹${hold.withdrawable || 0}`} />
                      </div>
                      <button onClick={requestWithdraw} disabled={requesting || (Number(requestAmount) || 0) <= 0}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-semibold text-sm transition-colors">
                        {requesting ? 'Submitting...' : 'Request Withdrawal'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Current Month Status */}
          {salaryData.currentMonth && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FiCalendar className="text-blue-600" size={18} />
                  </div>
                  <h3 className="font-bold text-gray-800">Current Month Status</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                    <p className="text-[10px] uppercase tracking-wider text-blue-500 font-semibold mb-2">Month</p>
                    <p className="text-xl font-extrabold text-gray-800">{salaryData.currentMonth.month}</p>
                  </div>
                  <div className={`rounded-xl p-5 border ${salaryData.currentMonth.status === 'paid' ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Status</p>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full font-bold ${
                      salaryData.currentMonth.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {salaryData.currentMonth.status === 'paid' ? <><FiCheckCircle size={14} /> Paid</> : <><FiClock size={14} /> Pending</>}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Amount</p>
                    <p className="text-xl font-extrabold text-gray-800">₹{salaryData.currentMonth.netAmount?.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment History */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <FiFileText className="text-indigo-600" size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Payment History</h3>
                  <p className="text-xs text-gray-500">{salaryData.history?.length || 0} payment records</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {salaryData.history && salaryData.history.length > 0 ? (
                <div className="space-y-3">
                  {salaryData.history.map((record, index) => {
                    const mode = modeColors[record.paymentMode] || modeColors.cash
                    const isExpanded = expandedPayment === index
                    return (
                      <div key={index} className="border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 hover:shadow-sm transition-all duration-200">
                        {/* Payment Row */}
                        <div className="flex items-center justify-between px-5 py-4 cursor-pointer" onClick={() => setExpandedPayment(isExpanded ? null : index)}>
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center">
                              <FiCalendar className="text-gray-600" size={18} />
                            </div>
                            <div>
                              <p className="font-bold text-gray-800">{record.month}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full font-bold ${mode.bg} ${mode.text} border ${mode.border}`}>
                                  {mode.icon} {mode.label}
                                </span>
                                <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${record.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {record.status === 'paid' ? 'Paid' : 'Pending'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-lg font-extrabold text-green-700">₹{record.netAmount?.toLocaleString('en-IN')}</p>
                              <p className="text-[10px] text-gray-400">
                                {record.paymentDate ? new Date(record.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not paid yet'}
                              </p>
                            </div>
                            {isExpanded ? <FiChevronUp className="text-gray-400" size={18} /> : <FiChevronDown className="text-gray-400" size={18} />}
                          </div>
                        </div>
                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3 text-sm">
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Gross Amount</p>
                                <p className="font-bold text-gray-800">₹{record.grossAmount?.toLocaleString('en-IN')}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Deductions</p>
                                <p className="font-bold text-red-600">-₹{record.deductions?.toLocaleString('en-IN')}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Net Amount</p>
                                <p className="font-bold text-green-700">₹{record.netAmount?.toLocaleString('en-IN')}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Payment Date</p>
                                <p className="font-bold text-gray-800">
                                  {record.paymentDate ? new Date(record.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                </p>
                              </div>
                            </div>
                            {(record.referenceNumber || record.transactionId || record.chequeNumber || record.notes) && (
                              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs pt-3 border-t border-gray-200">
                                {record.referenceNumber && <div><span className="text-gray-400">Ref:</span> <span className="font-mono font-bold text-gray-700">{record.referenceNumber}</span></div>}
                                {record.transactionId && <div><span className="text-gray-400">Txn ID:</span> <span className="font-mono font-bold text-gray-700">{record.transactionId}</span></div>}
                                {record.chequeNumber && <div><span className="text-gray-400">Cheque:</span> <span className="font-mono font-bold text-gray-700">{record.chequeNumber}</span></div>}
                                {record.bankName && <div><span className="text-gray-400">Bank:</span> <span className="font-bold text-gray-700">{record.bankName}</span></div>}
                                {record.notes && <div className="w-full"><span className="text-gray-400">Notes:</span> <span className="text-gray-600">{record.notes}</span></div>}
                              </div>
                            )}
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              {record.status === 'paid' && (
                                <button onClick={(e) => { e.stopPropagation(); downloadPayslip(record.month) }}
                                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm">
                                  <FiDownload size={14} />Download Payslip
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiFileText className="text-gray-400" size={32} />
                  </div>
                  <p className="text-gray-600 font-medium">No payment history available</p>
                  <p className="text-gray-400 text-sm mt-1">Payments will appear here once processed</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* =============== MONTHLY SHEETS TAB =============== */}
      {activeView === 'sheet' && (
        <div className="space-y-4">
          {salaryData.salarySheets && salaryData.salarySheets.length > 0 ? (
            salaryData.salarySheets.map((sheet, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Sheet Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                      {monthNames[sheet.month - 1]?.substring(0, 3)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{monthNames[sheet.month - 1]} {sheet.year}</p>
                      <p className="text-xs text-gray-500">Monthly Salary Sheet</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 text-xs rounded-full font-bold ${sheet.status === 'paid' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                      {sheet.status === 'paid' ? '✓ Paid' : '○ Unpaid'}
                    </span>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Final Salary</p>
                      <p className="text-xl font-extrabold text-green-700">₹{(sheet.afterDeduction || 0).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
                {/* Sheet Body */}
                <div className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                      <p className="text-[10px] uppercase tracking-wider text-blue-500 font-semibold mb-1">Total Days</p>
                      <p className="text-lg font-extrabold text-gray-800">{sheet.totalDays}</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                      <p className="text-[10px] uppercase tracking-wider text-red-500 font-semibold mb-1">Absent</p>
                      <p className="text-lg font-extrabold text-red-700">{sheet.totalAbsent}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                      <p className="text-[10px] uppercase tracking-wider text-green-500 font-semibold mb-1">Present</p>
                      <p className="text-lg font-extrabold text-green-700">{sheet.presentDays}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                      <p className="text-[10px] uppercase tracking-wider text-indigo-500 font-semibold mb-1">Extra Days</p>
                      <p className="text-lg font-extrabold text-indigo-700">{sheet.extraDaysWorking}</p>
                      {(sheet.extraDaysDetails || []).length > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          {sheet.extraDaysDetails.map((d, di) => (
                            <p key={di} className="text-[10px] text-indigo-600 truncate" title={`${d.date ? new Date(d.date).toLocaleDateString('en-IN') : ''} - ${d.note}`}>
                              {d.date ? new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}{d.note ? `: ${d.note}` : ''}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Fixed Salary</p>
                      <p className="text-lg font-extrabold text-gray-800">₹{(sheet.fixedSalary || 0).toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  {/* Calculation Breakdown */}
                  <div className="mt-5 bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">Salary Calculation</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Per Day Salary</span>
                        <span className="font-semibold">₹{(sheet.perDaySalary || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Salary Payable</span>
                        <span className="font-bold text-blue-700">₹{(sheet.salaryPayable || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">5% Deduction</span>
                        <span className="font-semibold text-red-600">-₹{(sheet.fivePercentDeduction || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Advance (OT)</span>
                        <span className="font-semibold text-orange-600">{sheet.advance > 0 ? `-₹${sheet.advance.toLocaleString('en-IN')}` : '₹0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Timings Deduction</span>
                        <span className="font-semibold text-red-600">{sheet.timingsDeduction > 0 ? `-₹${sheet.timingsDeduction.toLocaleString('en-IN')}` : '₹0'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-800">After Deduction</span>
                        <span className="font-extrabold text-green-700 text-lg">₹{(sheet.afterDeduction || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Paid Date */}
                  {sheet.paidDate && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-green-700">
                      <FiCheckCircle size={14} />
                      <span>Paid on {new Date(sheet.paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiGrid className="text-gray-400" size={32} />
              </div>
              <p className="text-gray-600 font-medium">No Monthly Sheets Found</p>
              <p className="text-gray-400 text-sm mt-1">Monthly salary sheets will appear here once generated by admin</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MySalary
