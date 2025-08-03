"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useCurrentAccount, useCurrentWallet } from "@mysten/dapp-kit";
import { useUnifiedStore } from "~~/services/store/unifiedStore";

// ==================== Network Status Interfaces ====================

interface NetworkMetrics {
  blockHeight: number;
  blockTime: number;
  gasPrice: string;
  tps: number; // transactions per second
  activeNodes: number;
  lastUpdateTime: number;
}

interface ChainStatus {
  isConnected: boolean;
  network: string;
  chainId: string | number;
  rpcUrl: string;
  blockHeight: number;
  lastBlockTime: number;
  averageBlockTime: number;
  gasPrice: string;
  healthStatus: 'healthy' | 'warning' | 'critical' | 'offline';
  latency: number; // in milliseconds
  errorCount: number;
  lastError?: string;
}

interface NetworkMonitorProps {
  className?: string;
  refreshInterval?: number;
  showDetailedMetrics?: boolean;
  onNetworkStatusChange?: (network: 'ethereum' | 'sui', status: ChainStatus) => void;
}

// ==================== Mock Network Data Generator ====================

const generateMockNetworkMetrics = (networkType: 'ethereum' | 'sui'): NetworkMetrics => {
  const baseMetrics = {
    ethereum: {
      blockHeight: 18950000 + Math.floor(Math.random() * 1000),
      blockTime: 12000 + Math.random() * 3000, // 12-15 seconds
      gasPrice: (15 + Math.random() * 35).toFixed(2), // 15-50 gwei
      tps: 12 + Math.random() * 8, // 12-20 TPS
      activeNodes: 6800 + Math.floor(Math.random() * 400),
    },
    sui: {
      blockHeight: 2450000 + Math.floor(Math.random() * 500),
      blockTime: 2500 + Math.random() * 1500, // 2.5-4 seconds
      gasPrice: (0.5 + Math.random() * 2).toFixed(4), // 0.5-2.5 MIST
      tps: 85 + Math.random() * 25, // 85-110 TPS
      activeNodes: 150 + Math.floor(Math.random() * 50),
    },
  };

  const base = baseMetrics[networkType];
  return {
    ...base,
    lastUpdateTime: Date.now(),
  };
};

const calculateHealthStatus = (latency: number, errorCount: number): ChainStatus['healthStatus'] => {
  if (errorCount > 5 || latency > 5000) return 'critical';
  if (errorCount > 2 || latency > 2000) return 'warning';
  if (latency > 1000) return 'warning';
  return 'healthy';
};

// ==================== Main Component ====================

