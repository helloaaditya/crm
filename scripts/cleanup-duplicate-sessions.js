import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LocationTracking from '../models/LocationTracking.js';
import Employee from '../models/Employee.js';

dotenv.config();

const cleanupDuplicateSessions = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all employees with multiple active sessions
    const employeesWithDuplicates = await LocationTracking.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: '$employee',
          sessionCount: { $sum: 1 },
          sessions: { $push: { sessionId: '$sessionId', createdAt: '$createdAt', _id: '$_id' } }
        }
      },
      {
        $match: { sessionCount: { $gt: 1 } }
      }
    ]);

    console.log(`📊 Found ${employeesWithDuplicates.length} employees with duplicate active sessions:\n`);

    if (employeesWithDuplicates.length === 0) {
      console.log('✅ No duplicate sessions found! Database is clean.');
      await mongoose.connection.close();
      return;
    }

    let totalCleaned = 0;

    for (const emp of employeesWithDuplicates) {
      // Get employee details
      const employee = await Employee.findById(emp._id);
      console.log(`\n👤 Employee: ${employee ? employee.name : 'Unknown'} (${employee ? employee.employeeId : emp._id})`);
      console.log(`   Has ${emp.sessionCount} active sessions:`);

      // Sort sessions by createdAt descending
      const sortedSessions = emp.sessions.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );

      // Keep the latest session
      const latestSession = sortedSessions[0];
      const oldSessions = sortedSessions.slice(1);

      console.log(`   ✅ Keeping latest session: ${latestSession.sessionId}`);
      console.log(`   ❌ Removing ${oldSessions.length} old sessions:`);
      
      oldSessions.forEach((session, index) => {
        console.log(`      ${index + 1}. ${session.sessionId} (created: ${new Date(session.createdAt).toLocaleString()})`);
      });

      // Mark old sessions as inactive
      const result = await LocationTracking.updateMany(
        {
          employee: emp._id,
          sessionId: { $in: oldSessions.map(s => s.sessionId) },
          isActive: true
        },
        {
          $set: { isActive: false }
        }
      );

      console.log(`   ✅ Marked ${result.modifiedCount} sessions as inactive`);
      totalCleaned += result.modifiedCount;
    }

    console.log(`\n\n🎉 CLEANUP COMPLETE!`);
    console.log(`   Total employees affected: ${employeesWithDuplicates.length}`);
    console.log(`   Total duplicate sessions cleaned: ${totalCleaned}`);
    console.log(`\n✅ Database is now clean - each employee has only ONE active session`);

    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

console.log('🧹 Location Tracking Duplicate Session Cleanup');
console.log('================================================\n');
cleanupDuplicateSessions();

