import { useState, useEffect } from 'react'
import { 
  Settings as SettingsIcon, 
  User, 
  Building2, 
  Bell, 
  Shield, 
  CreditCard,
  Save,
  Edit,
  Plus,
  Trash2
} from 'lucide-react'
import { useNotification } from '../components/Notification'
import { useAuth } from '../components/AuthContext'
import Notification from '../components/Notification'

interface HotelSettings {
  name: string
  address: string
  phone: string
  email: string
  website: string
  timezone: string
  currency: string
  checkInTime: string
  checkOutTime: string
  taxRate: number
  depositPercentage: number
}

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'staff' | 'accounts'
  status: 'active' | 'inactive'
  lastLogin: string
}

const Settings = () => {
  const { hasPermission } = useAuth()
  const [activeTab, setActiveTab] = useState('general')
  const { notification, showNotification, hideNotification } = useNotification()
  const [settings, setSettings] = useState({
    hotelName: 'Hotel Diplomat Residency (HDR)',
    address: '123 MG Road, Bangalore, Karnataka 560001',
    phone: '+91 80 1234 5678',
    email: 'info@hoteldiplomatresidency.com',
    website: 'www.hoteldiplomatresidency.com',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    taxRate: 18,
    serviceCharge: 5,
    depositPercentage: 20,
    cancellationPolicy: 'Free cancellation up to 24 hours before check-in',
    wifiPassword: 'HDR2024',
    emergencyContact: '+91 98765 43210',
    maintenanceContact: '+91 87654 32109'
  })

  const [originalSettings, setOriginalSettings] = useState({ ...settings })
  const [hasChanges, setHasChanges] = useState(false)

  // Track changes
  useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings))
  }, [settings, originalSettings])

  const handleSettingChange = (key: string, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSaveSettings = () => {
    // Validate required fields
    if (!settings.hotelName || !settings.address || !settings.phone) {
      showNotification('error', 'Please fill all mandatory fields (Hotel Name, Address, Phone)')
      return
    }

    // Save settings (in a real app, this would be an API call)
    setOriginalSettings({ ...settings })
    setHasChanges(false)
    
    // Show success message
    showNotification('success', 'Settings saved successfully!')
  }

  const handleResetSettings = () => {
    setSettings({ ...originalSettings })
    setHasChanges(false)
  }

  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      name: 'John Manager',
      email: 'john.manager@hoteldiplomatresidency.com',
      role: 'manager',
      status: 'active',
      lastLogin: '2024-01-15 10:30'
    },
    {
      id: '2',
      name: 'Sarah Staff',
      email: 'sarah.staff@hoteldiplomatresidency.com',
      role: 'staff',
      status: 'active',
      lastLogin: '2024-01-15 09:15'
    },
    {
      id: '3',
      name: 'Mike Admin',
      email: 'mike.admin@hoteldiplomatresidency.com',
      role: 'admin',
      status: 'active',
      lastLogin: '2024-01-14 16:45'
    }
  ])

  const [showAddUser, setShowAddUser] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const tabs = [
    { id: 'general', name: 'General', icon: Building2 },
    { id: 'users', name: 'Users', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'billing', name: 'Billing', icon: CreditCard }
  ]

  const handleAddUser = (userData: Partial<User>) => {
    const newUser: User = {
      id: Date.now().toString(),
      name: userData.name || '',
      email: userData.email || '',
      role: userData.role || 'staff',
      status: 'active',
      lastLogin: new Date().toISOString().slice(0, 16).replace('T', ' ')
    }
    setUsers([...users, newUser])
    setShowAddUser(false)
  }

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter(user => user.id !== userId))
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'text-red-600 bg-red-100'
      case 'manager':
        return 'text-blue-600 bg-blue-100'
      case 'staff':
        return 'text-green-600 bg-green-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'text-green-600 bg-green-100' 
      : 'text-gray-600 bg-gray-100'
  }

  // Check if user has permission to access settings
  if (!hasPermission('settings:view')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don&apos;t have permission to access the settings section.
          </p>
          <p className="text-sm text-gray-500">
            Only administrators can modify system settings.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage hotel configuration and system preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Hotel Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hotel Name</label>
                  <input
                    type="text"
                    value={settings.hotelName}
                    onChange={(e) => handleSettingChange('hotelName', e.target.value)}
                    className="input-field mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => handleSettingChange('phone', e.target.value)}
                    className="input-field mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => handleSettingChange('email', e.target.value)}
                    className="input-field mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Website</label>
                  <input
                    type="text"
                    value={settings.website}
                    onChange={(e) => handleSettingChange('website', e.target.value)}
                    className="input-field mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <input
                    type="text"
                    value={settings.address}
                    onChange={(e) => handleSettingChange('address', e.target.value)}
                    className="input-field mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Operational Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timezone</label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => handleSettingChange('timezone', e.target.value)}
                    className="input-field mt-1"
                  >
                          <option value="Asia/Kolkata">India Standard Time (IST)</option>
      <option value="Asia/Dubai">Gulf Standard Time (GST)</option>
      <option value="Asia/Singapore">Singapore Time (SGT)</option>
      <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Currency</label>
                  <select
                    value={settings.currency}
                    onChange={(e) => handleSettingChange('currency', e.target.value)}
                    className="input-field mt-1"
                  >
                          <option value="INR">INR (₹)</option>
      <option value="USD">USD ($)</option>
      <option value="EUR">EUR (€)</option>
      <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Check-in Time</label>
                  <input
                    type="time"
                    value={settings.checkInTime}
                    onChange={(e) => handleSettingChange('checkInTime', e.target.value)}
                    className="input-field mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Check-out Time</label>
                  <input
                    type="time"
                    value={settings.checkOutTime}
                    onChange={(e) => handleSettingChange('checkOutTime', e.target.value)}
                    className="input-field mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.taxRate}
                    onChange={(e) => handleSettingChange('taxRate', parseFloat(e.target.value))}
                    className="input-field mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Deposit Percentage (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.depositPercentage}
                    onChange={(e) => handleSettingChange('depositPercentage', parseFloat(e.target.value))}
                    className="input-field mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button 
                onClick={handleSaveSettings} 
                disabled={!hasChanges}
                className={`btn-primary flex items-center ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </button>
              <button 
                onClick={handleResetSettings}
                disabled={!hasChanges}
                className={`btn-secondary ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Users Management */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">User Management</h3>
              <button 
                onClick={() => setShowAddUser(true)}
                className="btn-primary flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </button>
            </div>

            <div className="card">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastLogin}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => setEditingUser(user)}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Settings */}
        {activeTab === 'notifications' && (
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">SMS Notifications</h4>
                  <p className="text-sm text-gray-500">Receive notifications via SMS</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Booking Confirmations</h4>
                  <p className="text-sm text-gray-500">Notify when new bookings are made</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Session Timeout (minutes)</label>
                <input
                  type="number"
                  defaultValue={30}
                  className="input-field mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password Policy</label>
                <select className="input-field mt-1">
                  <option>Strong (8+ characters, mixed case, numbers, symbols)</option>
                  <option>Medium (6+ characters, mixed case, numbers)</option>
                  <option>Basic (4+ characters)</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-500">Require 2FA for all users</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Billing Settings */}
        {activeTab === 'billing' && (
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Billing Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Billing Address</label>
                <input
                  type="text"
                  defaultValue="123 Main Street, New York, NY 10001"
                  className="input-field mt-1"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tax ID</label>
                  <input
                    type="text"
                    defaultValue="12-3456789"
                    className="input-field mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Business License</label>
                  <input
                    type="text"
                    defaultValue="BL-123456"
                    className="input-field mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                <select className="input-field mt-1">
                  <option>Credit Card</option>
                  <option>Bank Transfer</option>
                  <option>Check</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <Notification
        type={notification.type}
        message={notification.message}
        isVisible={notification.isVisible}
        onClose={hideNotification}
        duration={notification.duration}
      />
    </div>
  )
}

export default Settings 