export const CrossChainNetworkMonitor: React.FC<NetworkMonitorProps> = ({
  className = "",
  refreshInterval = 5000,
  showDetailedMetrics = false,
  onNetworkStatusChange,
}) => {
  const { address: ethAddress } = useAccount();
  const currentSuiAccount = useCurrentAccount();
  const currentSuiWallet = useCurrentWallet();
  const { addToastNotification } = useUnifiedStore();

  const [ethereumStatus, setEthereumStatus] = useState<ChainStatus>({
    isConnected: !!ethAddress,
    network: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    blockHeight: 0,
    lastBlockTime: Date.now(),
    averageBlockTime: 12000,
    gasPrice: '0',
    healthStatus: 'healthy',
    latency: 0,
    errorCount: 0,
  });

  const [suiStatus, setSuiStatus] = useState<ChainStatus>({
    isConnected: !!currentSuiAccount?.address,
    network: 'Sui Mainnet',
    chainId: 'sui:mainnet',
    rpcUrl: 'https://fullnode.mainnet.sui.io:443',
    blockHeight: 0,
    lastBlockTime: Date.now(),
    averageBlockTime: 2800,
    gasPrice: '0',
    healthStatus: 'healthy',
    latency: 0,
    errorCount: 0,
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [globalMetrics, setGlobalMetrics] = useState({
    totalTransactions: 0,
    crossChainSwaps: 0,
    totalValueLocked: 0,
    lastCrossChainSwap: null as Date | null,
  });

  // Simulate network health check
  const performHealthCheck = useCallback(async (networkType: 'ethereum' | 'sui'): Promise<{ latency: number; success: boolean; error?: string }> => {
    const startTime = Date.now();
    
    // Simulate network call delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
    
    const latency = Date.now() - startTime;
    const success = Math.random() > 0.05; // 95% success rate
    
    return {
      latency,
      success,
      error: success ? undefined : `Network timeout (${networkType})`,
    };
  }, []);

  // Update network status
  const updateNetworkStatus = useCallback(async (networkType: 'ethereum' | 'sui') => {
    const healthCheck = await performHealthCheck(networkType);
    const metrics = generateMockNetworkMetrics(networkType);
    
    const updateFunction = networkType === 'ethereum' ? setEthereumStatus : setSuiStatus;
    
    updateFunction(prev => {
      const newStatus: ChainStatus = {
        ...prev,
        blockHeight: metrics.blockHeight,
        lastBlockTime: Date.now(),
        gasPrice: metrics.gasPrice,
        latency: healthCheck.latency,
        errorCount: healthCheck.success ? Math.max(0, prev.errorCount - 1) : prev.errorCount + 1,
        lastError: healthCheck.error,
        healthStatus: calculateHealthStatus(healthCheck.latency, healthCheck.success ? prev.errorCount : prev.errorCount + 1),
      };
      
      // Notify parent component of status change
      onNetworkStatusChange?.(networkType, newStatus);
      
      // Show critical alerts
      if (newStatus.healthStatus === 'critical' && prev.healthStatus !== 'critical') {
        addToastNotification?.({
          type: 'error',
          title: `${networkType.charAt(0).toUpperCase() + networkType.slice(1)} Network Alert`,
          message: `Critical network issues detected. Latency: ${newStatus.latency}ms`,
        });
      }
      
      return newStatus;
    });
    
    // Update global metrics
    setGlobalMetrics(prev => ({
      ...prev,
      totalTransactions: prev.totalTransactions + Math.floor(Math.random() * 5),
      crossChainSwaps: networkType === 'ethereum' ? prev.crossChainSwaps + Math.floor(Math.random() * 2) : prev.crossChainSwaps,
      totalValueLocked: prev.totalValueLocked + (Math.random() * 1000),
      lastCrossChainSwap: Math.random() > 0.7 ? new Date() : prev.lastCrossChainSwap,
    }));
  }, [performHealthCheck, onNetworkStatusChange, addToastNotification]);

  // Start/stop monitoring
  const toggleMonitoring = useCallback(() => {
    setIsMonitoring(prev => !prev);
  }, []);

  // Auto-update network status
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      updateNetworkStatus('ethereum');
      updateNetworkStatus('sui');
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isMonitoring, refreshInterval, updateNetworkStatus]);

  // Update connection status when wallets change
  useEffect(() => {
    setEthereumStatus(prev => ({ ...prev, isConnected: !!ethAddress }));
  }, [ethAddress]);

  useEffect(() => {
    setSuiStatus(prev => ({ ...prev, isConnected: !!currentSuiAccount?.address }));
  }, [currentSuiAccount]);

  // Auto-start monitoring when both wallets are connected
  useEffect(() => {
    if (ethAddress && currentSuiAccount?.address && !isMonitoring) {
      setIsMonitoring(true);
      addToastNotification?.({
        type: 'success',
        title: 'Network Monitoring',
        message: 'Cross-chain network monitoring started',
      });
    }
  }, [ethAddress, currentSuiAccount, isMonitoring, addToastNotification]);

  const getStatusColor = (status: ChainStatus['healthStatus']) => {
    switch (status) {
      case 'healthy': return 'text-success';
      case 'warning': return 'text-warning';
      case 'critical': return 'text-error';
      case 'offline': return 'text-base-content/50';
      default: return 'text-base-content';
    }
  };

  const getStatusIcon = (status: ChainStatus['healthStatus']) => {
    switch (status) {
      case 'healthy': return '🟢';
      case 'warning': return '🟡';
      case 'critical': return '🔴';
      case 'offline': return '⚫';
      default: return '⚪';
    }
  };

  const formatLatency = (latency: number) => {
    if (latency < 1000) return `${latency}ms`;
    return `${(latency / 1000).toFixed(1)}s`;
  };

  const NetworkCard: React.FC<{ 
    title: string; 
    status: ChainStatus; 
    metrics?: NetworkMetrics;
    networkType: 'ethereum' | 'sui';
  }> = ({ title, status, networkType }) => (
    <div className="bg-base-100 rounded-lg p-4 border border-base-300">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{networkType === 'ethereum' ? '🔷' : '💫'}</span>
          <h3 className="font-semibold">{title}</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm">{getStatusIcon(status.healthStatus)}</span>
          <span className={`text-sm font-medium ${getStatusColor(status.healthStatus)}`}>
            {status.healthStatus.charAt(0).toUpperCase() + status.healthStatus.slice(1)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-base-content/70">Connection</div>
          <div className={`font-medium ${status.isConnected ? 'text-success' : 'text-warning'}`}>
            {status.isConnected ? '🔗 Connected' : '⚠️ Disconnected'}
          </div>
        </div>
        <div>
          <div className="text-base-content/70">Block Height</div>
          <div className="font-mono font-medium">
            #{status.blockHeight.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-base-content/70">Latency</div>
          <div className={`font-medium ${status.latency > 1000 ? 'text-warning' : 'text-success'}`}>
            {formatLatency(status.latency)}
          </div>
        </div>
        <div>
          <div className="text-base-content/70">Gas Price</div>
          <div className="font-medium">
            {status.gasPrice} {networkType === 'ethereum' ? 'Gwei' : 'MIST'}
          </div>
        </div>
      </div>

      {showDetailedMetrics && (
        <div className="mt-3 pt-3 border-t border-base-300">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-base-content/70">Avg Block Time</div>
              <div className="font-medium">{(status.averageBlockTime / 1000).toFixed(1)}s</div>
            </div>
            <div>
              <div className="text-base-content/70">Error Count</div>
              <div className={`font-medium ${status.errorCount > 0 ? 'text-error' : 'text-success'}`}>
                {status.errorCount}
              </div>
            </div>
          </div>
          {status.lastError && (
            <div className="mt-2 text-xs text-error bg-error/10 p-2 rounded">
              Last Error: {status.lastError}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Cross-Chain Network Monitor
            </h2>
            <p className="text-gray-600">
              Real-time monitoring of Ethereum and Sui network health
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`badge ${isMonitoring ? 'badge-success' : 'badge-ghost'}`}>
              {isMonitoring ? '🔄 Monitoring' : '⏸️ Paused'}
            </div>
            <button
              onClick={toggleMonitoring}
              className={`btn btn-sm ${isMonitoring ? 'btn-warning' : 'btn-primary'}`}
            >
              {isMonitoring ? 'Stop' : 'Start'} Monitoring
            </button>
          </div>
        </div>
      </div>

      {/* Global Metrics */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Global Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {globalMetrics.totalTransactions}
            </div>
            <div className="text-sm text-gray-600">Total Transactions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {globalMetrics.crossChainSwaps}
            </div>
            <div className="text-sm text-gray-600">Cross-Chain Swaps</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              ${globalMetrics.totalValueLocked.toFixed(0)}K
            </div>
            <div className="text-sm text-gray-600">Total Value Locked</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-800">
              {globalMetrics.lastCrossChainSwap 
                ? globalMetrics.lastCrossChainSwap.toLocaleTimeString()
                : 'No recent swaps'
              }
            </div>
            <div className="text-sm text-gray-600">Last Cross-Chain Swap</div>
          </div>
        </div>
      </div>

      {/* Network Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NetworkCard
          title="Ethereum Network"
          status={ethereumStatus}
          networkType="ethereum"
        />
        <NetworkCard
          title="Sui Network"  
          status={suiStatus}
          networkType="sui"
        />
      </div>

      {/* Advanced Controls */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Monitor Controls</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Refresh Interval
            </label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-lg"
              value={refreshInterval}
              onChange={(e) => {
                // This would need to be lifted up to parent component
                console.log('Refresh interval changed:', e.target.value);
              }}
            >
              <option value={1000}>1 second</option>
              <option value={5000}>5 seconds</option>
              <option value={10000}>10 seconds</option>
              <option value={30000}>30 seconds</option>
            </select>
          </div>
          
          <div className="flex flex-col space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showDetailedMetrics}
                onChange={(e) => {
                  // This would need to be lifted up to parent component
                  console.log('Detailed metrics toggled:', e.target.checked);
                }}
                className="mr-2"
              />
              <span className="text-sm">Show Detailed Metrics</span>
            </label>
            <button
              onClick={() => {
                updateNetworkStatus('ethereum');
                updateNetworkStatus('sui');
                addToastNotification?.({
                  type: 'info',
                  title: 'Network Status',
                  message: 'Network status refreshed manually',
                });
              }}
              className="btn btn-sm btn-outline"
            >
              🔄 Manual Refresh
            </button>
          </div>

          <div className="flex flex-col justify-center">
            <div className="text-sm text-gray-600">
              Status: {isMonitoring ? 'Active monitoring' : 'Monitoring paused'}
            </div>
            <div className="text-xs text-gray-500">
              Last update: {new Date().toLocaleTimeString()}
            </div>
            <div className="text-xs text-gray-500">
              Networks: {[ethereumStatus.isConnected && 'ETH', suiStatus.isConnected && 'SUI'].filter(Boolean).join(', ') || 'None connected'}
            </div>
          </div>
        </div>
      </div>

      {/* Network Health Summary */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Network Health Summary</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <span>🔷</span>
              <span className="font-medium">Ethereum</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`badge ${ethereumStatus.healthStatus === 'healthy' ? 'badge-success' : ethereumStatus.healthStatus === 'warning' ? 'badge-warning' : 'badge-error'}`}>
                {ethereumStatus.healthStatus}
              </span>
              <span className="text-sm text-gray-600">
                {formatLatency(ethereumStatus.latency)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <span>💫</span>
              <span className="font-medium">Sui</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`badge ${suiStatus.healthStatus === 'healthy' ? 'badge-success' : suiStatus.healthStatus === 'warning' ? 'badge-warning' : 'badge-error'}`}>
                {suiStatus.healthStatus}
              </span>
              <span className="text-sm text-gray-600">
                {formatLatency(suiStatus.latency)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <span>⚡</span>
              <span className="font-medium">Cross-Chain Bridge</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`badge ${ethereumStatus.healthStatus === 'healthy' && suiStatus.healthStatus === 'healthy' ? 'badge-success' : 'badge-warning'}`}>
                {ethereumStatus.healthStatus === 'healthy' && suiStatus.healthStatus === 'healthy' ? 'operational' : 'degraded'}
              </span>
              <span className="text-sm text-gray-600">
                Bridge Ready
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrossChainNetworkMonitor;