"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

// 类型定义
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
 * 1inch Fusion Protocol 主页面
 * 展示现代化的管理界面布局
 */
export default function FusionPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isConnected, setIsConnected] = useState(true); // 模拟连接状态

  // 页面加载效果
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // 添加通知
  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp">) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 5));

    // 自动移除通知
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, 5000);
  }, []);

  // 移除通知
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // 快速操作
  const quickActions: QuickAction[] = [
    {
      id: "new-order",
      title: "创建订单",
      description: "创建新的跨链交易订单",
      icon: "➕",
      action: () => {
        setActiveTab("trading");
        addNotification({ type: "info", message: "切换到交易页面" });
      },
      color: "bg-blue-500",
    },
    {
      id: "view-analytics",
      title: "查看分析",
      description: "查看交易数据和统计",
      icon: "📊",
      action: () => {
        setActiveTab("analytics");
        addNotification({ type: "info", message: "切换到分析页面" });
      },
      color: "bg-green-500",
    },
    {
      id: "bridge-status",
      title: "桥接状态",
      description: "检查跨链桥接状态",
      icon: "🌉",
      action: () => {
        setActiveTab("bridge");
        addNotification({ type: "info", message: "切换到桥接页面" });
      },
      color: "bg-purple-500",
    },
    {
      id: "order-history",
      title: "订单历史",
      description: "查看历史订单记录",
      icon: "📋",
      action: () => {
        setActiveTab("orders");
        addNotification({ type: "info", message: "切换到订单页面" });
      },
      color: "bg-orange-500",
    },
  ];

  // 更新活动时间
  const updateActivity = useCallback(() => {
    setLastActivity(new Date());
  }, []);

  // 模拟操作
  const handleDemoAction = useCallback(
    (action: string) => {
      setIsLoading(true);
      updateActivity();
      setTimeout(() => {
        setIsLoading(false);
        addNotification({
          type: "success",
          message: `${action} 操作完成！`,
        });
      }, 1500);
    },
    [addNotification, updateActivity],
  );

  // 页面加载状态
  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">加载 Fusion Protocol</h2>
          <p className="text-gray-600">正在初始化管理界面...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 通知系统 */}
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
        {/* 侧边栏 */}
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
              { id: "overview", label: "概览", icon: "🏠" },
              { id: "trading", label: "交易", icon: "💱" },
              { id: "orders", label: "订单", icon: "📋" },
              { id: "analytics", label: "分析", icon: "📊" },
              { id: "bridge", label: "桥接", icon: "🌉" },
              { id: "settings", label: "设置", icon: "⚙️" },
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

        {/* 主内容区域 */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {/* 概览页面 */}
            {activeTab === "overview" && (
              <div className="space-y-8">
                {/* 页面头部 */}
                <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-800 mb-2">Fusion Protocol 管理中心</h1>
                      <p className="text-gray-600">管理您的跨链交易和订单</p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {isConnected ? "✅ 已连接" : "❌ 未连接"}
                      </div>
                      <p className="text-sm text-gray-500 mt-2">最后活动: {lastActivity.toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>

                {/* 快速操作 */}
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

                {/* 统计卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">总交易量</h3>
                    <p className="text-3xl font-bold text-blue-600">$1,234,567</p>
                    <p className="text-sm text-green-600 mt-1">↗ +12.5% 本月</p>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">活跃订单</h3>
                    <p className="text-3xl font-bold text-purple-600">42</p>
                    <p className="text-sm text-blue-600 mt-1">↗ +3 今日</p>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">成功率</h3>
                    <p className="text-3xl font-bold text-green-600">98.7%</p>
                    <p className="text-sm text-green-600 mt-1">↗ +0.2% 本周</p>
                  </div>
                </div>

                {/* 最近活动 */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">最近活动</h3>
                  <div className="space-y-3">
                    {[
                      { id: 1, action: "创建跨链订单", time: "2分钟前", status: "成功" },
                      { id: 2, action: "桥接 ETH 到 Sui", time: "15分钟前", status: "进行中" },
                      { id: 3, action: "取消订单 #1234", time: "1小时前", status: "已完成" },
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
                              activity.status === "成功"
                                ? "text-green-600"
                                : activity.status === "进行中"
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

            {/* 交易页面 */}
            {activeTab === "trading" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">多网络交易</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-700">创建新订单</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">源代币</label>
                          <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option>ETH</option>
                            <option>USDC</option>
                            <option>SUI</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">目标代币</label>
                          <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option>SUI</option>
                            <option>USDC</option>
                            <option>ETH</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">数量</label>
                          <input
                            type="number"
                            placeholder="0.0"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <button
                          onClick={() => handleDemoAction("创建订单")}
                          disabled={isLoading}
                          className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                          {isLoading ? "创建中..." : "创建订单"}
                        </button>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">交易预览</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">汇率</span>
                          <span className="font-medium">1 ETH = 2,450 SUI</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">手续费</span>
                          <span className="font-medium">0.1%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">预计时间</span>
                          <span className="font-medium">2-5 分钟</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 订单页面 */}
            {activeTab === "orders" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">订单管理</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">订单ID</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">类型</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">金额</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">状态</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { id: "#1234", type: "ETH → SUI", amount: "1.5 ETH", status: "完成", time: "2小时前" },
                          { id: "#1235", type: "USDC → SUI", amount: "1000 USDC", status: "进行中", time: "30分钟前" },
                          { id: "#1236", type: "SUI → ETH", amount: "5000 SUI", status: "待确认", time: "10分钟前" },
                        ].map(order => (
                          <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium text-blue-600">{order.id}</td>
                            <td className="py-3 px-4">{order.type}</td>
                            <td className="py-3 px-4">{order.amount}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  order.status === "完成"
                                    ? "bg-green-100 text-green-800"
                                    : order.status === "进行中"
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

            {/* 分析页面 */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">数据分析</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">交易量趋势</h3>
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
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">网络分布</h3>
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

            {/* 桥接页面 */}
            {activeTab === "bridge" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">跨链桥接</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">桥接状态</h3>
                      <div className="space-y-4">
                        {[
                          { network: "Ethereum", status: "正常", latency: "2.3s" },
                          { network: "Sui", status: "正常", latency: "1.8s" },
                          { network: "Polygon", status: "维护中", latency: "N/A" },
                        ].map(bridge => (
                          <div
                            key={bridge.network}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-gray-800">{bridge.network}</p>
                              <p className="text-sm text-gray-500">延迟: {bridge.latency}</p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${
                                bridge.status === "正常"
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
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">快速桥接</h3>
                      <div className="space-y-4">
                        <button
                          onClick={() => handleDemoAction("ETH 桥接")}
                          className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-blue-800">ETH → Sui</span>
                            <span className="text-blue-600">→</span>
                          </div>
                        </button>
                        <button
                          onClick={() => handleDemoAction("SUI 桥接")}
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

            {/* 设置页面 */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">系统设置</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">通知设置</h3>
                      <div className="space-y-3">
                        {[
                          { label: "交易完成通知", enabled: true },
                          { label: "价格警报", enabled: false },
                          { label: "系统维护通知", enabled: true },
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
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">安全设置</h3>
                      <div className="space-y-3">
                        <button
                          onClick={() => handleDemoAction("密码更新")}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-left"
                        >
                          更改密码
                        </button>
                        <button
                          onClick={() => handleDemoAction("双因素认证")}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-left"
                        >
                          启用双因素认证
                        </button>
                        <button
                          onClick={() => handleDemoAction("API密钥")}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-left"
                        >
                          管理 API 密钥
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
