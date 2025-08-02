"use client";

import { useCallback, useEffect, useState } from "react";
import { useCrossChainWallet } from "~~/hooks/cross-chain/useCrossChainWallet";
import { useCoins } from "~~/hooks/fusion/useCoins";
import { useFusionSDK } from "~~/hooks/fusion/useFusionSDK";

export interface TransactionStatus {
  id: string;
  type: "order_creation" | "order_fill" | "cross_chain_swap" | "auction_bid";
  status: "pending" | "confirmed" | "failed" | "expired";
  hash?: string;
  timestamp: number;
  details: {
    makingAmount?: string;
    takingAmount?: string;
    orderType?: string;
    targetChain?: string;
    errorMessage?: string;
  };
}

interface TransactionMonitorProps {
  transactions?: TransactionStatus[];
  onRefresh?: () => void;
  className?: string;
}

export const TransactionMonitor = ({ transactions = [], onRefresh, className = "" }: TransactionMonitorProps) => {
  const { state } = useCrossChainWallet();
  const { subscribeToEvents, unsubscribeFromEvents, getUserOrders, cancelOrder, isInitialized, address } =
    useFusionSDK();
  const { formatBalance } = useCoins();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "failed">("all");
  const [realTimeTransactions, setRealTimeTransactions] = useState<TransactionStatus[]>([]);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [cancellingOrders, setCancellingOrders] = useState<Set<string>>(new Set());

  // 从事件构建交易状态
  const buildTransactionFromEvent = useCallback(
    (event: any): TransactionStatus | null => {
      try {
        const eventType = event.type?.split("::").pop();
        const eventData = event.parsedJson || event.fields || {};

        let transactionStatus: TransactionStatus;

        switch (eventType) {
          case "OrderCreated":
            transactionStatus = {
              id: eventData.order_id || event.id,
              type: "order_creation",
              status: "confirmed",
              hash: event.id?.txDigest,
              timestamp: event.timestampMs || Date.now(),
              details: {
                makingAmount: eventData.making_amount ? formatBalance(eventData.making_amount, 9) : "Unknown",
                takingAmount: eventData.taking_amount ? formatBalance(eventData.taking_amount, 6) : "Unknown",
                orderType: eventData.order_type || "simple",
              },
            };
            break;

          case "OrderFilled":
            transactionStatus = {
              id: eventData.order_id || event.id,
              type: "order_fill",
              status: "confirmed",
              hash: event.id?.txDigest,
              timestamp: event.timestampMs || Date.now(),
              details: {
                makingAmount: eventData.filled_amount ? formatBalance(eventData.filled_amount, 9) : "Unknown",
                takingAmount: eventData.payment_amount ? formatBalance(eventData.payment_amount, 6) : "Unknown",
                orderType: eventData.order_type || "fill",
              },
            };
            break;

          case "OrderCancelled":
            transactionStatus = {
              id: eventData.order_id || event.id,
              type: "order_creation",
              status: "failed",
              hash: event.id?.txDigest,
              timestamp: event.timestampMs || Date.now(),
              details: {
                makingAmount: eventData.making_amount ? formatBalance(eventData.making_amount, 9) : "Unknown",
                takingAmount: eventData.taking_amount ? formatBalance(eventData.taking_amount, 6) : "Unknown",
                orderType: "cancelled",
                errorMessage: "Order cancelled by user",
              },
            };
            break;

          case "CrossChainInitiated":
            transactionStatus = {
              id: eventData.swap_id || event.id,
              type: "cross_chain_swap",
              status: "pending",
              hash: event.id?.txDigest,
              timestamp: event.timestampMs || Date.now(),
              details: {
                makingAmount: eventData.amount ? formatBalance(eventData.amount, 9) : "Unknown",
                takingAmount: eventData.expected_amount ? formatBalance(eventData.expected_amount, 6) : "Unknown",
                targetChain: eventData.target_chain || "Ethereum",
              },
            };
            break;

          default:
            console.log("Unknown event type:", eventType, event);
            return null;
        }

        return transactionStatus;
      } catch (error) {
        console.error("Failed to parse event:", error, event);
        return null;
      }
    },
    [formatBalance],
  );

  // 启动事件监听
  const startEventListening = useCallback(async () => {
    if (!isInitialized || !address || isListening) return;

    try {
      setIsListening(true);

      const id = await subscribeToEvents(event => {
        console.log("Received event:", event);

        const transaction = buildTransactionFromEvent(event);
        if (transaction) {
          setRealTimeTransactions(prev => {
            // 检查是否已存在相同的交易
            const exists = prev.some(tx => tx.id === transaction.id && tx.hash === transaction.hash);
            if (exists) return prev;

            // 添加新交易到列表开头
            return [transaction, ...prev.slice(0, 49)]; // 保持最多50条记录
          });
        }
      });

      setSubscriptionId(id);
      console.log("Event listening started:", id);
    } catch (error) {
      console.error("Failed to start event listening:", error);
      setIsListening(false);
    }
  }, [isInitialized, address, isListening, subscribeToEvents, buildTransactionFromEvent]);

  // 停止事件监听
  const stopEventListening = useCallback(async () => {
    if (subscriptionId) {
      try {
        await unsubscribeFromEvents(subscriptionId);
        setSubscriptionId(null);
        setIsListening(false);
        console.log("Event listening stopped");
      } catch (error) {
        console.error("Failed to stop event listening:", error);
      }
    }
  }, [subscriptionId, unsubscribeFromEvents]);

  // 获取用户历史订单
  const fetchUserOrders = useCallback(async () => {
    if (!isInitialized || !address) return;

    try {
      const orders = await getUserOrders();
      console.log("Fetched user orders:", orders);

      // 将订单转换为交易状态
      const orderTransactions: TransactionStatus[] = orders.map((order: any) => ({
        id: order.id,
        type: "order_creation" as const,
        status:
          order.status === "active"
            ? "confirmed"
            : order.status === "cancelled"
              ? "failed"
              : order.status === "filled"
                ? "confirmed"
                : "pending",
        hash: order.creation_tx,
        timestamp: order.created_at || Date.now(),
        details: {
          makingAmount: formatBalance(order.making_amount || "0", 9),
          takingAmount: formatBalance(order.taking_amount || "0", 6),
          orderType: order.order_type || "simple",
        },
      }));

      setRealTimeTransactions(prev => {
        // 合并历史订单，避免重复
        const newTransactions = [...orderTransactions];
        prev.forEach(tx => {
          if (!newTransactions.some(newTx => newTx.id === tx.id)) {
            newTransactions.push(tx);
          }
        });

        // 按时间戳排序
        return newTransactions.sort((a, b) => b.timestamp - a.timestamp);
      });
    } catch (error) {
      console.error("Failed to fetch user orders:", error);
    }
  }, [isInitialized, address, getUserOrders, formatBalance]);

  // 组件挂载时启动事件监听和获取历史数据
  useEffect(() => {
    if (isInitialized && address) {
      fetchUserOrders();
      startEventListening();
    }

    return () => {
      stopEventListening();
    };
  }, [isInitialized, address, fetchUserOrders, startEventListening, stopEventListening]);

  const displayTransactions = transactions.length > 0 ? transactions : realTimeTransactions;

  const filteredTransactions = displayTransactions.filter(tx => {
    if (filter === "all") return true;
    return tx.status === filter;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // 如果有外部刷新函数，调用它
      if (onRefresh) {
        await onRefresh();
      }

      // 重新获取用户订单
      await fetchUserOrders();

      // 如果事件监听没有开启，尝试重新开启
      if (isInitialized && address && !isListening) {
        await startEventListening();
      }

      console.log("Transactions refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh transactions:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 取消订单处理器
  const handleCancelOrder = useCallback(
    async (orderId: string) => {
      if (!isInitialized || !address) {
        alert("SDK not initialized or wallet not connected");
        return;
      }

      // 确认操作
      if (!confirm("Are you sure you want to cancel this order? This action cannot be undone.")) {
        return;
      }

      setCancellingOrders(prev => new Set(prev).add(orderId));

      try {
        console.log("Cancelling order:", orderId);
        const result = await cancelOrder(orderId);
        console.log("Order cancelled successfully:", result);

        // 更新本地状态
        setRealTimeTransactions(prev =>
          prev.map(tx =>
            tx.id === orderId
              ? {
                  ...tx,
                  status: "failed" as const,
                  details: { ...tx.details, errorMessage: "Order cancelled by user" },
                }
              : tx,
          ),
        );

        alert("Order cancelled successfully!");

        // 刷新数据
        await fetchUserOrders();
      } catch (error) {
        console.error("Failed to cancel order:", error);
        alert(error instanceof Error ? error.message : "Failed to cancel order");
      } finally {
        setCancellingOrders(prev => {
          const newSet = new Set(prev);
          newSet.delete(orderId);
          return newSet;
        });
      }
    },
    [isInitialized, address, cancelOrder, fetchUserOrders],
  );

  const getStatusIcon = (status: TransactionStatus["status"]) => {
    switch (status) {
      case "pending":
        return <div className="loading loading-spinner loading-xs"></div>;
      case "confirmed":
        return <div className="w-3 h-3 bg-green-500 rounded-full"></div>;
      case "failed":
        return <div className="w-3 h-3 bg-red-500 rounded-full"></div>;
      case "expired":
        return <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>;
      default:
        return <div className="w-3 h-3 bg-gray-500 rounded-full"></div>;
    }
  };

  const getStatusColor = (status: TransactionStatus["status"]) => {
    switch (status) {
      case "pending":
        return "text-blue-600 dark:text-blue-400";
      case "confirmed":
        return "text-green-600 dark:text-green-400";
      case "failed":
        return "text-red-600 dark:text-red-400";
      case "expired":
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getTypeLabel = (type: TransactionStatus["type"]) => {
    switch (type) {
      case "order_creation":
        return "Order Creation";
      case "order_fill":
        return "Order Fill";
      case "cross_chain_swap":
        return "Cross-Chain Swap";
      case "auction_bid":
        return "Auction Bid";
      default:
        return "Transaction";
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return `${seconds}s ago`;
    }
  };

  return (
    <div className={`bg-base-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Transaction Monitor</h2>
        <div className="flex items-center gap-4">
          {/* Filter Tabs */}
          <div className="tabs tabs-boxed">
            {[
              { key: "all", label: "All" },
              { key: "pending", label: "Pending" },
              { key: "confirmed", label: "Confirmed" },
              { key: "failed", label: "Failed" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`tab ${filter === key ? "tab-active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button onClick={handleRefresh} disabled={isRefreshing} className="btn btn-outline btn-sm">
            {isRefreshing ? (
              <div className="loading loading-spinner loading-xs"></div>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Real-time Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Connection Status */}
        <div className={`alert ${state.isEitherConnected ? "alert-success" : "alert-warning"}`}>
          <div className={`w-3 h-3 rounded-full ${state.isEitherConnected ? "bg-green-500" : "bg-yellow-500"}`}></div>
          <span className="text-sm">{state.isEitherConnected ? "Wallets Connected" : "Connect Wallets"}</span>
        </div>

        {/* SDK Status */}
        <div className={`alert ${isInitialized ? "alert-success" : "alert-warning"}`}>
          <div className={`w-3 h-3 rounded-full ${isInitialized ? "bg-green-500" : "bg-yellow-500"}`}></div>
          <span className="text-sm">{isInitialized ? "SDK Ready" : "SDK Initializing"}</span>
        </div>

        {/* Event Listening Status */}
        <div className={`alert ${isListening ? "alert-success" : "alert-info"}`}>
          <div className={`w-3 h-3 rounded-full ${isListening ? "bg-green-500 animate-pulse" : "bg-blue-500"}`}></div>
          <span className="text-sm">{isListening ? "Live Events" : "Events Offline"}</span>
        </div>
      </div>

      {/* Connection Warning */}
      {!state.isEitherConnected && (
        <div className="alert alert-info mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-current shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <span>Connect wallets to view real-time transactions</span>
        </div>
      )}

      {/* Transaction List */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">📊</div>
            <div className="text-lg font-medium mb-2">No transactions found</div>
            <div className="text-sm">
              {!state.isEitherConnected
                ? "Connect your wallets to view transaction history"
                : !isInitialized
                  ? "Waiting for SDK to initialize..."
                  : filter === "all"
                    ? isListening
                      ? "Your transaction history will appear here. Try creating an order to see live events!"
                      : "Your transaction history will appear here once event listening is active"
                    : `No ${filter} transactions at the moment`}
            </div>
            {state.isEitherConnected && isInitialized && (
              <div className="mt-4">
                <button onClick={handleRefresh} className="btn btn-sm btn-outline" disabled={isRefreshing}>
                  {isRefreshing ? "Refreshing..." : "Refresh Data"}
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredTransactions.map(tx => (
            <div key={tx.id} className="bg-base-100 rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(tx.status)}
                  <div>
                    <div className="font-medium">{getTypeLabel(tx.type)}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{formatTimestamp(tx.timestamp)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium capitalize ${getStatusColor(tx.status)}`}>{tx.status}</div>
                  {tx.hash && (
                    <div className="text-xs font-mono text-gray-500">
                      {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {tx.details.makingAmount && (
                  <div>
                    <div className="text-gray-500">Making</div>
                    <div className="font-medium">{tx.details.makingAmount} SUI</div>
                  </div>
                )}
                {tx.details.takingAmount && (
                  <div>
                    <div className="text-gray-500">Taking</div>
                    <div className="font-medium">{tx.details.takingAmount} USDC</div>
                  </div>
                )}
                {tx.details.orderType && (
                  <div>
                    <div className="text-gray-500">Type</div>
                    <div className="font-medium capitalize">{tx.details.orderType}</div>
                  </div>
                )}
                {tx.details.targetChain && (
                  <div>
                    <div className="text-gray-500">Target Chain</div>
                    <div className="font-medium">{tx.details.targetChain}</div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {tx.status === "failed" && tx.details.errorMessage && (
                <div className="mt-3 p-2 bg-red-50 dark:bg-red-900 rounded text-red-800 dark:text-red-200 text-sm">
                  <div className="font-medium">Error:</div>
                  <div>{tx.details.errorMessage}</div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 mt-3">
                {tx.hash && (
                  <button
                    onClick={() => window.open(`https://suiexplorer.com/txblock/${tx.hash}?network=devnet`, "_blank")}
                    className="btn btn-ghost btn-xs"
                  >
                    View on Explorer
                  </button>
                )}
                {tx.status === "pending" && tx.type === "order_creation" && (
                  <button
                    onClick={() => handleCancelOrder(tx.id)}
                    disabled={cancellingOrders.has(tx.id)}
                    className="btn btn-ghost btn-xs text-red-600"
                  >
                    {cancellingOrders.has(tx.id) ? (
                      <div className="flex items-center gap-1">
                        <div className="loading loading-spinner loading-xs"></div>
                        <span>Cancelling...</span>
                      </div>
                    ) : (
                      "Cancel Order"
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Statistics */}
      {filteredTransactions.length > 0 && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: displayTransactions.length },
            { label: "Pending", value: displayTransactions.filter(tx => tx.status === "pending").length },
            { label: "Confirmed", value: displayTransactions.filter(tx => tx.status === "confirmed").length },
            { label: "Failed", value: displayTransactions.filter(tx => tx.status === "failed").length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-base-100 rounded-lg p-3 text-center border">
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
