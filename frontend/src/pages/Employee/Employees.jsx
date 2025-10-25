import { useState, useEffect } from 'react'
import { FiPlus, FiEdit, FiTrash2, FiUsers, FiUserCheck, FiBriefcase } from 'react-icons/fi'
import API from '../../api'
import { toast } from 'react-toastify'
import EmployeeModal from '../../components/Modals/EmployeeModal'
import AssignProjectModal from '../../components/Modals/AssignProjectModal'

const Employees = () => {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [filterRole, setFilterRole] = useState('')

  useEffect(() => {
    fetchEmployees()
  }, [page, filterRole])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const params = { page, limit: 10 }
      if (filterRole) params.designation = filterRole
      
      const response = await API.employees.getAll(params)
      setEmployees(response.data.data)
      setTotalPages(response.data.totalPages)
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this employee?')) return

    try {
      await API.employees.delete(id)
      toast.success('Employee deactivated successfully')
      fetchEmployees()
    } catch (error) {
      toast.error('Failed to deactivate employee')
    }
  }

  const handleEdit = (employee) => {
    setSelectedEmployee(employee)
    setShowModal(true)
  }

  const handleAdd = () => {
    setSelectedEmployee(null)
    setShowModal(true)
  }

  const handleAssignProject = (employee) => {
    setSelectedEmployee(employee)
    setShowAssignModal(true)
  }

  const handleUpdateRole = async (employee) => {
    const role = prompt(`Enter new role for ${employee.name}:\n\nOptions: supervisor, engineer, worker, technician, helper, driver, manager`, employee.role)
    if (!role) return

    const validRoles = ['supervisor', 'engineer', 'worker', 'technician', 'helper', 'driver', 'manager', 'admin']
    if (!validRoles.includes(role.toLowerCase())) {
      toast.error('Invalid role')
      return
    }

    try {
      await API.employees.updateRole(employee._id, { role: role.toLowerCase() })
      toast.success(`Role updated to ${role}`)
      fetchEmployees()
    } catch (error) {
      toast.error('Failed to update role')
    }
  }

  const getRoleBadgeColor = (role) => {
    const colors = {
      supervisor: 'bg-purple-100 text-purple-800',
      engineer: 'bg-blue-100 text-blue-800',
      worker: 'bg-green-100 text-green-800',
      technician: 'bg-orange-100 text-orange-800',
      manager: 'bg-red-100 text-red-800',
      helper: 'bg-yellow-100 text-yellow-800',
      driver: 'bg-gray-100 text-gray-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Employees</h1>
        <button 
          onClick={handleAdd}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
        >
          <FiPlus className="mr-2" />
          Add Employee
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by Role:</label>
          <select
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Roles</option>
            <option value="supervisor">Supervisor</option>
            <option value="engineer">Engineer</option>
            <option value="worker">Worker</option>
            <option value="technician">Technician</option>
            <option value="helper">Helper</option>
            <option value="driver">Driver</option>
            <option value="manager">Manager</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : employees.length > 0 ? (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee) => (
                  <tr key={employee._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {employee.employeeId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {employee.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(employee.role || employee.designation)}`}>
                        {employee.role || employee.designation}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {employee.designation}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{employee.basicSalary?.toLocaleString() || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleUpdateRole(employee)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded"
                          title="Update Role"
                        >
                          <FiUserCheck />
                        </button>
                        <button 
                          onClick={() => handleAssignProject(employee)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Assign Project"
                        >
                          <FiBriefcase />
                        </button>
                        <button 
                          onClick={() => handleEdit(employee)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                          title="Edit"
                        >
                          <FiEdit />
                        </button>
                        <button 
                          onClick={() => handleDelete(employee._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Deactivate"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-6 py-4 flex items-center justify-between border-t">
              <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
              <div className="flex space-x-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No employees found</p>
          </div>
        )}
      </div>

      {/* Employee Modal */}
      {showModal && (
        <EmployeeModal
          isOpen={showModal}
          onClose={() => { setShowModal(false); setSelectedEmployee(null); }}
          onSuccess={fetchEmployees}
          employee={selectedEmployee}
        />
      )}

      {/* Assign Project Modal */}
      {showAssignModal && (
        <AssignProjectModal
          isOpen={showAssignModal}
          onClose={() => { setShowAssignModal(false); setSelectedEmployee(null); }}
          onSuccess={fetchEmployees}
          employee={selectedEmployee}
        />
      )}
    </div>
  )
}

export default Employees
