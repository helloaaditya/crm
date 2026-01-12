import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Employee from '../models/Employee.js';
import { generateAttendanceForDateRange } from '../utils/attendanceService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Get only missing dates between a range
 */
const getMissingDates = (existingAttendance, startDate, endDate) => {
  const existingDates = new Set(
    (existingAttendance || []).map(a =>
      new Date(a.date).toISOString().split('T')[0]
    )
  );

  const missingDates = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];

    if (!existingDates.has(dateStr)) {
      missingDates.push(new Date(current));
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return missingDates;
};

const generateAttendance = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected\n');

    const employeeIdCode = 'EMP00042';

    // Find employee
    let employee = await Employee.findOne({ employeeId: employeeIdCode });

    if (!employee) {
      console.error(`❌ Employee with employeeId ${employeeIdCode} not found`);
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`✓ Employee found: ${employee.name} (${employee.employeeId})\n`);

    /**
     * 🔧 Fix corrupted attendance field (object instead of array)
     */
    const rawEmployee = await mongoose.connection.db
      .collection('employees')
      .findOne({ _id: employee._id });

    if (
      rawEmployee &&
      rawEmployee.attendance &&
      typeof rawEmployee.attendance === 'object' &&
      !Array.isArray(rawEmployee.attendance)
    ) {
      console.log('⚠️  Corrupted attendance detected');
      console.log('🔧 Fixing attendance field...');

      await mongoose.connection.db.collection('employees').updateOne(
        { _id: employee._id },
        { $set: { attendance: [] } }
      );

      console.log('✅ Attendance field fixed');
    }

    // Reload employee after fix
    employee = await Employee.findById(employee._id);

    /**
     * 📅 Date range (UTC)
     */
    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-01-12T23:59:59.999Z');

    console.log(`📅 Attendance Range`);
    console.log(`   From: ${startDate.toISOString().split('T')[0]}`);
    console.log(`   To  : ${endDate.toISOString().split('T')[0]}\n`);

    /**
     * 🧩 Find missing dates
     */
    const missingDates = getMissingDates(
      employee.attendance,
      startDate,
      endDate
    );

    if (missingDates.length === 0) {
      console.log('✅ No missing attendance dates found');
    } else {
      console.log(`🧩 Missing dates: ${missingDates.length}\n`);

      for (const date of missingDates) {
        await generateAttendanceForDateRange(
          employeeIdCode,
          date,
          date // single day only
        );

        console.log(`➕ Attendance added for ${date.toISOString().split('T')[0]}`);
      }

      console.log('\n✅ Missing attendance successfully generated');
    }

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
