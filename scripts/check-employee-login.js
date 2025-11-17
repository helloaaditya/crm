import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const checkEmployeeLogin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected\n');

    // Find employee by employeeId
    const employee = await Employee.findOne({ employeeId: 'EMP00002' });
    
    if (!employee) {
      console.log('❌ Employee EMP00002 not found in database');
      process.exit(1);
    }

    console.log('📋 Employee Details:');
    console.log('   Employee ID:', employee.employeeId);
    console.log('   Name:', employee.name);
    console.log('   Email:', employee.email);
    console.log('   Phone:', employee.phone);
    console.log('   User ID:', employee.userId);
    console.log('   Role:', employee.role);
    console.log('   Designation:', employee.designation);
    console.log('');

    // Find associated user
    if (employee.userId) {
      const user = await User.findById(employee.userId).select('+password');
      
      if (!user) {
        console.log('❌ User record not found for this employee');
        console.log('   User ID:', employee.userId);
        process.exit(1);
      }

      console.log('👤 User Details:');
      console.log('   User ID:', user._id);
      console.log('   Name:', user.name);
      console.log('   Email:', user.email);
      console.log('   Phone:', user.phone);
      console.log('   Role:', user.role);
      console.log('   Module:', user.module);
      console.log('   Is Active:', user.isActive);
      console.log('   Has Password:', user.password ? 'Yes' : 'No');
      console.log('   Password Length:', user.password ? user.password.length : 0);
      console.log('');

      // Check login issues
      console.log('🔍 Login Diagnostics:');
      
      if (!user.isActive) {
        console.log('   ⚠️  ISSUE: User account is DEACTIVATED');
        console.log('   Fix: Set isActive to true');
      } else {
        console.log('   ✅ User account is active');
      }

      if (!user.password) {
        console.log('   ⚠️  ISSUE: User has no password set');
        console.log('   Fix: Reset password');
      } else {
        console.log('   ✅ User has password set');
      }

      // Check if email/name match
      if (user.email !== employee.email) {
        console.log('   ⚠️  WARNING: Email mismatch');
        console.log('      User email:', user.email);
        console.log('      Employee email:', employee.email);
      }

      if (user.name !== employee.name) {
        console.log('   ⚠️  WARNING: Name mismatch');
        console.log('      User name:', user.name);
        console.log('      Employee name:', employee.name);
      }

      console.log('');
      console.log('💡 Login Credentials:');
      console.log('   Username (email):', user.email);
      console.log('   Username (name):', user.name);
      console.log('   Password: [Hidden - check if correct]');
      console.log('');

      // Suggest fixes
      console.log('🔧 Suggested Fixes:');
      if (!user.isActive) {
        console.log('   1. Activate user account:');
        console.log('      await User.findByIdAndUpdate(user._id, { isActive: true });');
      }
      if (!user.password) {
        console.log('   2. Reset password (use admin panel or create script)');
      }
    } else {
      console.log('❌ Employee has no userId linked');
      console.log('   This employee cannot login because there is no User account');
    }

    console.log('\n✨ Check completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Script Error:', error);
    process.exit(1);
  }
};

checkEmployeeLogin();

