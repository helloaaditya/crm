import { useState, useEffect } from 'react'
import { FiUsers, FiPlus, FiSearch, FiEdit, FiEye, FiCalendar, FiUser } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'
import CustomerModal from '../../components/Modals/CustomerModal'

const MyLeads = () => {
  const [leads, setLeads] = useState([])
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [leadStatus, setLeadStatus] = useState('')
  const [leadType, setLeadType] = useState('all') // 'all', 'my_leads', 'follow_up'
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [viewLead, setViewLead] = useState(null) // For viewing lead details

  useEffect(() => {
    fetchEmployeeProfile()
  }, [])

  useEffect(() => {
    if (employee?._id) {
      fetchLeads()
    }
  }, [employee, page, leadStatus, search, leadType])

  // Listen for refresh event from Header
  useEffect(() => {
    const handleRefresh = () => {
      if (employee?._id) {
        fetchLeads()
      }
    }

    window.addEventListener('app-refresh', handleRefresh)
    return () => window.removeEventListener('app-refresh', handleRefresh)
  }, [employee])

  const fetchEmployeeProfile = async () => {
    try {
      const response = await API.employees.myProfile()
      setEmployee(response.data.data)
    } catch (error) {
      console.error('Error fetching employee profile:', error)
      toast.error('Failed to load employee profile')
    }
  }

  const fetchLeads = async () => {
    try {
      setLoading(true)
      const params = { 
        page, 
        limit: 10
      }
      if (search) params.search = search
      if (leadStatus) params.leadStatus = leadStatus
      if (leadType !== 'all') params.leadType = leadType

      const response = await API.employees.myLeads.get(params)
      setLeads(response.data.data)
      setTotalPages(response.data.totalPages)
    } catch (error) {
      console.error('Error fetching leads:', error)
      toast.error('Failed to load leads')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchLeads()
  }

  const handleEdit = (customer) => {
    setSelectedCustomer(customer)
    setShowModal(true)
  }

  const handleAdd = () => {
    // Pre-fill leadFrom with current employee ID
    setSelectedCustomer({
      leadFrom: employee._id,
      leadDate: new Date().toISOString().split('T')[0]
    })
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setSelectedCustomer(null)
  }

  const handleModalSuccess = () => {
    fetchLeads()
  }

  const getStatusBadge = (status) => {
    const badges = {
      won: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      quotation_sent: 'bg-purple-100 text-purple-800',
      visited: 'bg-indigo-100 text-indigo-800',
      lead_attended: 'bg-cyan-100 text-cyan-800',
      new: 'bg-yellow-100 text-yellow-800',
      lost: 'bg-red-100 text-red-800',
      quotation_pending: 'bg-orange-100 text-orange-800',
      no_information: 'bg-gray-100 text-gray-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  const formatStatus = (status) => {
    if (!status) return 'N/A'
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Leads</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your customer leads</p>
        </div>
        <button 
          onClick={handleAdd}
          className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
        >
          <FiPlus className="mr-2" />
          Add New Lead
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total Leads</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-800">{leads.length}</p>
            </div>
            <FiUsers className="text-blue-500" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">New</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-800">
                {leads.filter(l => l.leadStatus === 'new').length}
              </p>
            </div>
            <FiCalendar className="text-yellow-500" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">In Progress</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-800">
                {leads.filter(l => l.leadStatus === 'in_progress').length}
              </p>
            </div>
            <FiUser className="text-blue-500" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Won</p>
              <p className="text-xl sm:text-2xl font-bold text-green-800">
                {leads.filter(l => l.leadStatus === 'won').length}
              </p>
            </div>
            <FiUsers className="text-green-500" size={24} />
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <form onSubmit={handleSearch} className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:space-x-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
            />
          </div>
          <div className="flex space-x-2 sm:space-x-4">
            <select 
              value={leadType}
              onChange={(e) => { setLeadType(e.target.value); setPage(1); }}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
            >
              <option value="all">All Leads</option>
              <option value="my_leads">My Leads</option>
              <option value="follow_up">Follow Up</option>
            </select>
            <select 
              value={leadStatus}
              onChange={(e) => { setLeadStatus(e.target.value); setPage(1); }}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
            >
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="lead_attended">Lead Attended</option>
              <option value="visited">Visited</option>
              <option value="quotation_sent">Quotation Sent</option>
              <option value="quotation_pending">Quotation Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="no_information">No Information</option>
            </select>
            <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base">
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : leads.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Follow Up</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leads.map((lead) => (
                    <tr key={lead._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lead.customerId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lead.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{lead.contactNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{lead.email || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {lead.leadDate ? new Date(lead.leadDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {lead.followUpPerson?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(lead.leadStatus)}`}>
                          {formatStatus(lead.leadStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleEdit(lead)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title="Edit"
                          >
                            <FiEdit />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden">
              {leads.map((lead) => (
                <div key={lead._id} className="p-4 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{lead.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">ID: {lead.customerId}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(lead.leadStatus)}`}>
                      {formatStatus(lead.leadStatus)}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium w-20">Phone:</span>
                      <span>{lead.contactNumber}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium w-20">Email:</span>
                      <span className="truncate">{lead.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium w-20">Lead Date:</span>
                      <span>{lead.leadDate ? new Date(lead.leadDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium w-20">Follow Up:</span>
                      <span>{lead.followUpPerson?.name || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleEdit(lead)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg text-sm"
                    >
                      <FiEdit className="mr-1" size={14} />
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border-t gap-3">
              <div className="text-sm text-gray-600 text-center sm:text-left">
                Page {page} of {totalPages}
              </div>
              <div className="flex space-x-2 justify-center sm:justify-end">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <FiUsers className="mx-auto text-gray-400" size={48} />
            <p className="text-gray-600 mt-2">No leads found</p>
            <button
              onClick={handleAdd}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Add Your First Lead
            </button>
          </div>
        )}
      </div>

      {/* Customer Modal */}
      <CustomerModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        customer={selectedCustomer}
      />
    </div>
  )
}

export default MyLeads

