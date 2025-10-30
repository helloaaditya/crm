import { useState, useEffect } from 'react'
import { FiDollarSign, FiPlus, FiEdit2, FiCheck, FiDownload, FiCalendar } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'

const SalaryManagement = () => {
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [salaryHistory, setSalaryHistory] = useState([])
  const [preview, setPreview] = useState(null)
  const [holdRequests, setHoldRequests] = useState([])
  const [holdLoading, setHoldLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    basicSalary: 0,
    allowances: {
      hra: 0,
      transport: 0,
      other: 0
    },
    deductions: {
      pf: 0,
      esi: 0,
      tax: 0,
      other: 0
    },
    paymentMode: 'bank_transfer',
    notes: ''
  })

  useEffect(() => {
    fetchEmployees()
    fetchHoldRequests()
  }, [])

  const fetchEmployees = async () => {
    try {
      const response = await API.employees.getAll()
      setEmployees(response.data.data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to fetch employees')
    }
  }

  const fetchSalaryHistory = async (employeeId) => {
    try {
      setLoading(true)
      const response = await API.employees.getSalaryHistory(employeeId)
      setSalaryHistory(response.data.data || [])
    } catch (error) {
      console.error('Error fetching salary history:', error)
      toast.error('Failed to fetch salary history')
    } finally {
      setLoading(false)
    }
  }

  const fetchPreview = async (employeeId, month) => {
    if (!employeeId || !month) return
    try {
      const res = await API.employees.getSalaryPreview(employeeId, month)
      setPreview(res.data.data)
    } catch (e) {
      console.error('Error fetching salary preview:', e)
      setPreview(null)
    }
  }

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee)
    setFormData({
      ...formData,
      basicSalary: employee.basicSalary || 0,
      allowances: employee.allowances || { hra: 0, transport: 0, other: 0 },
      deductions: employee.deductions || { pf: 0, esi: 0, tax: 0, other: 0 }
    })
    fetchSalaryHistory(employee._id)
    fetchPreview(employee._id, formData.month)
  }

  const handleProcessSalary = async (e) => {
    e.preventDefault()

    if (!selectedEmployee) {
      toast.error('Please select an employee')
      return
    }

    try {
      setLoading(true)
      await API.employees.processSalary(selectedEmployee._id, formData)
      toast.success('Salary processed successfully')
      setShowModal(false)
      fetchSalaryHistory(selectedEmployee._id)
      fetchPreview(selectedEmployee._id, formData.month)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process salary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedEmployee) {
      fetchPreview(selectedEmployee._id, formData.month)
    }
  }, [formData.month])

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

  const handleUpdateSalaryStructure = async () => {
    if (!selectedEmployee) return

    try {
      await API.employees.update(selectedEmployee._id, {
        basicSalary: formData.basicSalary,
        allowances: formData.allowances,
        deductions: formData.deductions
      })
      toast.success('Salary structure updated successfully')
      fetchEmployees()
    } catch (error) {
      toast.error('Failed to update salary structure')
    }
  }

  const calculateTotals = () => {
    const totalAllowances = Object.values(formData.allowances).reduce((sum, val) => sum + Number(val || 0), 0)
    const totalDeductions = Object.values(formData.deductions).reduce((sum, val) => sum + Number(val || 0), 0)
    const grossSalary = Number(formData.basicSalary) + totalAllowances
    const netSalary = grossSalary - totalDeductions
    return { totalAllowances, totalDeductions, grossSalary, netSalary }
  }

  const { totalAllowances, totalDeductions, grossSalary, netSalary } = calculateTotals()

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Salary Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage employee salaries and process payments</p>
        </div>
        {selectedEmployee && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
          >
            <FiPlus className="mr-2" />
            Process Salary
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hold Requests (Admin) */}
        <div className="lg:col-span-3">
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
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-800">{r.employeeName} ({r.empCode})</div>
                          </td>
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
        </div>
        {/* Employee List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-800">Employees</h2>
            </div>
            <div className="p-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              <div className="space-y-2">
                {employees.map(emp => (
                  <div
                    key={emp._id}
                    onClick={() => handleEmployeeSelect(emp)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedEmployee?._id === emp._id
                        ? 'bg-primary text-white'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <h3 className="font-medium">{emp.name}</h3>
                    <p className={`text-sm ${selectedEmployee?._id === emp._id ? 'text-blue-100' : 'text-gray-600'}`}>
                      {emp.employeeId} • {emp.role}
                    </p>
                    <p className={`text-sm font-semibold mt-1 ${selectedEmployee?._id === emp._id ? 'text-white' : 'text-gray-800'}`}>
                      ₹{emp.basicSalary?.toLocaleString() || 0}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Salary Details & History */}
        <div className="lg:col-span-2">
          {!selectedEmployee ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <FiDollarSign className="mx-auto text-gray-400 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Employee Selected</h3>
              <p className="text-gray-600">Select an employee from the list to view salary details</p>
            </div>
          ) : (
            <>
              {/* Salary Structure */}
              <div className="bg-white rounded-lg shadow mb-6">
                <div className="p-6 border-b flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Salary Structure</h2>
                    <p className="text-sm text-gray-600">{selectedEmployee.name} ({selectedEmployee.employeeId})</p>
                  </div>
                  <button
                    onClick={handleUpdateSalaryStructure}
                    className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    <FiEdit2 className="mr-2" />
                    Update Structure
                  </button>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Salary */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Basic Salary</label>
                      <input
                        type="number"
                        value={formData.basicSalary}
                        onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    {/* Allowances */}
                    <div className="col-span-2">
                      <h3 className="text-md font-semibold text-gray-800 mb-3">Allowances</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">HRA</label>
                          <input
                            type="number"
                            value={formData.allowances.hra}
                            onChange={(e) => setFormData({
                              ...formData,
                              allowances: { ...formData.allowances, hra: e.target.value }
                            })}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Transport</label>
                          <input
                            type="number"
                            value={formData.allowances.transport}
                            onChange={(e) => setFormData({
                              ...formData,
                              allowances: { ...formData.allowances, transport: e.target.value }
                            })}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Other</label>
                          <input
                            type="number"
                            value={formData.allowances.other}
                            onChange={(e) => setFormData({
                              ...formData,
                              allowances: { ...formData.allowances, other: e.target.value }
                            })}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div className="col-span-2">
                      <h3 className="text-md font-semibold text-gray-800 mb-3">Deductions</h3>
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">PF</label>
                          <input
                            type="number"
                            value={formData.deductions.pf}
                            onChange={(e) => setFormData({
                              ...formData,
                              deductions: { ...formData.deductions, pf: e.target.value }
                            })}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">ESI</label>
                          <input
                            type="number"
                            value={formData.deductions.esi}
                            onChange={(e) => setFormData({
                              ...formData,
                              deductions: { ...formData.deductions, esi: e.target.value }
                            })}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Tax</label>
                          <input
                            type="number"
                            value={formData.deductions.tax}
                            onChange={(e) => setFormData({
                              ...formData,
                              deductions: { ...formData.deductions, tax: e.target.value }
                            })}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Other</label>
                          <input
                            type="number"
                            value={formData.deductions.other}
                            onChange={(e) => setFormData({
                              ...formData,
                              deductions: { ...formData.deductions, other: e.target.value }
                            })}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Salary Summary */}
                    <div className="col-span-2 mt-4 p-4 bg-blue-50 rounded-lg">
                      {preview ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Gross Salary</p>
                            <p className="text-xl font-bold text-gray-800">₹{preview.grossSalary.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Fixed Deductions</p>
                            <p className="text-xl font-bold text-red-600">-₹{preview.fixedDeductions.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Leave Deductions</p>
                            <p className="text-xl font-bold text-red-600">-₹{preview.leaveDeductions.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Hold ({preview.holdPercent}%)</p>
                            <p className="text-xl font-bold text-orange-600">-₹{preview.holdAmount.toLocaleString()}</p>
                          </div>
                          <div className="col-span-2 md:col-span-4">
                            <div className="p-3 bg-green-100 rounded">
                              <p className="text-sm text-gray-700">Payable Net</p>
                              <p className="text-2xl font-extrabold text-green-700">₹{preview.payableNet.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Gross Salary</p>
                            <p className="text-xl font-bold text-gray-800">₹{grossSalary.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Net Salary</p>
                            <p className="text-xl font-bold text-green-600">₹{netSalary.toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Salary History */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b">
                  <h2 className="text-lg font-semibold text-gray-800">Payment History</h2>
                </div>
                <div className="p-6">
                  {loading ? (
                    <p className="text-center text-gray-600">Loading...</p>
                  ) : salaryHistory.length === 0 ? (
                    <p className="text-center text-gray-600 py-8">No salary payments found</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4">Month</th>
                            <th className="text-left py-3 px-4">Basic</th>
                            <th className="text-left py-3 px-4">Allowances</th>
                            <th className="text-left py-3 px-4">Deductions</th>
                            <th className="text-left py-3 px-4">Net Salary</th>
                            <th className="text-left py-3 px-4">Paid Date</th>
                            <th className="text-left py-3 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {salaryHistory.map((record, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">{record.month}</td>
                              <td className="py-3 px-4">₹{record.basicSalary?.toLocaleString()}</td>
                              <td className="py-3 px-4 text-green-600">+₹{record.totalAllowances?.toLocaleString()}</td>
                              <td className="py-3 px-4 text-red-600">-₹{record.totalDeductions?.toLocaleString()}</td>
                              <td className="py-3 px-4 font-semibold">₹{record.netSalary?.toLocaleString()}</td>
                              <td className="py-3 px-4">
                                {record.paidDate ? new Date(record.paidDate).toLocaleDateString() : '-'}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  record.status === 'paid' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {record.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Process Salary Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Process Salary Payment</h2>
            <form onSubmit={handleProcessSalary}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Month *</label>
                  <input
                    type="month"
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Payment Mode *</label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows="3"
                  />
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Net Payment Amount</p>
                  <p className="text-2xl font-bold text-green-600">₹{(preview?.payableNet ?? netSalary).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                >
                  <FiCheck className="mr-2" />
                  Process Payment
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SalaryManagement
