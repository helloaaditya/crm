import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const fixAdminModules = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all admin users
    const admins = await User.find({ 
      role: { $in: ['main_admin', 'admin'] } 
    });

    console.log(`Found ${admins.length} admin user(s)`);

    for (const admin of admins) {
      console.log(`\nUpdating: ${admin.name} (${admin.email})`);
      console.log(`Current module: ${admin.module}`);
      
      // Update to 'all' if not already
      if (admin.module !== 'all') {
        admin.module = 'all';
        await admin.save();
        console.log(`✅ Updated to: ${admin.module}`);
      } else {
        console.log(`✅ Already has 'all' access`);
      }
    }

    // Also find and list all users with their current module access
    console.log('\n\n📋 All Users and Their Module Access:');
    console.log('═'.repeat(60));
    
    const allUsers = await User.find({}).select('name email role module isActive');
    
    allUsers.forEach(user => {
      console.log(`\n👤 ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Module: ${user.module || 'NOT SET'}`);
      console.log(`   Status: ${user.isActive ? 'Active' : 'Inactive'}`);
    });

    console.log('\n\n✅ Admin modules updated successfully!');
    console.log('\nℹ️  If you\'re still getting 403 errors:');
    console.log('   1. Log out and log back in');
    console.log('   2. Check that your user has module = "all"');
    console.log('   3. Go to Accounts page and edit your user to set modules');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixAdminModules();

