import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const createEmployeeRecords = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    // Find all users who don't have an employee record
    const users = await User.find({ 
      isActive: true,
      role: { $ne: 'main_admin' } 
    });

    console.log(`\nFound ${users.length} active users`);

    let created = 0;
    let skipped = 0;

    for (const user of users) {
      // Check if employee record already exists
      const existingEmployee = await Employee.findOne({ userId: user._id });
      
      if (existingEmployee) {
        console.log(`⏭️  Skipped ${user.name} - Employee record already exists`);
        skipped++;
        continue;
      }

      // Generate unique employee ID
      const employeeCount = await Employee.countDocuments();
      const employeeId = `EMP${String(employeeCount + 1).padStart(4, '0')}`;

      // Create employee record
      await Employee.create({
        employeeId,
        userId: user._id,
        name: user.name,
        phone: user.phone || '0000000000',
        email: user.email,
        designation: user.role === 'admin' ? 'admin' : user.role || 'worker',
        role: user.role || 'worker',
        joiningDate: user.createdAt || new Date(),
        basicSalary: 0, // Admin needs to update
        employmentType: 'full_time',
        allowances: {
          hra: 0,
          transport: 0,
          other: 0
        },
        deductions: {
          pf: 0,
          esi: 0,
          tax: 0,
          other: 0
        },
        createdBy: user.createdBy || user._id // Use user's creator or self
      });

      console.log(`✅ Created employee record for ${user.name} (${employeeId})`);
      created++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${users.length}`);

    console.log('\n✨ Employee records creation completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createEmployeeRecords();
