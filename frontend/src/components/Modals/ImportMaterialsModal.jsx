import { useState } from 'react'
import { FiX, FiUpload, FiDownload, FiAlertCircle } from 'react-icons/fi'
import { toast } from 'react-toastify'
import API from '../../api'

const ImportMaterialsModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [validationErrors, setValidationErrors] = useState([])
  const [successCount, setSuccessCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)

  if (!isOpen) return null

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
      
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
        toast.error('Please upload a CSV or Excel file')
        return
      }

      setFile(selectedFile)
      setValidationErrors([])
      setSuccessCount(0)
      setErrorCount(0)
    }
  }

  const handleDownloadSample = () => {
    const sampleData = [
      {
        'Name': 'Dr. Fixit Waterproofing',
        'Category': 'waterproofing',
        'Brand': 'Dr. Fixit',
        'Product': 'LW+',
        'Unit': 'kg',
        'Quantity': '100',
        'MinStockLevel': '20',
        'SaleCost': '450',
        'MRP': '500',
        'VendorName': 'ABC Suppliers',
        'Description': 'Premium waterproofing compound'
      },
      {
        'Name': 'Asian Paints Apex',
        'Category': 'painting',
        'Brand': 'Asian Paints',
        'Product': 'Apex Ultima',
        'Unit': 'litre',
        'Quantity': '50',
        'MinStockLevel': '10',
        'SaleCost': '380',
        'MRP': '420',
        'VendorName': 'Paint World',
        'Description': 'Weather-resistant exterior paint'
      },
      {
        'Name': 'Kajaria Floor Tiles',
        'Category': 'flooring',
        'Brand': 'Kajaria',
        'Product': 'Vitrified 2x2',
        'Unit': 'box',
        'Quantity': '200',
        'MinStockLevel': '50',
        'SaleCost': '850',
        'MRP': '950',
        'VendorName': 'Tile Depot',
        'Description': 'Premium vitrified tiles 600x600mm'
      }
    ]

    const headers = Object.keys(sampleData[0])
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => 
        headers.map(header => {
          const value = row[header]
          // Wrap in quotes if contains comma or quotes
          return value.includes(',') || value.includes('"') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'materials-import-sample.csv'
    link.click()
    window.URL.revokeObjectURL(url)
    toast.success('Sample file downloaded')
  }

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file to import')
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await API.inventory.importMaterials(formData)
      
      setSuccessCount(response.data.data.successCount || 0)
      setErrorCount(response.data.data.errorCount || 0)
      setValidationErrors(response.data.data.errors || [])

      if (response.data.data.successCount > 0) {
        toast.success(`Successfully imported ${response.data.data.successCount} materials`)
        onSuccess()
      }

      if (response.data.data.errorCount > 0) {
        toast.warning(`${response.data.data.errorCount} items had errors`)
      }

    } catch (error) {
      console.error('Import error:', error)
      toast.error(error.response?.data?.error || 'Failed to import materials')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setValidationErrors([])
    setSuccessCount(0)
    setErrorCount(0)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Import Materials (Bulk)</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📋 Instructions:</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Download the sample file to see the required format</li>
              <li>Fill in your materials data following the same format</li>
              <li>Save as CSV file (Excel can export to CSV)</li>
              <li>Upload the file using the form below</li>
              <li>Category options: waterproofing, flooring, painting, civil, tools, machinery, other</li>
            </ul>
          </div>

          {/* Download Sample */}
          <div className="flex justify-center">
            <button
              onClick={handleDownloadSample}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FiDownload className="mr-2" />
              Download Sample Import File
            </button>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
            <div className="text-center">
              <FiUpload className="mx-auto text-gray-400 mb-3" size={48} />
              <label className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-700 font-medium">
                  Click to upload
                </span>
                <span className="text-gray-600"> or drag and drop</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="text-sm text-gray-500 mt-2">CSV or Excel file (up to 10MB)</p>
              
              {file && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg inline-block">
                  <p className="text-sm text-gray-700 font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          {(successCount > 0 || errorCount > 0) && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-800">Import Results:</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-100 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-green-700">{successCount}</div>
                  <div className="text-sm text-green-600">Successful</div>
                </div>
                <div className="bg-red-100 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-red-700">{errorCount}</div>
                  <div className="text-sm text-red-600">Failed</div>
                </div>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
              <h3 className="font-semibold text-red-900 mb-2 flex items-center">
                <FiAlertCircle className="mr-2" />
                Errors ({validationErrors.length}):
              </h3>
              <ul className="text-sm text-red-800 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="flex items-start">
                    <span className="font-medium mr-2">Row {error.row}:</span>
                    <span>{error.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t">
          <button
            onClick={handleClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={uploading}
          >
            Close
          </button>
          <button
            onClick={handleImport}
            disabled={!file || uploading}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {uploading ? (
              <>
                <div className="spinner-small mr-2"></div>
                Importing...
              </>
            ) : (
              <>
                <FiUpload className="mr-2" />
                Import Materials
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImportMaterialsModal

