import { useState, useEffect, useCallback } from 'react'
import { FiEdit2, FiCheck, FiX, FiDownload, FiSearch, FiSave, FiCalendar, FiCheckCircle, FiXCircle, FiDollarSign, FiUser, FiFileText, FiGrid, FiList } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'

const SalaryManagement = () => {
  const { user } = useAuth()
  const now = new Date()
  const [activeTab, setActiveTab] = useState('sheet') // 'sheet' or 'records'

  // ========== SALARY SHEET STATE ==========
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [salaryData, setSalaryData] = useState([])
  const [meta, setMeta] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingRow, setEditingRow] = useState(null)
  const [editData, setEditData] = useState({})
  const [showSheetProcessModal, setShowSheetProcessModal] = useState(false)
  const [processRowData, setProcessRowData] = useState(null)
  const [processForm, setProcessForm] = useState({
    fromDate: '',
    toDate: '',
    paidDate: new Date().toISOString().split('T')[0],
    paymentMode: 'bank_transfer',
    referenceNumber: '',
    transactionId: '',
    chequeNumber: '',
    processBank: '',
    notes: ''
  })
  const [processEmployeeDetails, setProcessEmployeeDetails] = useState(null)

  // ========== EMPLOYEE RECORDS STATE ==========
  const [employees, setEmployees] = useState([])
  const [empSearchTerm, setEmpSearchTerm] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [salaryHistory, setSalaryHistory] = useState([])
  const [preview, setPreview] = useState(null)
  const [holdRequests, setHoldRequests] = useState([])
  const [holdLoading, setHoldLoading] = useState(false)
  const [recordsLoading, setRecordsLoading] = useState(false)
  // Process salary is now handled from the Salary Sheet tab only
  const [formData, setFormData] = useState({
    month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    basicSalary: 0,
    allowances: { hra: 0, transport: 0, ot: 0 },
    deductions: { pf: 0, esi: 0, tax: 0, other: 0 },
    otHours: 0,
    hourlyRate: 0,
    paymentMode: 'bank_transfer',
    paidDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    transactionId: '',
    chequeNumber: '',
    bankName: '',
    notes: ''
  })

  const superiorRoles = ['manager', 'admin', 'supervisor', 'engineer']
  const isSuperiorRole = selectedEmployee && superiorRoles.includes(selectedEmployee.role?.toLowerCase())

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // ========== SALARY SHEET LOGIC ==========
  const fetchSalarySheet = useCallback(async () => {
    try {
      setLoading(true)
      const res = await API.salarySheet.get({ month, year })
      setSalaryData(res.data.data || [])
      setMeta(res.data.meta || {})
    } catch (error) {
      console.error('Error fetching salary sheet:', error)
      toast.error('Failed to load salary sheet')
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    if (activeTab === 'sheet') fetchSalarySheet()
  }, [fetchSalarySheet, activeTab])

  const recalculate = (data) => {
    const totalDays = parseFloat(data.totalDays) || 1
    const fixedSalary = parseFloat(data.fixedSalary) || 0
    const presentDays = parseFloat(data.presentDays) || 0
    const extraDaysWorking = parseFloat(data.extraDaysWorking) || 0
    const advance = parseFloat(data.advance) || 0
    const timingsDeduction = parseFloat(data.timingsDeduction) || 0
    const perDaySalary = Math.round((fixedSalary / totalDays) * 100) / 100
    const salaryPayable = Math.round(perDaySalary * (presentDays + extraDaysWorking) * 100) / 100
    const fivePercentDeduction = Math.round((salaryPayable * 5 / 100) * 100) / 100
    const afterDeduction = Math.max(0, Math.round((salaryPayable - fivePercentDeduction - advance - timingsDeduction) * 100) / 100)
    return { ...data, perDaySalary, fivePercentDeduction, salaryPayable, afterDeduction }
  }

  const handleEdit = (row) => {
    setEditingRow(row.employeeId)
    setEditData({ ...row })
  }

  const handleCancelEdit = () => {
    setEditingRow(null)
    setEditData({})
  }

  const handleFieldChange = (field, value) => {
    const numVal = value === '' ? 0 : parseFloat(value)
    const updated = { ...editData, [field]: numVal }
    if (field === 'totalAbsent') updated.presentDays = Math.max(0, (updated.totalDays || 0) - numVal)
    if (field === 'presentDays') updated.totalAbsent = Math.max(0, (updated.totalDays || 0) - numVal)
    setEditData(recalculate(updated))
  }

  const handleSaveRow = async () => {
    try {
      setSaving(true)
      // Validate extra days details - each must have a note
      const details = editData.extraDaysDetails || []
      if (details.length > 0 && details.some(d => !d.note || !d.note.trim())) {
        toast.error('Please enter a note for each extra working day')
        setSaving(false)
        return
      }
      await API.salarySheet.update(editData.employeeId, {
        month, year,
        totalDays: editData.totalDays, totalAbsent: editData.totalAbsent,
        presentDays: editData.presentDays, extraDaysWorking: editData.extraDaysWorking,
        extraDaysDetails: details,
        advance: editData.advance, timingsDeduction: editData.timingsDeduction,
        fixedSalary: editData.fixedSalary, status: editData.status
      })
      toast.success(`Salary updated for ${editData.employeeName}`)
      setEditingRow(null)
      setEditData({})
      fetchSalarySheet()
    } catch (error) {
      toast.error('Failed to save salary entry')
    } finally {
      setSaving(false)
    }
  }

  const handleBulkSave = async () => {
    try {
      setSaving(true)
      const entries = salaryData.map(row => ({
        employeeId: row.employeeId, totalDays: row.totalDays, totalAbsent: row.totalAbsent,
        presentDays: row.presentDays, extraDaysWorking: row.extraDaysWorking,
        extraDaysDetails: row.extraDaysDetails || [],
        advance: row.advance,
        timingsDeduction: row.timingsDeduction, fixedSalary: row.fixedSalary, status: row.status
      }))
      const res = await API.salarySheet.bulkSave({ month, year, entries })
      toast.success(res.data.message || 'All salary entries saved')
      fetchSalarySheet()
    } catch (error) {
      toast.error('Failed to bulk save')
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePaid = async (row) => {
    try {
      if (row.status === 'paid') {
        await API.salarySheet.markUnpaid(row.employeeId, { month, year })
        toast.success(`${row.employeeName} marked as Unpaid`)
      } else {
        if (!row.isExisting) {
          await API.salarySheet.update(row.employeeId, {
            month, year, totalDays: row.totalDays, totalAbsent: row.totalAbsent,
            presentDays: row.presentDays, extraDaysWorking: row.extraDaysWorking,
            extraDaysDetails: row.extraDaysDetails || [],
            advance: row.advance,
            timingsDeduction: row.timingsDeduction, fixedSalary: row.fixedSalary, status: 'paid'
          })
        } else {
          await API.salarySheet.markPaid(row.employeeId, { month, year })
        }
        toast.success(`${row.employeeName} marked as Paid`)
      }
      fetchSalarySheet()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update payment status')
    }
  }

  const handleDownloadCSV = () => {
    const headers = ['S.No','Employee ID','Name','Total Days','Total Absent','Present','Extra Days Working','Extra Days Details','Advance (OT)','Timings Deduction','Fixed Salary','Per Day Salary','5% Deduction','Salary Payable','After Deduction','Status']
    const rows = filteredData.map((row, i) => {
      const extraDetails = (row.extraDaysDetails || []).map(d => `${d.date ? new Date(d.date).toLocaleDateString('en-IN') : ''}: ${d.note || ''}`).join(' | ')
      return [i+1,row.employeeCode,row.employeeName,row.totalDays,row.totalAbsent,row.presentDays,row.extraDaysWorking,`"${extraDetails}"`,row.advance,row.timingsDeduction,row.fixedSalary,row.perDaySalary,row.fivePercentDeduction,row.salaryPayable,row.afterDeduction,row.status]
    })
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob) 
    const link = document.createElement('a')
    link.href = url
    link.download = `Salary_Sheet_${monthNames[month - 1]}_${year}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded')
  }

  // ========== SHEET PROCESS PAYMENT ==========
  const handleOpenSheetProcess = async (row) => {
    // Default from/to = full month
    const daysInMonth = new Date(year, month, 0).getDate()
    const fromDate = `${year}-${String(month).padStart(2, '0')}-01`
    const toDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

    setProcessRowData(row)
    setProcessForm({
      fromDate,
      toDate,
      paidDate: new Date().toISOString().split('T')[0],
      paymentMode: 'bank_transfer',
      referenceNumber: '',
      transactionId: '',
      chequeNumber: '',
      processBank: '',
      notes: ''
    })

    // Fetch full employee details for bank info
    try {
      const res = await API.employees.getById(row.employeeId)
      setProcessEmployeeDetails(res.data.data)
    } catch (err) {
      setProcessEmployeeDetails(null)
    }

    setShowSheetProcessModal(true)
  }

  // Calculate salary based on from/to dates
  const getProcessCalculation = () => {
    if (!processRowData) return {}
    const from = new Date(processForm.fromDate)
    const to = new Date(processForm.toDate)
    if (isNaN(from) || isNaN(to) || to < from) return { days: 0, amount: 0 }

    // Count working days in the date range (excl Sundays)
    let workingDays = 0
    const d = new Date(from)
    while (d <= to) {
      if (d.getDay() !== 0) workingDays++
      d.setDate(d.getDate() + 1)
    }

    const totalDays = processRowData.totalDays || 1
    const fixedSalary = processRowData.fixedSalary || 0
    const perDay = fixedSalary / totalDays
    const presentInRange = Math.min(workingDays, processRowData.presentDays || 0)
    const extraDays = processRowData.extraDaysWorking || 0
    const salaryForRange = Math.round(perDay * (presentInRange + extraDays) * 100) / 100
    const fivePercent = Math.round((salaryForRange * 5 / 100) * 100) / 100
    const advance = processRowData.advance || 0
    const timingsDeduction = processRowData.timingsDeduction || 0
    const finalAmount = Math.max(0, Math.round((salaryForRange - fivePercent - advance - timingsDeduction) * 100) / 100)

    return {
      workingDays,
      totalDays,
      perDay: Math.round(perDay * 100) / 100,
      presentInRange,
      extraDays,
      salaryForRange,
      fivePercent,
      advance,
      timingsDeduction,
      finalAmount
    }
  }

  const handleSheetProcessPayment = async (e) => {
    e.preventDefault()
    if (!processRowData) return
    const calc = getProcessCalculation()

    try {
      setSaving(true)
      const monthStr = `${year}-${String(month).padStart(2, '0')}`

      await API.employees.processSalary(processRowData.employeeId, {
        month: monthStr,
        paymentMode: processForm.paymentMode,
        paidDate: processForm.paidDate,
        referenceNumber: processForm.referenceNumber,
        transactionId: processForm.transactionId,
        chequeNumber: processForm.chequeNumber,
        bankName: processForm.processBank,
        notes: processForm.notes
          ? `${processForm.notes} | Period: ${processForm.fromDate} to ${processForm.toDate}`
          : `Period: ${processForm.fromDate} to ${processForm.toDate}`
      })

      // Also mark the sheet entry as paid
      try {
        if (!processRowData.isExisting) {
          await API.salarySheet.update(processRowData.employeeId, {
            month, year,
            totalDays: processRowData.totalDays, totalAbsent: processRowData.totalAbsent,
            presentDays: processRowData.presentDays, extraDaysWorking: processRowData.extraDaysWorking,
            sickLeave: processRowData.sickLeave, newYearHoliday: processRowData.newYearHoliday,
            sankranthiHoliday: processRowData.sankranthiHoliday, advance: processRowData.advance,
            timingsDeduction: processRowData.timingsDeduction, fixedSalary: processRowData.fixedSalary,
            status: 'paid'
          })
        } else {
          await API.salarySheet.markPaid(processRowData.employeeId, { month, year })
        }
      } catch (sheetErr) {
        // Non-critical, salary was still processed
      }

      toast.success(`Salary processed for ${processRowData.employeeName} - ₹${calc.finalAmount.toLocaleString('en-IN')}`)
      setShowSheetProcessModal(false)
      setProcessRowData(null)
      setProcessEmployeeDetails(null)
      fetchSalarySheet()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process salary')
    } finally {
      setSaving(false)
    }
  }

  const filteredData = salaryData.filter(row => {
    if (!searchTerm) return true
    const s = searchTerm.toLowerCase()
    return row.employeeName?.toLowerCase().includes(s) || row.employeeCode?.toLowerCase().includes(s)
  })

  const totalSalaryPayable = filteredData.reduce((sum, r) => sum + (r.salaryPayable || 0), 0)
  const totalAfterDeduction = filteredData.reduce((sum, r) => sum + (r.afterDeduction || 0), 0)
  const paidCount = filteredData.filter(r => r.status === 'paid').length
  const unpaidCount = filteredData.filter(r => r.status === 'unpaid').length

  // ========== EMPLOYEE RECORDS LOGIC ==========
  const fetchEmployees = async () => {
    try {
      const response = await API.employees.getAll({ limit: 10000 })
      setEmployees(response.data.data || [])
    } catch (error) {
      toast.error('Failed to fetch employees')
    }
  }

  const fetchSalaryHistory = async (employeeId) => {
    try {
      setRecordsLoading(true)
      const response = await API.employees.getSalaryHistory(employeeId)
      setSalaryHistory(response.data.data || [])
    } catch (error) {
      toast.error('Failed to fetch salary history')
    } finally {
      setRecordsLoading(false)
    }
  }

  const fetchPreview = async (employeeId, monthStr) => {
    if (!employeeId || !monthStr) return
    try {
      const res = await API.employees.getSalaryPreview(employeeId, monthStr)
      setPreview(res.data.data)
    } catch (e) {
      setPreview(null)
    }
  }

  const fetchHoldRequests = async (status = 'pending') => {
    try {
      setHoldLoading(true)
      const res = await API.employees.holdRequests.list({ status })
      setHoldRequests(res.data.data || [])
    } catch (e) {
      console.error('Error fetching hold requests:', e)
    } finally {
      setHoldLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'records') {
      fetchEmployees()
      fetchHoldRequests()
    }
  }, [activeTab])

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee)
    const allowances = employee.allowances || { hra: 0, transport: 0, ot: 0 }
    if (allowances.other !== undefined && !allowances.ot) {
      allowances.ot = allowances.other
      delete allowances.other
    }
    setFormData(prev => ({
      ...prev,
      basicSalary: employee.basicSalary || 0,
      allowances,
      deductions: employee.deductions || { pf: 0, esi: 0, tax: 0, other: 0 },
      otHours: employee.otHours || 0,
      hourlyRate: employee.hourlyRate || 0
    }))
    fetchSalaryHistory(employee._id)
    fetchPreview(employee._id, formData.month)
  }


  useEffect(() => {
    if (selectedEmployee) fetchPreview(selectedEmployee._id, formData.month)
  }, [formData.month])

  const handleUpdateSalaryStructure = async () => {
    if (!selectedEmployee) return
    try {
      await API.employees.update(selectedEmployee._id, {
        basicSalary: formData.basicSalary,
        allowances: formData.allowances,
        deductions: formData.deductions,
        otHours: isSuperiorRole ? formData.otHours : undefined,
        hourlyRate: isSuperiorRole ? formData.hourlyRate : undefined
      })
      toast.success('Salary structure updated successfully')
      fetchEmployees()
    } catch (error) {
      toast.error('Failed to update salary structure')
    }
  }

  const handleDownloadPayslip = async (employeeId, salaryId, monthStr) => {
    try {
      const response = await API.employees.downloadPayslip(employeeId, salaryId)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Payslip_${monthStr.replace('-', '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      setTimeout(() => { document.body.removeChild(link); window.URL.revokeObjectURL(url) }, 100)
      toast.success('Payslip downloaded successfully')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to download payslip')
    }
  }

  const approveHold = async (reqId) => {
    try {
      await API.employees.holdRequests.approve(reqId, { paymentMethod: 'bank_transfer' })
      toast.success('Withdrawal approved')
      fetchHoldRequests()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Approve failed')
    }
  }

  const rejectHold = async (reqId) => {
    try {
      await API.employees.holdRequests.reject(reqId, {})
      toast.success('Withdrawal rejected')
      fetchHoldRequests()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Reject failed')
    }
  }

  const calculateTotals = () => {
    const totalAllowances = Object.values(formData.allowances).reduce((sum, val) => sum + Number(val || 0), 0)
    const totalDeductions = Object.values(formData.deductions).reduce((sum, val) => sum + Number(val || 0), 0)
    const grossSalary = Number(formData.basicSalary) + totalAllowances
    const netSalary = grossSalary - totalDeductions
    return { totalAllowances, totalDeductions, grossSalary, netSalary }
  }
  const { grossSalary, netSalary } = calculateTotals()

  const filteredEmployees = employees.filter(emp => {
    if (!empSearchTerm) return true
    const s = empSearchTerm.toLowerCase()
    return emp.name?.toLowerCase().includes(s) || emp.employeeId?.toLowerCase().includes(s) || emp.phone?.includes(empSearchTerm) || emp.role?.toLowerCase().includes(s)
  })

  // ========== RENDER ==========
  return (
    <div className="p-4 sm:p-6">
      {/* Header with Tabs */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Salary Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage salaries, payslips, and payment records</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('sheet')}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'sheet' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FiGrid className="mr-2" size={16} />
            Salary Sheet
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'records' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FiList className="mr-2" size={16} />
            Records & Payslips
          </button>
        </div>
      </div>

      {/* ===================== TAB 1: SALARY SHEET ===================== */}
      {activeTab === 'sheet' && (
        <>
          {/* Actions Bar */}
          <div className="flex flex-wrap gap-2 mb-4 justify-end">
            <button onClick={handleBulkSave} disabled={saving} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">
              <FiSave className="mr-2" />{saving ? 'Saving...' : 'Save All'}
            </button>
            <button onClick={handleDownloadCSV} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <FiDownload className="mr-2" />Download CSV
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1"><FiCalendar className="inline mr-1" /> Month</label>
                <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {monthNames.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Employee</label>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Name or ID..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 bg-green-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-green-600 font-medium">Paid</p>
                  <p className="text-lg font-bold text-green-700">{paidCount}</p>
                </div>
                <div className="flex-1 bg-red-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-red-600 font-medium">Unpaid</p>
                  <p className="text-lg font-bold text-red-700">{unpaidCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500 font-medium">Total Employees</p>
              <p className="text-2xl font-bold text-gray-800">{meta.totalEmployees || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500 font-medium">Working Days ({monthNames[month - 1]})</p>
              <p className="text-2xl font-bold text-blue-600">{meta.totalWorkingDays || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500 font-medium">Total Salary Payable</p>
              <p className="text-2xl font-bold text-orange-600">₹{totalSalaryPayable.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500 font-medium">Total After Deduction</p>
              <p className="text-2xl font-bold text-green-600">₹{totalAfterDeduction.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Salary Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="px-2 py-3 text-left text-xs font-semibold whitespace-nowrap sticky left-0 bg-gray-800 z-10">S.No</th>
                    <th className="px-2 py-3 text-left text-xs font-semibold whitespace-nowrap sticky left-10 bg-gray-800 z-10">NAME</th>
                    <th className="px-2 py-3 text-center text-xs font-semibold whitespace-nowrap">TOTAL<br/>DAYS</th>
                    <th className="px-2 py-3 text-center text-xs font-semibold whitespace-nowrap">TOTAL<br/>ABSENT</th>
                    <th className="px-2 py-3 text-center text-xs font-semibold whitespace-nowrap">PRESENT</th>
                    <th className="px-2 py-3 text-center text-xs font-semibold whitespace-nowrap">EXTRA DAYS<br/>WORKING</th>
                    <th className="px-2 py-3 text-center text-xs font-semibold whitespace-nowrap">ADVANCE<br/>(OT)</th>
                    <th className="px-2 py-3 text-center text-xs font-semibold whitespace-nowrap">TIMINGS<br/>DEDUCTION</th>
                    <th className="px-2 py-3 text-center text-xs font-semibold whitespace-nowrap">FIXED<br/>SALARY</th>
                    <th className="px-2 py-3 text-center text-xs font-semibold whitespace-nowrap">Per day<br/>salary</th>
                    <th className="px-2 py-3 text-center text-xs font-semibold whitespace-nowrap">5%<br/>DEDUCTION</th>
                    <th className="px-2 py-3 text-center text-xs font-semibold whitespace-nowrap">SALARY<br/>PAYABLE</th>
                    <th className="px-2 py-3 text-center text-xs font-semibold whitespace-nowrap bg-green-700">AFTER<br/>DEDUCTION</th>
                    <th className="px-2 py-3 text-center text-xs font-semibold whitespace-nowrap">STATUS</th>
                    <th className="px-2 py-3 text-center text-xs font-semibold whitespace-nowrap">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={15} className="text-center py-12 text-gray-500">
                      <div className="flex items-center justify-center gap-2"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>Loading salary sheet...</div>
                    </td></tr>
                  ) : filteredData.length === 0 ? (
                    <tr><td colSpan={15} className="text-center py-12 text-gray-500">No employees found</td></tr>
                  ) : (
                    filteredData.map((row, index) => {
                      const isEditing = editingRow === row.employeeId
                      const data = isEditing ? editData : row

                      const renderEditableInput = (field, value, opts = {}) => {
                        if (isEditing) {
                          return (
                            <input type="number" value={editData[field] ?? ''} onChange={(e) => handleFieldChange(field, e.target.value)}
                              className="w-full px-1 py-0.5 border border-blue-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                              style={{ minWidth: '60px' }} step={opts.step || '1'} min={opts.min || '0'} />
                          )
                        }
                        return <span className={`font-medium ${opts.className || ''}`}>{typeof value === 'number' ? value.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : value}</span>
                      }

                      return (
                        <tr key={row.employeeId} className={`border-b hover:bg-gray-50 ${isEditing ? 'bg-blue-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-2 py-2 text-center font-medium text-gray-600 sticky left-0 bg-inherit">{index + 1}</td>
                          <td className="px-2 py-2 whitespace-nowrap sticky left-10 bg-inherit">
                            <div className="font-medium text-gray-800">{row.employeeName}</div>
                            <div className="text-xs text-gray-500">{row.employeeCode}</div>
                          </td>
                          <td className="px-2 py-2 text-center">{renderEditableInput('totalDays', data.totalDays)}</td>
                          <td className="px-2 py-2 text-center">{renderEditableInput('totalAbsent', data.totalAbsent, { className: data.totalAbsent > 0 ? 'text-red-600' : '' })}</td>
                          <td className="px-2 py-2 text-center">{renderEditableInput('presentDays', data.presentDays, { step: '0.5', className: 'text-green-600' })}</td>
                          <td className="px-2 py-2 text-center">
                            {isEditing ? (
                              <div className="space-y-1.5">
                                <input type="number" value={editData.extraDaysWorking ?? 0}
                                  onChange={(e) => {
                                    const count = parseInt(e.target.value) || 0
                                    const existing = editData.extraDaysDetails || []
                                    let details = [...existing]
                                    if (count > details.length) {
                                      for (let i = details.length; i < count; i++) details.push({ date: '', note: '' })
                                    } else {
                                      details = details.slice(0, count)
                                    }
                                    const updated = { ...editData, extraDaysWorking: count, extraDaysDetails: details }
                                    setEditData(recalculate(updated))
                                  }}
                                  className="w-full px-1 py-0.5 border border-blue-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  style={{ minWidth: '60px' }} min="0" />
                                {(editData.extraDaysDetails || []).map((detail, di) => (
                                  <div key={di} className="bg-blue-50 border border-blue-200 rounded p-1.5 space-y-1">
                                    <div className="text-[10px] text-blue-700 font-semibold">Day {di + 1}</div>
                                    <input type="date" value={detail.date ? (typeof detail.date === 'string' && detail.date.includes('T') ? detail.date.split('T')[0] : detail.date) : ''}
                                      onChange={(e) => {
                                        const details = [...(editData.extraDaysDetails || [])]
                                        details[di] = { ...details[di], date: e.target.value }
                                        setEditData(prev => ({ ...prev, extraDaysDetails: details }))
                                      }}
                                      className="w-full px-1 py-0.5 border border-blue-300 rounded text-[11px]" />
                                    <input type="text" placeholder="Note (required)" value={detail.note || ''}
                                      onChange={(e) => {
                                        const details = [...(editData.extraDaysDetails || [])]
                                        details[di] = { ...details[di], note: e.target.value }
                                        setEditData(prev => ({ ...prev, extraDaysDetails: details }))
                                      }}
                                      className="w-full px-1 py-0.5 border border-blue-300 rounded text-[11px]" />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div>
                                <span className={`font-medium ${data.extraDaysWorking > 0 ? 'text-blue-600' : ''}`}>{data.extraDaysWorking || 0}</span>
                                {(data.extraDaysDetails || []).length > 0 && (
                                  <div className="text-[10px] text-gray-500 mt-0.5 text-left">
                                    {data.extraDaysDetails.map((d, di) => (
                                      <div key={di} className="truncate" title={`${d.date ? new Date(d.date).toLocaleDateString('en-IN') : ''} - ${d.note || ''}`}>
                                        {d.date ? new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}{d.note ? `: ${d.note}` : ''}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center">{isEditing
                            ? renderEditableInput('advance', data.advance)
                            : <span className={`font-medium ${data.advance > 0 ? 'text-orange-600' : ''}`}>{data.advance > 0 ? `₹${data.advance.toLocaleString('en-IN')}` : '0'}</span>
                          }</td>
                          <td className="px-2 py-2 text-center">{isEditing
                            ? renderEditableInput('timingsDeduction', data.timingsDeduction)
                            : <span className={`font-medium ${data.timingsDeduction > 0 ? 'text-red-600' : ''}`}>{data.timingsDeduction > 0 ? `₹${data.timingsDeduction.toLocaleString('en-IN')}` : '0'}</span>
                          }</td>
                          <td className="px-2 py-2 text-center">{isEditing
                            ? renderEditableInput('fixedSalary', data.fixedSalary)
                            : <span className="font-semibold">₹{(data.fixedSalary || 0).toLocaleString('en-IN')}</span>
                          }</td>
                          <td className="px-2 py-2 text-center"><span className="text-gray-600">₹{(data.perDaySalary || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></td>
                          <td className="px-2 py-2 text-center"><span className="text-red-600 font-medium">₹{(data.fivePercentDeduction || 0).toLocaleString('en-IN')}</span></td>
                          <td className="px-2 py-2 text-center"><span className="font-semibold text-blue-700">₹{(data.salaryPayable || 0).toLocaleString('en-IN')}</span></td>
                          <td className="px-2 py-2 text-center bg-green-50"><span className="font-bold text-green-700 text-base">₹{(data.afterDeduction || 0).toLocaleString('en-IN')}</span></td>
                          <td className="px-2 py-2 text-center">
                            <button onClick={() => handleTogglePaid(row)} className={`px-2 py-1 text-xs rounded-full font-semibold cursor-pointer transition-colors ${row.status === 'paid' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                              {row.status === 'paid' ? <span className="flex items-center gap-1"><FiCheckCircle size={12} /> Paid</span> : <span className="flex items-center gap-1"><FiXCircle size={12} /> Unpaid</span>}
                            </button>
                          </td>
                          <td className="px-2 py-2 text-center">
                            {isEditing ? (
                              <div className="flex gap-1 justify-center">
                                <button onClick={handleSaveRow} disabled={saving} className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50" title="Save"><FiCheck size={14} /></button>
                                <button onClick={handleCancelEdit} className="p-1.5 bg-gray-400 text-white rounded hover:bg-gray-500" title="Cancel"><FiX size={14} /></button>
                              </div>
                            ) : (
                              <div className="flex gap-1 justify-center">
                                <button onClick={() => handleEdit(row)} className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600" title="Edit"><FiEdit2 size={14} /></button>
                                <button onClick={() => handleOpenSheetProcess(row)} className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700" title="Process Payment"><FiDollarSign size={14} /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
                {filteredData.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-100 font-bold border-t-2">
                      <td className="px-2 py-3" colSpan={2}><span className="text-gray-700">TOTAL ({filteredData.length} employees)</span></td>
                      <td className="px-2 py-3 text-center">{filteredData.reduce((s, r) => s + (r.totalDays || 0), 0)}</td>
                      <td className="px-2 py-3 text-center text-red-600">{filteredData.reduce((s, r) => s + (r.totalAbsent || 0), 0)}</td>
                      <td className="px-2 py-3 text-center text-green-600">{filteredData.reduce((s, r) => s + (r.presentDays || 0), 0)}</td>
                      <td className="px-2 py-3 text-center">{filteredData.reduce((s, r) => s + (r.extraDaysWorking || 0), 0)}</td>
                      <td className="px-2 py-3 text-center text-orange-600">₹{filteredData.reduce((s, r) => s + (r.advance || 0), 0).toLocaleString('en-IN')}</td>
                      <td className="px-2 py-3 text-center text-red-600">₹{filteredData.reduce((s, r) => s + (r.timingsDeduction || 0), 0).toLocaleString('en-IN')}</td>
                      <td className="px-2 py-3 text-center">₹{filteredData.reduce((s, r) => s + (r.fixedSalary || 0), 0).toLocaleString('en-IN')}</td>
                      <td className="px-2 py-3 text-center">-</td>
                      <td className="px-2 py-3 text-center text-red-600">₹{filteredData.reduce((s, r) => s + (r.fivePercentDeduction || 0), 0).toLocaleString('en-IN')}</td>
                      <td className="px-2 py-3 text-center text-blue-700">₹{totalSalaryPayable.toLocaleString('en-IN')}</td>
                      <td className="px-2 py-3 text-center bg-green-100 text-green-700 text-base">₹{totalAfterDeduction.toLocaleString('en-IN')}</td>
                      <td className="px-2 py-3 text-center" colSpan={2}><span className="text-green-600">{paidCount}P</span> / <span className="text-red-600">{unpaidCount}U</span></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Sheet Process Payment Modal */}
          {showSheetProcessModal && processRowData && (() => {
            const calc = getProcessCalculation()
            const empBank = processEmployeeDetails?.bankDetails
            return (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
                  {/* Header */}
                  <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Process Salary Payment</h2>
                      <p className="text-sm text-gray-500">{processRowData.employeeName} ({processRowData.employeeCode}) - {monthNames[month - 1]} {year}</p>
                    </div>
                    <button onClick={() => { setShowSheetProcessModal(false); setProcessRowData(null); setProcessEmployeeDetails(null) }}
                      className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"><FiX size={20} /></button>
                  </div>

                  <form onSubmit={handleSheetProcessPayment} className="p-6 space-y-5">

                    {/* Bank Details */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        Employee Bank Details
                      </h3>
                      {empBank?.accountNumber ? (
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><p className="text-gray-500 text-xs">Account Holder</p><p className="font-semibold text-gray-800">{empBank.accountHolderName || processRowData.employeeName}</p></div>
                          <div><p className="text-gray-500 text-xs">Bank Name</p><p className="font-semibold text-gray-800">{empBank.bankName || '-'}</p></div>
                          <div><p className="text-gray-500 text-xs">Account Number</p><p className="font-mono font-bold text-gray-800">{empBank.accountNumber}</p></div>
                          <div><p className="text-gray-500 text-xs">IFSC Code</p><p className="font-mono font-semibold text-gray-800">{empBank.ifscCode || '-'}</p></div>
                          <div><p className="text-gray-500 text-xs">Branch</p><p className="font-medium text-gray-800">{empBank.branch || '-'}</p></div>
                          <div><p className="text-gray-500 text-xs">Account Type</p><p className="font-medium text-gray-800 capitalize">{empBank.accountType || '-'}</p></div>
                          {empBank.upiId && <div className="col-span-2"><p className="text-gray-500 text-xs">UPI ID</p><p className="font-mono font-semibold text-blue-700">{empBank.upiId}</p></div>}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No bank details available for this employee</p>
                      )}
                    </div>

                    {/* Date Selection */}
                    <div className="border border-gray-200 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <FiCalendar size={16} /> Salary Period & Payment Date
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">From Date *</label>
                          <input type="date" value={processForm.fromDate} onChange={(e) => setProcessForm({ ...processForm, fromDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">To Date *</label>
                          <input type="date" value={processForm.toDate} onChange={(e) => setProcessForm({ ...processForm, toDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
                          <input type="date" value={processForm.paidDate} onChange={(e) => setProcessForm({ ...processForm, paidDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" required />
                        </div>
                      </div>
                    </div>

                    {/* Salary Calculation Breakdown */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Salary Breakdown</h3>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-500">Working Days (in range):</span><span className="font-medium">{calc.workingDays || 0}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Present Days:</span><span className="font-medium text-green-600">{calc.presentInRange || 0}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Extra Days Working:</span><span className="font-medium text-blue-600">{calc.extraDays || 0}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Fixed Salary:</span><span className="font-medium">₹{(processRowData.fixedSalary || 0).toLocaleString('en-IN')}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Per Day Salary:</span><span className="font-medium">₹{(calc.perDay || 0).toLocaleString('en-IN')}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Salary for Period:</span><span className="font-semibold">₹{(calc.salaryForRange || 0).toLocaleString('en-IN')}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">5% Deduction:</span><span className="font-medium text-red-600">-₹{(calc.fivePercent || 0).toLocaleString('en-IN')}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Advance:</span><span className="font-medium text-orange-600">-₹{(calc.advance || 0).toLocaleString('en-IN')}</span></div>
                        <div className="flex justify-between col-span-2"><span className="text-gray-500">Timings Deduction:</span><span className="font-medium text-red-600">-₹{(calc.timingsDeduction || 0).toLocaleString('en-IN')}</span></div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-300 flex justify-between items-center">
                        <span className="text-base font-bold text-gray-800">Final Amount to Pay</span>
                        <span className="text-2xl font-extrabold text-green-700">₹{(calc.finalAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div className="border border-gray-200 rounded-xl p-4 space-y-4">
                      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><FiFileText size={16} /> Payment Details</h3>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode *</label>
                        <select value={processForm.paymentMode} onChange={(e) => setProcessForm({ ...processForm, paymentMode: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" required>
                          <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                          <option value="upi">UPI</option>
                          <option value="cash">Cash</option>
                          <option value="cheque">Cheque</option>
                        </select>
                      </div>

                      {(processForm.paymentMode === 'bank_transfer' || processForm.paymentMode === 'upi') && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Reference / UTR Number</label>
                            <input type="text" value={processForm.referenceNumber} onChange={(e) => setProcessForm({ ...processForm, referenceNumber: e.target.value })}
                              placeholder={processForm.paymentMode === 'upi' ? 'UPI Ref Number' : 'NEFT/RTGS Ref'} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID</label>
                            <input type="text" value={processForm.transactionId} onChange={(e) => setProcessForm({ ...processForm, transactionId: e.target.value })}
                              placeholder="Transaction ID" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                          </div>
                        </div>
                      )}

                      {processForm.paymentMode === 'cheque' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cheque Number *</label>
                            <input type="text" value={processForm.chequeNumber} onChange={(e) => setProcessForm({ ...processForm, chequeNumber: e.target.value })}
                              placeholder="Cheque number" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                            <input type="text" value={processForm.processBank} onChange={(e) => setProcessForm({ ...processForm, processBank: e.target.value })}
                              placeholder="e.g., SBI, HDFC" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                          </div>
                        </div>
                      )}

                      {processForm.paymentMode === 'cash' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Number</label>
                          <input type="text" value={processForm.referenceNumber} onChange={(e) => setProcessForm({ ...processForm, referenceNumber: e.target.value })}
                            placeholder="Receipt number (if any)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Remarks</label>
                        <textarea value={processForm.notes} onChange={(e) => setProcessForm({ ...processForm, notes: e.target.value })}
                          placeholder="Add any remarks..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows="2" />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button type="submit" disabled={saving || !calc.finalAmount}
                        className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center font-semibold text-sm transition-colors">
                        <FiCheck className="mr-2" size={18} />
                        {saving ? 'Processing...' : `Pay ₹${(calc.finalAmount || 0).toLocaleString('en-IN')}`}
                      </button>
                      <button type="button" onClick={() => { setShowSheetProcessModal(false); setProcessRowData(null); setProcessEmployeeDetails(null) }}
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors">
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )
          })()}
        </>
      )}

      {/* ===================== TAB 2: RECORDS & PAYSLIPS ===================== */}
      {activeTab === 'records' && (
        <>
          {/* Hold Withdrawal Requests */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Pending Hold Withdrawal Requests</h2>
              <button onClick={() => fetchHoldRequests()} className="text-sm text-primary hover:text-blue-700">Refresh</button>
            </div>
            <div className="p-6">
              {holdLoading ? (
                <p className="text-center text-gray-600">Loading...</p>
              ) : holdRequests.length === 0 ? (
                <p className="text-center text-gray-600">No pending requests</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Employee</th>
                        <th className="text-left py-3 px-4">Amount</th>
                        <th className="text-left py-3 px-4">Requested</th>
                        <th className="text-left py-3 px-4">Hold Balance</th>
                        <th className="text-left py-3 px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holdRequests.map((r) => (
                        <tr key={r._id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4"><div className="font-medium text-gray-800">{r.employeeName} ({r.empCode})</div></td>
                          <td className="py-3 px-4">₹{Number(r.amount).toLocaleString()}</td>
                          <td className="py-3 px-4">{r.requestedAt ? new Date(r.requestedAt).toLocaleDateString() : '-'}</td>
                          <td className="py-3 px-4">₹{Number(r.holdBalanceAtFetch || 0).toLocaleString()}</td>
                          <td className="py-3 px-4 space-x-2">
                            <button onClick={() => approveHold(r._id)} className="px-3 py-1 bg-green-600 text-white rounded">Approve</button>
                            <button onClick={() => rejectHold(r._id)} className="px-3 py-1 bg-red-600 text-white rounded">Reject</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Employee List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <h2 className="font-semibold text-gray-800 mb-3">Employees ({filteredEmployees.length})</h2>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="Search by name, ID, phone..." value={empSearchTerm} onChange={(e) => setEmpSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    {empSearchTerm && (
                      <button onClick={() => setEmpSearchTerm('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
                    )}
                  </div>
                </div>
                <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)', minHeight: '400px' }}>
                  {filteredEmployees.length === 0 ? (
                    <div className="text-center py-8">
                      <FiUser className="mx-auto text-gray-400 mb-2" size={48} />
                      <p className="text-gray-600">{empSearchTerm ? 'No employees found' : 'No employees available'}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredEmployees.map(emp => (
                        <div key={emp._id} onClick={() => handleEmployeeSelect(emp)}
                          className={`p-4 rounded-lg cursor-pointer transition-colors ${selectedEmployee?._id === emp._id ? 'bg-primary text-white' : 'bg-gray-50 hover:bg-gray-100'}`}>
                          <h3 className="font-medium">{emp.name}</h3>
                          <p className={`text-sm ${selectedEmployee?._id === emp._id ? 'text-blue-100' : 'text-gray-600'}`}>{emp.employeeId} • {emp.role}</p>
                          <p className={`text-sm font-semibold mt-1 ${selectedEmployee?._id === emp._id ? 'text-white' : 'text-gray-800'}`}>₹{emp.basicSalary?.toLocaleString() || 0}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Salary Details & History */}
            <div className="lg:col-span-2">
              {!selectedEmployee ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <FiDollarSign className="mx-auto text-gray-400 mb-4" size={64} />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No Employee Selected</h3>
                  <p className="text-gray-600">Select an employee from the list to view salary details, history, and download payslips</p>
                </div>
              ) : (
                <>
                  {/* Bank Details */}
                  {selectedEmployee.bankDetails?.accountNumber && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg shadow mb-6 p-6">
                      <h3 className="text-md font-semibold text-gray-800 mb-4">Payment Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div><p className="text-gray-600">Account Holder</p><p className="font-semibold text-gray-900">{selectedEmployee.bankDetails.accountHolderName || selectedEmployee.name}</p></div>
                        <div><p className="text-gray-600">Bank Name</p><p className="font-semibold text-gray-900">{selectedEmployee.bankDetails.bankName}</p></div>
                        <div><p className="text-gray-600">Account Number</p><p className="font-mono font-bold text-gray-900">{selectedEmployee.bankDetails.accountNumber}</p></div>
                        <div><p className="text-gray-600">IFSC Code</p><p className="font-mono font-semibold text-gray-900">{selectedEmployee.bankDetails.ifscCode}</p></div>
                        <div><p className="text-gray-600">Branch</p><p className="font-medium text-gray-900">{selectedEmployee.bankDetails.branch}</p></div>
                        <div><p className="text-gray-600">Account Type</p><p className="font-medium text-gray-900 capitalize">{selectedEmployee.bankDetails.accountType}</p></div>
                        {selectedEmployee.bankDetails.upiId && (
                          <div className="col-span-2"><p className="text-gray-600">UPI ID</p><p className="font-mono font-semibold text-blue-700">{selectedEmployee.bankDetails.upiId}</p></div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Salary Structure */}
                  <div className="bg-white rounded-lg shadow mb-6">
                    <div className="p-6 border-b flex justify-between items-center">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-800">Salary Structure</h2>
                        <p className="text-sm text-gray-600">{selectedEmployee.name} ({selectedEmployee.employeeId})</p>
                      </div>
                      <button onClick={handleUpdateSalaryStructure} className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                        <FiEdit2 className="mr-2" />Update Structure
                      </button>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Basic Salary</label>
                          <input type="number" value={formData.basicSalary} onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                        </div>

                        <div className="col-span-2">
                          <h3 className="text-md font-semibold text-gray-800 mb-3">Allowances</h3>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">HRA</label>
                              <input type="number" value={formData.allowances.hra} onChange={(e) => setFormData({ ...formData, allowances: { ...formData.allowances, hra: e.target.value } })} className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">Transport</label>
                              <input type="number" value={formData.allowances.transport} onChange={(e) => setFormData({ ...formData, allowances: { ...formData.allowances, transport: e.target.value } })} className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">OT (Overtime)</label>
                              <input type="number" value={formData.allowances.ot || 0}
                                onChange={(e) => setFormData({ ...formData, allowances: { ...formData.allowances, ot: parseFloat(e.target.value) || 0 } })}
                                className="w-full px-3 py-2 border rounded-lg"
                                readOnly={isSuperiorRole && formData.otHours > 0 && formData.hourlyRate > 0}
                                style={isSuperiorRole && formData.otHours > 0 && formData.hourlyRate > 0 ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}} />
                              {isSuperiorRole && formData.otHours > 0 && formData.hourlyRate > 0 && (
                                <p className="text-xs text-gray-500 mt-1">Auto: {formData.otHours} hrs × ₹{formData.hourlyRate} = ₹{formData.allowances.ot?.toFixed?.(2) || 0}</p>
                              )}
                            </div>
                          </div>
                          {isSuperiorRole && (
                            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">OT Hours</label>
                                <input type="number" value={formData.otHours} min="0" step="0.5" placeholder="Enter OT hours" className="w-full px-3 py-2 border rounded-lg"
                                  onChange={(e) => {
                                    const hours = parseFloat(e.target.value) || 0
                                    const rate = parseFloat(formData.hourlyRate) || 0
                                    setFormData(prev => ({ ...prev, otHours: hours, allowances: { ...prev.allowances, ot: hours > 0 && rate > 0 ? hours * rate : 0 } }))
                                  }} />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate (₹)</label>
                                <input type="number" value={formData.hourlyRate} min="0" step="0.01" placeholder="Enter hourly rate" className="w-full px-3 py-2 border rounded-lg"
                                  onChange={(e) => {
                                    const rate = parseFloat(e.target.value) || 0
                                    const hours = parseFloat(formData.otHours) || 0
                                    setFormData(prev => ({ ...prev, hourlyRate: rate, allowances: { ...prev.allowances, ot: hours > 0 && rate > 0 ? hours * rate : 0 } }))
                                  }} />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="col-span-2">
                          <h3 className="text-md font-semibold text-gray-800 mb-3">Deductions</h3>
                          <div className="grid grid-cols-4 gap-4">
                            {['pf', 'esi', 'tax', 'other'].map(key => (
                              <div key={key}>
                                <label className="block text-sm text-gray-600 mb-1 uppercase">{key}</label>
                                <input type="number" value={formData.deductions[key]}
                                  onChange={(e) => setFormData({ ...formData, deductions: { ...formData.deductions, [key]: e.target.value } })}
                                  className="w-full px-3 py-2 border rounded-lg" />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Salary Preview */}
                        <div className="col-span-2 mt-4 p-4 bg-blue-50 rounded-lg">
                          {preview ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div><p className="text-sm text-gray-600">Gross Salary</p><p className="text-xl font-bold text-gray-800">₹{preview.grossSalary.toLocaleString()}</p></div>
                              <div><p className="text-sm text-gray-600">Fixed Deductions</p><p className="text-xl font-bold text-red-600">-₹{preview.fixedDeductions.toLocaleString()}</p></div>
                              <div><p className="text-sm text-gray-600">Leave Deductions</p><p className="text-xl font-bold text-red-600">-₹{preview.leaveDeductions.toLocaleString()}</p></div>
                              <div><p className="text-sm text-gray-600">Hold ({preview.holdPercent}%)</p><p className="text-xl font-bold text-orange-600">-₹{preview.holdAmount.toLocaleString()}</p></div>
                              <div className="col-span-2 md:col-span-4">
                                <div className="p-3 bg-green-100 rounded">
                                  <p className="text-sm text-gray-700">Payable Net</p>
                                  <p className="text-2xl font-extrabold text-green-700">₹{preview.payableNet.toLocaleString()}</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-4">
                              <div><p className="text-sm text-gray-600">Gross Salary</p><p className="text-xl font-bold text-gray-800">₹{grossSalary.toLocaleString()}</p></div>
                              <div><p className="text-sm text-gray-600">Net Salary</p><p className="text-xl font-bold text-green-600">₹{netSalary.toLocaleString()}</p></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment History & Payslips */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="px-6 py-5 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                          <FiFileText className="text-white" size={20} />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-gray-800">Payment History & Payslips</h2>
                          <p className="text-xs text-gray-500">{salaryHistory.length} payment record{salaryHistory.length !== 1 ? 's' : ''} found</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      {recordsLoading ? (
                        <div className="flex items-center justify-center py-12 gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <p className="text-gray-500 font-medium">Loading payment history...</p>
                        </div>
                      ) : salaryHistory.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiFileText className="text-gray-400" size={32} />
                          </div>
                          <p className="text-gray-600 font-medium mb-1">No Payments Found</p>
                          <p className="text-gray-400 text-sm">No salary payments have been processed for this employee yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {salaryHistory.map((record, index) => {
                            const modeColors = {
                              bank_transfer: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: '🏦', label: 'Bank Transfer' },
                              upi: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: '📱', label: 'UPI' },
                              cheque: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '📝', label: 'Cheque' },
                              cash: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: '💵', label: 'Cash' }
                            }
                            const mode = modeColors[record.paymentMode] || modeColors.cash
                            return (
                              <div key={index} className="border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all duration-200">
                                {/* Card Header */}
                                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                      <FiCalendar className="text-gray-600" size={18} />
                                    </div>
                                    <div>
                                      <p className="font-bold text-gray-800">{record.month}</p>
                                      <p className="text-xs text-gray-500">Basic: ₹{record.basicSalary?.toLocaleString('en-IN')}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1.5 text-xs rounded-full font-bold ${record.status === 'paid' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
                                      {record.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
                                    </span>
                                    <button onClick={() => handleDownloadPayslip(selectedEmployee._id, record._id, record.month)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm" title="Download Payslip PDF">
                                      <FiDownload size={13} />Payslip
                                    </button>
                                  </div>
                                </div>
                                {/* Card Body */}
                                <div className="px-5 py-4">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Net Salary</p>
                                      <p className="text-xl font-extrabold text-green-700">₹{record.netSalary?.toLocaleString('en-IN')}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Allowances / Deductions</p>
                                      <p className="text-sm font-semibold">
                                        <span className="text-green-600">+₹{record.totalAllowances?.toLocaleString('en-IN')}</span>
                                        {' / '}
                                        <span className="text-red-600">-₹{record.totalDeductions?.toLocaleString('en-IN')}</span>
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Payment Mode</p>
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-semibold ${mode.bg} ${mode.text} border ${mode.border}`}>
                                        <span>{mode.icon}</span>{mode.label}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Paid Date</p>
                                      <p className="text-sm font-semibold text-gray-800">
                                        {record.paidDate ? new Date(record.paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                      </p>
                                    </div>
                                  </div>
                                  {/* Reference / Transaction Details */}
                                  {(record.referenceNumber || record.transactionId || record.chequeNumber || record.notes) && (
                                    <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-x-6 gap-y-2 text-xs">
                                      {record.referenceNumber && (
                                        <div><span className="text-gray-400">Ref:</span> <span className="font-mono font-semibold text-gray-700">{record.referenceNumber}</span></div>
                                      )}
                                      {record.transactionId && (
                                        <div><span className="text-gray-400">Txn ID:</span> <span className="font-mono font-semibold text-gray-700">{record.transactionId}</span></div>
                                      )}
                                      {record.chequeNumber && (
                                        <div><span className="text-gray-400">Cheque:</span> <span className="font-mono font-semibold text-gray-700">{record.chequeNumber}</span></div>
                                      )}
                                      {record.notes && (
                                        <div className="w-full"><span className="text-gray-400">Notes:</span> <span className="text-gray-600">{record.notes}</span></div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  )
}

export default SalaryManagement
