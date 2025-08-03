/**
 * Enhanced Transaction Monitor
 * Advanced transaction monitoring with real-time updates and analytics
 */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRealtimeData } from "../../hooks/useRealtimeData";
import { ErrorBoundary } from "../../lib/monitoring/ErrorBoundary";
import { PerformanceMonitor } from "../../lib/monitoring/PerformanceMonitor";

/**
 * Enhanced Transaction Monitor
 * Advanced transaction monitoring with real-time updates and analytics
 */

/**
 * Enhanced Transaction Monitor
 * Advanced transaction monitoring with real-time updates and analytics
 */

/**
 * Enhanced Transaction Monitor
 * Advanced transaction monitoring with real-time updates and analytics
 */

interface Transaction {
  id: string;
  hash: string;
  type: "swap" | "limit" | "fusion" | "bridge";
  status: "pending" | "confirmed" | "failed" | "cancelled";
  fromToken: {
    address: string;
    symbol: string;
    amount: string;
    decimals: number;
  };
  toToken: {
    address: string;
    symbol: string;
    amount: string;
    decimals: number;
  };
  timestamp: string;
  gasUsed?: string;
  gasPrice?: string;
  blockNumber?: number;
  confirmations?: number;
  error?: string;
  estimatedTime?: number;
  actualTime?: number;
  slippage?: number;
  priceImpact?: number;
  route?: Array<{
    protocol: string;
    percentage: number;
  }>;
  user: string;
  network: string;
}

interface TransactionStats {
  total: number;
  pending: number;
  confirmed: number;
  failed: number;
  cancelled: number;
  averageTime: number;
  successRate: number;
  totalVolume: string;
  averageGasUsed: string;
}

interface MonitorProps {
  className?: string;
  maxTransactions?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showStats?: boolean;
  showFilters?: boolean;
  onTransactionClick?: (transaction: Transaction) => void;
}

