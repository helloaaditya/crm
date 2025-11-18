import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import LocationTracking from '../models/LocationTracking.js';
import Employee from '../models/Employee.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI or MONGO_URI not found in environment variables');
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB Connected\n');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const cleanupDuplicateSessions = async () => {
  try {
    await connectDB();

    console.log('🧹 CLEANING UP DUPLICATE LOCATION SESSIONS\n');
    console.log('='.repeat(80));

    // Find employees with multiple active sessions
    const duplicateCheck = await LocationTracking.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: '$employee',
          sessions: { $addToSet: '$sessionId' },
          records: { $push: '$$ROOT' }
        }
      },
      {
        $match: { $expr: { $gt: [{ $size: '$sessions' }, 1] } }
      }
    ]);

    if (duplicateCheck.length === 0) {
      console.log('✅ No duplicate active sessions found.\n');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`⚠️  Found ${duplicateCheck.length} employees with multiple active sessions\n`);

    let totalCleaned = 0;

    for (const dup of duplicateCheck) {
      const employee = await Employee.findById(dup._id).select('employeeId name');
      console.log(`\n👤 Employee: ${employee?.name || 'Unknown'} (${employee?.employeeId || 'N/A'})`);
      console.log(`   Active Sessions: ${dup.sessions.length}`);

      // Group records by session and find the latest session
      const sessionGroups = {};
      dup.records.forEach(record => {
        if (!sessionGroups[record.sessionId]) {
          sessionGroups[record.sessionId] = [];
        }
        sessionGroups[record.sessionId].push(record);
      });

      // Find the session with the latest record
      let latestSession = null;
      let latestTime = null;

      Object.entries(sessionGroups).forEach(([sessionId, records]) => {
        const latestRecord = records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        const recordTime = new Date(latestRecord.createdAt);
        
        if (!latestTime || recordTime > latestTime) {
          latestTime = recordTime;
          latestSession = sessionId;
        }
      });

      console.log(`   Keeping latest session: ${latestSession}`);
      console.log(`   Latest update: ${latestTime.toLocaleString()}`);

      // Mark all other sessions as inactive
      const sessionsToCleanup = dup.sessions.filter(s => s !== latestSession);
      
      if (sessionsToCleanup.length > 0) {
        const result = await LocationTracking.updateMany(
          {
            employee: dup._id,
            sessionId: { $in: sessionsToCleanup },
            isActive: true
          },
          {
            $set: { isActive: false }
          }
        );

        console.log(`   ✅ Cleaned up ${result.modifiedCount} records from ${sessionsToCleanup.length} old sessions`);
        totalCleaned += result.modifiedCount;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ Cleanup complete! Total records cleaned: ${totalCleaned}\n`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

cleanupDuplicateSessions();

