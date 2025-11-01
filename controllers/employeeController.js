import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import CalendarReminder from '../models/CalendarReminder.js';
import { createNotification, NotificationTemplates, sendToMultipleUsers } from './notificationController.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private
export const getEmployees = asyncHandler(async (req, res) => {
  const { search, designation, isActive = true, page = 1, limit = 10 } = req.query;

  let query = { isActive };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  if (designation) query.designation = designation;

  const employees = await Employee.find(query)
    .populate('userId', 'name email role')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await Employee.countDocuments(query);

  res.json({
    success: true,
    data: employees,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    total: count
  });
});

// @desc    Get single employee
// @route   GET /api/employees/:id
// @access  Private
export const getEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id)
    .populate('userId')
    .populate('assignedProjects.project')
    .populate('createdBy', 'name');

  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  res.json({
    success: true,
    data: employee
  });
});

// @desc    Create employee
// @route   POST /api/employees
// @access  Private
export const createEmployee = asyncHandler(async (req, res) => {
  const {
    name,
    phone,
    email,
    dateOfBirth,
    gender,
    address,
    designation,
    role,
    department,
    joiningDate,
    employmentType,
    basicSalary,
    allowances,
    deductions
  } = req.body;

  // Create user account for employee
  const user = await User.create({
    name,
    email,
    password: `emp${phone.slice(-4)}`, // Temporary password
    phone,
    role: 'employee',
    module: 'all',
    createdBy: req.user._id
  });

  // Create employee
  const employee = await Employee.create({
    userId: user._id,
    name,
    phone,
    email,
    dateOfBirth,
    gender,
    address,
    designation: role || designation,
    role: role || designation || 'worker',
    department,
    joiningDate,
    employmentType,
    basicSalary,
    allowances,
    deductions,
    createdBy: req.user._id
  });

  res.status(201).json({
    success: true,
    data: employee,
    message: `Employee created. Temporary password: emp${phone.slice(-4)}`
  });
});

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private
export const updateEmployee = asyncHandler(async (req, res) => {
  let employee = await Employee.findById(req.params.id);

  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  employee = await Employee.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: employee
  });
});

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private
export const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  employee.isActive = false;
  employee.exitDate = new Date();
  await employee.save();

  // Deactivate user account
  await User.findByIdAndUpdate(employee.userId, { isActive: false });

  res.json({
    success: true,
    message: 'Employee deactivated successfully'
  });
});

// @desc    Mark attendance
// @route   POST /api/employees/:id/attendance
// @access  Private
export const markAttendance = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  const { date, status, checkInTime, checkOutTime, location, notes } = req.body;

  // Check if attendance already marked for the date
  const existingAttendance = employee.attendance.find(
    a => new Date(a.date).toDateString() === new Date(date).toDateString()
  );

  if (existingAttendance) {
    return res.status(400).json({ message: 'Attendance already marked for this date' });
  }

  // Calculate work hours and auto-determine status only if both checkInTime and checkOutTime are provided
  let workHours = 0;
  let finalStatus = status; // Default to provided status
  
  if (checkInTime && checkOutTime) {
    const checkIn = new Date(checkInTime);
    const checkOut = new Date(checkOutTime);
    workHours = (checkOut - checkIn) / (1000 * 60 * 60); // Hours
    
    // Automatically determine attendance status based on work hours
    if (workHours >= 8.25) { // 8 hours 15 minutes
      finalStatus = 'present';
    } else if (workHours >= 4) { // 4 hours
      finalStatus = 'half_day';
    } else {
      finalStatus = 'absent';
    }
  }

  employee.attendance.push({
    date,
    status: finalStatus,
    checkInTime,
    checkOutTime,
    location,
    workHours,
    notes
  });

  await employee.save();

  res.json({
    success: true,
    data: employee,
    message: 'Attendance marked successfully'
  });
});

// @desc    Get attendance history
// @route   GET /api/employees/:id/attendance
// @access  Private
export const getAttendanceHistory = asyncHandler(async (req, res) => {
  const { startDate, endDate, month, year } = req.query;
  
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  let attendance = employee.attendance;

  // Filter by month/year if provided
  if (month && year) {
    const targetMonth = parseInt(month);
    const targetYear = parseInt(year);
    
    attendance = attendance.filter(a => {
      const date = new Date(a.date);
      // JavaScript months are 0-indexed, so we need to add 1 for comparison
      return (date.getMonth() + 1) === targetMonth && date.getFullYear() === targetYear;
    });
  }
  // Filter by date range if provided
  else if (startDate && endDate) {
    attendance = attendance.filter(a => {
      const aDate = new Date(a.date);
      return aDate >= new Date(startDate) && aDate <= new Date(endDate);
    });
  }

  res.json({
    success: true,
    data: attendance.sort((a, b) => new Date(b.date) - new Date(a.date))
  });
});

// @desc    Admin edit attendance entry (check-in/out times and status)
// @route   PUT /api/employees/:id/attendance/:attendanceId
// @access  Private (Admin/with module)
export const updateAttendanceEntry = asyncHandler(async (req, res) => {
  const { id, attendanceId } = req.params;
  const { checkInTime, checkOutTime, status, notes } = req.body;
  const employee = await Employee.findById(id);
  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }
  const entry = employee.attendance.id(attendanceId);
  if (!entry) {
    return res.status(404).json({ message: 'Attendance entry not found' });
  }

  if (checkInTime) entry.checkInTime = new Date(checkInTime);
  if (checkOutTime) entry.checkOutTime = new Date(checkOutTime);
  if (typeof notes === 'string') entry.notes = notes;

  // Recompute work hours if both present
  if (entry.checkInTime && entry.checkOutTime) {
    const hours = (entry.checkOutTime - entry.checkInTime) / (1000 * 60 * 60);
    entry.workHours = Math.round(hours * 100) / 100;
    if (!status) {
      // Auto-determine unless explicit status provided
      if (entry.workHours >= 8.25) entry.status = 'present';
      else if (entry.workHours >= 4) entry.status = 'half_day';
      else entry.status = 'absent';
    }
  }
  if (status) entry.status = status;

  await employee.save();
  res.json({ success: true, data: entry, message: 'Attendance entry updated' });
});

