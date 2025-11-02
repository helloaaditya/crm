import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const createEmployeeRecordsForUsers = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error('❌ MONGO_URI not found in .env file!');
      process.exit(1);
    }
    
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find all users
    const users = await User.find({}).lean();
    console.log(`📊 Total users found: ${users.length}\n`);

    let created = 0;
    let skipped = 0;

    for (const user of users) {
      try {
        // Check if employee record already exists
        const existingEmployee = await Employee.findOne({ userId: user._id });
        
        if (existingEmployee) {
          console.log(`⏭️  Employee record already exists for ${user.name} (${user.email})`);
          skipped++;
          continue;
        }

        // Determine role/designation
        const roleMap = {
          'main_admin': 'admin',
          'admin': 'admin',
          'supervisor': 'supervisor',
          'engineer': 'engineer',
          'worker': 'worker',
          'employee': 'worker'
        };
        
        const employeeRole = roleMap[user.role] || 'worker';
        
        // Create employee record
        const employee = await Employee.create({
          userId: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email || `${user.name.toLowerCase().replace(/\s+/g, '')}@company.com`,
          role: employeeRole,
          designation: employeeRole,
          basicSalary: user.role === 'main_admin' || user.role === 'admin' ? 50000 : 20000,
          joiningDate: user.createdAt || new Date(),
          employmentType: 'full_time',
          department: user.role === 'main_admin' || user.role === 'admin' ? 'admin' : 'construction',
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
          createdBy: user._id
        });

        console.log(`✅ Created employee record for ${user.name} (${employee.employeeId})`);
        created++;

      } catch (error) {
        console.error(`❌ Error creating employee for ${user.name}:`, error.message);
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📊 Total: ${users.length}\n`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createEmployeeRecordsForUsers();

