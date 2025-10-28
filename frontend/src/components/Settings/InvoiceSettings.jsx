import { useState, useEffect } from 'react';
import { FiSave, FiUpload, FiRefreshCw } from 'react-icons/fi';
import API from '../../api';
import { toast } from 'react-toastify';

const InvoiceSettings = () => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    companyInfo: {
      name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      email: '',
      gstin: '',
      pan: '',
      logoUrl: ''
    },
    bankDetails: {
      bankName: '',
      accountName: '',
      accountNumber: '',
      ifscCode: '',
      branch: '',
      upiId: ''
    },
    invoiceDefaults: {
      terms: '',
      notes: '',
      prefix: 'INV',
      dateFormat: 'DD/MM/YYYY'
    },
    qrCode: {
      enabled: true,
      size: 100,
      includeAmount: true
    },
    theme: {
      primaryColor: '#1e40af',
      secondaryColor: '#374151',
      accentColor: '#f3f4f6',
      fontSizes: {
        companyName: 24,
        invoiceTitle: 14,
        headerText: 8,
        bodyText: 7,
        totalText: 9
      },
      logo: {
        enabled: false,
        url: '',
        width: 80,
        height: 40,
        position: 'left'
      },
      layout: {
        showBorder: false,
        borderColor: '#e5e7eb',
        showAlternateRows: true,
        compactMode: false
      }
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // Use the dedicated invoice settings API
      const response = await API.invoiceSettings.getAll();
      if (response.data.data) {
        const invoiceSettings = {
          companyInfo: response.data.data.companyInfo || {},
          bankDetails: response.data.data.bankDetails || {},
          invoiceDefaults: response.data.data.invoiceDefaults || {
            terms: '',
            notes: '',
            prefix: 'INV',
            dateFormat: 'DD/MM/YYYY'
          },
          qrCode: response.data.data.qrCode || {
            enabled: true,
            size: 100,
            includeAmount: true
          },
          theme: response.data.data.theme || {
            primaryColor: '#1e40af',
            secondaryColor: '#374151',
            accentColor: '#f3f4f6',
            fontSizes: {
              companyName: 24,
              invoiceTitle: 14,
              headerText: 8,
              bodyText: 7,
              totalText: 9
            },
            logo: {
              enabled: false,
              url: '',
              width: 80,
              height: 40,
              position: 'left'
            },
            layout: {
              showBorder: false,
              borderColor: '#e5e7eb',
              showAlternateRows: true,
              compactMode: false
            }
          }
        };
        setSettings(invoiceSettings);
      }
    } catch (error) {
      console.error('Error fetching invoice settings:', error);
      toast.error('Failed to load invoice settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleNestedInputChange = (section, nestedSection, field, value) => {
    setSettings(prev => ({
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      // Send the complete settings object to the invoice settings API
      await API.invoiceSettings.update(settings);
      toast.success('Invoice settings updated successfully');
    } catch (error) {
      console.error('Error updating invoice settings:', error);
      toast.error('Failed to update invoice settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFromSettings = async () => {
    setLoading(true);
    
    try {
      const response = await API.invoiceSettings.syncFromSettings();
      setSettings(response.data.data);
      toast.success('Invoice settings synced from general settings!');
    } catch (error) {
      console.error('Error syncing settings:', error);
      toast.error('Failed to sync settings from general settings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Invoice Settings</h2>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Company Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={settings.companyInfo.name}
                  onChange={(e) => handleInputChange('companyInfo', 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={settings.companyInfo.phone}
                  onChange={(e) => handleInputChange('companyInfo', 'phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={settings.companyInfo.address}
                  onChange={(e) => handleInputChange('companyInfo', 'address', e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={settings.companyInfo.city}
                  onChange={(e) => handleInputChange('companyInfo', 'city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={settings.companyInfo.state}
                  onChange={(e) => handleInputChange('companyInfo', 'state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  value={settings.companyInfo.pincode}
                  onChange={(e) => handleInputChange('companyInfo', 'pincode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={settings.companyInfo.email}
                  onChange={(e) => handleInputChange('companyInfo', 'email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GSTIN
                </label>
                <input
                  type="text"
                  value={settings.companyInfo.gstin}
                  onChange={(e) => handleInputChange('companyInfo', 'gstin', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PAN
                </label>
                <input
                  type="text"
                  value={settings.companyInfo.pan}
                  onChange={(e) => handleInputChange('companyInfo', 'pan', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo URL
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={settings.companyInfo.logoUrl}
                    onChange={(e) => handleInputChange('companyInfo', 'logoUrl', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    className="px-3 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 flex items-center"
                  >
                    <FiUpload className="mr-1" /> Upload
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bank Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={settings.bankDetails.bankName}
                  onChange={(e) => handleInputChange('bankDetails', 'bankName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  value={settings.bankDetails.accountName}
                  onChange={(e) => handleInputChange('bankDetails', 'accountName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={settings.bankDetails.accountNumber}
                  onChange={(e) => handleInputChange('bankDetails', 'accountNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={settings.bankDetails.ifscCode}
                  onChange={(e) => handleInputChange('bankDetails', 'ifscCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <input
                  type="text"
                  value={settings.bankDetails.branch}
                  onChange={(e) => handleInputChange('bankDetails', 'branch', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UPI ID
                </label>
                <input
                  type="text"
                  value={settings.bankDetails.upiId}
                  onChange={(e) => handleInputChange('bankDetails', 'upiId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          {/* Invoice Defaults */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Invoice Defaults</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Terms & Conditions
                </label>
                <textarea
                  value={settings.invoiceDefaults.terms}
                  onChange={(e) => handleInputChange('invoiceDefaults', 'terms', e.target.value)}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={settings.invoiceDefaults.notes}
                  onChange={(e) => handleInputChange('invoiceDefaults', 'notes', e.target.value)}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Prefix
                </label>
                <input
                  type="text"
                  value={settings.invoiceDefaults.prefix}
                  onChange={(e) => handleInputChange('invoiceDefaults', 'prefix', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Format
                </label>
                <select
                  value={settings.invoiceDefaults.dateFormat}
                  onChange={(e) => handleInputChange('invoiceDefaults', 'dateFormat', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* QR Code Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">QR Code Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="qrEnabled"
                  checked={settings.qrCode.enabled}
                  onChange={(e) => handleNestedInputChange('qrCode', 'enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="qrEnabled" className="ml-2 block text-sm text-gray-700">
                  Enable QR Code
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Size (px)
                </label>
                <input
                  type="number"
                  min="50"
                  max="200"
                  value={settings.qrCode.size}
                  onChange={(e) => handleNestedInputChange('qrCode', 'size', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="qrIncludeAmount"
                  checked={settings.qrCode.includeAmount}
                  onChange={(e) => handleNestedInputChange('qrCode', 'includeAmount', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="qrIncludeAmount" className="ml-2 block text-sm text-gray-700">
                  Include Amount in QR
                </label>
              </div>
            </div>
          </div>
          
          {/* Theme Customization */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Theme Customization</h3>
            
            {/* Colors */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-700 mb-3">Colors</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Color
                  </label>
                  <input
                    type="color"
                    value={settings.theme.primaryColor}
                    onChange={(e) => handleNestedInputChange('theme', 'primaryColor', e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secondary Color
                  </label>
                  <input
                    type="color"
                    value={settings.theme.secondaryColor}
                    onChange={(e) => handleNestedInputChange('theme', 'secondaryColor', e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Accent Color
                  </label>
                  <input
                    type="color"
                    value={settings.theme.accentColor}
                    onChange={(e) => handleNestedInputChange('theme', 'accentColor', e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Font Sizes */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-700 mb-3">Font Sizes</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="number"
                    min="12"
                    max="36"
                    value={settings.theme.fontSizes.companyName}
                    onChange={(e) => handleNestedInputChange('theme', 'fontSizes', { ...settings.theme.fontSizes, companyName: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Title
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="24"
                    value={settings.theme.fontSizes.invoiceTitle}
                    onChange={(e) => handleNestedInputChange('theme', 'fontSizes', { ...settings.theme.fontSizes, invoiceTitle: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Body Text
                  </label>
                  <input
                    type="number"
                    min="6"
                    max="12"
                    value={settings.theme.fontSizes.bodyText}
                    onChange={(e) => handleNestedInputChange('theme', 'fontSizes', { ...settings.theme.fontSizes, bodyText: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Logo Settings */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-700 mb-3">Logo Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="logoEnabled"
                    checked={settings.theme.logo.enabled}
                    onChange={(e) => handleNestedInputChange('theme', 'logo', { ...settings.theme.logo, enabled: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="logoEnabled" className="ml-2 block text-sm text-gray-700">
                    Enable Logo
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={settings.theme.logo.url}
                    onChange={(e) => handleNestedInputChange('theme', 'logo', { ...settings.theme.logo, url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    min="40"
                    max="200"
                    value={settings.theme.logo.width}
                    onChange={(e) => handleNestedInputChange('theme', 'logo', { ...settings.theme.logo, width: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <select
                    value={settings.theme.logo.position}
                    onChange={(e) => handleNestedInputChange('theme', 'logo', { ...settings.theme.logo, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Layout Options */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-700 mb-3">Layout Options</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showAlternateRows"
                    checked={settings.theme.layout.showAlternateRows}
                    onChange={(e) => handleNestedInputChange('theme', 'layout', { ...settings.theme.layout, showAlternateRows: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="showAlternateRows" className="ml-2 block text-sm text-gray-700">
                    Show Alternate Row Colors
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="compactMode"
                    checked={settings.theme.layout.compactMode}
                    onChange={(e) => handleNestedInputChange('theme', 'layout', { ...settings.theme.layout, compactMode: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="compactMode" className="ml-2 block text-sm text-gray-700">
                    Compact Mode
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Save Button */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleSyncFromSettings}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <FiRefreshCw className="mr-2" />
              Sync from General Settings
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <FiSave className="mr-2" />
              Save Invoice Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvoiceSettings;