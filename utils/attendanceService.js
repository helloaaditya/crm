import Employee from '../models/Employee.js';

/**
 * Helper function to normalize date to YYYY-MM-DD format for comparison
 * This ensures consistent date comparison regardless of time components or timezones
 */
const normalizeDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Helper function to check if attendance exists for a date
 * Uses normalized date strings for reliable comparison
 */
const hasAttendanceForDate = (attendanceArray, targetDate) => {
  const targetDateStr = normalizeDate(targetDate);
  return attendanceArray.some(a => {
    const attDateStr = normalizeDate(a.date);
    return attDateStr === targetDateStr;
  });
};

/**
 * Helper function to find attendance index for a date
 * Uses normalized date strings for reliable comparison
 */
const findAttendanceIndex = (attendanceArray, targetDate) => {
  const targetDateStr = normalizeDate(targetDate);
  return attendanceArray.findIndex(a => {
    const attDateStr = normalizeDate(a.date);
    return attDateStr === targetDateStr;
  });
};

/**
 * Deduplicate attendance records - keep the most complete record for each date
 */
export const deduplicateAttendance = async (employeeId = null) => {
  try {
    console.log('🔍 Starting attendance deduplication...');
    
    let employees;
    if (employeeId) {
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }
      employees = [employee];
    } else {
      employees = await Employee.find({ isActive: true }).select('_id name attendance');
    }
    
    let totalDeduplicated = 0;
    let totalProcessed = 0;
    
    for (const employee of employees) {
      if (!employee.attendance || employee.attendance.length === 0) {
        continue;
      }
      
      // Group attendance by normalized date
      const attendanceByDate = {};
      const duplicates = [];
      
      employee.attendance.forEach((att, index) => {
        const dateStr = normalizeDate(att.date);
        
        if (!attendanceByDate[dateStr]) {
          attendanceByDate[dateStr] = [];
        }
        
        attendanceByDate[dateStr].push({ att, index });
      });
      
      // Find dates with duplicates
      Object.keys(attendanceByDate).forEach(dateStr => {
        if (attendanceByDate[dateStr].length > 1) {
          duplicates.push({ dateStr, records: attendanceByDate[dateStr] });
        }
      });
      
      if (duplicates.length === 0) {
        continue;
      }
      
      // For each duplicate date, keep the best record
      const indicesToRemove = [];
      
      duplicates.forEach(({ dateStr, records }) => {
        // Sort records by completeness (prefer records with check-in/check-out times)
        records.sort((a, b) => {
          const aHasCheckIn = a.att.checkInTime ? 1 : 0;
          const bHasCheckIn = b.att.checkInTime ? 1 : 0;
          const aHasCheckOut = a.att.checkOutTime ? 1 : 0;
          const bHasCheckOut = b.att.checkOutTime ? 1 : 0;
          const aCompleteness = aHasCheckIn + aHasCheckOut;
          const bCompleteness = bHasCheckIn + bHasCheckOut;
          
          if (aCompleteness !== bCompleteness) {
            return bCompleteness - aCompleteness; // More complete first
          }
          
          // If same completeness, prefer non-auto-generated
          const aIsAuto = a.att.notes?.includes('Auto-generated') ? 1 : 0;
          const bIsAuto = b.att.notes?.includes('Auto-generated') ? 1 : 0;
          return aIsAuto - bIsAuto; // Non-auto-generated first
        });
        
        // Keep the first (best) record, mark others for removal
        const bestRecord = records[0];
        for (let i = 1; i < records.length; i++) {
          indicesToRemove.push(records[i].index);
          totalDeduplicated++;
        }
      });
      
      // Remove duplicates (sort indices descending to avoid index shifting issues)
      if (indicesToRemove.length > 0) {
        indicesToRemove.sort((a, b) => b - a); // Sort descending
        indicesToRemove.forEach(index => {
          employee.attendance.splice(index, 1);
        });
        
        await employee.save();
        console.log(`✅ Removed ${indicesToRemove.length} duplicate records for employee ${employee.name || employee._id}`);
      }
      
      totalProcessed++;
    }
    
    console.log(`✅ Deduplication complete: Removed ${totalDeduplicated} duplicate records from ${totalProcessed} employees`);
    
    return {
      success: true,
      processed: totalProcessed,
      removed: totalDeduplicated,
      message: `Removed ${totalDeduplicated} duplicate attendance records from ${totalProcessed} employees`
    };
    
  } catch (error) {
    console.error('❌ Deduplication failed:', error);
    throw error;
  }
};

