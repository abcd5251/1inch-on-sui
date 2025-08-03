'use client';

import { useState } from 'react';
import { useFusion } from '../context/FusionContext';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const settingsSections: SettingsSection[] = [
  {
    id: 'general',
    title: 'General Settings',
    description: 'Basic preferences and interface settings',
    icon: '⚙️'
  },
  {
    id: 'trading',
    title: 'Trading Settings',
    description: 'Default trading parameters',
    icon: '💱'
  },
  {
    id: 'notifications',
    title: 'Notification Settings',
    description: 'Order status and system notifications',
    icon: '🔔'
  },
  {
    id: 'security',
    title: 'Security Settings',
    description: 'Wallet connection and security options',
    icon: '🔒'
  },
  {
    id: 'advanced',
    title: 'Advanced Settings',
    description: 'Developer options and experimental features',
    icon: '🔬'
  }
];

export default function SettingsPage() {
  const {
    userPreferences,
    updatePreferences,
    selectedNetwork,
    setSelectedNetwork,
    isLoading
  } = useFusion();

  // If still loading, show loading state
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading settings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const [activeSection, setActiveSection] = useState<string>('general');
  const [tempSettings, setTempSettings] = useState({
    slippageTolerance: '0.5',
    transactionDeadline: '20',
    gasPrice: 'standard',
    autoApprove: false,
    soundEnabled: true,
    emailNotifications: true,
    pushNotifications: false,
    expertMode: false,
    testnetMode: true
  });

  const handleSaveSettings = () => {
    // Settings should be saved to local storage or backend here
    console.log('Save settings:', tempSettings);
    // Success notification can be shown here
  };

  const handleResetSettings = () => {
    setTempSettings({
      slippageTolerance: '0.5',
      transactionDeadline: '20',
      gasPrice: 'standard',
      autoApprove: false,
      soundEnabled: true,
      emailNotifications: true,
      pushNotifications: false,
      expertMode: false,
      testnetMode: true
    });
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Default Network
        </label>
        <select
          value={selectedNetwork}
          onChange={(e) => setSelectedNetwork(e.target.value as 'ethereum' | 'sui')}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="ethereum">Ethereum</option>
          <option value="sui">Sui</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Theme
        </label>
        <select
          value={userPreferences?.theme || 'light'}
          onChange={(e) => updatePreferences({ theme: e.target.value as 'light' | 'dark' | 'auto' })}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Follow System</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900">Auto Switch Network</div>
          <div className="text-sm text-gray-600">Automatically switch to corresponding network based on trading pair</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={userPreferences?.autoSwitchNetwork || false}
            onChange={(e) => updatePreferences({ autoSwitchNetwork: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900">Show Advanced Features</div>
          <div className="text-sm text-gray-600">Display expert-level trading options and tools</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={userPreferences?.showAdvancedFeatures || false}
            onChange={(e) => updatePreferences({ showAdvancedFeatures: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
    </div>
  );

  const renderTradingSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Slippage Tolerance (%)
        </label>
        <input
          type="number"
          value={tempSettings.slippageTolerance}
          onChange={(e) => setTempSettings({ ...tempSettings, slippageTolerance: e.target.value })}
          step="0.1"
          min="0.1"
          max="50"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Transaction Deadline (minutes)
        </label>
        <input
          type="number"
          value={tempSettings.transactionDeadline}
          onChange={(e) => setTempSettings({ ...tempSettings, transactionDeadline: e.target.value })}
          min="1"
          max="60"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Gas Price Strategy
        </label>
        <select
          value={tempSettings.gasPrice}
          onChange={(e) => setTempSettings({ ...tempSettings, gasPrice: e.target.value })}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="slow">Slow (Save Fees)</option>
          <option value="standard">Standard</option>
          <option value="fast">Fast</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900">Auto Approve Tokens</div>
          <div className="text-sm text-gray-600">Automatically approve transaction authorization for common tokens</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={tempSettings.autoApprove}
            onChange={(e) => setTempSettings({ ...tempSettings, autoApprove: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900">Sound Alerts</div>
          <div className="text-sm text-gray-600">Play notification sound when transaction completes</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={tempSettings.soundEnabled}
            onChange={(e) => setTempSettings({ ...tempSettings, soundEnabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900">Email Notifications</div>
          <div className="text-sm text-gray-600">Email alerts for important events</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={tempSettings.emailNotifications}
            onChange={(e) => setTempSettings({ ...tempSettings, emailNotifications: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900">Push Notifications</div>
          <div className="text-sm text-gray-600">Browser push notifications</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={tempSettings.pushNotifications}
            onChange={(e) => setTempSettings({ ...tempSettings, pushNotifications: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-xl">⚠️</div>
          <div>
            <h3 className="font-medium text-yellow-800">Security Reminder</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Please ensure you only use this on trusted devices and regularly check wallet connection status.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium text-gray-900">Wallet Connection Status</div>
            <div className="text-sm text-green-600">Connected to MetaMask</div>
          </div>
          <button className="text-red-600 hover:text-red-800 text-sm font-medium">
            Disconnect
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium text-gray-900">Session Timeout</div>
            <div className="text-sm text-gray-600">Automatically disconnect after 30 minutes of inactivity</div>
          </div>
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            Modify
          </button>
        </div>
      </div>
    </div>
  );

  const renderAdvancedSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900">Expert Mode</div>
          <div className="text-sm text-gray-600">Enable advanced trading features and detailed information</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={tempSettings.expertMode}
            onChange={(e) => setTempSettings({ ...tempSettings, expertMode: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900">Testnet Mode</div>
          <div className="text-sm text-gray-600">Use test networks for transactions</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={tempSettings.testnetMode}
            onChange={(e) => setTempSettings({ ...tempSettings, testnetMode: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <div className="space-y-4">
        <button className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
          <div className="font-medium text-gray-900">Clear Cache Data</div>
          <div className="text-sm text-gray-600">Clear locally stored transaction history and settings</div>
        </button>

        <button className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
          <div className="font-medium text-gray-900">Export Settings</div>
          <div className="text-sm text-gray-600">Export current settings configuration file</div>
        </button>

        <button className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
          <div className="font-medium text-gray-900">Import Settings</div>
          <div className="text-sm text-gray-600">Import settings from configuration file</div>
        </button>
      </div>
    </div>
  );

  const renderSettingsContent = () => {
    switch (activeSection) {
      case 'general': return renderGeneralSettings();
      case 'trading': return renderTradingSettings();
      case 'notifications': return renderNotificationSettings();
      case 'security': return renderSecuritySettings();
      case 'advanced': return renderAdvancedSettings();
      default: return renderGeneralSettings();
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-8 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your Fusion preferences and account configuration</p>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-1/3 bg-gray-50 p-6">
            <nav className="space-y-2">
              {settingsSections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left p-4 rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{section.icon}</span>
                    <div>
                      <div className="font-medium">{section.title}</div>
                      <div className="text-sm opacity-75">{section.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {settingsSections.find(s => s.id === activeSection)?.title}
              </h2>
              <p className="text-gray-600">
                {settingsSections.find(s => s.id === activeSection)?.description}
              </p>
            </div>

            {renderSettingsContent()}

            {/* Action Buttons */}
            <div className="mt-8 flex space-x-4">
              <button
                onClick={handleSaveSettings}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Save Settings
              </button>
              <button
                onClick={handleResetSettings}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Reset to Default
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}