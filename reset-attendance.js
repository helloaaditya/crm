import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/Employee.js';
import readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const resetAttendance = async () => {
  try {
    console.log('🔄 Reset Today\'s Attendance\n');
    
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find employee by name
    rl.question('Enter employee name (e.g., Rahul): ', async (name) => {
      const employee = await Employee.findOne({ 
        name: { $regex: new RegExp(name, 'i') } 
      });
      
      if (!employee) {
        console.log('❌ Employee not found');
        await mongoose.disconnect();
        rl.close();
        return;
      }
      
      console.log(`\n✅ Found: ${employee.name} (${employee.employeeId})\n`);
      
      // Find today's attendance
      const todayAttendance = employee.attendance.find(a => {
        const attDate = new Date(a.date);
        attDate.setHours(0, 0, 0, 0);
        return attDate.getTime() === today.getTime();
      });
      
      if (!todayAttendance) {
        console.log('⚠️  No attendance record found for today');
        await mongoose.disconnect();
        rl.close();
        return;
      }
      
      console.log('📋 Current attendance for today:');
      console.log(`   Status: ${todayAttendance.status}`);
      console.log(`   Check-in: ${todayAttendance.checkInTime || 'N/A'}`);
      console.log(`   Check-out: ${todayAttendance.checkOutTime || 'N/A'}`);
      
      rl.question('\n⚠️  Delete this attendance record? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() === 'yes') {
          // Remove today's attendance
          employee.attendance = employee.attendance.filter(a => {
            const attDate = new Date(a.date);
            attDate.setHours(0, 0, 0, 0);
            return attDate.getTime() !== today.getTime();
          });
          
          await employee.save();
          console.log('\n✅ Today\'s attendance deleted!');
          console.log('👉 You can now check in again for testing.\n');
        } else {
          console.log('\n❌ Cancelled. No changes made.\n');
        }
        
        await mongoose.disconnect();
        rl.close();
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    rl.close();
  }
};

resetAttendance();