// @desc    Apply for leave
// @route   POST /api/employees/:id/leave
// @access  Private
export const applyLeave = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  const { leaveType, startDate, endDate, reason } = req.body;

  // Calculate number of days
  const start = new Date(startDate);
  const end = new Date(endDate);
  const numberOfDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  employee.leaves.push({
    leaveType,
    startDate,
    endDate,
    numberOfDays,
    reason,
    status: 'pending'
  });

  await employee.save();

  res.json({
    success: true,
    data: employee,
    message: 'Leave application submitted successfully'
  });
});

// @desc    Approve/Reject leave
// @route   PUT /api/employees/leave/:leaveId
// @access  Private
export const updateLeaveStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;

  const employee = await Employee.findOne({ 'leaves._id': req.params.leaveId });

  if (!employee) {
    return res.status(404).json({ message: 'Leave application not found' });
  }

  const leave = employee.leaves.id(req.params.leaveId);
  leave.status = status;
  leave.approvedBy = req.user._id;

  await employee.save();

  // Notify employee about leave status
  if (employee.userId) {
    if (status === 'approved') {
      await createNotification({
        recipient: employee.userId,
        ...NotificationTemplates.leaveApproved(
          employee.name,
          new Date(leave.startDate).toLocaleDateString('en-IN'),
          new Date(leave.endDate).toLocaleDateString('en-IN'),
          req.user._id
        )
      });
    } else if (status === 'rejected') {
      await createNotification({
        recipient: employee.userId,
        ...NotificationTemplates.leaveRejected(reason, req.user._id)
      });
    }
  }

  res.json({
    success: true,
    data: employee,
    message: `Leave ${status} successfully`
  });
});

// @desc    Process salary
// @route   POST /api/employees/:id/salary
// @access  Private
export const processSalary = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  const { month, paymentMode, notes } = req.body;

  // Check if salary already processed for the month
  const existingSalary = employee.salaryHistory.find(s => s.month === month);
  if (existingSalary) {
    return res.status(400).json({ message: 'Salary already processed for this month' });
  }

  const totalAllowances = Object.values(employee.allowances).reduce((sum, val) => sum + (val || 0), 0);
  const fixedDeductions = Object.values(employee.deductions).reduce((sum, val) => sum + (val || 0), 0);
  const grossSalary = employee.basicSalary + totalAllowances;

  // Calculate leave/attendance deductions for the target month
  const [y, m] = month.split('-').map(Number);
  const monthStart = new Date(y, (m - 1), 1);
  const monthEnd = new Date(y, (m - 1) + 1, 0, 23, 59, 59, 999);
  const attendanceThisMonth = (employee.attendance || []).filter(a => {
    const d = new Date(a.date);
    return d >= monthStart && d <= monthEnd;
  });

  // Approved leaves overlapping month
  let sickApprovedDays = 0;
  let otherApprovedLeaveDays = 0;
  (employee.leaves || []).forEach(l => {
    if (l.status === 'approved') {
      const s = new Date(l.startDate);
      const e = new Date(l.endDate);
      const from = s < monthStart ? monthStart : s;
      const to = e > monthEnd ? monthEnd : e;
      if (from <= to) {
        const days = Math.ceil((to - from) / (1000*60*60*24)) + 1;
        if (l.leaveType === 'sick') sickApprovedDays += days; else otherApprovedLeaveDays += days;
      }
    }
  });
  const halfDays = attendanceThisMonth.filter(a => a.status === 'half_day').length;
  const absents = attendanceThisMonth.filter(a => a.status === 'absent').length;
  // Daily rate approximation of 26 working days
  const dailyRate = (employee.basicSalary + totalAllowances - fixedDeductions) / 26;
  const unpaidSickDays = Math.max(0, sickApprovedDays - 1);
  const leaveDeductions = Math.max(0, Math.round(((unpaidSickDays + otherApprovedLeaveDays + absents) * dailyRate + halfDays * (dailyRate/2)) * 100) / 100);

  // Hold (Retention) 5% by default
  const holdPercent = employee.holdPercent || 5;
  const prelimNet = grossSalary - fixedDeductions - leaveDeductions;
  const holdAmount = Math.max(0, Math.round((prelimNet * holdPercent / 100) * 100) / 100);
  const payableNet = Math.max(0, Math.round((prelimNet - holdAmount) * 100) / 100);

  employee.salaryHistory.push({
    month,
    basicSalary: employee.basicSalary,
    totalAllowances,
    totalDeductions: fixedDeductions + leaveDeductions + holdAmount,
    netSalary: payableNet,
    paidDate: new Date(),
    paymentMode,
    status: 'paid',
    notes
  });

  // Update hold balance accumulator
  employee.holdBalance = (employee.holdBalance || 0) + holdAmount;

  await employee.save();

  // Notify employee about salary processed
  if (employee.userId) {
    await createNotification({
      recipient: employee.userId,
      ...NotificationTemplates.salaryProcessed(month, payableNet.toFixed(2)),
      triggeredBy: req.user._id
    });
  }

  res.json({
    success: true,
    data: employee,
    message: 'Salary processed successfully',
    salaryDetails: {
      month,
      grossSalary,
      fixedDeductions,
      leaveDeductions,
      holdPercent,
      holdAmount,
      payableNet
    }
  });
});

