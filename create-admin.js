import axios from 'axios';

const createAdmin = async () => {
  try {
    console.log('🔧 Creating admin user...\n');
    
    const response = await axios.post('https://crm-156r.onrender.com/api/auth/register', {
      name: 'Admin User',
      email: 'admin@sanjanacrm.com',
      password: 'admin123',
      phone: '9876543210',
      role: 'main_admin',
      module: 'all',
      permissions: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canHandleAccounts: true
      }
    });

    console.log('✅ Admin user created successfully!\n');
    console.log('Login Credentials:');
    console.log('Email: admin@sanjanacrm.com');
    console.log('Password: admin123\n');
    console.log('You can now login at http://localhost:3000\n');
    
  } catch (error) {
    if (error.response?.data?.message === 'User already exists') {
      console.log('ℹ️  Admin user already exists!\n');
      console.log('Login Credentials:');
      console.log('Email: admin@sanjanacrm.com');
      console.log('Password: admin123\n');
    } else {
      console.error('❌ Error:', error.response?.data?.message || error.message);
      console.log('\n⚠️  Make sure the backend server is running on port 5000');
    }
  }
};

createAdmin();
