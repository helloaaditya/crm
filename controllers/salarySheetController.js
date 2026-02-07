import SalarySheet from '../models/SalarySheet.js';
import Employee from '../models/Employee.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Helper: get total working days in a month (exclude Sundays)
const getWorkingDaysInMonth = (month, year) => {
  const daysInMonth = new Date(year, month, 0).getDate(); // month is 1-based
  let workingDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay(); // 0=Sunday
    if (day !== 0) workingDays++;
  }
  return workingDays;
};

// Helper: calculate salary fields
const calculateSalaryFields = (data) => {
  const totalDays = data.totalDays || 1; // prevent divide by zero
  const perDaySalary = Math.round((data.fixedSalary / totalDays) * 100) / 100;
  const salaryPayable = Math.round(perDaySalary * (data.presentDays + data.extraDaysWorking) * 100) / 100;
  const fivePercentDeduction = Math.round((salaryPayable * 5 / 100) * 100) / 100;
  const afterDeduction = Math.round((salaryPayable - fivePercentDeduction - data.advance - data.timingsDeduction) * 100) / 100;

  return {
    perDaySalary,
    fivePercentDeduction,
    salaryPayable,
    afterDeduction: Math.max(0, afterDeduction)
  };
};

// @desc    Get salary sheet for a month/year (all employees)
// @route   GET /api/salary-sheet?month=1&year=2026
// @access  Private (Admin)
export const getSalarySheet = asyncHandler(async (req, res) => {
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ message: 'Month and year are required' });
  }

  const m = parseInt(month);
  const y = parseInt(year);

  // Get all active employees
  const employees = await Employee.find({ isActive: true })
    .select('name employeeId basicSalary role designation attendance leaves')
    .sort({ name: 1 });

  // Get existing salary sheet records for this month
  const existingSheets = await SalarySheet.find({ month: m, year: y })
    .populate('employee', 'name employeeId');

  const existingMap = {};
  existingSheets.forEach(s => {
    existingMap[s.employee._id.toString()] = s;
  });

  const totalWorkingDays = getWorkingDaysInMonth(m, y);

  // Build salary data for each employee
  const salaryData = employees.map(emp => {
    // Check if a record already exists
    const existing = existingMap[emp._id.toString()];
    if (existing) {
      return {
        _id: existing._id,
        employeeId: emp._id,
        employeeCode: emp.employeeId,
        employeeName: emp.name,
        role: emp.role,
        designation: emp.designation,
        totalDays: existing.totalDays,
        totalAbsent: existing.totalAbsent,
        presentDays: existing.presentDays,
        extraDaysWorking: existing.extraDaysWorking,
        extraDaysDetails: existing.extraDaysDetails || [],
        advance: existing.advance,
        timingsDeduction: existing.timingsDeduction,
        fixedSalary: existing.fixedSalary,
        perDaySalary: existing.perDaySalary,
        fivePercentDeduction: existing.fivePercentDeduction,
        salaryPayable: existing.salaryPayable,
        afterDeduction: existing.afterDeduction,
        status: existing.status,
        paidDate: existing.paidDate,
        isExisting: true
      };
    }

    // Auto-calculate from attendance data
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);

    const attendanceThisMonth = (emp.attendance || []).filter(a => {
      const d = new Date(a.date);
      return d >= monthStart && d <= monthEnd;
    });

    const presentCount = attendanceThisMonth.filter(a =>
      a.status === 'present'
    ).length;

    const halfDayCount = attendanceThisMonth.filter(a =>
      a.status === 'half_day'
    ).length;

    const absentCount = attendanceThisMonth.filter(a =>
      a.status === 'absent'
    ).length;

    const leaveCount = attendanceThisMonth.filter(a =>
      a.status === 'leave'
    ).length;

    const holidayCount = attendanceThisMonth.filter(a =>
      a.status === 'holiday'
    ).length;

    const weekoffWorked = attendanceThisMonth.filter(a =>
      a.status === 'weekoff' && a.checkInTime && a.checkOutTime
    ).length;

    // Sick leave from leaves array
    let sickLeaveDays = 0;
    (emp.leaves || []).forEach(l => {
      if (l.leaveType === 'sick' && l.status === 'approved') {
        const s = new Date(l.startDate);
        const e = new Date(l.endDate);
        const from = s < monthStart ? monthStart : s;
        const to = e > monthEnd ? monthEnd : e;
        if (from <= to) {
          sickLeaveDays += Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
        }
      }
    });

    const effectivePresent = presentCount + (halfDayCount * 0.5);
    const fixedSalary = emp.basicSalary || 0;

    const baseData = {
      totalDays: totalWorkingDays,
      totalAbsent: absentCount + leaveCount,
      presentDays: effectivePresent,
      extraDaysWorking: weekoffWorked,
      extraDaysDetails: [],
      advance: 0,
      timingsDeduction: 0,
      fixedSalary
    };

    const calculated = calculateSalaryFields(baseData);

    return {
      _id: null,
      employeeId: emp._id,
      employeeCode: emp.employeeId,
      employeeName: emp.name,
      role: emp.role,
      designation: emp.designation,
      ...baseData,
      ...calculated,
      status: 'unpaid',
      paidDate: null,
      isExisting: false
    };
  });

  res.json({
    success: true,
    data: salaryData,
    meta: {
      month: m,
      year: y,
      totalWorkingDays,
      totalEmployees: employees.length
    }
  });
});