// @desc    Preview salary calculation for a month (no save)
// @route   GET /api/employees/:id/salary-preview?month=YYYY-MM
// @access  Private
export const getSalaryPreview = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }
  const { month } = req.query;
  if (!month) {
    return res.status(400).json({ message: 'Month (YYYY-MM) is required' });
  }

  const totalAllowances = Object.values(employee.allowances).reduce((sum, val) => sum + (val || 0), 0);
  const fixedDeductions = Object.values(employee.deductions).reduce((sum, val) => sum + (val || 0), 0);
  const grossSalary = employee.basicSalary + totalAllowances;

  const [y, m] = month.split('-').map(Number);
  const monthStart = new Date(y, (m - 1), 1);
  const monthEnd = new Date(y, (m - 1) + 1, 0, 23, 59, 59, 999);

  const attendanceThisMonth = (employee.attendance || []).filter(a => {
    const d = new Date(a.date);
    return d >= monthStart && d <= monthEnd;
  });

  let sickApprovedDays = 0;
  let otherApprovedLeaveDays = 0;
  (employee.leaves || []).forEach(l => {
    if (l.status === 'approved') {
      const s = new Date(l.startDate);
      const e = new Date(l.endDate);
      const from = s < monthStart ? monthStart : s;
      const to = e > monthEnd ? monthEnd : e;
      if (from <= to) {
        const days = Math.ceil((to - from) / (1000*60*60*24)) + 1;
        if (l.leaveType === 'sick') sickApprovedDays += days; else otherApprovedLeaveDays += days;
      }
    }
  });

  const halfDays = attendanceThisMonth.filter(a => a.status === 'half_day').length;
  const absents = attendanceThisMonth.filter(a => a.status === 'absent').length;
  const dailyRate = (employee.basicSalary + totalAllowances - fixedDeductions) / 26;
  const unpaidSickDays = Math.max(0, sickApprovedDays - 1);
  const leaveDeductions = Math.max(0, Math.round(((unpaidSickDays + otherApprovedLeaveDays + absents) * dailyRate + halfDays * (dailyRate/2)) * 100) / 100);

  const holdPercent = employee.holdPercent || 5;
  const prelimNet = grossSalary - fixedDeductions - leaveDeductions;
  const holdAmount = Math.max(0, Math.round((prelimNet * holdPercent / 100) * 100) / 100);
  const payableNet = Math.max(0, Math.round((prelimNet - holdAmount) * 100) / 100);

  res.json({
    success: true,
    data: {
      month,
      grossSalary,
      totalAllowances,
      fixedDeductions,
      leaveDeductions,
      holdPercent,
      holdAmount,
      payableNet
    }
  });
});

// @desc    Get salary history
// @route   GET /api/employees/:id/salary-history
// @access  Private
export const getSalaryHistory = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  res.json({
    success: true,
    data: employee.salaryHistory.sort((a, b) => new Date(b.paidDate) - new Date(a.paidDate))
  });
});

// @desc    Add work update
// @route   POST /api/employees/:id/work-update
// @access  Private
export const addWorkUpdate = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  const { project, description, images } = req.body;

  employee.workUpdates.push({
    project,
    description,
    images,
    submittedBy: req.user._id
  });

  await employee.save();

  res.json({
    success: true,
    data: employee,
    message: 'Work update added successfully'
  });
});

// @desc    Get work updates
// @route   GET /api/employees/:id/work-updates
// @access  Private
export const getWorkUpdates = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id)
    .populate('workUpdates.project', 'projectId description')
    .populate('workUpdates.submittedBy', 'name');

  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  res.json({
    success: true,
    data: employee.workUpdates.sort((a, b) => new Date(b.date) - new Date(a.date))
  });
});

// @desc    Update employee role
// @route   PUT /api/employees/:id/role
// @access  Private
export const updateEmployeeRole = asyncHandler(async (req, res) => {
  const { role, reportingTo } = req.body;

  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  employee.role = role;
  employee.designation = role;
  if (reportingTo) {
    employee.reportingTo = reportingTo;
  }

  await employee.save();

  const populated = await Employee.findById(employee._id)
    .populate('reportingTo', 'name employeeId role');

  res.json({
    success: true,
    data: populated,
    message: `Role updated to ${role} successfully`
  });
});

// @desc    Assign project to employee
// @route   POST /api/employees/:id/assign-project
// @access  Private
export const assignProjectToEmployee = asyncHandler(async (req, res) => {
  const { projectId, role } = req.body; // role: supervisor, engineer, worker, helper

  console.log('Assigning project to employee:', { employeeId: req.params.id, projectId, role });

  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    console.log('Employee not found:', req.params.id);
    return res.status(404).json({ message: 'Employee not found' });
  }

  const project = await Project.findById(projectId);
  if (!project) {
    console.log('Project not found:', projectId);
    return res.status(404).json({ message: 'Project not found' });
  }

  // Check if already assigned
  const existing = employee.assignedProjects.find(
    ap => ap.project.toString() === projectId && ap.status === 'active'
  );

  if (existing) {
    console.log('Project already assigned to employee:', { projectId, employeeId: employee._id });
    return res.status(400).json({ message: 'Already assigned to this project' });
  }

  // Add to employee's assigned projects
  const assignment = {
    project: projectId,
    role: role || employee.role,
    assignedBy: req.user._id,
    status: 'active'
  };
  
  employee.assignedProjects.push(assignment);
  console.log('Added project to employee assignedProjects:', assignment);

  // If supervisor, add to managed projects
  if (role === 'supervisor' || employee.role === 'supervisor') {
    if (!employee.managedProjects.includes(projectId)) {
      employee.managedProjects.push(projectId);
      console.log('Added project to employee managedProjects:', projectId);
    }
  }

  await employee.save();
  console.log('Employee saved with assigned project');

  // Update project with employee assignment
  project.assignEmployee(employee._id, role || employee.role, req.user._id);
  await project.save();
  console.log('Project updated with employee assignment');

  const populated = await Employee.findById(employee._id)
    .populate('assignedProjects.project', 'projectId description status');

  console.log('Populated employee data:', JSON.stringify(populated.assignedProjects, null, 2));

  res.json({
    success: true,
    data: populated,
    message: `Project assigned successfully as ${role || employee.role}`
  });
});

