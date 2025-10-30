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
  applyLeave,
  updateLeaveStatus,
  processSalary,
  getSalaryHistory,
  getSalaryPreview,
  addWorkUpdate,
  getWorkUpdates,
  uploadWorkUpdateFiles,
  updateEmployeeRole,
  assignProjectToEmployee,
  getEmployeeProjects,
  getEmployeesByRole,
  getSupervisorTeam,
  getMyProfile,
  geocodeLocation,
  generatePayslip,
  generateMyPayslip,
  // Employee Self-Service
  markMyAttendance,
  getMyAttendance,
  getMySalary,
  getMyHold,
  requestMyHoldWithdrawal,
  getMyProjects,
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
  rejectHoldRequest
} from '../controllers/employeeController.js';

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

// Get employees by role (needed for project assignment)
router.get('/by-role/:role', getEmployeesByRole);

// My Payslip (Employee Self-Service)
router.get('/my-payslip/:month', generateMyPayslip);

// File upload for work updates (Employee Self-Service) - use memory for S3
router.post('/upload-work-files', uploadMemory.array('files', 10), uploadWorkUpdateFiles);

// ============= ADMIN EMPLOYEE MANAGEMENT ROUTES =============
// These routes require 'employee' or 'all' module access
router.use(moduleAccess('employee', 'all'));

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
router.post('/:id/attendance', markAttendance);
router.get('/:id/attendance', getAttendanceHistory);
router.put('/:id/attendance/:attendanceId', checkPermission('canEdit'), updateAttendanceEntry);

// Leave Management (Admin)
router.post('/:id/leave', applyLeave);
router.put('/leave/:leaveId', checkPermission('canEdit'), updateLeaveStatus);

// Salary (Admin)
router.post('/:id/salary', checkPermission('canHandleAccounts'), processSalary);
router.get('/:id/salary-history', getSalaryHistory);
router.get('/:id/salary-preview', getSalaryPreview);
router.get('/:id/payslip/:month', generatePayslip);

// Hold Requests (Admin)
router.get('/hold-requests', checkPermission('canHandleAccounts'), listHoldRequests);
router.put('/hold-requests/:requestId/approve', checkPermission('canHandleAccounts'), approveHoldRequest);
router.put('/hold-requests/:requestId/reject', checkPermission('canHandleAccounts'), rejectHoldRequest);

// Work Updates (Admin)
router.post('/:id/work-update', addWorkUpdate);
router.get('/:id/work-updates', getWorkUpdates);

export default router;