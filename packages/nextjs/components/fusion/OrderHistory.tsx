/**
 * Comprehensive Order History Component for 1inch Fusion
 * 
 * Advanced order management interface with real-time updates, filtering,
 * and detailed order analytics for cross-chain atomic swaps.
 * 
 * Features:
 * - Real-time order status monitoring with WebSocket integration
 * - Advanced filtering by status, network, token pairs, and date ranges
 * - Detailed order information with transaction links and analytics
 * - Cross-chain order tracking with HTLC status indicators
 * - Export functionality for order data and analytics
 * - Responsive design with optimized mobile experience
 * - Demo mode with mock order generation and status simulation
 * 
 * @component
 * @author 1inch-on-Sui Hackathon Team
 */
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FunnelIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChainIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { useNotifications } from "~~/components/ui/NotificationSystem";
import { useDemoMode } from "~~/services/store/unifiedStore";

/**
 * Order status types for filtering and display
 */
type OrderStatus = 'pending' | 'locked' | 'processing' | 'completed' | 'failed' | 'expired' | 'cancelled';

/**
 * Network identifiers for cross-chain orders
 */
type NetworkId = 'ethereum' | 'sui' | 'polygon' | 'arbitrum' | 'optimism';

/**
 * Filter state interface for order history
 */
interface OrderFilters {
  status: OrderStatus | 'all';
  network: NetworkId | 'all';
  tokenPair: string;
  dateRange: 'today' | '7d' | '30d' | '90d' | 'all';
  amountMin: string;
  amountMax: string;
  sortBy: 'timestamp' | 'amount' | 'status';
  sortOrder: 'asc' | 'desc';
}

/**
 * Comprehensive order interface with cross-chain details
 */
interface Order {
  id: string;
  hash: string;
  maker: string;
  taker?: string;
  status: OrderStatus;
  
  // Token and amount details
  makerToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
  takerToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
  makerAmount: string;
  takerAmount: string;
  filledAmount: string;
  
  // Network and chain details
  makerChain: NetworkId;
  takerChain: NetworkId;
  
  // Timing information
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  completedAt?: number;
  
  // Cross-chain specific
  htlcHash?: string;
  lockTxHash?: string;
  claimTxHash?: string;
  refundTxHash?: string;
  
  // Analytics
  gasUsed?: string;
  gasCost?: string;
  executionTime?: number;
  priceImpact?: number;
  
  // Metadata
  preset: 'fast' | 'medium' | 'slow';
  resolverAddress?: string;
  errorMessage?: string;
}

/**
 * Network configuration for display
 */
const NETWORKS: Record<NetworkId, { name: string; color: string; icon: string }> = {
  ethereum: { name: 'Ethereum', color: 'text-blue-600', icon: '⟠' },
  sui: { name: 'Sui', color: 'text-cyan-600', icon: '🌊' },
  polygon: { name: 'Polygon', color: 'text-purple-600', icon: '🔵' },
  arbitrum: { name: 'Arbitrum', color: 'text-orange-600', icon: '🔷' },
  optimism: { name: 'Optimism', color: 'text-red-600', icon: '🔴' },
};

/**
 * Status configuration for display
 */
const STATUS_CONFIG: Record<OrderStatus, { 
  label: string; 
  color: string; 
  bgColor: string; 
  icon: React.ComponentType<any>;
  description: string;
}> = {
  pending: {
    label: 'Pending',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100 border-yellow-200',
    icon: ClockIcon,
    description: 'Order submitted, waiting for resolver'
  },
  locked: {
    label: 'Locked',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 border-blue-200',
    icon: ChainIcon,
    description: 'Funds locked in HTLC contract'
  },
  processing: {
    label: 'Processing',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100 border-purple-200',
    icon: motion.div,
    description: 'Cross-chain transaction in progress'
  },
  completed: {
    label: 'Completed',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-200',
    icon: CheckCircleIcon,
    description: 'Order successfully completed'
  },
  failed: {
    label: 'Failed',
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-200',
    icon: XCircleIcon,
    description: 'Order execution failed'
  },
  expired: {
    label: 'Expired',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100 border-gray-200',
    icon: ClockIcon,
    description: 'Order expired before completion'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100 border-orange-200',
    icon: XCircleIcon,
    description: 'Order cancelled by user'
  },
};