// @desc    Get employee's assigned projects
// @route   GET /api/employees/:id/projects
// @access  Private
export const getEmployeeProjects = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id)
    .populate('assignedProjects.project', 'projectId description status customer category')
    .populate('assignedProjects.assignedBy', 'name');

  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  const activeProjects = employee.assignedProjects.filter(ap => ap.status === 'active');

  res.json({
    success: true,
    data: {
      activeProjects,
      allProjects: employee.assignedProjects
    }
  });
});

// @desc    Get employees by role
// @route   GET /api/employees/by-role/:role
// @access  Private
export const getEmployeesByRole = asyncHandler(async (req, res) => {
  const { role } = req.params;

  const employees = await Employee.find({ 
    role,
    isActive: true 
  })
    .populate('reportingTo', 'name employeeId')
    .select('employeeId name phone role designation assignedProjects')
    .sort({ name: 1 });

  res.json({
    success: true,
    data: employees
  });
});

// @desc    Get supervisor's team members
// @route   GET /api/employees/:id/team
// @access  Private
export const getSupervisorTeam = asyncHandler(async (req, res) => {
  const supervisor = await Employee.findById(req.params.id);
  
  if (!supervisor) {
    return res.status(404).json({ message: 'Supervisor not found' });
  }

  // Get all employees reporting to this supervisor
  const team = await Employee.find({ 
    reportingTo: req.params.id,
    isActive: true 
  })
    .populate('assignedProjects.project', 'projectId description status')
    .select('employeeId name phone role designation assignedProjects');

  res.json({
    success: true,
    data: {
      supervisor: {
        _id: supervisor._id,
        name: supervisor.name,
        employeeId: supervisor.employeeId,
        role: supervisor.role
      },
      team
    }
  });
});

// ============= EMPLOYEE SELF-SERVICE FUNCTIONS =============

// @desc    Mark attendance with GPS location
// @route   POST /api/employees/my-attendance
// @access  Private (Employee)
export const markMyAttendance = asyncHandler(async (req, res) => {
  const { type, location, notes } = req.body; // type: 'checkin' or 'checkout'
  
  // Find employee by userId
  const employee = await Employee.findOne({ userId: req.user._id });
  if (!employee) {
    return res.status(404).json({ message: 'Employee record not found' });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find or create today's attendance
  let attendance = employee.attendance.find(
    a => new Date(a.date).setHours(0, 0, 0, 0) === today.getTime()
  );

  if (type === 'checkin') {
    if (attendance && attendance.checkInTime) {
      return res.status(400).json({ message: 'Already checked in today' });
    }

    if (!attendance) {
      attendance = {
        date: new Date(),
        checkInTime: new Date(),
        checkInLocation: {
          type: 'Point',
          coordinates: location?.coordinates || [0, 0],
          address: location?.address || 'Location not provided'
        },
        status: 'present',
        markedBy: req.user._id,
        notes: notes || ''
      };
      employee.attendance.push(attendance);
    } else {
      attendance.checkInTime = new Date();
      attendance.checkInLocation = {
        type: 'Point',
        coordinates: location?.coordinates || [0, 0],
        address: location?.address || 'Location not provided'
      };
      attendance.status = 'present';
      attendance.markedBy = req.user._id;
    }
  } else if (type === 'checkout') {
    if (!attendance || !attendance.checkInTime) {
      return res.status(400).json({ message: 'Please check in first' });
    }
    if (attendance.checkOutTime) {
      return res.status(400).json({ message: 'Already checked out today' });
    }

    attendance.checkOutTime = new Date();
    attendance.checkOutLocation = {
      type: 'Point',
      coordinates: location?.coordinates || [0, 0],
      address: location?.address || 'Location not provided'
    };
    
    // Calculate work hours
    const hours = (attendance.checkOutTime - attendance.checkInTime) / (1000 * 60 * 60);
    attendance.workHours = Math.round(hours * 100) / 100;
    
    // Automatically determine attendance status based on work hours
    if (attendance.workHours >= 8.25) { // 8 hours 15 minutes
      attendance.status = 'present';
    } else if (attendance.workHours >= 4) { // 4 hours
      attendance.status = 'half_day';
    } else {
      attendance.status = 'absent';
    }
  }

  await employee.save();

  res.json({
    success: true,
    data: attendance,
    message: type === 'checkin' ? 'Checked in successfully' : 'Checked out successfully'
  });
});

// @desc    Get my attendance history
// @route   GET /api/employees/my-attendance
// @access  Private (Employee)
export const getMyAttendance = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  
  const employee = await Employee.findOne({ userId: req.user._id });
  if (!employee) {
    return res.status(404).json({ message: 'Employee record not found' });
  }

  let attendance = employee.attendance;

  // Filter by month/year if provided
  if (month && year) {
    const targetMonth = parseInt(month);
    const targetYear = parseInt(year);
    
    attendance = attendance.filter(a => {
      const date = new Date(a.date);
      // JavaScript months are 0-indexed, so we need to add 1 for comparison
      return (date.getMonth() + 1) === targetMonth && date.getFullYear() === targetYear;
    });
  }

  res.json({
    success: true,
    data: attendance.sort((a, b) => b.date - a.date)
  });
});

