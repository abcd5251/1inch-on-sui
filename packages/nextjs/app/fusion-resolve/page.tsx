"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

// Type definitions
type TabType = "overview" | "trading" | "orders" | "analytics" | "bridge" | "settings";

type NotificationType = "success" | "error" | "warning" | "info";

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: Date;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: () => void;
  color: string;
}

/**
 * 1inch Fusion Protocol main page
 * Displays modern administrative interface layout
 */
export default function FusionPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isConnected, setIsConnected] = useState(true); // Simulate connection status

  // Page loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Add notification
  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp">) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 5));

    // Auto remove notification
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, 5000);
  }, []);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Quick actions
  const quickActions: QuickAction[] = [
    {
      id: "new-order",
      title: "Create Order",
      description: "Create new cross-chain trading order",
      icon: "➕",
      action: () => {
        setActiveTab("trading");
        addNotification({ type: "info", message: "Switch to trading page" });
      },
      color: "bg-blue-500",
    },
    {
      id: "view-analytics",
      title: "View Analytics",
      description: "View trading data and statistics",
      icon: "📊",
      action: () => {
        setActiveTab("analytics");
        addNotification({ type: "info", message: "Switch to analytics page" });
      },
      color: "bg-green-500",
    },
    {
      id: "bridge-status",
      title: "Bridge Status",
      description: "Check cross-chain bridge status",
      icon: "🌉",
      action: () => {
        setActiveTab("bridge");
        addNotification({ type: "info", message: "Switch to bridge page" });
      },
      color: "bg-purple-500",
    },
    {
      id: "order-history",
      title: "Order History",
      description: "View historical order records",
      icon: "📋",
      action: () => {
        setActiveTab("orders");
        addNotification({ type: "info", message: "Switch to orders page" });
      },
      color: "bg-orange-500",
    },
  ];

  // Update activity time
  const updateActivity = useCallback(() => {
    setLastActivity(new Date());
  }, []);

  // Simulate operation
  const handleDemoAction = useCallback(
    (action: string) => {
      setIsLoading(true);
      updateActivity();
      setTimeout(() => {
        setIsLoading(false);
        addNotification({
          type: "success",
          message: `${action} operation completed!`,
        });
      }, 1500);
    },
    [addNotification, updateActivity],
  );

  // Page loading state
  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Fusion Protocol</h2>
          <p className="text-gray-600">Initializing admin interface...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Notification system */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`p-4 rounded-xl shadow-lg max-w-sm transform transition-all duration-300 backdrop-blur-sm ${
              notification.type === "success"
                ? "bg-green-500/90 text-white"
                : notification.type === "error"
                  ? "bg-red-500/90 text-white"
                  : notification.type === "warning"
                    ? "bg-yellow-500/90 text-black"
                    : "bg-blue-500/90 text-white"
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{notification.message}</p>
                <p className="text-sm opacity-75">{notification.timestamp.toLocaleTimeString()}</p>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="ml-2 text-lg hover:opacity-75 transition-opacity"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex h-screen">
        {/* Sidebar */}
        <div
          className={`${sidebarCollapsed ? "w-16" : "w-64"} bg-white shadow-xl transition-all duration-300 flex flex-col`}
        >
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && <h1 className="text-xl font-bold text-gray-800">Fusion Protocol</h1>}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {sidebarCollapsed ? "→" : "←"}
              </button>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {[
              { id: "overview", label: "Overview", icon: "🏠" },
              { id: "trading", label: "Trading", icon: "💱" },
              { id: "orders", label: "Orders", icon: "📋" },
              { id: "analytics", label: "Analytics", icon: "📊" },
              { id: "bridge", label: "Bridge", icon: "🌉" },
              { id: "settings", label: "Settings", icon: "⚙️" },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === item.id ? "bg-blue-500 text-white shadow-lg" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {/* Overview Page */}
            {activeTab === "overview" && (
              <div className="space-y-8">
                {/* Page Header */}
                <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-800 mb-2">Fusion Protocol Management Center</h1>
                      <p className="text-gray-600">Manage your cross-chain trading and orders</p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {isConnected ? "✅ Connected" : "❌ Disconnected"}
                      </div>
                      <p className="text-sm text-gray-500 mt-2">Last Activity: {lastActivity.toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {quickActions.map(action => (
                    <button
                      key={action.id}
                      onClick={action.action}
                      className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 text-left group"
                    >
                      <div
                        className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                      >
                        <span className="text-white text-xl">{action.icon}</span>
                      </div>
                      <h3 className="font-semibold text-gray-800 mb-2">{action.title}</h3>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </button>
                  ))}
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Volume</h3>
                    <p className="text-3xl font-bold text-blue-600">$1,234,567</p>
                    <p className="text-sm text-green-600 mt-1">↗ +12.5% This Month</p>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Active Orders</h3>
                    <p className="text-3xl font-bold text-purple-600">42</p>
                    <p className="text-sm text-blue-600 mt-1">↗ +3 Today</p>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Success Rate</h3>
                    <p className="text-3xl font-bold text-green-600">98.7%</p>
                    <p className="text-sm text-green-600 mt-1">↗ +0.2% This Week</p>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {[
                      { id: 1, action: "Create Cross-chain Order", time: "2025-07-27 12:28:00", status: "Success" },
    { id: 2, action: "Bridge ETH to Sui", time: "2025-07-27 12:15:00", status: "In Progress" },
    { id: 3, action: "Cancel Order #1234", time: "2025-07-27 11:30:00", status: "Completed" },
                    ].map(activity => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                      >
                        <div>
                          <p className="font-medium text-gray-800">{activity.action}</p>
                          <p className="text-sm text-gray-500">{activity.time}</p>
                        </div>
                        <div>
                          <p
                            className={`text-sm font-medium ${
                              activity.status === "Success"
                                ? "text-green-600"
                                : activity.status === "In Progress"
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }`}
                          >
                            {activity.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Trading Page */}
            {activeTab === "trading" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Multi-Network Trading</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-700">Create New Order</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Source Token</label>
                          <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option>ETH</option>
                            <option>USDC</option>
                            <option>SUI</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Target Token</label>
                          <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option>SUI</option>
                            <option>USDC</option>
                            <option>ETH</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                          <input
                            type="number"
                            placeholder="0.0"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <button
                          onClick={() => handleDemoAction("Create Order")}
                          disabled={isLoading}
                          className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                          {isLoading ? "Creating..." : "Create Order"}
                        </button>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">Trade Preview</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Exchange Rate</span>
                          <span className="font-medium">1 ETH = 2,450 SUI</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Fee</span>
                          <span className="font-medium">0.1%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Estimated Time</span>
                          <span className="font-medium">2-5 minutes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Orders Page */}
            {activeTab === "orders" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Order Management</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Order ID</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { id: "#1234", type: "ETH → SUI", amount: "1.5 ETH", status: "Completed", time: "2025-07-27 10:30:00" },
    { id: "#1235", type: "USDC → SUI", amount: "1000 USDC", status: "In Progress", time: "2025-07-27 12:00:00" },
    { id: "#1236", type: "SUI → ETH", amount: "5000 SUI", status: "Pending", time: "2025-07-27 12:20:00" },
                        ].map(order => (
                          <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium text-blue-600">{order.id}</td>
                            <td className="py-3 px-4">{order.type}</td>
                            <td className="py-3 px-4">{order.amount}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  order.status === "Completed"
                                    ? "bg-green-100 text-green-800"
                                    : order.status === "In Progress"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-500">{order.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Page */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Data Analytics</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Volume Trends</h3>
                      <div className="h-48 flex items-end justify-between space-x-2">
                        {[40, 65, 45, 80, 55, 70, 85].map((height, index) => (
                          <div
                            key={index}
                            className="bg-blue-500 rounded-t"
                            style={{ height: `${height}%`, width: "12%" }}
                          ></div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Network Distribution</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Ethereum</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full" style={{ width: "65%" }}></div>
                            </div>
                            <span className="text-sm font-medium">65%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Sui</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full" style={{ width: "35%" }}></div>
                            </div>
                            <span className="text-sm font-medium">35%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bridge Page */}
            {activeTab === "bridge" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Cross-chain Bridge</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">Bridge Status</h3>
                      <div className="space-y-4">
                        {[
                          { network: "Ethereum", status: "Normal", latency: "2.3s" },
                          { network: "Sui", status: "Normal", latency: "1.8s" },
                          { network: "Polygon", status: "Maintenance", latency: "N/A" },
                        ].map(bridge => (
                          <div
                            key={bridge.network}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-gray-800">{bridge.network}</p>
                              <p className="text-sm text-gray-500">Latency: {bridge.latency}</p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${
                                bridge.status === "Normal"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {bridge.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">Quick Bridge</h3>
                      <div className="space-y-4">
                        <button
                          onClick={() => handleDemoAction("ETH Bridge")}
                          className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-blue-800">ETH → Sui</span>
                            <span className="text-blue-600">→</span>
                          </div>
                        </button>
                        <button
                          onClick={() => handleDemoAction("SUI Bridge")}
                          className="w-full p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-green-800">SUI → ETH</span>
                            <span className="text-green-600">→</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Page */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">System Settings</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">Notification Settings</h3>
                      <div className="space-y-3">
                        {[
                          { label: "Trade Completion Notifications", enabled: true },
                          { label: "Price Alerts", enabled: false },
                          { label: "System Maintenance Notifications", enabled: true },
                        ].map((setting, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-700">{setting.label}</span>
                            <button
                              className={`w-12 h-6 rounded-full transition-colors ${
                                setting.enabled ? "bg-blue-500" : "bg-gray-300"
                              }`}
                            >
                              <div
                                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                                  setting.enabled ? "translate-x-6" : "translate-x-1"
                                }`}
                              ></div>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">Security Settings</h3>
                      <div className="space-y-3">
                        <button
                          onClick={() => handleDemoAction("Password Update")}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-left"
                        >
                          Change Password
                        </button>
                        <button
                          onClick={() => handleDemoAction("Two-factor Authentication")}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-left"
                        >
                          Enable Two-factor Authentication
                        </button>
                        <button
                          onClick={() => handleDemoAction("API Keys")}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-left"
                        >
                          Manage API Keys
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
