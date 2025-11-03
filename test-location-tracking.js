import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/Employee.js';
import LocationTracking from './models/LocationTracking.js';
import User from './models/User.js';

dotenv.config();

const testLocationTracking = async () => {
  try {
    console.log('🔍 Testing Location Tracking Setup...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // 1. Check if Rahul exists as a User
    console.log('1️⃣ Checking for User "Rahul"...');
    const rahulUser = await User.findOne({ 
      name: { $regex: /rahul/i } 
    }).select('_id name email role');
    
    if (rahulUser) {
      console.log('✅ User found:', {
        id: rahulUser._id,
        name: rahulUser.name,
        email: rahulUser.email,
        role: rahulUser.role
      });
    } else {
      console.log('❌ User "Rahul" not found\n');
      console.log('Available users:');
      const users = await User.find({}).select('name email').limit(5);
      users.forEach(u => console.log(`  - ${u.name} (${u.email})`));
      return;
    }
    
    // 2. Check if Employee record exists for Rahul
    console.log('\n2️⃣ Checking for Employee record...');
    const rahulEmployee = await Employee.findOne({ 
      userId: rahulUser._id 
    }).select('_id employeeId name userId');
    
    if (rahulEmployee) {
      console.log('✅ Employee found:', {
        id: rahulEmployee._id,
        employeeId: rahulEmployee.employeeId,
        name: rahulEmployee.name,
        userId: rahulEmployee.userId
      });
    } else {
      console.log('❌ Employee record not found for this user!');
      console.log('   This is likely the issue - tracking requires Employee record');
      console.log('\n💡 Solution: Run this command:');
      console.log('   node scripts/create-employee-for-users.js');
      return;
    }
    
    // 3. Check for any location tracking records
    console.log('\n3️⃣ Checking for location tracking records...');
    const allTracking = await LocationTracking.find({}).limit(10);
    console.log(`📊 Total location records in DB: ${allTracking.length}`);
    
    if (allTracking.length > 0) {
      console.log('\nSample records:');
      allTracking.forEach((record, i) => {
        console.log(`  ${i + 1}. Session: ${record.sessionId}, Active: ${record.isActive}, Date: ${record.trackingDate}`);
      });
    }
    
    // 4. Check for Rahul's tracking records
    console.log('\n4️⃣ Checking Rahul\'s tracking records...');
    const rahulTracking = await LocationTracking.find({
      employee: rahulEmployee._id
    }).sort({ createdAt: -1 }).limit(5);
    
    if (rahulTracking.length > 0) {
      console.log(`✅ Found ${rahulTracking.length} tracking record(s) for Rahul:`);
      rahulTracking.forEach((record, i) => {
        console.log(`  ${i + 1}. ${record.sessionId} - ${record.isActive ? '🟢 Active' : '⚫ Inactive'} - ${new Date(record.createdAt).toLocaleString()}`);
      });
    } else {
      console.log('❌ No tracking records found for Rahul');
      console.log('\n💡 This means tracking was never started or failed to save');
    }
    
    // 5. Check active tracking records
    console.log('\n5️⃣ Checking currently active tracking sessions...');
    const activeTracking = await LocationTracking.find({ isActive: true });
    console.log(`📊 Total active sessions: ${activeTracking.length}`);
    
    if (activeTracking.length > 0) {
      console.log('\nActive sessions:');
      for (const record of activeTracking) {
        const emp = await Employee.findById(record.employee).select('name employeeId');
        console.log(`  - ${emp?.name} (${emp?.employeeId}) - Session: ${record.sessionId}`);
      }
    }
    
    console.log('\n✅ Diagnosis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
};

testLocationTracking();