// @desc    Get my salary history
// @route   GET /api/employees/my-salary
// @access  Private (Employee)
export const getMySalary = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ userId: req.user._id });
  if (!employee) {
    return res.status(404).json({ message: 'Employee record not found' });
  }

  // Format current month as YYYY-MM
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // Find if salary has been processed for current month
  const currentSalaryRecord = employee.salaryHistory.find(s => s.month === currentMonth);

  // Calculate current month salary based on employee's allowances and deductions
  const totalAllowances = Object.values(employee.allowances).reduce((sum, val) => sum + (val || 0), 0);
  const totalDeductions = Object.values(employee.deductions).reduce((sum, val) => sum + (val || 0), 0);
  const netSalary = employee.basicSalary + totalAllowances - totalDeductions;

  // Leave/attendance deduction calculation for current month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const attendanceThisMonth = (employee.attendance || []).filter(a => {
    const d = new Date(a.date);
    return d >= monthStart && d <= monthEnd;
  });
  const dailyRate = netSalary / 26; // working days approx
  let sickApprovedDays = 0;
  let otherApprovedLeaveDays = 0;
  // Approved leaves overlapping current month
  (employee.leaves || []).forEach(l => {
    if (l.status === 'approved') {
      const s = new Date(l.startDate);
      const e = new Date(l.endDate);
      const from = s < monthStart ? monthStart : s;
      const to = e > monthEnd ? monthEnd : e;
      if (from <= to) {
        const days = Math.ceil((to - from) / (1000*60*60*24)) + 1;
        if (l.leaveType === 'sick') sickApprovedDays += days; else otherApprovedLeaveDays += days;
      }
    }
  });
  // First 1 sick day is paid
  const unpaidSickDays = Math.max(0, sickApprovedDays - 1);
  // Half-day and absent from attendance
  const halfDays = attendanceThisMonth.filter(a => a.status === 'half_day').length;
  const absents = attendanceThisMonth.filter(a => a.status === 'absent').length;
  const leaveDeductions = Math.round(((unpaidSickDays + otherApprovedLeaveDays + absents) * dailyRate + halfDays * (dailyRate/2)) * 100) / 100;

  // Format current month data for frontend
  const currentMonthData = currentSalaryRecord 
    ? {
        month: currentSalaryRecord.month,
        status: currentSalaryRecord.status,
        netAmount: currentSalaryRecord.netSalary,
        grossAmount: currentSalaryRecord.basicSalary + currentSalaryRecord.totalAllowances,
        deductions: currentSalaryRecord.totalDeductions,
        paymentDate: currentSalaryRecord.paidDate
      }
    : {
        month: currentMonth,
        status: 'pending',
        netAmount: Math.max(0, netSalary - leaveDeductions),
        grossAmount: employee.basicSalary + totalAllowances,
        deductions: totalDeductions + leaveDeductions,
        paymentDate: null
      };

  // Format salary history for frontend
  const formattedHistory = employee.salaryHistory.map(record => ({
    month: record.month,
    grossAmount: record.basicSalary + record.totalAllowances,
    deductions: record.totalDeductions,
    netAmount: record.netSalary,
    status: record.status,
    paymentDate: record.paidDate,
    paymentMode: record.paymentMode,
    notes: record.notes
  })).sort((a, b) => b.month.localeCompare(a.month));

  res.json({
    success: true,
    data: {
      basicSalary: employee.basicSalary,
      allowances: employee.allowances,
      deductions: employee.deductions,
      totalAllowances,
      totalDeductions,
      netSalary,
      leaveDeductions,
      currentMonth: currentMonthData,
      history: formattedHistory
    }
  });
});

// ============= HOLD (RETENTION) ==================
// @desc    Get my hold (retention) summary
// @route   GET /api/employees/my-hold
// @access  Private (Employee)
export const getMyHold = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ userId: req.user._id });
  if (!employee) {
    return res.status(404).json({ message: 'Employee record not found' });
  }

  const holdPercent = employee.holdPercent || 5;
  // Calculate accrual from paid salary history (for display)
  let totalAccrued = 0;
  (employee.salaryHistory || []).forEach(r => {
    if (r.status === 'paid') {
      const hold = Math.round((r.netSalary * holdPercent / 100) * 100) / 100;
      totalAccrued += hold;
    }
  });

  const approvedRequests = (employee.holdRequests || []).filter(r => r.status === 'approved');
  const withdrawn = approvedRequests.reduce((s, r) => s + (r.amount || 0), 0);
  const pending = (employee.holdRequests || []).filter(r => r.status === 'pending').reduce((s, r) => s + (r.amount || 0), 0);

  // Use stored holdBalance as current available balance tracker
  const holdBalance = Math.max(0, (employee.holdBalance || 0));
  const withdrawable = Math.max(0, holdBalance - pending);

  res.json({
    success: true,
    data: {
      holdPercent,
      totalAccrued: Math.round(totalAccrued * 100) / 100,
      holdBalance: Math.round(holdBalance * 100) / 100,
      withdrawable: Math.round(withdrawable * 100) / 100,
      pendingRequestsAmount: Math.round(pending * 100) / 100,
      nextEligibleMonth: null
    }
  });
});

// @desc    Request hold withdrawal
// @route   POST /api/employees/my-hold/request
// @access  Private (Employee)
export const requestMyHoldWithdrawal = asyncHandler(async (req, res) => {
  const { amount, notes } = req.body;
  const employee = await Employee.findOne({ userId: req.user._id });
  if (!employee) {
    return res.status(404).json({ message: 'Employee record not found' });
  }

  // Withdraw up to current hold balance minus pending requests
  const pending = (employee.holdRequests || []).filter(r => r.status === 'pending').reduce((s, r) => s + (r.amount || 0), 0);
  const withdrawable = Math.max(0, (employee.holdBalance || 0) - pending);

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid amount' });
  }
  if (amount > withdrawable) {
    return res.status(400).json({ message: `Requested amount exceeds withdrawable balance (₹${withdrawable})` });
  }

  employee.holdRequests.push({ amount, status: 'pending', requestedAt: new Date(), notes: notes || '' });
  await employee.save();

  res.status(201).json({ success: true, message: 'Withdrawal request submitted for approval' });
});

