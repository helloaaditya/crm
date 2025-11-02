import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

// Test credentials (update with your actual admin credentials)
const TEST_USER = {
  username: 'Sanjana Enterprises', // Change this to your admin username
  password: 'admin123' // Change this to your admin password
};

async function testAutoAttendance() {
  try {
    console.log('🧪 Testing Auto-Attendance System...\n');
    
    // Step 1: Login
    console.log('1️⃣  Logging in...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    const token = loginRes.data.token || loginRes.data.data?.token;
    console.log('✅ Login successful');
    console.log(`   🔑 Token: ${token ? 'Received' : 'MISSING'}\n`);
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Step 2: Get all employees
    console.log('2️⃣  Fetching employees...');
    const employeesRes = await axios.get(`${BASE_URL}/employees`, { headers });
    const employees = employeesRes.data.data || employeesRes.data;
    console.log(`✅ Found ${employees.length} employees\n`);
    
    if (employees.length === 0) {
      console.log('⚠️  No employees found to test with');
      return;
    }
    
    // Step 3: Check attendance before auto-generation
    const firstEmployee = employees[0];
    console.log(`3️⃣  Checking attendance for: ${firstEmployee.name} (${firstEmployee.employeeId})`);
    const attendanceBefore = await axios.get(`${BASE_URL}/employees/${firstEmployee._id}/attendance`, { headers });
    const beforeCount = attendanceBefore.data.data?.attendance?.length || 0;
    console.log(`   📊 Current attendance records: ${beforeCount}\n`);
    
    // Step 4: Trigger auto-generation for ALL employees
    console.log('4️⃣  Triggering auto-attendance generation for ALL employees...');
    const generateRes = await axios.post(`${BASE_URL}/employees/attendance/auto-generate`, {}, { headers });
    console.log(`✅ ${generateRes.data.message}`);
    console.log(`   📈 Records created: ${generateRes.data.data.created}`);
    console.log(`   👥 Employees processed: ${generateRes.data.data.processed}\n`);
    
    // Step 5: Check attendance after auto-generation (fetch employee fresh from DB)
    console.log('5️⃣  Verifying attendance records...');
    const employeeAfter = await axios.get(`${BASE_URL}/employees/${firstEmployee._id}`, { headers });
    const attendance = employeeAfter.data.data?.attendance || employeeAfter.data.attendance || [];
    const afterCount = attendance.length;
    const newRecords = afterCount - beforeCount;
    console.log(`   📊 Total attendance records: ${afterCount}`);
    console.log(`   ➕ New records created: +${newRecords}\n`);
    
    // Step 6: Show sample attendance records
    if (attendance.length > 0) {
      console.log('6️⃣  Sample attendance records (most recent first):');
      const sorted = attendance.sort((a, b) => new Date(b.date) - new Date(a.date));
      const recentRecords = sorted.slice(0, 10);
      recentRecords.forEach(record => {
        const date = new Date(record.date).toLocaleDateString('en-IN');
        const status = record.status;
        const note = record.notes || '';
        const isAutoGen = note.includes('Auto-generated');
        console.log(`   📅 ${date} - Status: ${status.toUpperCase().padEnd(10)} ${isAutoGen ? '🤖 Auto-generated' : '✓ Manual'}`);
      });
    } else {
      console.log('⚠️  No attendance records found after generation');
    }
    
    console.log('\n✅ Auto-Attendance Test Complete!\n');
    
  } catch (error) {
    console.error('\n❌ Test Failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data.message || error.response.data}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    console.error('\n💡 Make sure:');
    console.error('   1. Backend server is running on port 5000');
    console.error('   2. Update TEST_USER credentials in the script');
    console.error('   3. You have admin/main_admin access\n');
  }
}

// Run the test
testAutoAttendance();