const EnhancedTransactionMonitor: React.FC<MonitorProps> = ({
  className = "",
  maxTransactions = 50,
  autoRefresh = true,
  refreshInterval = 5000,
  showStats = true,
  showFilters = true,
  onTransactionClick,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"timestamp" | "amount" | "gasUsed">("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Real-time data hook
  const { /* orders, */ isConnected, connectionError } = useRealtimeData({
    orders: true,
  });

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/transactions", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate mock transactions for demonstration
  const generateMockTransactions = useCallback((): Transaction[] => {
    const mockTransactions: Transaction[] = [];
    const types: Transaction["type"][] = ["swap", "limit", "fusion", "bridge"];
    const statuses: Transaction["status"][] = ["pending", "confirmed", "failed", "cancelled"];
    const tokens = [
      { address: "0x1::sui::SUI", symbol: "SUI", decimals: 9 },
      { address: "0x2::coin::COIN", symbol: "USDC", decimals: 6 },
      { address: "0x3::token::TOKEN", symbol: "WETH", decimals: 18 },
      { address: "0x4::defi::DEFI", symbol: "CETUS", decimals: 9 },
    ];

    for (let i = 0; i < maxTransactions; i++) {
      const fromToken = tokens[Math.floor(Math.random() * tokens.length)];
      let toToken = tokens[Math.floor(Math.random() * tokens.length)];
      while (toToken.address === fromToken.address) {
        toToken = tokens[Math.floor(Math.random() * tokens.length)];
      }

      const type = types[Math.floor(Math.random() * types.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString();

      const transaction: Transaction = {
        id: `tx_${i + 1}`,
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        type,
        status,
        fromToken: {
          ...fromToken,
          amount: (Math.random() * 1000 + 1).toFixed(fromToken.decimals),
        },
        toToken: {
          ...toToken,
          amount: (Math.random() * 1000 + 1).toFixed(toToken.decimals),
        },
        timestamp,
        gasUsed: status === "confirmed" ? (Math.random() * 100000 + 21000).toFixed(0) : undefined,
        gasPrice: (Math.random() * 50 + 10).toFixed(9),
        blockNumber: status === "confirmed" ? Math.floor(Math.random() * 1000000 + 18000000) : undefined,
        confirmations: status === "confirmed" ? Math.floor(Math.random() * 100 + 1) : undefined,
        error: status === "failed" ? "Transaction reverted" : undefined,
        estimatedTime: Math.floor(Math.random() * 300 + 30),
        actualTime: status === "confirmed" ? Math.floor(Math.random() * 300 + 30) : undefined,
        slippage: Math.random() * 2,
        priceImpact: Math.random() * 5,
        route: [
          { protocol: "1inch", percentage: Math.random() * 100 },
          { protocol: "Uniswap", percentage: Math.random() * 100 },
        ],
        user: `0x${Math.random().toString(16).substr(2, 40)}`,
        network: "sui",
      };

      mockTransactions.push(transaction);
    }

    return mockTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [maxTransactions]);

  // Initialize with mock data
  useEffect(() => {
    const mockData = generateMockTransactions();
    setTransactions(mockData);
    setLoading(false);
  }, [generateMockTransactions]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // In a real app, this would fetch new transactions
      // For demo, we'll just update timestamps
      setTransactions(prev =>
        prev.map(tx => ({
          ...tx,
          timestamp: tx.status === "pending" ? new Date().toISOString() : tx.timestamp,
        })),
      );
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter(tx => tx.status === selectedStatus);
    }

    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter(tx => tx.type === selectedType);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        tx =>
          tx.hash.toLowerCase().includes(query) ||
          tx.fromToken.symbol.toLowerCase().includes(query) ||
          tx.toToken.symbol.toLowerCase().includes(query) ||
          tx.user.toLowerCase().includes(query),
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "timestamp":
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
        case "amount":
          aValue = parseFloat(a.fromToken.amount);
          bValue = parseFloat(b.fromToken.amount);
          break;
        case "gasUsed":
          aValue = parseFloat(a.gasUsed || "0");
          bValue = parseFloat(b.gasUsed || "0");
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    return filtered;
  }, [transactions, selectedStatus, selectedType, searchQuery, sortBy, sortOrder]);

  // Calculate statistics
  const stats = useMemo((): TransactionStats => {
    const total = transactions.length;
    const pending = transactions.filter(tx => tx.status === "pending").length;
    const confirmed = transactions.filter(tx => tx.status === "confirmed").length;
    const failed = transactions.filter(tx => tx.status === "failed").length;
    const cancelled = transactions.filter(tx => tx.status === "cancelled").length;

    const confirmedTxs = transactions.filter(tx => tx.status === "confirmed" && tx.actualTime);
    const averageTime =
      confirmedTxs.length > 0
        ? confirmedTxs.reduce((sum, tx) => sum + (tx.actualTime || 0), 0) / confirmedTxs.length
        : 0;

    const successRate = total > 0 ? (confirmed / total) * 100 : 0;

    const totalVolume = transactions.reduce((sum, tx) => {
      if (tx.status === "confirmed") {
        return sum + parseFloat(tx.fromToken.amount);
      }
      return sum;
    }, 0);

    const gasUsedTxs = transactions.filter(tx => tx.gasUsed);
    const averageGasUsed =
      gasUsedTxs.length > 0
        ? gasUsedTxs.reduce((sum, tx) => sum + parseFloat(tx.gasUsed || "0"), 0) / gasUsedTxs.length
        : 0;

    return {
      total,
      pending,
      confirmed,
      failed,
      cancelled,
      averageTime,
      successRate,
      totalVolume: totalVolume.toFixed(2),
      averageGasUsed: averageGasUsed.toFixed(0),
    };
  }, [transactions]);

  const getStatusColor = (status: Transaction["status"]): string => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "confirmed":
        return "text-green-600 bg-green-100";
      case "failed":
        return "text-red-600 bg-red-100";
      case "cancelled":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getTypeColor = (type: Transaction["type"]): string => {
    switch (type) {
      case "swap":
        return "text-blue-600 bg-blue-100";
      case "limit":
        return "text-purple-600 bg-purple-100";
      case "fusion":
        return "text-orange-600 bg-orange-100";
      case "bridge":
        return "text-teal-600 bg-teal-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatAmount = (amount: string, decimals: number): string => {
    const num = parseFloat(amount);
    if (num >= 1e6) {
      return `${(num / 1e6).toFixed(2)}M`;
    } else if (num >= 1e3) {
      return `${(num / 1e3).toFixed(2)}K`;
    }
    return num.toFixed(Math.min(decimals, 4));
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    } else {
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    }
  };

  const truncateHash = (hash: string): string => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Error Loading Transactions</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={fetchTransactions}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <PerformanceMonitor componentName="EnhancedTransactionMonitor">
        <div className={`bg-white rounded-lg shadow-lg ${className}`}>
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Transaction Monitor</h2>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className={`flex items-center ${isConnected ? "text-green-600" : "text-red-600"}`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${isConnected ? "bg-green-600" : "bg-red-600"}`}></span>
                    {isConnected ? "Real-time Connected" : "Disconnected"}
                  </span>
                  {connectionError && <span className="text-red-600">Error: {connectionError}</span>}
                </div>
              </div>

              <button
                onClick={() => {
                  const newData = generateMockTransactions();
                  setTransactions(newData);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors mt-4 sm:mt-0"
              >
                Refresh
              </button>
            </div>

            {/* Statistics */}
            {showStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
                  <div className="text-sm text-gray-600">Confirmed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.successRate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{formatTime(stats.averageTime)}</div>
                  <div className="text-sm text-gray-600">Avg Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.totalVolume}</div>
                  <div className="text-sm text-gray-600">Volume</div>
                </div>
              </div>
            )}

            {/* Filters */}
            {showFilters && (
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <input
                  type="text"
                  placeholder="Search by hash, token, or address..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="swap">Swap</option>
                  <option value="limit">Limit</option>
                  <option value="fusion">Fusion</option>
                  <option value="bridge">Bridge</option>
                </select>

                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={e => {
                    const [field, order] = e.target.value.split("-");
                    setSortBy(field as any);
                    setSortOrder(order as any);
                  }}
                  className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="timestamp-desc">Newest First</option>
                  <option value="timestamp-asc">Oldest First</option>
                  <option value="amount-desc">Highest Amount</option>
                  <option value="amount-asc">Lowest Amount</option>
                  <option value="gasUsed-desc">Highest Gas</option>
                  <option value="gasUsed-asc">Lowest Gas</option>
                </select>
              </div>
            )}
          </div>

          {/* Transaction List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No transactions found matching your criteria.</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredTransactions.map(transaction => (
                  <div
                    key={transaction.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onTransactionClick?.(transaction)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}
                            >
                              {transaction.status}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(transaction.type)}`}
                            >
                              {transaction.type}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">{truncateHash(transaction.hash)}</div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className="text-center">
                            <div className="font-medium">
                              {formatAmount(transaction.fromToken.amount, transaction.fromToken.decimals)}{" "}
                              {transaction.fromToken.symbol}
                            </div>
                            <div className="text-sm text-gray-600">From</div>
                          </div>
                          <div className="text-gray-400">→</div>
                          <div className="text-center">
                            <div className="font-medium">
                              {formatAmount(transaction.toToken.amount, transaction.toToken.decimals)}{" "}
                              {transaction.toToken.symbol}
                            </div>
                            <div className="text-sm text-gray-600">To</div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-gray-600">{new Date(transaction.timestamp).toLocaleString()}</div>
                        {transaction.actualTime && (
                          <div className="text-sm text-gray-500">{formatTime(transaction.actualTime)}</div>
                        )}
                        {transaction.gasUsed && (
                          <div className="text-sm text-gray-500">
                            Gas: {parseInt(transaction.gasUsed).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {transaction.error && (
                      <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">{transaction.error}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PerformanceMonitor>
    </ErrorBoundary>
  );
};

export default EnhancedTransactionMonitor;
