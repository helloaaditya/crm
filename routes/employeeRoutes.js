import express from 'express';
import { protect, moduleAccess, checkPermission } from '../middleware/auth.js';
import { upload, uploadMemory } from '../middleware/upload.js';
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  markAttendance,
  getAttendanceHistory,
  updateAttendanceEntry,
  autoGenerateAllAttendance,
  generateMissingAttendance,
  deduplicateAttendanceRecords,
  applyLeave,
  updateLeaveStatus,
  grantCompOff,
  processSalary,
  getSalaryHistory,
  getSalaryPreview,
  generatePayslip,
  addWorkUpdate,
  getWorkUpdates,
  uploadWorkUpdateFiles,
  updateEmployeeRole,
  assignProjectToEmployee,
  getEmployeeProjects,
  getEmployeesByRole,
  getSupervisorTeam,
  getEmployeesList,
  getMyProfile,
  geocodeLocation,
  generateMyPayslip,
  // Employee Self-Service
  markMyAttendance,
  getMyAttendance,
  getMySalary,
  getMyHold,
  requestMyHoldWithdrawal,
  getMyProjects,
  getMyLeads,
  createMyLead,
  updateMyLead,
  submitMyWorkUpdate,
  applyMyLeave,
  getMyLeaves,
  getMyReminders,
  createReminder,
  updateReminder,
  resetMyReminders,
  resetAllReminders,
  listHoldRequests,
  approveHoldRequest,
  rejectHoldRequest,
  // Documents
  addEmployeeDocument,
  deleteEmployeeDocument
} from '../controllers/employeeController.js';
import { employeeBulkSample, employeeBulkUpload } from '../controllers/importController.js';

const router = express.Router();

// Geocoding (Public utility endpoint - no authentication required)
router.get('/geocode', geocodeLocation);

// All routes require authentication
router.use(protect);

// ============= EMPLOYEE SELF-SERVICE ROUTES (No module restriction) =============
// These routes are accessible to ALL authenticated users

// My Profile
router.get('/my-profile', getMyProfile);

// My Attendance
router.post('/my-attendance', markMyAttendance);
router.get('/my-attendance', getMyAttendance);

// My Salary
router.get('/my-salary', getMySalary);
router.get('/my-hold', getMyHold);
router.post('/my-hold/request', requestMyHoldWithdrawal);

// My Projects
router.get('/my-projects', getMyProjects);

// My Leads
router.get('/my-leads', getMyLeads);
router.post('/my-leads', createMyLead);
router.put('/my-leads/:id', updateMyLead);

// My Work Updates
router.post('/my-work-update', submitMyWorkUpdate);

// My Leave Requests
router.post('/my-leave', applyMyLeave);
router.get('/my-leaves', getMyLeaves);

// My Calendar Reminders
router.get('/my-reminders', getMyReminders);
router.post('/my-reminder', createReminder);
router.put('/my-reminder/:id', updateReminder);
router.delete('/my-reminders/reset', resetMyReminders);

// Get employees list for dropdowns (accessible to all authenticated users)
router.get('/list', getEmployeesList);

// Get employees by role (needed for project assignment)
router.get('/by-role/:role', getEmployeesByRole);

// My Payslip (Employee Self-Service)
router.get('/my-payslip/:month', generateMyPayslip);

// File upload for work updates (Employee Self-Service) - use memory for S3
router.post('/upload-work-files', uploadMemory.array('files', 10), uploadWorkUpdateFiles);

// ============= ADMIN EMPLOYEE MANAGEMENT ROUTES =============
// These routes require 'employee', 'all', or 'live-tracking' module access
// (live-tracking users need to see employees for tracking purposes)
router.use((req, res, next) => {
  // Use moduleAccess for employee/all modules
  const employeeModuleCheck = moduleAccess('employee', 'all');
  
  // Check if user has employee or all module first
  if (req.user.module === 'all' || (req.user.module && req.user.module.split(',').some(m => m.trim() === 'employee' || m.trim().startsWith('employee:')))) {
    return employeeModuleCheck(req, res, next);
  }
  
  // Also allow users with live-tracking module access (for Live Tracking page)
  const userModule = req.user.module || '';
  const userModules = userModule.split(',').map(m => m.trim()).filter(m => m);
  const hasLiveTrackingAccess = userModules.some(module => {
    return module === 'live-tracking' || 
           module === 'admin:live-tracking' ||
           module.startsWith('live-tracking:') ||
           module.startsWith('admin:live-tracking:');
  });
  
  if (hasLiveTrackingAccess) {
    return next();
  }
  
  // Fall back to standard moduleAccess check
  return employeeModuleCheck(req, res, next);
});

// Hold Requests (Admin) - must be before any '/:id' routes
router.get('/hold-requests', checkPermission('canHandleAccounts'), listHoldRequests);
router.put('/hold-requests/:requestId/approve', checkPermission('canHandleAccounts'), approveHoldRequest);
router.put('/hold-requests/:requestId/reject', checkPermission('canHandleAccounts'), rejectHoldRequest);

// Bulk Import (Admin) - before any '/:id' routes
router.get('/bulk/sample', checkPermission('canCreate'), employeeBulkSample);
router.post('/bulk/upload', checkPermission('canCreate'), uploadMemory.single('file'), employeeBulkUpload);

// Employees
router.get('/', getEmployees);
router.post('/', checkPermission('canCreate'), createEmployee);
router.get('/:id', getEmployee);
router.get('/:id/projects', getEmployeeProjects);
router.get('/:id/team', getSupervisorTeam);
router.put('/:id', checkPermission('canEdit'), updateEmployee);
router.put('/:id/role', checkPermission('canEdit'), updateEmployeeRole);
router.post('/:id/assign-project', checkPermission('canEdit'), assignProjectToEmployee);
router.delete('/:id', checkPermission('canDelete'), deleteEmployee);

// Admin reset all reminders
router.delete('/reminders/reset', checkPermission('canDelete'), resetAllReminders);

// Attendance (Admin)
router.post('/attendance/auto-generate', checkPermission('canCreate'), autoGenerateAllAttendance);
router.post('/attendance/deduplicate', checkPermission('canCreate'), deduplicateAttendanceRecords);
router.post('/:id/attendance/generate-missing', checkPermission('canCreate'), generateMissingAttendance);
router.post('/:id/attendance/deduplicate', checkPermission('canCreate'), deduplicateAttendanceRecords);
router.post('/:id/attendance', markAttendance);
router.get('/:id/attendance', getAttendanceHistory);
router.put('/:id/attendance/:attendanceId', checkPermission('canEdit'), updateAttendanceEntry);

// Leave Management (Admin)
router.post('/:id/leave', applyLeave);
router.put('/leave/:leaveId', checkPermission('canEdit'), updateLeaveStatus);

// Comp Off Management (Admin)
router.post('/:id/compoff/grant', checkPermission('canEdit'), grantCompOff);

// Salary (Admin)
router.post('/:id/salary', checkPermission('canHandleAccounts'), processSalary);
router.get('/:id/salary-history', getSalaryHistory);
router.get('/:id/salary-preview', getSalaryPreview);
router.get('/:id/salary/:salaryId/payslip', generatePayslip);

// Work Updates (Admin)
router.post('/:id/work-update', addWorkUpdate);
router.get('/:id/work-updates', getWorkUpdates);

// Documents (Admin)
router.post('/:id/documents', checkPermission('canCreate'), addEmployeeDocument);
router.delete('/:id/documents/:documentId', checkPermission('canDelete'), deleteEmployeeDocument);

export default router;