// @desc    Get my employee profile
// @route   GET /api/employees/my-profile
// @access  Private (Employee)
export const getMyProfile = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ userId: req.user._id })
    .populate('userId', 'name email role')
    .populate('reportingTo', 'name employeeId');

  if (!employee) {
    return res.status(404).json({ message: 'Employee record not found' });
  }

  res.json({
    success: true,
    data: employee
  });
});

// @desc    Get my assigned projects
// @route   GET /api/employees/my-projects
// @access  Private (Employee)
export const getMyProjects = asyncHandler(async (req, res) => {
  console.log('Fetching projects for user:', req.user._id);
  
  // First, let's try to find any employee record with this userId
  const anyEmployee = await Employee.findOne({ userId: req.user._id });
  console.log('Any employee with this userId:', anyEmployee ? anyEmployee._id : 'None found');
  
  const employee = await Employee.findOne({ userId: req.user._id })
    .populate('assignedProjects.project', 'projectId description status category customer startDate expectedEndDate')
    .populate('assignedProjects.assignedBy', 'name');

  if (!employee) {
    console.log('Employee not found for userId:', req.user._id);
    // Let's also check all employees to see if we can find a match
    const allEmployees = await Employee.find({}, 'userId name employeeId');
    console.log('All employees:', allEmployees.map(e => ({ id: e._id, userId: e.userId, name: e.name, employeeId: e.employeeId })));
    return res.status(404).json({ message: 'Employee record not found' });
  }

  console.log('Employee found:', employee._id);
  console.log('Employee userId:', employee.userId);
  console.log('Employee assignedProjects length:', employee.assignedProjects.length);
  console.log('Employee assignedProjects:', JSON.stringify(employee.assignedProjects, null, 2));

  const activeProjects = employee.assignedProjects.filter(ap => ap.status === 'active');
  
  console.log('Active projects count:', activeProjects.length);
  console.log('Active projects:', JSON.stringify(activeProjects, null, 2));

  res.json({
    success: true,
    data: {
      activeProjects,
      totalProjects: employee.assignedProjects.length
    }
  });
});

// @desc    Submit work update
// @route   POST /api/employees/work-update
// @access  Private (Employee)
export const submitMyWorkUpdate = asyncHandler(async (req, res) => {
  const { projectId, description, images, audioNotes, videoRecordings } = req.body;
  
  const employee = await Employee.findOne({ userId: req.user._id });
  if (!employee) {
    return res.status(404).json({ message: 'Employee record not found' });
  }

  // Parse arrays from body (they may come as strings from FormData)
  let uploadedImages = Array.isArray(images) ? images : (images ? [images] : []);
  let uploadedAudioNotes = Array.isArray(audioNotes) ? audioNotes : (audioNotes ? [audioNotes] : []);
  let uploadedVideoRecordings = Array.isArray(videoRecordings) ? videoRecordings : (videoRecordings ? [videoRecordings] : []);

  // If files are uploaded with this request, upload them to S3
  if (req.files && req.files.length > 0) {
    try {
      const { uploadMultipleFromMemory } = await import('../utils/s3Service.js');
      const uploadedFiles = await uploadMultipleFromMemory(req.files, 'work-updates');

      // Categorize uploaded files based on their type
      uploadedFiles.forEach((file, index) => {
        const originalFile = req.files[index];
        const fileUrl = file.url;
        
        if (originalFile.mimetype.startsWith('image/')) {
          uploadedImages.push(fileUrl);
        } else if (originalFile.mimetype.startsWith('audio/')) {
          uploadedAudioNotes.push(fileUrl);
        } else if (originalFile.mimetype.startsWith('video/')) {
          uploadedVideoRecordings.push(fileUrl);
        }
      });
    } catch (error) {
      console.error('S3 upload error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to upload files to S3',
        error: error.message 
      });
    }
  }

  console.log('Work update data:', { projectId, description, uploadedImages, uploadedAudioNotes, uploadedVideoRecordings });

  employee.workUpdates.push({
    date: new Date(),
    project: projectId,
    description,
    images: uploadedImages,
    audioNotes: uploadedAudioNotes,
    videoRecordings: uploadedVideoRecordings,
    submittedBy: req.user._id
  });

  await employee.save();

  // Also add to project history
  if (projectId) {
    const project = await Project.findById(projectId);
    if (project) {
      project.addWorkUpdate({
        title: `Update by ${employee.name}`,
        description,
        status: 'in_progress',
        images: uploadedImages,
        audioNotes: uploadedAudioNotes,
        videoRecordings: uploadedVideoRecordings,
        updatedBy: employee._id
      });
      await project.save();
      
      // Notify project supervisors and admin about work update
      const supervisorIds = project.supervisors
        .map(s => s.employee)
        .filter(id => id.toString() !== employee._id.toString());
      
      if (supervisorIds.length > 0) {
        const supervisors = await Employee.find({ _id: { $in: supervisorIds } }).select('userId');
        const userIds = supervisors.map(s => s.userId).filter(Boolean);
        
        if (userIds.length > 0) {
          await sendToMultipleUsers(userIds, NotificationTemplates.workUpdateSubmitted(
            employee.name,
            project.description || project.projectId,
            project._id,
            req.user._id
          ));
        }
      }
    }
  }

  res.json({
    success: true,
    message: 'Work update submitted successfully',
    data: {
      images: uploadedImages,
      audioNotes: uploadedAudioNotes,
      videoRecordings: uploadedVideoRecordings
    }
  });
});

// @desc    Upload work update files
// @route   POST /api/employees/upload-work-files
// @access  Private (Employee)
export const uploadWorkUpdateFiles = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'Please upload files' });
  }

  try {
    // Upload files to S3 (memory buffers)
    const { uploadMultipleFromMemory } = await import('../utils/s3Service.js');
    const uploadedFiles = await uploadMultipleFromMemory(req.files, 'work-updates');

    // Return the uploaded file URLs
    res.json({
      success: true,
      data: uploadedFiles,
      message: 'Files uploaded successfully to S3'
    });
  } catch (error) {
    console.error('S3 upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload files to S3',
      error: error.message 
    });
  }
});

