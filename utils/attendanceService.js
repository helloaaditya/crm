import Employee from '../models/Employee.js';

/**
 * Auto-generate attendance records for all active employees
 * Marks as 'absent' if no check-in was made for a given date
 * **OPTIMIZED: Only processes last 30 days to avoid server overload**
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
    
    // **FIX: Only process last 30 days to avoid server overload**
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    
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
        
        // **FIX: Only process last 30 days, not from joining date**
        const processingStartDate = start > thirtyDaysAgo ? start : thirtyDaysAgo;
        
        // Process each date from start date to yesterday (not today)
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const currentDate = new Date(processingStartDate);
        let createdForEmployee = 0;
        let checkedDays = 0;
        
        while (currentDate <= yesterday) {
          checkedDays++;
          
          // Safety check - prevent infinite loop
          if (checkedDays > 31) {
            console.error(`⚠️ Safety limit reached for employee ${employee._id}`);
            break;
          }
          
          // Check if attendance already exists for this date
          const existingAttendance = employee.attendance.find(a => {
            const attDate = new Date(a.date);
            attDate.setHours(0, 0, 0, 0);
            return attDate.getTime() === currentDate.getTime();
          });
          
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
    
    console.log(`✅ Auto-attendance complete: ${totalCreated} records created for ${totalProcessed} employees (last 30 days)`);
    
    return {
      success: true,
      processed: totalProcessed,
      created: totalCreated,
      message: `Generated ${totalCreated} attendance records for ${totalProcessed} employees (last 30 days only)`
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
 */
export const generateMissingAttendanceForEmployee = async (employeeId) => {
  try {
    const employee = await Employee.findById(employeeId);
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    if (!employee.isActive) {
      throw new Error('Employee is not active');
    }
    
    const startDate = employee.joiningDate || employee.createdAt;
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Process up to yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const currentDate = new Date(start);
    let created = 0;
    
    while (currentDate <= yesterday) {
      // Check if attendance exists
      const existingAttendance = employee.attendance.find(a => {
        const attDate = new Date(a.date);
        attDate.setHours(0, 0, 0, 0);
        return attDate.getTime() === currentDate.getTime();
      });
      
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
    
    if (created > 0) {
      await employee.save();
    }
    
    return {
      success: true,
      created,
      message: `Generated ${created} missing attendance records`
    };
    
  } catch (error) {
    console.error('Error generating missing attendance:', error);
    throw error;
  }
};

/**
 * Validate and update attendance record when check-in occurs
 * Converts 'absent' status to 'present' or 'half_day' based on work hours
 */
export const validateAndUpdateAttendance = (employee, date, checkInTime, checkOutTime, location) => {
  const dateStr = new Date(date).toISOString().split('T')[0];
  
  // Find existing attendance for the date
  const attendanceIndex = employee.attendance.findIndex(a => {
    const attDate = new Date(a.date);
    attDate.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    return attDate.getTime() === targetDate.getTime();
  });
  
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

