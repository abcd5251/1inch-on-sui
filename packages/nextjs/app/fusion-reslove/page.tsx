"use client";

import { useEffect, useState, useCallback } from "react";

import { AnalyticsDashboard } from "~~/components/fusion/AnalyticsDashboard";
import { CrossChainBridgeStatus } from "~~/components/fusion/CrossChainBridgeStatus";
import { CrossChainOperations } from "~~/components/fusion/CrossChainOperations";
import { DutchAuctionVisualizer } from "~~/components/fusion/DutchAuctionVisualizer";
import {
  EnhancedOrderCreationForm,
  EnhancedOrderCreationFormData,
} from "~~/components/fusion/EnhancedOrderCreationForm";
import { MarketData } from "~~/components/fusion/MarketData";
import { MultiNetworkOrderForm } from "~~/components/fusion/MultiNetworkOrderForm";
import { MultiNetworkOrderManager } from "~~/components/fusion/MultiNetworkOrderManager";
import { EthereumTokenApproval } from "~~/components/fusion/EthereumTokenApproval";
import { OrderBook } from "~~/components/fusion/OrderBook";
import { OrderCreationForm, OrderCreationFormData } from "~~/components/fusion/OrderCreationForm";
import { TransactionMonitor } from "~~/components/fusion/TransactionMonitor";
import { HTLCManager } from "~~/components/htlc/HTLCManager";
import { useCrossChainWallet } from "~~/hooks/cross-chain/useCrossChainWallet";

// 定义标签页类型
type TabType = 
  | "overview"
  | "multinetwork"
  | "multiorders"
  | "approval"
  | "orders"
  | "enhanced-orders"
  | "transactions"
  | "crosschain"
  | "htlc"
  | "analytics"
  | "auction-sim"
  | "bridge-status"
  | "orderbook"
  | "market";

// 定义通知类型
type NotificationType = "success" | "error" | "warning" | "info";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
}

/**
 * 1inch Fusion Protocol 主页面
 * 展示跨链钱包集成和基本 SDK 功能
 */
