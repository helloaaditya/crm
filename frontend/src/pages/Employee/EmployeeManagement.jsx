import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import API from '../../api';
import { toast } from 'react-hot-toast';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'hierarchy', 'list'
  const [filterDesignation, setFilterDesignation] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');

  useEffect(() => {
    fetchEmployees();
  }, [filterDesignation, filterStatus]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterDesignation) params.designation = filterDesignation;
      if (filterStatus === 'active') params.isActive = true;
      if (filterStatus === 'inactive') params.isActive = false;

      const response = await API.get('/employees', { params });
      setEmployees(response.data.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (isActive) => {
    return isActive 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const getDesignationIcon = (designation) => {
    const icons = {
      manager: '👔',
      supervisor: '👨‍💼',
      engineer: '👷',
      worker: '🔨',
      technician: '🔧',
      helper: '🧰',
      driver: '🚗',
      admin: '💼',
      other: '👤'
    };
    return icons[designation] || '👤';
  };

  // Group employees by reporting structure
  const buildHierarchy = () => {
    const employeeMap = {};
    const roots = [];

    // Create map
    employees.forEach(emp => {
      employeeMap[emp._id] = { ...emp, children: [] };
    });

    // Build tree
    employees.forEach(emp => {
      if (emp.reportingTo) {
        const parent = employeeMap[emp.reportingTo];
        if (parent) {
          parent.children.push(employeeMap[emp._id]);
        } else {
          roots.push(employeeMap[emp._id]);
        }
      } else {
        roots.push(employeeMap[emp._id]);
      }
    });

    return roots;
  };

  const renderHierarchyNode = (node, level = 0) => {
    return (
      <div key={node._id} className="mb-2">
        <div 
          className={`bg-white rounded-lg shadow p-4 ${level > 0 ? 'ml-8' : ''} hover:shadow-md transition-shadow`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getDesignationIcon(node.designation)}</span>
              <div>
                <div className="font-semibold text-gray-900">
                  {node.name}
                </div>
                <div className="text-sm text-gray-500">
                  {node.employeeId} • {node.designation}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(node.isActive)}`}>
                {node.isActive ? 'Active' : 'Inactive'}
              </span>
              {node.children.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  {node.children.length} report(s)
                </div>
              )}
            </div>
          </div>
        </div>
        {node.children.length > 0 && (
          <div className="mt-2">
            {node.children.map(child => renderHierarchyNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Employee Management</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('hierarchy')}
            className={`px-4 py-2 rounded-lg ${viewMode === 'hierarchy' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Hierarchy
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            List
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Designation
            </label>
            <select
              value={filterDesignation}
              onChange={(e) => setFilterDesignation(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All Designations</option>
              <option value="manager">Manager</option>
              <option value="supervisor">Supervisor</option>
              <option value="engineer">Engineer</option>
              <option value="worker">Worker</option>
              <option value="technician">Technician</option>
              <option value="helper">Helper</option>
              <option value="driver">Driver</option>
              <option value="admin">Admin</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <div className="font-semibold">Total: {employees.length} employees</div>
              <div>Active: {employees.filter(e => e.isActive).length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : viewMode === 'hierarchy' ? (
        <div className="space-y-4">
          {buildHierarchy().map(node => renderHierarchyNode(node))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((employee) => (
            <div key={employee._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{getDesignationIcon(employee.designation)}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{employee.name}</h3>
                    <p className="text-sm text-gray-500">{employee.employeeId}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(employee.isActive)}`}>
                  {employee.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div>
                  <span className="font-medium">Designation:</span> {employee.designation}
                </div>
                <div>
                  <span className="font-medium">Phone:</span> {employee.phone}
                </div>
                {employee.email && (
                  <div>
                    <span className="font-medium">Email:</span> {employee.email}
                  </div>
                )}
                <div>
                  <span className="font-medium">Joined:</span>{' '}
                  {format(new Date(employee.joiningDate), 'dd MMM yyyy')}
                </div>
                {employee.department && (
                  <div>
                    <span className="font-medium">Department:</span> {employee.department}
                  </div>
                )}
              </div>

              {employee.assignedProjects && employee.assignedProjects.length > 0 && (
                <div className="text-sm text-blue-600 mb-2">
                  🔹 {employee.assignedProjects.filter(p => p.status === 'active').length} Active Project(s)
                </div>
              )}

              <div className="text-xs text-gray-500">
                {employee.documents && employee.documents.length > 0 && (
                  <span>📄 {employee.documents.length} Document(s)</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List view
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Projects</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((employee) => (
                <tr key={employee._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="mr-3">{getDesignationIcon(employee.designation)}</span>
                      <div>
                        <div className="font-medium text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-500">{employee.employeeId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.designation}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.department || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(employee.joiningDate), 'dd MMM yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(employee.isActive)}`}>
                      {employee.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.assignedProjects?.filter(p => p.status === 'active').length || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && employees.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No employees found
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;

