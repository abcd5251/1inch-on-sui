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
    title: '通用设置',
    description: '基本偏好和界面设置',
    icon: '⚙️'
  },
  {
    id: 'trading',
    title: '交易设置',
    description: '交易相关的默认参数',
    icon: '💱'
  },
  {
    id: 'notifications',
    title: '通知设置',
    description: '订单状态和系统通知',
    icon: '🔔'
  },
  {
    id: 'security',
    title: '安全设置',
    description: '钱包连接和安全选项',
    icon: '🔒'
  },
  {
    id: 'advanced',
    title: '高级设置',
    description: '开发者选项和实验功能',
    icon: '🔬'
  }
];

export default function SettingsPage() {
  const {
    preferences,
    updatePreferences,
    selectedNetwork,
    setSelectedNetwork
  } = useFusion();
  
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
    // 这里应该保存设置到本地存储或后端
    console.log('保存设置:', tempSettings);
    // 可以显示成功提示
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
          默认网络
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
          主题
        </label>
        <select
          value={preferences.theme}
          onChange={(e) => updatePreferences({ theme: e.target.value as 'light' | 'dark' | 'auto' })}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="light">浅色</option>
          <option value="dark">深色</option>
          <option value="auto">跟随系统</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900">自动切换网络</div>
          <div className="text-sm text-gray-600">根据交易对自动切换到对应网络</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.autoSwitchNetwork}
            onChange={(e) => updatePreferences({ autoSwitchNetwork: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900">显示高级功能</div>
          <div className="text-sm text-gray-600">显示专家级交易选项和工具</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.showAdvancedFeatures}
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
          滑点容忍度 (%)
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
          交易期限 (分钟)
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
          Gas 价格策略
        </label>
        <select
          value={tempSettings.gasPrice}
          onChange={(e) => setTempSettings({ ...tempSettings, gasPrice: e.target.value })}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="slow">慢速 (节省费用)</option>
          <option value="standard">标准</option>
          <option value="fast">快速</option>
          <option value="custom">自定义</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900">自动批准代币</div>
          <div className="text-sm text-gray-600">自动批准常用代币的交易授权</div>
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
          <div className="font-medium text-gray-900">声音提醒</div>
          <div className="text-sm text-gray-600">交易完成时播放提示音</div>
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
          <div className="font-medium text-gray-900">邮件通知</div>
          <div className="text-sm text-gray-600">重要事件的邮件提醒</div>
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
          <div className="font-medium text-gray-900">推送通知</div>
          <div className="text-sm text-gray-600">浏览器推送通知</div>
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
            <h3 className="font-medium text-yellow-800">安全提醒</h3>
            <p className="text-sm text-yellow-700 mt-1">
              请确保只在受信任的设备上使用，并定期检查钱包连接状态。
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium text-gray-900">钱包连接状态</div>
            <div className="text-sm text-green-600">已连接 MetaMask</div>
          </div>
          <button className="text-red-600 hover:text-red-800 text-sm font-medium">
            断开连接
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium text-gray-900">会话超时</div>
            <div className="text-sm text-gray-600">30 分钟无操作后自动断开</div>
          </div>
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            修改
          </button>
        </div>
      </div>
    </div>
  );

  const renderAdvancedSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900">专家模式</div>
          <div className="text-sm text-gray-600">启用高级交易功能和详细信息</div>
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
          <div className="font-medium text-gray-900">测试网模式</div>
          <div className="text-sm text-gray-600">使用测试网络进行交易</div>
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
          <div className="font-medium text-gray-900">清除缓存数据</div>
          <div className="text-sm text-gray-600">清除本地存储的交易历史和设置</div>
        </button>

        <button className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
          <div className="font-medium text-gray-900">导出设置</div>
          <div className="text-sm text-gray-600">导出当前设置配置文件</div>
        </button>

        <button className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
          <div className="font-medium text-gray-900">导入设置</div>
          <div className="text-sm text-gray-600">从配置文件导入设置</div>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">设置</h1>
          <p className="text-gray-600">管理您的 Fusion 偏好设置和账户配置</p>
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
                保存设置
              </button>
              <button
                onClick={handleResetSettings}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                重置为默认
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}