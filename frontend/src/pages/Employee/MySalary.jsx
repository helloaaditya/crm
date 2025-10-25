import { useState, useEffect } from 'react'
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiCalendar, FiDownload } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'

function MySalary() {
  const [salaryData, setSalaryData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchSalary()
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
      // Generate payslip using self-service endpoint
      const response = await API.employees.myPayslip(month);
      
      // Download the PDF
      const pdfUrl = response.data.data.pdfUrl;
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `payslip-${month}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Payslip downloaded successfully');
    } catch (error) {
      console.error('Error downloading payslip:', error);
      toast.error('Failed to download payslip');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading salary information...</p>
      </div>
    )
  }

  if (!salaryData) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <p className="text-gray-600">No salary data available</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Salary</h1>
          <p className="text-gray-600 mt-1">View your salary breakdown and payment history</p>
        </div>
      </div>

      {/* Current Salary Overview */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90 mb-1">Net Monthly Salary</p>
            <h2 className="text-4xl font-bold">₹{salaryData.netSalary?.toLocaleString()}</h2>
            <p className="text-sm opacity-90 mt-2">
              Basic: ₹{salaryData.basicSalary?.toLocaleString()} + Allowances: ₹{salaryData.totalAllowances?.toLocaleString()} - Deductions: ₹{salaryData.totalDeductions?.toLocaleString()}
            </p>
          </div>
          <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <FiDollarSign size={40} />
          </div>
        </div>
      </div>

      {/* Salary Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Earnings */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b bg-green-50">
            <div className="flex items-center">
              <FiTrendingUp className="text-green-600 mr-2" size={20} />
              <h3 className="text-lg font-semibold text-gray-800">Earnings</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Basic Salary</span>
                <span className="font-semibold text-gray-800">₹{salaryData.basicSalary?.toLocaleString()}</span>
              </div>
              {salaryData.allowances && Object.entries(salaryData.allowances).map(([key, value]) => (
                value > 0 && (
                  <div key={key} className="flex justify-between py-2 border-b">
                    <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="font-semibold text-green-600">+₹{value?.toLocaleString()}</span>
                  </div>
                )
              ))}
              <div className="flex justify-between py-3 bg-green-50 px-3 rounded mt-2">
                <span className="font-semibold text-gray-800">Total Earnings</span>
                <span className="font-bold text-green-600">
                  ₹{(salaryData.basicSalary + salaryData.totalAllowances)?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b bg-red-50">
            <div className="flex items-center">
              <FiTrendingDown className="text-red-600 mr-2" size={20} />
              <h3 className="text-lg font-semibold text-gray-800">Deductions</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {salaryData.deductions && Object.entries(salaryData.deductions).map(([key, value]) => (
                value > 0 && (
                  <div key={key} className="flex justify-between py-2 border-b">
                    <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="font-semibold text-red-600">-₹{value?.toLocaleString()}</span>
                  </div>
                )
              ))}
              {salaryData.totalDeductions === 0 && (
                <p className="text-gray-500 text-center py-4">No deductions</p>
              )}
              <div className="flex justify-between py-3 bg-red-50 px-3 rounded mt-2">
                <span className="font-semibold text-gray-800">Total Deductions</span>
                <span className="font-bold text-red-600">
                  ₹{salaryData.totalDeductions?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Month Status */}
      {salaryData.currentMonth && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b">
            <div className="flex items-center">
              <FiCalendar className="text-blue-600 mr-2" size={20} />
              <h3 className="text-lg font-semibold text-gray-800">Current Month Status</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Month</p>
                <p className="text-xl font-bold text-gray-800">{salaryData.currentMonth.month}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <span className={`px-3 py-1 text-sm rounded-full ${
                  salaryData.currentMonth.status === 'paid' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {salaryData.currentMonth.status}
                </span>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Amount</p>
                <p className="text-xl font-bold text-gray-800">
                  ₹{salaryData.currentMonth.netAmount?.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Payment History</h3>
        </div>
        <div className="p-6">
          {salaryData.history && salaryData.history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Month</th>
                    <th className="text-left py-3 px-4">Gross Amount</th>
                    <th className="text-left py-3 px-4">Deductions</th>
                    <th className="text-left py-3 px-4">Net Amount</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Payment Date</th>
                    <th className="text-left py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryData.history.map((record, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{record.month}</td>
                      <td className="py-3 px-4">₹{record.grossAmount?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-red-600">₹{record.deductions?.toLocaleString()}</td>
                      <td className="py-3 px-4 font-semibold">₹{record.netAmount?.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          record.status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : record.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {record.paymentDate ? new Date(record.paymentDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {record.status === 'paid' && (
                          <button
                            onClick={() => downloadPayslip(record.month)}
                            className="flex items-center text-blue-600 hover:text-blue-800"
                            title="Download Payslip"
                          >
                            <FiDownload size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-600 py-8">No payment history available</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default MySalary
