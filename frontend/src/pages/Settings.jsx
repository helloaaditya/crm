import { useState, useEffect, useContext } from 'react';
import { FiSave, FiUpload, FiSettings, FiUser, FiDatabase, FiMail, FiCreditCard, FiBell, FiImage, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import API from '../api';
import { toast } from 'react-toastify';

const Settings = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState(null);
  const [userSettings, setUserSettings] = useState({
    name: '',
    email: '',
    theme: 'light'
  });
  const [formData, setFormData] = useState({
    company: {
      name: '',
      logo: '',
      address: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      },
      phone: '',
      email: '',
      website: '',
      gstNumber: '',
      panNumber: ''
    },
    invoice: {
      prefix: 'INV',
      startNumber: 1,
      terms: '',
      defaultDueDays: 30,
      bankDetails: {
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        accountHolderName: '',
        branch: ''
      }
    },
    tax: {
      defaultGST: 18,
      cgst: 9,
      sgst: 9,
      igst: 18
    },
    theme: {
      primaryColor: '#3b82f6',
      secondaryColor: '#10b981',
      mode: 'light'
    },
    backup: {
      enabled: true,
      frequency: 'daily'
    }
  });

  // Check if user is admin
  const isAdmin = user && (user.role === 'admin' || user.role === 'main_admin');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // Fetch user settings
      const userResponse = await API.settings.getMySettings();
      setUserSettings({
        name: userResponse.data.data.name,
        email: userResponse.data.data.email,
        theme: userResponse.data.data.theme
      });
      
      // Fetch admin settings if user is admin
      if (isAdmin) {
        const response = await API.settings.getAll();
        const settingsData = response.data.data;
        
        // Ensure nested structures exist
        const safeSettingsData = {
          ...settingsData,
          company: {
            name: settingsData.company?.name || 'Sanjana Enterprises',
            logo: settingsData.company?.logo || '',
            address: {
              street: settingsData.company?.address?.street || '',
              city: settingsData.company?.address?.city || 'Bangalore',
              state: settingsData.company?.address?.state || 'Karnataka',
              pincode: settingsData.company?.address?.pincode || '561203',
              country: settingsData.company?.address?.country || 'India'
            },
            phone: settingsData.company?.phone || '+91 9916290799',
            email: settingsData.company?.email || 'sanjana.waterproofing@gmail.com',
            website: settingsData.company?.website || '',
            gstNumber: settingsData.company?.gstNumber || '',
            panNumber: settingsData.company?.panNumber || ''
          },
          invoice: {
            prefix: settingsData.invoice?.prefix || 'INV',
            startNumber: settingsData.invoice?.startNumber || 1,
            terms: settingsData.invoice?.terms || '',
            defaultDueDays: settingsData.invoice?.defaultDueDays || 30,
            bankDetails: {
              bankName: settingsData.invoice?.bankDetails?.bankName || 'State Bank of India',
              accountNumber: settingsData.invoice?.bankDetails?.accountNumber || '123456789012',
              ifscCode: settingsData.invoice?.bankDetails?.ifscCode || 'SBIN0001234',
              accountHolderName: settingsData.invoice?.bankDetails?.accountHolderName || 'Sanjana Enterprises',
              branch: settingsData.invoice?.bankDetails?.branch || 'Main Branch, Bangalore'
            }
          },
          tax: {
            defaultGST: settingsData.tax?.defaultGST || 18,
            cgst: settingsData.tax?.cgst || 9,
            sgst: settingsData.tax?.sgst || 9,
            igst: settingsData.tax?.igst || 18
          },
          theme: {
            primaryColor: settingsData.theme?.primaryColor || '#3b82f6',
            secondaryColor: settingsData.theme?.secondaryColor || '#10b981',
            mode: settingsData.theme?.mode || 'light'
          },
          backup: {
            enabled: settingsData.backup?.enabled !== undefined ? settingsData.backup.enabled : true,
            frequency: settingsData.backup?.frequency || 'daily'
          }
        };
        
        setSettings(settingsData);
        setFormData(safeSettingsData);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSettingsChange = (e) => {
    const { name, value } = e.target;
    setUserSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleNestedInputChange = (section, nestedSection, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [nestedSection]: {
          ...prev[section][nestedSection],
          [field]: value
        }
      }
    }));
  };

  const handleToggleChange = (section, field) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: !prev[section][field]
      }
    }));
  };

  const handleModuleToggle = (module) => {
    setFormData(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [module]: !prev.modules[module]
      }
    }));
  };

  const handleUserSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await API.settings.updateMySettings(userSettings);
      toast.success('Profile settings updated successfully');
    } catch (error) {
      console.error('Error updating user settings:', error);
      toast.error('Failed to update profile settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSettingsSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Access denied. Admin rights required.');
      return;
    }
    
    try {
      setLoading(true);
      // Ensure proper data structure before sending
      const settingsData = {
        ...formData,
        company: {
          ...formData.company,
          address: {
            ...formData.company.address
          }
        },
        invoice: {
          ...formData.invoice,
          bankDetails: {
            ...formData.invoice.bankDetails
          }
        }
      };
      await API.settings.update(settingsData);
      toast.success('System settings updated successfully');
      
      // Also update invoice settings for backward compatibility
      // This ensures both systems are in sync
      setTimeout(() => {
        fetchSettings();
      }, 500);
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e) => {
    // In a real implementation, this would upload the file to the server
    const file = e.target.files[0];
    if (file) {
      toast.info('Logo upload functionality would be implemented here');
      // For now, we'll just show a message
      // In a real app, you would:
      // 1. Upload the file to your server
      // 2. Get the URL of the uploaded file
      // 3. Update the formData with the logo URL
      // handleInputChange('company', 'logo', url);
    }
  };

  if (loading && !settings && !userSettings.name) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
        <div className="flex items-center space-x-2">
          <FiSettings className="text-gray-500" />
          <span className="text-sm text-gray-500">
            {isAdmin ? 'Admin Access' : 'User Access'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FiUser className="inline mr-2" />
            My Profile
          </button>
          
          {isAdmin && (
            <button
              onClick={() => setActiveTab('system')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'system'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiDatabase className="inline mr-2" />
              System Settings
            </button>
          )}
        </nav>
      </div>

      {/* Profile Settings Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">Profile Settings</h2>
          <form onSubmit={handleUserSettingsSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={userSettings.name}
                  onChange={handleUserSettingsChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={userSettings.email}
                  onChange={handleUserSettingsChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <input
                  type="text"
                  value={user.role}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Theme Preference
                </label>
                <select
                  name="theme"
                  value={userSettings.theme}
                  onChange={handleUserSettingsChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <FiSave className="mr-2" />
                Save Profile Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* System Settings Tab (Admin Only) */}
      {activeTab === 'system' && isAdmin && (
        <div className="space-y-6">
          {/* Company Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Company Information</h2>
            <form onSubmit={handleAdminSettingsSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={formData.company?.name || ''}
                    onChange={(e) => handleInputChange('company', 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logo
                  </label>
                  <div className="flex items-center space-x-4">
                    {formData.company?.logo ? (
                      <img src={formData.company.logo} alt="Company Logo" className="h-16 w-16 object-contain" />
                    ) : (
                      <div className="h-16 w-16 bg-gray-200 rounded-md flex items-center justify-center">
                        <FiImage className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label
                        htmlFor="logo-upload"
                        className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <FiUpload className="mr-2" />
                        Upload Logo
                      </label>
                      <p className="mt-1 text-sm text-gray-500">
                        PNG, JPG up to 2MB
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.company?.phone || ''}
                    onChange={(e) => handleInputChange('company', 'phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.company?.email || ''}
                    onChange={(e) => handleInputChange('company', 'email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.company?.website || ''}
                    onChange={(e) => handleInputChange('company', 'website', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={formData.company?.gstNumber || ''}
                    onChange={(e) => handleInputChange('company', 'gstNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    value={formData.company?.panNumber || ''}
                    onChange={(e) => handleInputChange('company', 'panNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </form>
          </div>
          
          {/* Invoice Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Invoice Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Prefix
                </label>
                <input
                  type="text"
                  value={formData.invoice?.prefix || 'INV'}
                  onChange={(e) => handleInputChange('invoice', 'prefix', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Number
                </label>
                <input
                  type="number"
                  value={formData.invoice?.startNumber || 1}
                  onChange={(e) => handleInputChange('invoice', 'startNumber', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Due Days
                </label>
                <input
                  type="number"
                  value={formData.invoice?.defaultDueDays || 30}
                  onChange={(e) => handleInputChange('invoice', 'defaultDueDays', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Terms
                </label>
                <textarea
                  value={formData.invoice?.terms || ''}
                  onChange={(e) => handleInputChange('invoice', 'terms', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter default terms and conditions for invoices"
                />
              </div>

            </div>
            
            <h3 className="text-lg font-medium mt-6 mb-4">Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.invoice?.bankDetails?.bankName || ''}
                  onChange={(e) => handleNestedInputChange('invoice', 'bankDetails', 'bankName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={formData.invoice?.bankDetails?.accountNumber || ''}
                  onChange={(e) => handleNestedInputChange('invoice', 'bankDetails', 'accountNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={formData.invoice?.bankDetails?.ifscCode || ''}
                  onChange={(e) => handleNestedInputChange('invoice', 'bankDetails', 'ifscCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={formData.invoice?.bankDetails?.accountHolderName || ''}
                  onChange={(e) => handleNestedInputChange('invoice', 'bankDetails', 'accountHolderName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <input
                  type="text"
                  value={formData.invoice?.bankDetails?.branch || ''}
                  onChange={(e) => handleNestedInputChange('invoice', 'bankDetails', 'branch', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          {/* Tax Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Tax Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default GST (%)
                </label>
                <input
                  type="number"
                  value={formData.tax?.defaultGST || 18}
                  onChange={(e) => handleInputChange('tax', 'defaultGST', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CGST (%)
                </label>
                <input
                  type="number"
                  value={formData.tax?.cgst || 9}
                  onChange={(e) => handleInputChange('tax', 'cgst', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SGST (%)
                </label>
                <input
                  type="number"
                  value={formData.tax?.sgst || 9}
                  onChange={(e) => handleInputChange('tax', 'sgst', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IGST (%)
                </label>
                <input
                  type="number"
                  value={formData.tax?.igst || 18}
                  onChange={(e) => handleInputChange('tax', 'igst', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Theme Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Theme Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Color
                </label>
                <div className="flex items-center">
                  <input
                    type="color"
                    value={formData.theme?.primaryColor || '#3b82f6'}
                    onChange={(e) => handleInputChange('theme', 'primaryColor', e.target.value)}
                    className="w-12 h-12 border border-gray-300 rounded-md cursor-pointer"
                  />
                  <span className="ml-3 text-sm text-gray-500">
                    {formData.theme?.primaryColor || '#3b82f6'}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secondary Color
                </label>
                <div className="flex items-center">
                  <input
                    type="color"
                    value={formData.theme?.secondaryColor || '#10b981'}
                    onChange={(e) => handleInputChange('theme', 'secondaryColor', e.target.value)}
                    className="w-12 h-12 border border-gray-300 rounded-md cursor-pointer"
                  />
                  <span className="ml-3 text-sm text-gray-500">
                    {formData.theme?.secondaryColor || '#10b981'}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Theme Mode
                </label>
                <select
                  value={formData.theme?.mode || 'light'}
                  onChange={(e) => handleInputChange('theme', 'mode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>
          </div>

          {/* Backup Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Backup Settings</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Automatic Backups</h3>
                  <p className="text-sm text-gray-500">Enable automatic database backups</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleChange('backup', 'enabled')}
                  className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-gray-200"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.backup?.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              
              {formData.backup?.enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Backup Frequency
                  </label>
                  <select
                    value={formData.backup?.frequency || 'daily'}
                    onChange={(e) => handleInputChange('backup', 'frequency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAdminSettingsSubmit}
              disabled={loading}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <FiSave className="mr-2" />
              Save System Settings
            </button>
          </div>
        </div>
      )}
      
      {/* Access Denied Message for Non-Admin Users */}
      {activeTab === 'system' && !isAdmin && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiSettings className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Access denied. System settings are only accessible to administrators.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;