/**
 * Auto-generate attendance records for all active employees
 * Marks as 'absent' if no check-in was made for a given date
 * Processes from joining date to yesterday (with reasonable limit to prevent overload)
 */
export const autoGenerateAttendanceRecords = async () => {
  try {
    console.log('🕐 Starting auto-attendance generation...');
    
    // Get all active employees
    const employees = await Employee.find({ isActive: true }).select('_id joiningDate createdAt attendance');
    
    if (!employees || employees.length === 0) {
      console.log('ℹ️  No active employees found');
      return { success: true, processed: 0, created: 0 };
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Limit to last 365 days (1 year) to prevent server overload for very old employees
    const oneYearAgo = new Date(today);
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    oneYearAgo.setHours(0, 0, 0, 0);
    
    let totalCreated = 0;
    let totalProcessed = 0;
    
    for (const employee of employees) {
      try {
        console.log(`📝 Processing employee ${totalProcessed + 1}/${employees.length}`);
        
        // Determine start date (joining date or account creation date)
        const startDate = employee.joiningDate || employee.createdAt;
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        
        // Don't process future dates
        if (start > today) {
          console.log(`⏭️ Skipping employee (future joining date)`);
          continue;
        }
        
        // Use the later of joining date or 1 year ago (to prevent processing too far back)
        const processingStartDate = start > oneYearAgo ? start : oneYearAgo;
        
        // Process each date from start date to yesterday (not today)
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const currentDate = new Date(processingStartDate);
        let createdForEmployee = 0;
        let checkedDays = 0;
        const maxDays = 366; // Safety limit for 1 year
        
        while (currentDate <= yesterday) {
          checkedDays++;
          
          // Safety check - prevent infinite loop
          if (checkedDays > maxDays) {
            console.log(`⚠️ Safety limit reached for employee ${employee._id} (${maxDays} days)`);
            break;
          }
          
          // Check if attendance already exists for this date (using normalized date comparison)
          const existingAttendance = hasAttendanceForDate(employee.attendance, currentDate);
          
          // If no attendance record exists, create one marked as 'absent'
          if (!existingAttendance) {
            employee.attendance.push({
              date: new Date(currentDate),
              status: 'absent',
              checkInTime: null,
              checkOutTime: null,
              workHours: 0,
              notes: 'Auto-generated - No check-in recorded',
              markedBy: null
            });
            createdForEmployee++;
            totalCreated++;
          }
          
          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Save employee if any new records were created
        if (createdForEmployee > 0) {
          console.log(`💾 Saving ${createdForEmployee} records for employee...`);
          await employee.save();
          console.log(`✅ Saved ${createdForEmployee} attendance records`);
        } else {
          console.log(`✓ No missing attendance for this employee`);
        }
        
        totalProcessed++;
        
      } catch (empError) {
        console.error(`❌ Error processing employee ${employee._id}:`, empError.message);
        // Continue with next employee instead of failing completely
      }
    }
    
    console.log(`✅ Auto-attendance complete: ${totalCreated} records created for ${totalProcessed} employees`);
    
    return {
      success: true,
      processed: totalProcessed,
      created: totalCreated,
      message: `Generated ${totalCreated} missing attendance records for ${totalProcessed} employees`
    };
    
  } catch (error) {
    console.error('❌ Auto-attendance generation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate missing attendance for a specific employee
 * Processes from joining date to yesterday (with reasonable limit to prevent overload)
 */
export const generateMissingAttendanceForEmployee = async (employeeId) => {
  try {
    console.log(`📝 Fetching employee ${employeeId}...`);
    const employee = await Employee.findById(employeeId);
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    if (!employee.isActive) {
      throw new Error('Employee is not active');
    }
    
    console.log(`✓ Employee found: ${employee.name || employeeId}`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Limit to last 365 days (1 year) to prevent server overload for very old employees
    const oneYearAgo = new Date(today);
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    oneYearAgo.setHours(0, 0, 0, 0);
    
    const startDate = employee.joiningDate || employee.createdAt;
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    // Use the later of joining date or 1 year ago
    const processingStartDate = start > oneYearAgo ? start : oneYearAgo;
    
    console.log(`📅 Processing from ${processingStartDate.toISOString().split('T')[0]} to yesterday`);
    
    // Process up to yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const currentDate = new Date(processingStartDate);
    let created = 0;
    let checkedDays = 0;
    const maxDays = 366; // Safety limit for 1 year
    
    while (currentDate <= yesterday) {
      checkedDays++;
      
      // Safety check - prevent infinite loop
      if (checkedDays > maxDays) {
        console.log(`⚠️ Safety limit reached - stopping at ${maxDays} days`);
        break;
      }
      
      // Check if attendance exists (using normalized date comparison)
      const existingAttendance = hasAttendanceForDate(employee.attendance, currentDate);
      
      // Create if missing
      if (!existingAttendance) {
        employee.attendance.push({
          date: new Date(currentDate),
          status: 'absent',
          checkInTime: null,
          checkOutTime: null,
          workHours: 0,
          notes: 'Auto-generated - No check-in recorded',
          markedBy: null
        });
        created++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`📊 Checked ${checkedDays} days, creating ${created} missing records`);
    
    if (created > 0) {
      console.log(`💾 Saving employee with ${created} new attendance records...`);
      await employee.save();
      console.log(`✅ Saved successfully`);
    } else {
      console.log(`✓ No missing attendance records`);
    }
    
    return {
      success: true,
      created,
      message: `Generated ${created} missing attendance records`
    };
    
  } catch (error) {
    console.error('❌ Error generating missing attendance:', error);
    throw error;
  }
};

/**
 * Validate and update attendance record when check-in occurs
 * Converts 'absent' status to 'present' or 'half_day' based on work hours
 */
export const validateAndUpdateAttendance = (employee, date, checkInTime, checkOutTime, location) => {
  // Find existing attendance for the date (using normalized date comparison)
  const attendanceIndex = findAttendanceIndex(employee.attendance, date);
  
  let workHours = 0;
  let status = 'present';
  
  // Calculate work hours if both times provided
  if (checkInTime && checkOutTime) {
    const checkIn = new Date(checkInTime);
    const checkOut = new Date(checkOutTime);
    workHours = (checkOut - checkIn) / (1000 * 60 * 60);
    
    // Determine status based on work hours
    if (workHours >= 8.25) {
      status = 'present';
    } else if (workHours >= 4) {
      status = 'half_day';
    } else {
      status = 'absent';
    }
  } else if (checkInTime) {
    // Only check-in, consider as present (pending checkout)
    status = 'present';
  }
  
  if (attendanceIndex !== -1) {
    // Update existing record
    employee.attendance[attendanceIndex].status = status;
    employee.attendance[attendanceIndex].checkInTime = checkInTime;
    employee.attendance[attendanceIndex].checkOutTime = checkOutTime;
    employee.attendance[attendanceIndex].workHours = workHours;
    
    if (location) {
      employee.attendance[attendanceIndex].checkInLocation = location;
    }
    
    // Remove auto-generated note
    if (employee.attendance[attendanceIndex].notes?.includes('Auto-generated')) {
      employee.attendance[attendanceIndex].notes = '';
    }
  } else {
    // Create new record if doesn't exist
    employee.attendance.push({
      date: new Date(date),
      status,
      checkInTime,
      checkOutTime,
      checkInLocation: location,
      workHours,
      notes: ''
    });
  }
  
  return employee;
};

