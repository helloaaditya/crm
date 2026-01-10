import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Employee from '../models/Employee.js';
import { generateAttendanceForDateRange } from '../utils/attendanceService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const generateAttendance = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected\n');

    const employeeIdCode = 'EMP00042';
    
    // Find employee first
    let employee = await Employee.findOne({ employeeId: employeeIdCode });
    
    if (!employee) {
      console.error(`❌ Employee with employeeId ${employeeIdCode} not found`);
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`✓ Employee found: ${employee.name} (${employee.employeeId})\n`);

    // Check if attendance field is corrupted (object instead of array)
    const rawEmployee = await mongoose.connection.db.collection('employees').findOne({ _id: employee._id });
    
    if (rawEmployee && rawEmployee.attendance && typeof rawEmployee.attendance === 'object' && !Array.isArray(rawEmployee.attendance)) {
      console.log('⚠️  Data corruption detected: attendance field is an object instead of an array');
      console.log('🔧 Fixing data corruption...');
      
      // Fix the corruption by converting to array or setting to empty array
      await mongoose.connection.db.collection('employees').updateOne(
        { _id: employee._id },
        { $set: { attendance: [] } }
      );
      
      console.log('✅ Data corruption fixed: attendance field reset to empty array');
      
      // Reload employee after fix
      employee = await Employee.findById(employee._id);
    }

    // Generate attendance for EMP00042 from January 1-9, 2026
    // Using UTC dates to avoid timezone issues
    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-01-09T23:59:59.999Z');

    console.log(`📅 Generating attendance for ${employeeIdCode}`);
    console.log(`   Start Date: ${startDate.toISOString().split('T')[0]}`);
    console.log(`   End Date: ${endDate.toISOString().split('T')[0]}\n`);

    const result = await generateAttendanceForDateRange(employeeIdCode, startDate, endDate);

    console.log('\n✅ Attendance generation complete!');
    console.log(`   Created: ${result.created} records`);
    console.log(`   Skipped: ${result.skipped} existing records`);
    console.log(`   Message: ${result.message}`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

generateAttendance();