// @desc    Save/Update salary sheet for a single employee
// @route   PUT /api/salary-sheet/:employeeId
// @access  Private (Admin)
export const updateSalarySheetEntry = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const {
    month, year,
    totalDays, totalAbsent, presentDays, extraDaysWorking,
    extraDaysDetails,
    advance, timingsDeduction,
    fixedSalary, status
  } = req.body;

  if (!month || !year) {
    return res.status(400).json({ message: 'Month and year are required' });
  }

  const employee = await Employee.findById(employeeId);
  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  const baseData = {
    totalDays: totalDays || 0,
    presentDays: presentDays || 0,
    extraDaysWorking: extraDaysWorking || 0,
    fixedSalary: fixedSalary || 0,
    advance: advance || 0,
    timingsDeduction: timingsDeduction || 0
  };

  const calculated = calculateSalaryFields(baseData);

  const updateData = {
    employee: employeeId,
    month: parseInt(month),
    year: parseInt(year),
    totalDays: totalDays || 0,
    totalAbsent: totalAbsent || 0,
    presentDays: presentDays || 0,
    extraDaysWorking: extraDaysWorking || 0,
    extraDaysDetails: extraDaysDetails || [],
    advance: advance || 0,
    timingsDeduction: timingsDeduction || 0,
    fixedSalary: fixedSalary || 0,
    ...calculated,
    status: status || 'unpaid',
    updatedBy: req.user._id
  };

  const sheet = await SalarySheet.findOneAndUpdate(
    { employee: employeeId, month: parseInt(month), year: parseInt(year) },
    updateData,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // If no createdBy, set it
  if (!sheet.createdBy) {
    sheet.createdBy = req.user._id;
    await sheet.save();
  }

  res.json({
    success: true,
    data: sheet,
    message: 'Salary sheet entry updated successfully'
  });
});

// @desc    Save salary sheet for all employees at once (bulk)
// @route   POST /api/salary-sheet/bulk
// @access  Private (Admin)
export const bulkSaveSalarySheet = asyncHandler(async (req, res) => {
  const { month, year, entries } = req.body;

  if (!month || !year || !entries || !Array.isArray(entries)) {
    return res.status(400).json({ message: 'Month, year, and entries array are required' });
  }

  const m = parseInt(month);
  const y = parseInt(year);
  let saved = 0;
  let errors = [];

  for (const entry of entries) {
    try {
      const baseData = {
        totalDays: entry.totalDays || 0,
        presentDays: entry.presentDays || 0,
        extraDaysWorking: entry.extraDaysWorking || 0,
        fixedSalary: entry.fixedSalary || 0,
        advance: entry.advance || 0,
        timingsDeduction: entry.timingsDeduction || 0
      };

      const calculated = calculateSalaryFields(baseData);

      await SalarySheet.findOneAndUpdate(
        { employee: entry.employeeId, month: m, year: y },
        {
          employee: entry.employeeId,
          month: m,
          year: y,
          totalDays: entry.totalDays || 0,
          totalAbsent: entry.totalAbsent || 0,
          presentDays: entry.presentDays || 0,
          extraDaysWorking: entry.extraDaysWorking || 0,
          extraDaysDetails: entry.extraDaysDetails || [],
          advance: entry.advance || 0,
          timingsDeduction: entry.timingsDeduction || 0,
          fixedSalary: entry.fixedSalary || 0,
          ...calculated,
          status: entry.status || 'unpaid',
          updatedBy: req.user._id,
          createdBy: req.user._id
        },
        { upsert: true, new: true }
      );
      saved++;
    } catch (err) {
      errors.push({ employeeId: entry.employeeId, error: err.message });
    }
  }

  res.json({
    success: true,
    message: `Saved ${saved} of ${entries.length} entries`,
    saved,
    errors: errors.length > 0 ? errors : undefined
  });
});

// @desc    Mark salary as paid for an employee
// @route   PUT /api/salary-sheet/:employeeId/mark-paid
// @access  Private (Admin)
export const markSalaryPaid = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { month, year } = req.body;

  const sheet = await SalarySheet.findOne({
    employee: employeeId,
    month: parseInt(month),
    year: parseInt(year)
  });

  if (!sheet) {
    return res.status(404).json({ message: 'Salary record not found. Please save the salary sheet first.' });
  }

  sheet.status = 'paid';
  sheet.paidDate = new Date();
  sheet.updatedBy = req.user._id;
  await sheet.save();

  res.json({
    success: true,
    data: sheet,
    message: 'Salary marked as paid'
  });
});

// @desc    Mark salary as unpaid for an employee
// @route   PUT /api/salary-sheet/:employeeId/mark-unpaid
// @access  Private (Admin)
export const markSalaryUnpaid = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { month, year } = req.body;

  const sheet = await SalarySheet.findOne({
    employee: employeeId,
    month: parseInt(month),
    year: parseInt(year)
  });

  if (!sheet) {
    return res.status(404).json({ message: 'Salary record not found' });
  }

  sheet.status = 'unpaid';
  sheet.paidDate = null;
  sheet.updatedBy = req.user._id;
  await sheet.save();

  res.json({
    success: true,
    data: sheet,
    message: 'Salary marked as unpaid'
  });
});

// @desc    Delete salary sheet entry
// @route   DELETE /api/salary-sheet/:employeeId?month=1&year=2026
// @access  Private (Admin)
export const deleteSalarySheetEntry = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { month, year } = req.query;

  const result = await SalarySheet.findOneAndDelete({
    employee: employeeId,
    month: parseInt(month),
    year: parseInt(year)
  });

  if (!result) {
    return res.status(404).json({ message: 'Salary record not found' });
  }

  res.json({
    success: true,
    message: 'Salary sheet entry deleted'
  });
});