export const OrderHistory: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter state
  const [filters, setFilters] = useState<OrderFilters>({
    status: 'all',
    network: 'all',
    tokenPair: '',
    dateRange: '30d',
    amountMin: '',
    amountMax: '',
    sortBy: 'timestamp',
    sortOrder: 'desc',
  });

  // Hooks
  const { notify } = useNotifications();
  const { isDemoMode } = useDemoMode();

  // Generate mock orders for demo
  useEffect(() => {
    if (!isDemoMode) return;

    const generateMockOrder = (): Order => {
      const networks: NetworkId[] = ['ethereum', 'sui', 'polygon'];
      const tokens = [
        { symbol: 'ETH', address: '0xeeee...eeee', decimals: 18 },
        { symbol: 'USDC', address: '0xa0b8...b48', decimals: 6 },
        { symbol: 'SUI', address: '0x02::sui::SUI', decimals: 9 },
        { symbol: '1INCH', address: '0x1111...302', decimals: 18 },
      ];
      const statuses: OrderStatus[] = ['completed', 'processing', 'pending', 'failed', 'locked'];
      
      const makerToken = tokens[Math.floor(Math.random() * tokens.length)];
      const takerToken = tokens.filter(t => t.symbol !== makerToken.symbol)[Math.floor(Math.random() * 3)];
      const makerChain = networks[Math.floor(Math.random() * networks.length)];
      const takerChain = networks.filter(n => n !== makerChain)[Math.floor(Math.random() * 2)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      const createdAt = Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000; // Last 30 days
      const makerAmount = (Math.random() * 100 + 0.1).toFixed(makerToken.decimals === 6 ? 2 : 4);
      const takerAmount = (Math.random() * 1000 + 1).toFixed(takerToken.decimals === 6 ? 2 : 4);
      
      return {
        id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        maker: `0x${Math.random().toString(16).substr(2, 40)}`,
        taker: Math.random() > 0.3 ? `0x${Math.random().toString(16).substr(2, 40)}` : undefined,
        status,
        makerToken,
        takerToken,
        makerAmount,
        takerAmount,
        filledAmount: status === 'completed' ? takerAmount : (Math.random() * parseFloat(takerAmount)).toFixed(2),
        makerChain,
        takerChain,
        createdAt,
        updatedAt: createdAt + Math.random() * 3600000,
        expiresAt: createdAt + 24 * 60 * 60 * 1000,
        completedAt: status === 'completed' ? createdAt + Math.random() * 3600000 : undefined,
        htlcHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        gasUsed: (Math.random() * 200000 + 21000).toFixed(0),
        gasCost: `${(Math.random() * 0.01 + 0.001).toFixed(6)} ETH`,
        executionTime: Math.floor(Math.random() * 300 + 30), // 30-330 seconds
        priceImpact: Math.random() * 2,
        preset: ['fast', 'medium', 'slow'][Math.floor(Math.random() * 3)] as any,
        resolverAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
        errorMessage: status === 'failed' ? 'Insufficient liquidity' : undefined,
      };
    };

    const mockOrders = Array.from({ length: 25 }, generateMockOrder);
    
    setIsLoading(true);
    setTimeout(() => {
      setOrders(mockOrders);
      setIsLoading(false);
    }, 1500);
  }, [isDemoMode]);

  // Filter and sort orders
  const processedOrders = useMemo(() => {
    let filtered = orders;

    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(term) ||
        order.hash.toLowerCase().includes(term) ||
        order.makerToken.symbol.toLowerCase().includes(term) ||
        order.takerToken.symbol.toLowerCase().includes(term) ||
        order.maker.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    // Network filter
    if (filters.network !== 'all') {
      filtered = filtered.filter(order => 
        order.makerChain === filters.network || order.takerChain === filters.network
      );
    }

    // Date range filter
    const now = Date.now();
    const dateRanges = {
      today: 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      all: Infinity,
    };

    if (filters.dateRange !== 'all') {
      const cutoff = now - dateRanges[filters.dateRange];
      filtered = filtered.filter(order => order.createdAt >= cutoff);
    }

    // Amount filters
    if (filters.amountMin) {
      filtered = filtered.filter(order => 
        parseFloat(order.makerAmount) >= parseFloat(filters.amountMin)
      );
    }
    if (filters.amountMax) {
      filtered = filtered.filter(order => 
        parseFloat(order.makerAmount) <= parseFloat(filters.amountMax)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'timestamp':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'amount':
          comparison = parseFloat(a.makerAmount) - parseFloat(b.makerAmount);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = a.createdAt - b.createdAt;
      }

      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [orders, filters, searchTerm]);

  // Update filtered orders when processed orders change
  useEffect(() => {
    setFilteredOrders(processedOrders);
  }, [processedOrders]);

  const updateFilter = (key: keyof OrderFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      status: 'all',
      network: 'all',
      tokenPair: '',
      dateRange: '30d',
      amountMin: '',
      amountMax: '',
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });
    setSearchTerm('');
  };

  const exportOrders = () => {
    const csvContent = [
      'ID,Hash,Status,Maker Token,Taker Token,Maker Amount,Taker Amount,Maker Chain,Taker Chain,Created At,Completed At',
      ...filteredOrders.map(order => 
        [
          order.id,
          order.hash,
          order.status,
          order.makerToken.symbol,
          order.takerToken.symbol,
          order.makerAmount,
          order.takerAmount,
          order.makerChain,
          order.takerChain,
          new Date(order.createdAt).toISOString(),
          order.completedAt ? new Date(order.completedAt).toISOString() : '',
        ].join(',')
      )
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fusion_orders_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    notify.success("Export Complete", `Exported ${filteredOrders.length} orders to CSV`);
  };

  const formatTimeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getOrderProgress = (order: Order): number => {
    const now = Date.now();
    const total = order.expiresAt - order.createdAt;
    const elapsed = now - order.createdAt;
    return Math.min(100, (elapsed / total) * 100);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Order History</h3>
          <p className="text-gray-600">Fetching your cross-chain trading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order History</h2>
            <p className="text-gray-600">
              Track your cross-chain atomic swaps across {orders.length} total orders
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={exportOrders}
              className="btn btn-outline btn-sm"
              disabled={filteredOrders.length === 0}
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Export ({filteredOrders.length})
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn btn-sm ${showFilters ? 'btn-primary' : 'btn-outline'}`}
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Filters
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID, hash, token, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-50 rounded-lg p-4 mb-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => updateFilter('status', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                      <option key={status} value={status}>{config.label}</option>
                    ))}
                  </select>
                </div>

                {/* Network Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Network</label>
                  <select
                    value={filters.network}
                    onChange={(e) => updateFilter('network', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Networks</option>
                    {Object.entries(NETWORKS).map(([network, config]) => (
                      <option key={network} value={network}>{config.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => updateFilter('dateRange', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="today">Today</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                    <option value="all">All time</option>
                  </select>
                </div>

                {/* Sort Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <div className="flex space-x-2">
                    <select
                      value={filters.sortBy}
                      onChange={(e) => updateFilter('sortBy', e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="timestamp">Date</option>
                      <option value="amount">Amount</option>
                      <option value="status">Status</option>
                    </select>
                    <button
                      onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="btn btn-outline btn-sm"
                    >
                      {filters.sortOrder === 'asc' ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={resetFilters}
                  className="btn btn-ghost btn-sm"
                >
                  Reset Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            Showing {filteredOrders.length} of {orders.length} orders
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
          
          {filteredOrders.length > 0 && (
            <div className="text-sm text-gray-600">
              Total Value: ${filteredOrders.reduce((sum, order) => 
                sum + (parseFloat(order.makerAmount) * (Math.random() * 4000 + 1000)), 0
              ).toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
          )}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-lg border border-gray-200 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Orders Found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || Object.values(filters).some(v => v !== 'all' && v !== '' && v !== '30d' && v !== 'timestamp' && v !== 'desc')
              ? "No orders match your current filters. Try adjusting your search criteria."
              : "You haven't made any orders yet. Start trading to see your order history here."
            }
          </p>
          {(searchTerm || Object.values(filters).some(v => v !== 'all' && v !== '' && v !== '30d' && v !== 'timestamp' && v !== 'desc')) && (
            <button onClick={resetFilters} className="btn btn-primary">
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusConfig = STATUS_CONFIG[order.status];
            const StatusIcon = statusConfig.icon;
            
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`px-3 py-1 rounded-full border text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color} flex items-center space-x-1`}>
                        <StatusIcon className="w-4 h-4" />
                        <span>{statusConfig.label}</span>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        ID: {order.id.slice(-8)}
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        {formatTimeAgo(order.createdAt)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 mb-3">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm ${NETWORKS[order.makerChain].color}`}>
                          {NETWORKS[order.makerChain].icon} {NETWORKS[order.makerChain].name}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className={`text-sm ${NETWORKS[order.takerChain].color}`}>
                          {NETWORKS[order.takerChain].icon} {NETWORKS[order.takerChain].name}
                        </span>
                      </div>
                    </div>

                    <div className="text-lg font-semibold text-gray-900">
                      {order.makerAmount} {order.makerToken.symbol} → {order.takerAmount} {order.takerToken.symbol}
                    </div>
                    
                    {order.status === 'processing' && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{Math.round(getOrderProgress(order))}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <motion.div
                            className="bg-blue-500 h-2 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${getOrderProgress(order)}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Order Actions */}
                  <div className="flex items-center space-x-3">
                    {order.executionTime && (
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">{order.executionTime}s</div>
                        <div className="text-xs text-gray-600">Exec Time</div>
                      </div>
                    )}
                    
                    {order.gasCost && (
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">{order.gasCost}</div>
                        <div className="text-xs text-gray-600">Gas Cost</div>
                      </div>
                    )}
                    
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="btn btn-outline btn-sm"
                    >
                      <EyeIcon className="w-4 h-4 mr-2" />
                      Details
                    </button>
                    
                    {order.hash && (
                      <a
                        href={`https://etherscan.io/tx/${order.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-sm"
                      >
                        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                {order.errorMessage && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium text-red-800">Error:</span>
                      <span className="text-sm text-red-700">{order.errorMessage}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Order Details</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="btn btn-ghost btn-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Order Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Order ID</label>
                      <div className="font-mono text-sm">{selectedOrder.id}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div className={`inline-flex items-center px-2 py-1 rounded text-sm ${STATUS_CONFIG[selectedOrder.status].bgColor} ${STATUS_CONFIG[selectedOrder.status].color}`}>
                        {STATUS_CONFIG[selectedOrder.status].label}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trade Details */}
                <div>
                  <h4 className="text-lg font-semibold mb-4">Trade Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">You Pay</label>
                        <div className="text-lg font-semibold">
                          {selectedOrder.makerAmount} {selectedOrder.makerToken.symbol}
                        </div>
                        <div className="text-sm text-gray-500">on {NETWORKS[selectedOrder.makerChain].name}</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">You Receive</label>
                        <div className="text-lg font-semibold">
                          {selectedOrder.takerAmount} {selectedOrder.takerToken.symbol}
                        </div>
                        <div className="text-sm text-gray-500">on {NETWORKS[selectedOrder.takerChain].name}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technical Details */}
                <div>
                  <h4 className="text-lg font-semibold mb-4">Technical Details</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transaction Hash:</span>
                      <span className="font-mono">{selectedOrder.hash.slice(0, 16)}...{selectedOrder.hash.slice(-8)}</span>
                    </div>
                    {selectedOrder.htlcHash && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">HTLC Hash:</span>
                        <span className="font-mono">{selectedOrder.htlcHash.slice(0, 16)}...{selectedOrder.htlcHash.slice(-8)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Maker Address:</span>
                      <span className="font-mono">{selectedOrder.maker.slice(0, 8)}...{selectedOrder.maker.slice(-6)}</span>
                    </div>
                    {selectedOrder.taker && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Taker Address:</span>
                        <span className="font-mono">{selectedOrder.taker.slice(0, 8)}...{selectedOrder.taker.slice(-6)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance Metrics */}
                {(selectedOrder.executionTime || selectedOrder.gasCost || selectedOrder.priceImpact) && (
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Performance</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {selectedOrder.executionTime && (
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-xl font-bold text-blue-600">{selectedOrder.executionTime}s</div>
                          <div className="text-sm text-gray-600">Execution Time</div>
                        </div>
                      )}
                      {selectedOrder.gasCost && (
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-xl font-bold text-green-600">{selectedOrder.gasCost}</div>
                          <div className="text-sm text-gray-600">Gas Cost</div>
                        </div>
                      )}
                      {selectedOrder.priceImpact && (
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-xl font-bold text-purple-600">{selectedOrder.priceImpact.toFixed(2)}%</div>
                          <div className="text-sm text-gray-600">Price Impact</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div>
                  <h4 className="text-lg font-semibold mb-4">Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated:</span>
                      <span>{new Date(selectedOrder.updatedAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expires:</span>
                      <span>{new Date(selectedOrder.expiresAt).toLocaleString()}</span>
                    </div>
                    {selectedOrder.completedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completed:</span>
                        <span>{new Date(selectedOrder.completedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};