import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../../api/axios';
import { toast } from 'react-toastify';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState(''); // Show all by default

  useEffect(() => {
    fetchEmployees();
  }, [filterStatus]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus === 'active') params.isActive = true;
      if (filterStatus === 'inactive') params.isActive = false;

      const response = await api.get('/employees', { params });
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

  // Get employee availability status
  const getAvailabilityStatus = (employee) => {
    const today = new Date().toDateString();
    
    // Check if on leave today
    const onLeaveToday = employee.leaves?.find(leave => {
      if (leave.status !== 'approved') return false;
      const start = new Date(leave.startDate).toDateString();
      const end = new Date(leave.endDate).toDateString();
      return today >= start && today <= end;
    });
    
    if (onLeaveToday) {
      return {
        status: 'on_leave',
        label: '🌴 On Leave',
        color: 'bg-orange-100 text-orange-800',
        details: `${onLeaveToday.leaveType} till ${format(new Date(onLeaveToday.endDate), 'dd MMM')}`
      };
    }
    
    // Check if checked in today
    const todayAttendance = employee.attendance?.find(att => {
      return new Date(att.date).toDateString() === today;
    });
    
    if (todayAttendance) {
      if (todayAttendance.checkInTime && !todayAttendance.checkOutTime) {
        return {
          status: 'working',
          label: '✅ Working',
          color: 'bg-green-100 text-green-800',
          details: `Since ${format(new Date(todayAttendance.checkInTime), 'hh:mm a')}`
        };
      }
      if (todayAttendance.checkOutTime) {
        return {
          status: 'completed',
          label: '✓ Completed',
          color: 'bg-blue-100 text-blue-800',
          details: `${todayAttendance.workHours?.toFixed(1) || 0}h worked`
        };
      }
    }
    
    // Check if inactive
    if (!employee.isActive) {
      return {
        status: 'inactive',
        label: '⭕ Inactive',
        color: 'bg-gray-100 text-gray-800',
        details: 'Not active'
      };
    }
    
    // Available but not checked in
    return {
      status: 'available',
      label: '🟡 Available',
      color: 'bg-yellow-100 text-yellow-800',
      details: 'Not checked in yet'
    };
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

  const renderHierarchyNode = (node, level = 0, isLast = false, parentPrefix = '') => {
    const hasChildren = node.children && node.children.length > 0;
    const availability = getAvailabilityStatus(node);
    
    return (
      <div key={node._id} className="relative">
        {/* Tree connector lines */}
        {level > 0 && (
          <div className="absolute left-0 top-0 h-full w-8">
            {/* Vertical line */}
            {!isLast && (
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
            )}
            {/* Horizontal line */}
            <div className="absolute left-4 top-10 w-4 h-0.5 bg-gray-300"></div>
          </div>
        )}
        
        <div className={`${level > 0 ? 'ml-8' : ''} mb-3`}>
          <div 
            className={`bg-white rounded-lg shadow-md p-4 hover:shadow-xl transition-all border-l-4 ${
              level === 0 ? 'border-blue-600' : 
              level === 1 ? 'border-purple-500' :
              level === 2 ? 'border-green-500' : 'border-orange-500'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                {/* Icon */}
                <div className={`text-3xl sm:text-4xl w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full flex-shrink-0 ${
                  level === 0 ? 'bg-blue-100' :
                  level === 1 ? 'bg-purple-100' :
                  level === 2 ? 'bg-green-100' : 'bg-orange-100'
                }`}>
                  {getDesignationIcon(node.designation)}
                </div>
                
                {/* Employee Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-bold text-gray-900 text-base sm:text-lg truncate">
                      {node.name}
                    </div>
                    {/* Show TOP badge only for level 0 employees who have team members */}
                    {level === 0 && hasChildren && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded whitespace-nowrap">
                        TOP
                      </span>
                    )}
                    {/* Availability Badge */}
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${availability.color}`}>
                      {availability.label}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 mt-1">
                    {node.employeeId} • {node.designation?.toUpperCase()}
                  </div>
                  {availability.details && (
                    <div className="text-xs text-gray-500 mt-1">
                      {availability.details}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs text-gray-500">
                    {node.phone && (
                      <span>📞 {node.phone}</span>
                    )}
                    {node.department && (
                      <span>🏢 {node.department}</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Stats */}
              <div className="text-left sm:text-right flex sm:flex-col gap-2 flex-wrap">
                {hasChildren && (
                  <div className="text-xs sm:text-sm font-semibold text-blue-600 whitespace-nowrap">
                    👥 {node.children.length} Team
                  </div>
                )}
                {node.assignedProjects && node.assignedProjects.length > 0 && (
                  <div className="text-xs text-green-600 whitespace-nowrap">
                    📊 {node.assignedProjects.filter(p => p.status === 'active').length} Project(s)
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Children */}
          {hasChildren && (
            <div className="mt-3 relative">
              {node.children.map((child, index) => 
                renderHierarchyNode(
                  child, 
                  level + 1, 
                  index === node.children.length - 1,
                  parentPrefix
                )
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Calculate availability summary
  const availabilitySummary = employees.reduce((acc, emp) => {
    const status = getAvailabilityStatus(emp).status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Employee Planning</h1>
        <p className="text-sm text-gray-600 mt-1">Real-time employee availability and organizational hierarchy</p>
      </div>

      {/* Availability Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-3 sm:p-4" title="Checked in, currently working">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 font-medium">Working Now</p>
              <p className="text-xl sm:text-2xl font-bold text-green-700">{availabilitySummary.working || 0}</p>
              <p className="text-[10px] text-green-600 mt-0.5">Checked in today</p>
            </div>
            <div className="text-2xl">✅</div>
          </div>
        </div>

        <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-3 sm:p-4" title="On approved leave">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-600 font-medium">On Leave</p>
              <p className="text-xl sm:text-2xl font-bold text-orange-700">{availabilitySummary.on_leave || 0}</p>
              <p className="text-[10px] text-orange-600 mt-0.5">Not available</p>
            </div>
            <div className="text-2xl">🌴</div>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-3 sm:p-4" title="Not checked in yet">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-yellow-600 font-medium">Available</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-700">{availabilitySummary.available || 0}</p>
              <p className="text-[10px] text-yellow-600 mt-0.5">Not checked in</p>
            </div>
            <div className="text-2xl">🟡</div>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3 sm:p-4" title="Checked in and checked out">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 font-medium">Day Complete</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-700">{availabilitySummary.completed || 0}</p>
              <p className="text-[10px] text-blue-600 mt-0.5">Checked out</p>
            </div>
            <div className="text-2xl">✓</div>
          </div>
        </div>

        <div className="bg-gray-50 border-l-4 border-gray-400 rounded-lg p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 font-medium">Total</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-700">{employees.length}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">All employees</p>
            </div>
            <div className="text-2xl">👥</div>
          </div>
        </div>
      </div>

      {/* Simple Filter */}
      <div className="flex justify-end mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm"
        >
          <option value="">All Employees</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Hierarchy Legend */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Availability Status */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">📊 Availability Status:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-1">
                <span>✅</span>
                <span>Working Now</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>🌴</span>
                <span>On Leave</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>🟡</span>
                <span>Available</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>✓</span>
                <span>Completed</span>
              </div>
            </div>
          </div>

          {/* Hierarchy Levels */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">🌳 Hierarchy Levels:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-600 rounded"></div>
                <span>Top Level</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span>Managers</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Team</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span>Sub-team</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hierarchy Tree */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading employee data...</p>
        </div>
      ) : buildHierarchy().length > 0 ? (
        <div className="space-y-4">
          {buildHierarchy().map((node, index) => 
            renderHierarchyNode(node, 0, index === buildHierarchy().length - 1)
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Employees Found</h3>
          <p className="text-gray-500">Add employees to see the organizational hierarchy</p>
        </div>
      )}

    </div>
  );
};

export default EmployeeManagement;

