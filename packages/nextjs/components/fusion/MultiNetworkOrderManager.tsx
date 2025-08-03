"use client";

import { useCallback, useEffect, useState } from "react";
import { CompactNetworkSelector } from "./NetworkSelector";
import { NetworkType, useUnifiedFusionSDK } from "~~/hooks/fusion/useUnifiedFusionSDK";

interface Order {
  id: string;
  network: NetworkType;
  fromToken: string;
  toToken: string;
  amount: string;
  takingAmount: string;
  status: "active" | "filled" | "cancelled" | "expired";
  createdAt: number;
  expiryTime?: number;
  type: "simple" | "dutch" | "crosschain";
  maker: string;
  taker?: string;
  // 荷兰拍卖特定字段
  initialTakingAmount?: string;
  finalTakingAmount?: string;
  startTime?: number;
  endTime?: number;
  // 跨链特定字段
  targetChainId?: string;
  safetyDepositAmount?: string;
}

interface MultiNetworkOrderManagerProps {
  onOrderSelect?: (order: Order) => void;
  refreshInterval?: number;
}

/**
 * 多网络订单管理器
 * 支持查看和管理 Sui 和以太坊网络的订单
 */
export const MultiNetworkOrderManager = ({ onOrderSelect, refreshInterval = 30000 }: MultiNetworkOrderManagerProps) => {
  const { activeNetwork, getOrders, getOrdersByMaker, getNetworkInfo, initializeNetwork } = useUnifiedFusionSDK();

  const [selectedNetwork, setSelectedNetwork] = useState<NetworkType>(activeNetwork);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"all" | "my">("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"createdAt" | "amount" | "expiryTime">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // 获取订单列表
  const fetchOrders = useCallback(async () => {
    const networkInfo = getNetworkInfo(selectedNetwork);
    if (!networkInfo?.isInitialized) {
      setError(`${selectedNetwork} 网络未初始化`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let orderData: any[];

      if (viewMode === "my" && networkInfo.address) {
        orderData = await getOrdersByMaker({
          network: selectedNetwork,
          maker: networkInfo.address,
        });
      } else {
        orderData = await getOrders({
          network: selectedNetwork,
          limit: 100,
        });
      }

      // 转换订单数据格式
      const formattedOrders: Order[] = orderData.map((order: any) => ({
        id: order.id || order.orderHash || `${Date.now()}-${Math.random()}`,
        network: selectedNetwork,
        fromToken: order.fromToken || order.makerAsset,
        toToken: order.toToken || order.takerAsset,
        amount: order.amount || order.makingAmount || "0",
        takingAmount: order.takingAmount || "0",
        status: order.status || "active",
        createdAt: order.createdAt || order.createDateTime || Date.now(),
        expiryTime: order.expiryTime || order.expiry,
        type: order.type || "simple",
        maker: order.maker || networkInfo.address || "",
        taker: order.taker,
        // 荷兰拍卖字段
        initialTakingAmount: order.initialTakingAmount,
        finalTakingAmount: order.finalTakingAmount,
        startTime: order.startTime,
        endTime: order.endTime,
        // 跨链字段
        targetChainId: order.targetChainId,
        safetyDepositAmount: order.safetyDepositAmount,
      }));

      setOrders(formattedOrders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取订单失败");
    } finally {
      setLoading(false);
    }
  }, [selectedNetwork, viewMode, getOrders, getOrdersByMaker, getNetworkInfo]);

  // 网络切换处理
  const handleNetworkChange = useCallback((network: NetworkType) => {
    setSelectedNetwork(network);
    setOrders([]);
    setError(null);
  }, []);

  // 初始化网络
  const handleInitializeNetwork = useCallback(async () => {
    try {
      await initializeNetwork(selectedNetwork);
      await fetchOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络初始化失败");
    }
  }, [selectedNetwork, initializeNetwork, fetchOrders]);

  // 过滤和排序订单
  const filteredAndSortedOrders = orders
    .filter(order => {
      if (filterStatus !== "all" && order.status !== filterStatus) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "createdAt":
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case "amount":
          aValue = parseFloat(a.amount) || 0;
          bValue = parseFloat(b.amount) || 0;
          break;
        case "expiryTime":
          aValue = a.expiryTime || 0;
          bValue = b.expiryTime || 0;
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // 格式化代币地址显示
  const formatTokenAddress = (address: string) => {
    if (!address) return "未知";
    if (address.length > 20) {
      return `${address.slice(0, 8)}...${address.slice(-6)}`;
    }
    return address;
  };

  // 格式化时间显示
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // 获取状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "filled":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "expired":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  // 获取订单类型样式
  const getTypeStyle = (type: string) => {
    switch (type) {
      case "simple":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "dutch":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "crosschain":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  // 自动刷新
  useEffect(() => {
    const networkInfo = getNetworkInfo(selectedNetwork);
    if (networkInfo?.isInitialized) {
      fetchOrders();
    }
  }, [selectedNetwork, viewMode, fetchOrders, getNetworkInfo]);

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        const networkInfo = getNetworkInfo(selectedNetwork);
        if (networkInfo?.isInitialized) {
          fetchOrders();
        }
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, selectedNetwork, fetchOrders, getNetworkInfo]);

  const networkInfo = getNetworkInfo(selectedNetwork);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">多网络订单管理</h2>

      {/* 网络选择器 */}
      <div className="mb-6">
        <CompactNetworkSelector selectedNetwork={selectedNetwork} onNetworkChange={handleNetworkChange} />
      </div>

      {/* 网络状态 */}
      {networkInfo && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">网络状态:</span>
              <span
                className={`ml-2 px-2 py-1 rounded text-xs ${
                  networkInfo.isInitialized
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                }`}
              >
                {networkInfo.isInitialized ? "已初始化" : "未初始化"}
              </span>
            </div>
            {!networkInfo.isInitialized && (
              <button
                onClick={handleInitializeNetwork}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                初始化网络
              </button>
            )}
          </div>
          {networkInfo.address && (
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              地址: {networkInfo.address.slice(0, 10)}...{networkInfo.address.slice(-6)}
            </div>
          )}
        </div>
      )}

      {networkInfo?.isInitialized && (
        <>
          {/* 控制面板 */}
          <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4">
              {/* 视图模式 */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("all")}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    viewMode === "all"
                      ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  所有订单
                </button>
                <button
                  onClick={() => setViewMode("my")}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    viewMode === "my"
                      ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  我的订单
                </button>
              </div>

              {/* 状态过滤 */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">所有状态</option>
                <option value="active">活跃</option>
                <option value="filled">已成交</option>
                <option value="cancelled">已取消</option>
                <option value="expired">已过期</option>
              </select>
            </div>

            <div className="flex gap-4 items-center">
              {/* 排序 */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="createdAt">创建时间</option>
                <option value="amount">数量</option>
                <option value="expiryTime">过期时间</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </button>

              {/* 刷新按钮 */}
              <button
                onClick={fetchOrders}
                disabled={loading}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? "刷新中..." : "刷新"}
              </button>
            </div>
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* 订单列表 */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    订单 ID
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    类型
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    交易对
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    数量
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    状态
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    创建时间
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="border border-gray-300 dark:border-gray-600 px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      加载中...
                    </td>
                  </tr>
                ) : filteredAndSortedOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="border border-gray-300 dark:border-gray-600 px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      暂无订单
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-900 dark:text-white">
                        {order.id.slice(0, 8)}...{order.id.slice(-6)}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${getTypeStyle(order.type)}`}>
                          {order.type === "simple" ? "简单" : order.type === "dutch" ? "拍卖" : "跨链"}
                        </span>
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-900 dark:text-white">
                        <div>
                          <div>{formatTokenAddress(order.fromToken)}</div>
                          <div className="text-gray-500 dark:text-gray-400">→ {formatTokenAddress(order.toToken)}</div>
                        </div>
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-900 dark:text-white">
                        <div>
                          <div>{order.amount}</div>
                          <div className="text-gray-500 dark:text-gray-400">→ {order.takingAmount}</div>
                        </div>
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${getStatusStyle(order.status)}`}>
                          {order.status === "active"
                            ? "活跃"
                            : order.status === "filled"
                              ? "已成交"
                              : order.status === "cancelled"
                                ? "已取消"
                                : "已过期"}
                        </span>
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-900 dark:text-white">
                        {formatTime(order.createdAt)}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                        <button
                          onClick={() => onOrderSelect?.(order)}
                          className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 统计信息 */}
          <div className="mt-6 flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <div>共 {filteredAndSortedOrders.length} 个订单</div>
            <div>
              网络: {selectedNetwork} | 模式: {viewMode === "all" ? "所有订单" : "我的订单"}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