// @desc    Apply for leave
// @route   POST /api/employees/leave-request
// @access  Private (Employee)
export const applyMyLeave = asyncHandler(async (req, res) => {
  const { leaveType, startDate, endDate, reason } = req.body;
  
  const employee = await Employee.findOne({ userId: req.user._id });
  if (!employee) {
    return res.status(404).json({ message: 'Employee record not found' });
  }

  // Calculate number of days
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  employee.leaves.push({
    leaveType,
    startDate,
    endDate,
    numberOfDays: days,
    reason,
    status: 'pending',
    appliedDate: new Date()
  });

  await employee.save();

  res.json({
    success: true,
    message: 'Leave request submitted successfully'
  });
});

// @desc    Get my leave requests
// @route   GET /api/employees/my-leaves
// @access  Private (Employee)
export const getMyLeaves = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ userId: req.user._id })
    .populate('leaves.approvedBy', 'name');

  if (!employee) {
    return res.status(404).json({ message: 'Employee record not found' });
  }

  res.json({
    success: true,
    data: employee.leaves.sort((a, b) => b.appliedDate - a.appliedDate)
  });
});

// @desc    Get my calendar reminders
// @route   GET /api/employees/my-reminders
// @access  Private (Employee)
export const getMyReminders = asyncHandler(async (req, res) => {
  const { type, status } = req.query;

  let query = {
    $or: [
      { assignedTo: req.user._id },
      { createdBy: req.user._id }
    ]
  };

  if (type) query.type = type;
  if (status) query.status = status;

  const reminders = await CalendarReminder.find(query)
    .populate('assignedTo', 'name')
    .populate('completedBy', 'name')
    .sort({ date: 1 });

  res.json({
    success: true,
    data: reminders
  });
});

// @desc    Create calendar reminder
// @route   POST /api/employees/reminder
// @access  Private (Employee)
export const createReminder = asyncHandler(async (req, res) => {
  const reminder = await CalendarReminder.create({
    ...req.body,
    createdBy: req.user._id
  });

  res.status(201).json({
    success: true,
    data: reminder
  });
});

// @desc    Update reminder status
// @route   PUT /api/employees/reminder/:id
// @access  Private (Employee)
export const updateReminder = asyncHandler(async (req, res) => {
  const reminder = await CalendarReminder.findById(req.params.id);
  
  if (!reminder) {
    return res.status(404).json({ message: 'Reminder not found' });
  }

  // Check if user is the creator or assignee of the reminder
  const isCreator = reminder.createdBy.toString() === req.user._id.toString();
  const isAssignee = reminder.assignedTo.some(id => id.toString() === req.user._id.toString());
  
  if (!isCreator && !isAssignee) {
    return res.status(403).json({ message: 'Access denied. You can only modify your own reminders.' });
  }

  if (req.body.status === 'completed') {
    reminder.completedBy = req.user._id;
    reminder.completedDate = new Date();
  }

  reminder.status = req.body.status || reminder.status;
  await reminder.save();

  res.json({
    success: true,
    data: reminder
  });
});

// @desc    Reset all calendar reminders (Delete all)
// @route   DELETE /api/employees/reminders/reset
// @access  Private (Admin only)
export const resetAllReminders = asyncHandler(async (req, res) => {
  // Check if user has admin permissions
  if (req.user.role !== 'admin' && req.user.role !== 'main-admin') {
    return res.status(403).json({ message: 'Access denied. Admin rights required.' });
  }

  // Delete all calendar reminders
  const result = await CalendarReminder.deleteMany({});
  
  res.json({
    success: true,
    message: `Successfully deleted ${result.deletedCount} calendar reminders`,
    deletedCount: result.deletedCount
  });
});

// @desc    Reset my calendar reminders (Delete only user's reminders)
// @route   DELETE /api/employees/my-reminders/reset
// @access  Private (Employee)
export const resetMyReminders = asyncHandler(async (req, res) => {
  // Delete only reminders created by or assigned to the current user
  const result = await CalendarReminder.deleteMany({
    $or: [
      { createdBy: req.user._id },
      { assignedTo: req.user._id }
    ]
  });
  
  res.json({
    success: true,
    message: `Successfully deleted ${result.deletedCount} of your calendar reminders`,
    deletedCount: result.deletedCount
  });
});

// ============= HOLD REQUESTS (ADMIN) ==================
// @desc    List hold requests (flattened) with optional status filter
// @route   GET /api/employees/hold-requests
// @access  Private (Admin/accounts)
export const listHoldRequests = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const employees = await Employee.find({}).select('name employeeId holdRequests holdBalance');
  const all = [];
  employees.forEach(emp => {
    (emp.holdRequests || []).forEach(r => {
      if (!status || r.status === status) {
        all.push({
          _id: r._id,
          employeeId: emp._id,
          employeeName: emp.name,
          empCode: emp.employeeId,
          amount: r.amount,
          status: r.status,
          requestedAt: r.requestedAt,
          processedAt: r.processedAt,
          notes: r.notes,
          holdBalanceAtFetch: emp.holdBalance || 0
        });
      }
    });
  });
  // Latest first
  all.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  res.json({ success: true, data: all });
});

