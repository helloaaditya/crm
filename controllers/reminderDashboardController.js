import Reminder from '../models/Reminder.js';
import Customer from '../models/Customer.js';
import Project from '../models/Project.js';
import Invoice from '../models/Invoice.js';
import Material from '../models/Material.js';
import Employee from '../models/Employee.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get all reminders
// @route   GET /api/reminders
// @access  Private
export const getReminders = asyncHandler(async (req, res) => {
  const { status, reminderType, page = 1, limit = 10 } = req.query;

  let query = {};

  if (status) query.status = status;
  if (reminderType) query.reminderType = reminderType;

  const reminders = await Reminder.find(query)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name')
    .sort({ reminderDate: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await Reminder.countDocuments(query);

  res.json({
    success: true,
    data: reminders,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    total: count
  });
});

// @desc    Get upcoming reminders
// @route   GET /api/reminders/upcoming
// @access  Private
export const getUpcomingReminders = asyncHandler(async (req, res) => {
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const reminders = await Reminder.find({
    reminderDate: { $gte: today, $lte: nextWeek },
    status: { $in: ['pending', 'overdue'] }
  })
    .populate('assignedTo', 'name email')
    .sort({ reminderDate: 1 });

  res.json({
    success: true,
    data: reminders
  });
});

// @desc    Create reminder
// @route   POST /api/reminders
// @access  Private
export const createReminder = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    reminderType,
    reminderDate,
    isRecurring,
    recurrencePattern,
    relatedTo,
    amount,
    priority,
    notifyBefore,
    assignedTo
  } = req.body;

  const reminder = await Reminder.create({
    title,
    description,
    reminderType,
    reminderDate,
    isRecurring,
    recurrencePattern,
    relatedTo,
    amount,
    priority,
    notifyBefore,
    assignedTo,
    createdBy: req.user._id
  });

  res.status(201).json({
    success: true,
    data: reminder
  });
});

// @desc    Update reminder
// @route   PUT /api/reminders/:id
// @access  Private
export const updateReminder = asyncHandler(async (req, res) => {
  let reminder = await Reminder.findById(req.params.id);

  if (!reminder) {
    return res.status(404).json({ message: 'Reminder not found' });
  }

  reminder = await Reminder.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: reminder
  });
});

// @desc    Mark reminder as complete
// @route   PUT /api/reminders/:id/complete
// @access  Private
export const completeReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findById(req.params.id);

  if (!reminder) {
    return res.status(404).json({ message: 'Reminder not found' });
  }

  reminder.status = 'completed';
  reminder.completedBy = req.user._id;
  reminder.completedAt = new Date();

  await reminder.save();

  res.json({
    success: true,
    data: reminder,
    message: 'Reminder marked as complete'
  });
});

// @desc    Delete reminder
// @route   DELETE /api/reminders/:id
// @access  Private
export const deleteReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findById(req.params.id);

  if (!reminder) {
    return res.status(404).json({ message: 'Reminder not found' });
  }

  reminder.status = 'cancelled';
  await reminder.save();

  res.json({
    success: true,
    message: 'Reminder cancelled successfully'
  });
});

// =============== DASHBOARD ===============

// @desc    Get dashboard overview
// @route   GET /api/dashboard/overview
// @access  Private
export const getDashboardOverview = asyncHandler(async (req, res) => {
  const totalCustomers = await Customer.countDocuments({ isActive: true });
  const totalProjects = await Project.countDocuments({ status: { $ne: 'completed' } });
  const totalMaterials = await Material.countDocuments({ isActive: true });
  const totalEmployees = await Employee.countDocuments({ isActive: true });

  // Calculate total revenue (from invoices)
  const invoices = await Invoice.find({ status: { $ne: 'cancelled' } });
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const paidRevenue = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const pendingRevenue = totalRevenue - paidRevenue;

  // Pending invoices
  const pendingInvoices = await Invoice.countDocuments({ paymentStatus: { $in: ['unpaid', 'partial'] } });

  // Low stock materials
  const materials = await Material.find({ isActive: true });
  const lowStockCount = materials.filter(m => m.isLowStock()).length;

  res.json({
    success: true,
    data: {
      totalCustomers,
      totalProjects,
      totalMaterials,
      totalEmployees,
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      pendingInvoices,
      lowStockCount
    }
  });
});

// @desc    Get CRM statistics
// @route   GET /api/dashboard/crm-stats
// @access  Private
export const getCRMStats = asyncHandler(async (req, res) => {
  // Customer stats by lead status
  const customerStats = await Customer.aggregate([
    { $group: { _id: '$leadStatus', count: { $sum: 1 } } }
  ]);

  // Project stats by category
  const projectStats = await Project.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);

  // Project stats by status
  const projectStatusStats = await Project.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  res.json({
    success: true,
    data: {
      customers: customerStats,
      projectsByCategory: projectStats,
      projectsByStatus: projectStatusStats
    }
  });
});

// @desc    Get inventory statistics
// @route   GET /api/dashboard/inventory-stats
// @access  Private
export const getInventoryStats = asyncHandler(async (req, res) => {
  const materials = await Material.find({ isActive: true });

  const totalValue = materials.reduce((sum, m) => sum + (m.quantity * m.saleCost), 0);
  const lowStockCount = materials.filter(m => m.isLowStock()).length;

  // Materials by category
  const materialsByCategory = await Material.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 }, totalQuantity: { $sum: '$quantity' } } }
  ]);

  res.json({
    success: true,
    data: {
      totalMaterials: materials.length,
      totalValue,
      lowStockCount,
      byCategory: materialsByCategory
    }
  });
});

