import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LocationTracking from '../models/LocationTracking.js';
import Employee from '../models/Employee.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const showAllLocationRecords = async () => {
  try {
    await connectDB();

    console.log('\n📊 LOCATION TRACKING RECORDS ANALYSIS\n');
    console.log('='.repeat(80));

    // Get total counts
    const totalRecords = await LocationTracking.countDocuments();
    const activeRecords = await LocationTracking.countDocuments({ isActive: true });
    const inactiveRecords = await LocationTracking.countDocuments({ isActive: false });

    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total Records: ${totalRecords}`);
    console.log(`   Active Records: ${activeRecords}`);
    console.log(`   Inactive Records: ${inactiveRecords}`);

    // Get all active records with employee details
    const allActiveRecords = await LocationTracking.find({ isActive: true })
      .populate('employee', 'employeeId name role')
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    console.log(`\n🟢 ACTIVE LOCATION RECORDS (${allActiveRecords.length}):`);
    console.log('='.repeat(80));

    if (allActiveRecords.length === 0) {
      console.log('   No active records found.');
    } else {
      // Group by employee
      const byEmployee = {};
      allActiveRecords.forEach(record => {
        const empId = record.employee?._id?.toString() || 'Unknown';
        const empName = record.employee?.name || record.employee?.employeeId || 'Unknown';
        
        if (!byEmployee[empId]) {
          byEmployee[empId] = {
            employee: record.employee,
            records: []
          };
        }
        byEmployee[empId].records.push(record);
      });

      Object.entries(byEmployee).forEach(([empId, data]) => {
        console.log(`\n👤 Employee: ${data.employee?.name || 'Unknown'} (${data.employee?.employeeId || 'N/A'})`);
        console.log(`   Total Active Records: ${data.records.length}`);
        
        // Group by session
        const bySession = {};
        data.records.forEach(record => {
          const sessionId = record.sessionId;
          if (!bySession[sessionId]) {
            bySession[sessionId] = [];
          }
          bySession[sessionId].push(record);
        });

        Object.entries(bySession).forEach(([sessionId, sessionRecords]) => {
          const latest = sessionRecords[0]; // Already sorted by createdAt desc
          const oldest = sessionRecords[sessionRecords.length - 1];
          const duration = new Date(latest.createdAt) - new Date(oldest.createdAt);
          const durationMinutes = Math.round(duration / 1000 / 60);

          console.log(`\n   📍 Session: ${sessionId}`);
          console.log(`      Records: ${sessionRecords.length}`);
          console.log(`      Duration: ${durationMinutes} minutes`);
          console.log(`      Latest: ${new Date(latest.createdAt).toLocaleString()}`);
          console.log(`      Oldest: ${new Date(oldest.createdAt).toLocaleString()}`);
          console.log(`      Latest Location: [${latest.location.coordinates[1].toFixed(6)}, ${latest.location.coordinates[0].toFixed(6)}]`);
          if (latest.address) {
            console.log(`      Address: ${latest.address.substring(0, 60)}...`);
          }
          console.log(`      Accuracy: ${latest.accuracy ? Math.round(latest.accuracy) + 'm' : 'N/A'}`);
          if (latest.batteryLevel) {
            console.log(`      Battery: ${latest.batteryLevel}%`);
          }
        });
      });
    }

    // Get all inactive records (recent ones)
    const recentInactiveRecords = await LocationTracking.find({ isActive: false })
      .populate('employee', 'employeeId name role')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(20);

    console.log(`\n\n🔴 RECENT INACTIVE RECORDS (showing last 20 of ${inactiveRecords}):`);
    console.log('='.repeat(80));

    if (recentInactiveRecords.length === 0) {
      console.log('   No inactive records found.');
    } else {
      recentInactiveRecords.forEach((record, index) => {
        console.log(`\n   ${index + 1}. Employee: ${record.employee?.name || 'Unknown'} (${record.employee?.employeeId || 'N/A'})`);
        console.log(`      Session: ${record.sessionId}`);
        console.log(`      Created: ${new Date(record.createdAt).toLocaleString()}`);
        console.log(`      Location: [${record.location.coordinates[1].toFixed(6)}, ${record.location.coordinates[0].toFixed(6)}]`);
        console.log(`      Is Stop Point: ${record.isStopPoint ? 'Yes' : 'No'}`);
      });
    }

    // Group by session to show session statistics
    console.log(`\n\n📦 SESSION STATISTICS:`);
    console.log('='.repeat(80));

    const sessionStats = await LocationTracking.aggregate([
      {
        $group: {
          _id: '$sessionId',
          employee: { $first: '$employee' },
          totalRecords: { $sum: 1 },
          activeRecords: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
          inactiveRecords: {
            $sum: { $cond: ['$isActive', 0, 1] }
          },
          firstRecord: { $min: '$createdAt' },
          lastRecord: { $max: '$createdAt' },
          latestLocation: {
            $first: {
              $cond: [
                '$isActive',
                {
                  coords: '$location.coordinates',
                  address: '$address',
                  createdAt: '$createdAt'
                },
                null
              ]
            }
          }
        }
      },
      {
        $sort: { lastRecord: -1 }
      },
      {
        $limit: 10
      }
    ]);

    for (const stat of sessionStats) {
      const employee = await Employee.findById(stat.employee).select('employeeId name');
      const duration = new Date(stat.lastRecord) - new Date(stat.firstRecord);
      const durationMinutes = Math.round(duration / 1000 / 60);

      console.log(`\n   Session: ${stat._id}`);
      console.log(`   Employee: ${employee?.name || 'Unknown'} (${employee?.employeeId || 'N/A'})`);
      console.log(`   Total Records: ${stat.totalRecords} (Active: ${stat.activeRecords}, Inactive: ${stat.inactiveRecords})`);
      console.log(`   Duration: ${durationMinutes} minutes`);
      console.log(`   First Record: ${new Date(stat.firstRecord).toLocaleString()}`);
      console.log(`   Last Record: ${new Date(stat.lastRecord).toLocaleString()}`);
      if (stat.latestLocation) {
        console.log(`   Latest Active Location: [${stat.latestLocation.coords[1].toFixed(6)}, ${stat.latestLocation.coords[0].toFixed(6)}]`);
        console.log(`   Latest Update: ${new Date(stat.latestLocation.createdAt).toLocaleString()}`);
      }
    }

    // Check for duplicate active records per employee
    console.log(`\n\n🔍 DUPLICATE ACTIVE RECORDS CHECK:`);
    console.log('='.repeat(80));

    const duplicateCheck = await LocationTracking.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: '$employee',
          count: { $sum: 1 },
          sessions: { $addToSet: '$sessionId' },
          records: { $push: '$$ROOT' }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    if (duplicateCheck.length === 0) {
      console.log('   ✅ No duplicate active records found per employee.');
    } else {
      console.log(`   ⚠️ Found ${duplicateCheck.length} employees with multiple active records:`);
      for (const dup of duplicateCheck) {
        const employee = await Employee.findById(dup._id).select('employeeId name');
        console.log(`\n   Employee: ${employee?.name || 'Unknown'} (${employee?.employeeId || 'N/A'})`);
        console.log(`   Active Records: ${dup.count}`);
        console.log(`   Sessions: ${dup.sessions.length}`);
        dup.sessions.forEach(sessionId => {
          const sessionRecords = dup.records.filter(r => r.sessionId === sessionId);
          console.log(`      - Session ${sessionId}: ${sessionRecords.length} records`);
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Analysis complete!\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

showAllLocationRecords();