// @desc    Approve a hold withdrawal request
// @route   PUT /api/employees/hold-requests/:requestId/approve
// @access  Private (Admin/accounts)
export const approveHoldRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { paymentMethod, referenceNumber, notes } = req.body;

  const employee = await Employee.findOne({ 'holdRequests._id': requestId });
  if (!employee) return res.status(404).json({ message: 'Request not found' });
  const request = employee.holdRequests.id(requestId);
  if (request.status !== 'pending') return res.status(400).json({ message: 'Request not pending' });
  const amount = request.amount || 0;
  if ((employee.holdBalance || 0) < amount) return res.status(400).json({ message: 'Insufficient hold balance' });

  // Deduct balance and mark approved
  employee.holdBalance = Math.max(0, (employee.holdBalance || 0) - amount);
  request.status = 'approved';
  request.processedAt = new Date();
  if (notes) request.notes = notes;
  await employee.save();

  // For now, record meta in response (Payment creation can be wired later if needed)
  res.json({ success: true, message: 'Withdrawal approved', data: { employeeId: employee._id, amount, paymentMethod, referenceNumber, holdBalance: employee.holdBalance } });
});

// @desc    Reject a hold withdrawal request
// @route   PUT /api/employees/hold-requests/:requestId/reject
// @access  Private (Admin/accounts)
export const rejectHoldRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { notes } = req.body;
  const employee = await Employee.findOne({ 'holdRequests._id': requestId });
  if (!employee) return res.status(404).json({ message: 'Request not found' });
  const request = employee.holdRequests.id(requestId);
  if (request.status !== 'pending') return res.status(400).json({ message: 'Request not pending' });
  request.status = 'rejected';
  request.processedAt = new Date();
  if (notes) request.notes = notes;
  await employee.save();
  res.json({ success: true, message: 'Withdrawal rejected' });
});

// @desc    Get human-readable address from coordinates
// @route   GET /api/employees/geocode
// @access  Private
export const geocodeLocation = asyncHandler(async (req, res) => {
  // Prevent caching
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  const { lat, lon } = req.query;
  
  if (!lat || !lon) {
    return res.status(400).json({ message: 'Latitude and longitude are required' });
  }

  try {
    // Use OpenStreetMap Nominatim API for reverse geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'SanjanaCRM/1.0 (contact@sanjanacrm.com)'
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.display_name) {
        // Extract meaningful parts of the address
        const parts = data.display_name.split(', ');
        // Take the first 3 parts for a concise address
        const address = parts.slice(0, 3).join(', ');
        
        return res.json({
          success: true,
          data: {
            address: address,
            fullAddress: data.display_name,
            coordinates: [parseFloat(lon), parseFloat(lat)]
          }
        });
      }
    }
    
    // Fallback to coordinates if geocoding fails
    res.json({
      success: true,
      data: {
        address: `${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`,
        coordinates: [parseFloat(lon), parseFloat(lat)]
      }
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    // Fallback to coordinates if geocoding fails
    res.json({
      success: true,
      data: {
        address: `${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`,
        coordinates: [parseFloat(lon), parseFloat(lat)]
      }
    });
  }
});

// @desc    Generate payslip PDF
// @route   GET /api/employees/:id/payslip/:month
// @access  Private
export const generatePayslip = asyncHandler(async (req, res) => {
  const { id, month } = req.params;
  
  try {
    // Find employee
    const employee = await Employee.findById(id)
      .populate('userId', 'name');
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Find salary record for the specified month
    const salaryRecord = employee.salaryHistory.find(s => s.month === month);
    
    if (!salaryRecord) {
      return res.status(404).json({ message: `No salary record found for ${month}` });
    }
    
    // Prepare payslip data
    const payslipData = {
      employeeId: employee.employeeId,
      employeeName: employee.userId?.name || employee.name,
      department: employee.department,
      designation: employee.designation,
      month: salaryRecord.month,
      paymentDate: salaryRecord.paidDate,
      basicSalary: salaryRecord.basicSalary,
      allowances: employee.allowances,
      deductions: employee.deductions,
      totalDeductions: salaryRecord.totalDeductions,
      grossAmount: salaryRecord.basicSalary + salaryRecord.totalAllowances,
      netAmount: salaryRecord.netSalary
    };
    
    // Generate PDF
    const { generatePayslipPDF } = await import('../utils/pdfService.js');
    const pdf = await generatePayslipPDF(payslipData);
    
    res.json({
      success: true,
      data: {
        pdfUrl: `/uploads/payslips/${pdf.filename}`
      }
    });
  } catch (error) {
    console.error('Payslip generation error:', error);
    res.status(500).json({ message: 'Failed to generate payslip' });
  }
});

// @desc    Generate my payslip PDF (Employee Self-Service)
// @route   GET /api/employees/my-payslip/:month
// @access  Private (Employee)
export const generateMyPayslip = asyncHandler(async (req, res) => {
  const { month } = req.params;
  
  try {
    // Find employee by userId
    const employee = await Employee.findOne({ userId: req.user._id })
      .populate('userId', 'name');
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee record not found' });
    }
    
    // Find salary record for the specified month
    const salaryRecord = employee.salaryHistory.find(s => s.month === month);
    
    if (!salaryRecord) {
      return res.status(404).json({ message: `No salary record found for ${month}` });
    }
    
    // Prepare payslip data
    const payslipData = {
      employeeId: employee.employeeId,
      employeeName: employee.userId?.name || employee.name,
      department: employee.department,
      designation: employee.designation,
      month: salaryRecord.month,
      paymentDate: salaryRecord.paidDate,
      basicSalary: salaryRecord.basicSalary,
      allowances: employee.allowances,
      deductions: employee.deductions,
      totalDeductions: salaryRecord.totalDeductions,
      grossAmount: salaryRecord.basicSalary + salaryRecord.totalAllowances,
      netAmount: salaryRecord.netSalary
    };
    
    // Generate PDF
    const { generatePayslipPDF } = await import('../utils/pdfService.js');
    const pdf = await generatePayslipPDF(payslipData);
    
    res.json({
      success: true,
      data: {
        pdfUrl: `/uploads/payslips/${pdf.filename}`
      }
    });
  } catch (error) {
    console.error('Payslip generation error:', error);
    res.status(500).json({ message: 'Failed to generate payslip' });
  }
});