export default function FusionPage() {
  const { isFullyConnected } = useCrossChainWallet();
  const [activeTab, setActiveTab] = useState<TabType>("multinetwork");
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());

  // 页面加载效果
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // 添加通知
  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp">) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    setNotifications(prev => [...prev, newNotification]);

    // 自动移除通知
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, 5000);
  }, []);

  // 移除通知
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // 更新活动时间
  const updateActivity = useCallback(() => {
    setLastActivity(new Date());
  }, []);

  // 处理订单创建
  const handleOrderCreation = useCallback(async (orderData: OrderCreationFormData) => {
    setIsLoading(true);
    updateActivity();
    try {
      // 模拟订单创建
      await new Promise(resolve => setTimeout(resolve, 2000));
      addNotification({
        type: "success",
        title: "订单创建成功",
        message: `订单已成功创建，金额: ${orderData.makingAmount} tokens`
      });
    } catch (error) {
      addNotification({
        type: "error",
        title: "订单创建失败",
        message: error instanceof Error ? error.message : "未知错误"
      });
    } finally {
      setIsLoading(false);
    }
  }, [addNotification, updateActivity]);

  // 处理增强订单创建
  const handleEnhancedOrderCreation = useCallback(async (orderData: EnhancedOrderCreationFormData) => {
    setIsLoading(true);
    updateActivity();
    try {
      // 模拟增强订单创建
      await new Promise(resolve => setTimeout(resolve, 2000));
      addNotification({
        type: "success",
        title: "增强订单创建成功",
        message: `增强订单已成功创建，金额: ${orderData.makingAmount} tokens`
      });
    } catch (error) {
      addNotification({
        type: "error",
        title: "增强订单创建失败",
        message: error instanceof Error ? error.message : "未知错误"
      });
    } finally {
      setIsLoading(false);
    }
  }, [addNotification, updateActivity]);

  // 处理跨链交换
  const handleCrossChainSwap = useCallback(async () => {
    setIsLoading(true);
    updateActivity();
    try {
      // 模拟跨链交换
      await new Promise(resolve => setTimeout(resolve, 3000));
      addNotification({
        type: "success",
        title: "跨链交换成功",
        message: "跨链交换已成功完成"
      });
    } catch (error) {
      addNotification({
        type: "error",
        title: "跨链交换失败",
        message: error instanceof Error ? error.message : "未知错误"
      });
    } finally {
      setIsLoading(false);
    }
  }, [addNotification, updateActivity]);

  // 页面加载状态
  if (isPageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg mb-4"></div>
          <h2 className="text-2xl font-semibold mb-2">加载 Fusion Protocol</h2>
          <p className="text-gray-600 dark:text-gray-400">正在初始化跨链协议...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      {/* 通知系统 */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`
              alert shadow-lg max-w-sm animate-in slide-in-from-right duration-300
              ${
                notification.type === "success"
                  ? "alert-success"
                  : notification.type === "error"
                  ? "alert-error"
                  : notification.type === "warning"
                  ? "alert-warning"
                  : "alert-info"
              }
            `}
          >
            <div className="flex-1">
              <h4 className="font-semibold">{notification.title}</h4>
              <p className="text-sm opacity-90">{notification.message}</p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="btn btn-ghost btn-sm btn-circle"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 页面头部 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
              <span className="text-2xl text-white">🔄</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              1inch Fusion Protocol on Sui
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">
            多网络去中心化交易协议 - 支持 Sui 和以太坊
          </p>
          
          {/* 状态指示器 */}
          <div className="flex items-center justify-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                isFullyConnected ? "bg-green-500" : "bg-red-500"
              }`}></div>
              <span className="text-gray-600 dark:text-gray-400">
                {isFullyConnected ? "已连接" : "未连接"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-600 dark:text-gray-400">
                最后活动: {lastActivity.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* 导航标签 */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {[
            { key: "overview", label: "概览", icon: "📊" },
            { key: "multinetwork", label: "多网络交易", icon: "🌐" },
            { key: "multiorders", label: "多网络订单", icon: "📱" },
            { key: "approval", label: "代币授权", icon: "🔐" },
            { key: "orders", label: "Sui 订单", icon: "📝" },
            { key: "enhanced-orders", label: "增强订单", icon: "⚡" },
            { key: "transactions", label: "交易监控", icon: "🔍" },
            { key: "crosschain", label: "跨链操作", icon: "🌉" },
            { key: "htlc", label: "HTLC管理", icon: "🔒" },
            { key: "analytics", label: "数据分析", icon: "📈" },
            { key: "auction-sim", label: "拍卖模拟", icon: "🎯" },
            { key: "bridge-status", label: "桥接状态", icon: "🔗" },
            { key: "orderbook", label: "订单簿", icon: "📚" },
            { key: "market", label: "市场数据", icon: "💹" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as TabType);
                updateActivity();
              }}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2
                ${
                  activeTab === tab.key
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-md"
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg min-h-[600px]">
          {/* Multi-Network Order Form Tab */}
          {activeTab === "multinetwork" && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2 flex items-center">
                  <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-sm">🌐</span>
                  </span>
                  多网络交易
                </h2>
                <p className="text-gray-600 dark:text-gray-400">在多个区块链网络上创建和管理订单</p>
              </div>
              <MultiNetworkOrderForm 
                onSubmit={async (data) => {
                  updateActivity();
                  addNotification({
                    type: "success",
                    title: "多网络订单创建成功",
                    message: `已在 ${data.network} 网络创建订单`
                  });
                }}
              />
            </div>
          )}

          {/* Multi-Network Order Manager Tab */}
          {activeTab === "multiorders" && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2 flex items-center">
                  <span className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-sm">📱</span>
                  </span>
                  多网络订单管理
                </h2>
                <p className="text-gray-600 dark:text-gray-400">管理和监控跨网络订单</p>
              </div>
              <MultiNetworkOrderManager 
                onOrderSelect={(order) => {
                  updateActivity();
                  addNotification({
                    type: "info",
                    title: "订单详情",
                    message: `查看订单 ${order.id.slice(0, 8)}... 的详细信息`
                  });
                }}
              />
            </div>
          )}

          {/* Ethereum Token Approval Tab */}
          {activeTab === "approval" && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2 flex items-center">
                  <span className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-sm">🔐</span>
                  </span>
                  以太坊代币授权
                </h2>
                <p className="text-gray-600 dark:text-gray-400">管理 ERC20 代币的授权设置</p>
              </div>
              <EthereumTokenApproval 
                onApprovalComplete={(txHash) => {
                  updateActivity();
                  addNotification({
                    type: "success",
                    title: "授权成功",
                    message: `代币授权交易已提交: ${txHash.slice(0, 10)}...`
                  });
                }}
                onError={(error) => {
                  addNotification({
                    type: "error",
                    title: "授权失败",
                    message: error
                  });
                }}
              />
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* 协议状态 */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 p-6 rounded-xl">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white text-sm">📊</span>
                    </span>
                    协议状态
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">连接状态</span>
                      <span className={`font-medium ${
                        isFullyConnected ? "text-green-600" : "text-red-600"
                      }`}>
                        {isFullyConnected ? "已连接" : "未连接"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">活跃订单</span>
                      <span className="font-medium text-blue-600">12</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">总交易量</span>
                      <span className="font-medium text-purple-600">$1.2M</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">最后活动</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {lastActivity.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 快速操作 */}
                <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 p-6 rounded-xl">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <span className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white text-sm">⚡</span>
                    </span>
                    快速操作
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={handleCrossChainSwap}
                      disabled={isLoading || !isFullyConnected}
                      className="w-full btn btn-primary bg-gradient-to-r from-blue-500 to-purple-600 border-none text-white hover:from-blue-600 hover:to-purple-700"
                    >
                      {isLoading ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        "🌉 跨链交换"
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab("orders")}
                      className="w-full btn btn-outline btn-primary"
                    >
                      📝 创建订单
                    </button>
                    <button
                      onClick={() => setActiveTab("transactions")}
                      className="w-full btn btn-outline btn-secondary"
                    >
                      🔍 查看交易
                    </button>
                  </div>
                </div>
              </div>

              {/* 连接警告 */}
              {!isFullyConnected && (
                <div className="alert alert-warning mb-6">
                  <span>⚠️ 请先连接钱包以使用完整功能</span>
                </div>
              )}

              {/* 功能介绍 */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-600 p-6 rounded-xl">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-sm">🚀</span>
                  </span>
                  功能介绍
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { icon: "📝", title: "简单订单", desc: "创建基础交换订单" },
                    { icon: "⚡", title: "增强订单", desc: "高级订单配置" },
                    { icon: "🎯", title: "荷兰式拍卖", desc: "动态价格发现" },
                    { icon: "🌉", title: "跨链交换", desc: "多链资产交换" },
                    { icon: "🔒", title: "HTLC管理", desc: "哈希时间锁定" },
                    { icon: "📈", title: "数据分析", desc: "实时市场数据" },
                  ].map((feature, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                      <div className="text-2xl mb-2">{feature.icon}</div>
                      <h4 className="font-semibold mb-1">{feature.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Order Creation Tab */}
          {activeTab === "orders" && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2 flex items-center">
                  <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-sm">📝</span>
                  </span>
                  创建订单
                </h2>
                <p className="text-gray-600 dark:text-gray-400">创建基础的Fusion订单</p>
              </div>
              <OrderCreationForm onSubmit={handleOrderCreation} isLoading={isLoading} />
            </div>
          )}

          {/* Enhanced Order Creation Tab */}
          {activeTab === "enhanced-orders" && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2 flex items-center">
                  <span className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-sm">⚡</span>
                  </span>
                  增强订单
                </h2>
                <p className="text-gray-600 dark:text-gray-400">创建具有高级功能的增强订单</p>
              </div>
              <EnhancedOrderCreationForm onSubmit={handleEnhancedOrderCreation} isLoading={isLoading} />
            </div>
          )}

          {/* Transaction Monitor Tab */}
          {activeTab === "transactions" && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2 flex items-center">
                  <span className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-sm">🔍</span>
                  </span>
                  交易监控
                </h2>
                <p className="text-gray-600 dark:text-gray-400">监控和管理您的交易</p>
              </div>
              <TransactionMonitor />
            </div>
          )}

          {/* Cross Chain Operations Tab */}
          {activeTab === "crosschain" && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2 flex items-center">
                  <span className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-sm">🌉</span>
                  </span>
                  跨链操作
                </h2>
                <p className="text-gray-600 dark:text-gray-400">执行跨链资产转移和交换</p>
              </div>
              <CrossChainOperations />
            </div>
          )}

          {/* HTLC Manager Tab */}
          {activeTab === "htlc" && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2 flex items-center">
                  <span className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-sm">🔒</span>
                  </span>
                  HTLC管理
                </h2>
                <p className="text-gray-600 dark:text-gray-400">管理哈希时间锁定合约</p>
              </div>
              <HTLCManager />
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2 flex items-center">
                  <span className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-sm">📈</span>
                  </span>
                  数据分析
                </h2>
                <p className="text-gray-600 dark:text-gray-400">查看协议性能和市场分析</p>
              </div>
              <AnalyticsDashboard />
            </div>
          )}

          {/* Auction Simulator Tab */}
          {activeTab === "auction-sim" && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2 flex items-center">
                  <span className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-sm">🎯</span>
                  </span>
                  拍卖模拟
                </h2>
                <p className="text-gray-600 dark:text-gray-400">模拟荷兰式拍卖过程</p>
              </div>
              <DutchAuctionVisualizer />
            </div>
          )}

          {/* Bridge Status Tab */}
          {activeTab === "bridge-status" && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2 flex items-center">
                  <span className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-sm">🔗</span>
                  </span>
                  桥接状态
                </h2>
                <p className="text-gray-600 dark:text-gray-400">监控跨链桥接状态</p>
              </div>
              <CrossChainBridgeStatus />
            </div>
          )}

          {/* Order Book Tab */}
          {activeTab === "orderbook" && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2 flex items-center">
                  <span className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-sm">📚</span>
                  </span>
                  订单簿
                </h2>
                <p className="text-gray-600 dark:text-gray-400">查看和管理订单簿</p>
              </div>
              <OrderBook />
            </div>
          )}

          {/* Market Data Tab */}
          {activeTab === "market" && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2 flex items-center">
                  <span className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-sm">💹</span>
                  </span>
                  市场数据
                </h2>
                <p className="text-gray-600 dark:text-gray-400">实时市场数据和价格信息</p>
              </div>
              <MarketData />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
