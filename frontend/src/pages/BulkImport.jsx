import { useState } from 'react'
import { FiUpload, FiDownload, FiDatabase } from 'react-icons/fi'
import API from '../api'
import { toast } from 'react-toastify'

const BulkImport = () => {
  const [moduleKey, setModuleKey] = useState('employees')
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleDownloadSample = async () => {
    setDownloading(true)
    try {
      const endpointMap = {
        employees: () => API.employees.bulk.sample(),
        customers: () => API.customers.bulk.sample(),
      }
      const request = endpointMap[moduleKey]
      if (!request) {
        toast.error('Unsupported module')
        return
      }
      
      const res = await request()
      
      // When responseType is 'text', res.data should be a string
      let csvContent = res.data
      
      // Fallback handling if data is not a string
      if (typeof csvContent !== 'string') {
        console.warn('Response is not a string:', typeof csvContent, csvContent)
        // Try to extract from object
        if (res.data?.data) csvContent = res.data.data
        else csvContent = String(csvContent)
      }
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${moduleKey}-sample.csv`
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }, 100)
      
      toast.success('Sample file downloaded successfully')
    } catch (e) {
      console.error('Download error:', e)
      const errorMsg = e.response?.data?.message || e.message || 'Failed to download sample'
      toast.error(errorMsg)
    } finally {
      setDownloading(false)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const endpointMap = {
        employees: () => API.employees.bulk.upload(form),
        customers: () => API.customers.bulk.upload(form),
      }
      const request = endpointMap[moduleKey]
      if (!request) return toast.error('Unsupported module')
      const res = await request()
      toast.success(res.data?.message || 'Bulk import completed')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Bulk import failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Bulk Import</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Download sample CSV and upload real data in bulk</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
            <select
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              value={moduleKey}
              onChange={(e) => setModuleKey(e.target.value)}
            >
              <option value="employees">Employees</option>
              <option value="customers">Customers</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleDownloadSample}
              disabled={downloading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiDownload className="mr-2" /> {downloading ? 'Downloading...' : 'Download Sample'}
            </button>
          </div>

          <div className="flex items-end">
            <label className="w-full">
              <div className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 flex items-center justify-center cursor-pointer disabled:opacity-50">
                <FiUpload className="mr-2" /> {uploading ? 'Uploading...' : 'Upload CSV'}
              </div>
              <input type="file" accept=".csv,.xls,.xlsx" onChange={handleUpload} className="hidden" disabled={uploading} />
            </label>
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <div className="flex items-center mb-2"><FiDatabase className="mr-2" /> Expected columns per module:</div>
          <ul className="list-disc pl-6 space-y-1">
            <li><b>Employees</b>: name, email, phone, role, module, basicSalary, dateOfBirth(YYYY-MM-DD), canView, canCreate, canEdit, canDelete, canHandleAccounts</li>
            <li><b>Customers</b>: name, phone, email, address</li>
          </ul>
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs font-medium text-blue-800 mb-1">Note:</p>
            <p className="text-xs text-blue-700">
              • <b>Permissions</b> (canView, canCreate, etc.): Use "true"/"1" for yes, "false"/"0" for no. Leave empty to use defaults.<br/>
              • <b>Module Access</b>: all, crm, inventory, employee, or none<br/>
              • <b>Role</b>: supervisor, engineer, worker, technician, helper, driver, manager, admin, employee<br/>
              • <b>Date Format</b>: YYYY-MM-DD (e.g., 1990-05-20)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BulkImport