// @desc    Get employee statistics
// @route   GET /api/dashboard/employee-stats
// @access  Private
export const getEmployeeStats = asyncHandler(async (req, res) => {
  const totalEmployees = await Employee.countDocuments({ isActive: true });

  // Employees by designation
  const byDesignation = await Employee.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$designation', count: { $sum: 1 } } }
  ]);

  // Attendance today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const employees = await Employee.find({ isActive: true });
  let presentToday = 0;

  employees.forEach(emp => {
    const todayAttendance = emp.attendance.find(
      a => new Date(a.date).toDateString() === today.toDateString()
    );
    if (todayAttendance && todayAttendance.status === 'present') {
      presentToday++;
    }
  });

  res.json({
    success: true,
    data: {
      totalEmployees,
      presentToday,
      absentToday: totalEmployees - presentToday,
      byDesignation
    }
  });
});

// @desc    Get revenue statistics
// @route   GET /api/dashboard/revenue-stats
// @access  Private
export const getRevenueStats = asyncHandler(async (req, res) => {
  const { months = 6 } = req.query;

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const invoices = await Invoice.find({
    invoiceDate: { $gte: startDate },
    status: { $ne: 'cancelled' }
  });

  // Revenue by month
  const revenueByMonth = {};
  invoices.forEach(inv => {
    const monthYear = `${inv.invoiceDate.getFullYear()}-${String(inv.invoiceDate.getMonth() + 1).padStart(2, '0')}`;
    if (!revenueByMonth[monthYear]) {
      revenueByMonth[monthYear] = {
        total: 0,
        paid: 0,
        pending: 0
      };
    }
    revenueByMonth[monthYear].total += inv.totalAmount;
    revenueByMonth[monthYear].paid += inv.paidAmount;
    revenueByMonth[monthYear].pending += inv.balanceAmount;
  });

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const paidRevenue = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);

  res.json({
    success: true,
    data: {
      totalRevenue,
      paidRevenue,
      pendingRevenue: totalRevenue - paidRevenue,
      revenueByMonth
    }
  });
});

// @desc    Get recent activities
// @route   GET /api/dashboard/recent-activities
// @access  Private
export const getRecentActivities = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  // Get recent customers
  const recentCustomers = await Customer.find()
    .sort({ createdAt: -1 })
    .limit(3)
    .select('name createdAt');

  // Get recent projects
  const recentProjects = await Project.find()
    .sort({ createdAt: -1 })
    .limit(3)
    .select('projectId description status createdAt');

  // Get recent payments
  const recentPayments = await Invoice.find({ paidAmount: { $gt: 0 } })
    .sort({ updatedAt: -1 })
    .limit(3)
    .select('invoiceNumber paidAmount updatedAt');

  const activities = [
    ...recentCustomers.map(c => ({
      type: 'customer',
      title: 'New customer added',
      description: c.name,
      timestamp: c.createdAt
    })),
    ...recentProjects.map(p => ({
      type: 'project',
      title: 'Project update',
      description: `${p.projectId} - ${p.status}`,
      timestamp: p.createdAt
    })),
    ...recentPayments.map(p => ({
      type: 'payment',
      title: 'Payment received',
      description: `${p.invoiceNumber} - ₹${p.paidAmount}`,
      timestamp: p.updatedAt
    }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);

  res.json({
    success: true,
    data: activities
  });
});

// @desc    Get notification counts
// @route   GET /api/dashboard/notifications
// @access  Private
export const getNotificationCounts = asyncHandler(async (req, res) => {
  try {
    // Get pending reminders count
    const pendingReminders = await Reminder.countDocuments({
      status: { $in: ['pending', 'overdue'] },
      $or: [
        { assignedTo: req.user._id },
        { createdBy: req.user._id }
      ]
    });

    // Get pending invoices count (exclude cancelled)
    const pendingInvoices = await Invoice.countDocuments({
      paymentStatus: { $in: ['unpaid', 'partial'] },
      status: { $ne: 'cancelled' }
    });

    // Get low stock materials count
    const materials = await Material.find({ isActive: true });
    const lowStockCount = materials.filter(m => m.isLowStock()).length;

    // Get pending leave requests count
    const pendingLeaves = await Employee.aggregate([
      { $unwind: '$leaves' },
      { $match: { 'leaves.status': 'pending' } },
      { $count: 'count' }
    ]);
    const pendingLeaveCount = pendingLeaves.length > 0 ? pendingLeaves[0].count : 0;

    // Get employees with pending attendance (no attendance marked today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const employees = await Employee.find({ isActive: true });
    let pendingAttendanceCount = 0;

    employees.forEach(emp => {
      const todayAttendance = emp.attendance.find(
        a => new Date(a.date).toDateString() === today.toDateString()
      );
      if (!todayAttendance) {
        pendingAttendanceCount++;
      }
    });

    res.json({
      success: true,
      data: {
        reminders: pendingReminders,
        invoices: pendingInvoices,
        lowStock: lowStockCount,
        leaves: pendingLeaveCount,
        attendance: pendingAttendanceCount
      }
    });
  } catch (error) {
    console.error('Notification counts error:', error);
    res.status(500).json({ message: 'Failed to fetch notification counts' });
  }
});
