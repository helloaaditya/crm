import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LocationTracking from './models/LocationTracking.js';
import Employee from './models/Employee.js';

dotenv.config();

const checkRouteHistory = async () => {
  try {
    console.log('🗺️  Checking Route History Data\n');
    
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find all location records for today
    const todayLocations = await LocationTracking.find({
      trackingDate: {
        $gte: today,
        $lt: tomorrow
      }
    }).populate('employee', 'name employeeId').sort({ createdAt: 1 });
    
    console.log(`📊 Total location points today: ${todayLocations.length}\n`);
    
    if (todayLocations.length === 0) {
      console.log('⚠️  No location data for today');
      await mongoose.disconnect();
      return;
    }
    
    // Group by employee
    const byEmployee = {};
    todayLocations.forEach(loc => {
      const empId = loc.employee._id.toString();
      if (!byEmployee[empId]) {
        byEmployee[empId] = {
          employee: loc.employee,
          sessions: {}
        };
      }
      if (!byEmployee[empId].sessions[loc.sessionId]) {
        byEmployee[empId].sessions[loc.sessionId] = [];
      }
      byEmployee[empId].sessions[loc.sessionId].push(loc);
    });
    
    // Display summary
    console.log('📋 Route History Summary:\n');
    
    Object.values(byEmployee).forEach(emp => {
      console.log(`👤 ${emp.employee.name} (${emp.employee.employeeId})`);
      console.log(`   Total sessions: ${Object.keys(emp.sessions).length}`);
      
      Object.entries(emp.sessions).forEach(([sessionId, locations]) => {
        console.log(`\n   📍 Session: ${sessionId}`);
        console.log(`      Points: ${locations.length}`);
        console.log(`      Start: ${locations[0].createdAt.toLocaleTimeString()}`);
        console.log(`      End: ${locations[locations.length - 1].createdAt.toLocaleTimeString()}`);
        console.log(`      Active: ${locations[0].isActive ? '🟢 Yes' : '⚫ No'}`);
        
        // Show coordinates
        console.log(`\n      Route coordinates:`);
        locations.forEach((loc, i) => {
          const coords = loc.location.coordinates;
          console.log(`      ${i + 1}. [${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}] at ${loc.createdAt.toLocaleTimeString()}`);
        });
      });
      
      console.log('\n' + '─'.repeat(60) + '\n');
    });
    
    // Test historical route query
    console.log('🧪 Testing Historical Route API Query:\n');
    
    const firstEmployee = Object.values(byEmployee)[0];
    if (firstEmployee) {
      const empId = firstEmployee.employee._id;
      const dateStr = today.toISOString().split('T')[0];
      
      console.log(`Testing query for: ${firstEmployee.employee.name}`);
      console.log(`Date: ${dateStr}\n`);
      
      // Simulate the API query
      const startOfDay = new Date(dateStr);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);
      
      const historyLocations = await LocationTracking.find({
        employee: empId,
        trackingDate: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      }).sort({ createdAt: 1 });
      
      console.log(`✅ API would return ${historyLocations.length} location points`);
      
      if (historyLocations.length > 0) {
        const firstLoc = historyLocations[0].location.coordinates;
        const lastLoc = historyLocations[historyLocations.length - 1].location.coordinates;
        
        console.log(`\n📍 Route summary:`);
        console.log(`   Start: [${firstLoc[1].toFixed(4)}, ${firstLoc[0].toFixed(4)}]`);
        console.log(`   End: [${lastLoc[1].toFixed(4)}, ${lastLoc[0].toFixed(4)}]`);
        console.log(`   Duration: ${Math.round((historyLocations[historyLocations.length - 1].createdAt - historyLocations[0].createdAt) / 1000 / 60)} minutes`);
      }
    }
    
    console.log('\n✅ Check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
};

checkRouteHistory();

