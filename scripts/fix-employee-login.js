import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const fixEmployeeLogin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected\n');

    // Find employee by employeeId
    const employee = await Employee.findOne({ employeeId: 'EMP00002' });
    
    if (!employee) {
      console.log('❌ Employee EMP00002 not found in database');
      process.exit(1);
    }

    console.log('📋 Found Employee:', employee.name, `(${employee.employeeId})`);
    console.log('');

    // Find associated user
    if (!employee.userId) {
      console.log('❌ Employee has no userId linked');
      console.log('   Cannot fix login - no User account exists');
      process.exit(1);
    }

    const user = await User.findById(employee.userId).select('+password');
    
    if (!user) {
      console.log('❌ User record not found');
      console.log('   User ID:', employee.userId);
      process.exit(1);
    }

    console.log('👤 Found User:', user.name, `(${user.email})`);
    console.log('');

    // Check current status
    console.log('🔍 Current Status:');
    console.log('   Is Active:', user.isActive);
    console.log('   Has Password:', user.password ? 'Yes' : 'No');
    console.log('');

    // Fix issues
    let fixesApplied = [];

    // Fix 1: Activate account if deactivated
    if (!user.isActive) {
      user.isActive = true;
      fixesApplied.push('✅ Activated user account');
    }

    // Fix 2: Set default password if missing
    if (!user.password) {
      const defaultPassword = '123456'; // Default password
      user.password = defaultPassword;
      fixesApplied.push(`✅ Set default password: ${defaultPassword}`);
    }

    // Fix 3: Ensure email matches employee email
    if (user.email !== employee.email && employee.email) {
      user.email = employee.email;
      fixesApplied.push(`✅ Updated email to match employee: ${employee.email}`);
    }

    // Fix 4: Ensure name matches
    if (user.name !== employee.name) {
      user.name = employee.name;
      fixesApplied.push(`✅ Updated name to match employee: ${employee.name}`);
    }

    if (fixesApplied.length > 0) {
      await user.save();
      console.log('🔧 Fixes Applied:');
      fixesApplied.forEach(fix => console.log('   ', fix));
      console.log('');
    } else {
      console.log('✅ No fixes needed - account appears to be in good state');
      console.log('');
    }

    // Show login credentials
    console.log('💡 Login Credentials:');
    console.log('   Username (email):', user.email);
    console.log('   Username (name):', user.name);
    if (fixesApplied.some(f => f.includes('password'))) {
      console.log('   Password:', '123456 (default - please change after login)');
    } else {
      console.log('   Password:', '[Existing password - unchanged]');
    }
    console.log('');

    console.log('✨ Fix completed! Employee should now be able to login.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Script Error:', error);
    process.exit(1);
  }
};

fixEmployeeLogin();

