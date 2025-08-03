"use client";

import React, { useState, useEffect, useCallback } from "react";
import { unifiedRelayerService, UnifiedRelayerConfig } from "~~/services/relayer/UnifiedRelayerService";
import { SwapData, SwapStats } from "~~/types/swap";
import { useUnifiedStore } from "~~/services/store/unifiedStore";

interface RelayerControlPanelProps {
  className?: string;
  onServiceChange?: (serviceType: 'mock' | 'real') => void;
  onSwapUpdate?: (swap: SwapData) => void;
}

export const RelayerControlPanel: React.FC<RelayerControlPanelProps> = ({
  className = "",
  onServiceChange,
  onSwapUpdate,
}) => {
  const { addToastNotification } = useUnifiedStore();
  
  const [serviceInfo, setServiceInfo] = useState(unifiedRelayerService.getServiceInfo());
  const [isHealthy, setIsHealthy] = useState(true);
  const [stats, setStats] = useState<SwapStats | null>(null);
  const [recentSwaps, setRecentSwaps] = useState<SwapData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Mock service controls (only available when using mock service)
  const [mockOnline, setMockOnline] = useState(true);
  const [mockLatency, setMockLatency] = useState(200);
  const [mockSuccessRate, setMockSuccessRate] = useState(0.95);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Health check
      const health = await unifiedRelayerService.healthCheck();
      setIsHealthy(health.success);

      // Get stats
      const statsResponse = await unifiedRelayerService.getSwapStats();
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      // Get recent swaps
      const swapsResponse = await unifiedRelayerService.getSwaps({ limit: 5 });
      if (swapsResponse.success && swapsResponse.data) {
        setRecentSwaps(swapsResponse.data.data);
      }

      // Update service info
      setServiceInfo(unifiedRelayerService.getServiceInfo());
      
    } catch (error) {
      console.error('Failed to refresh relayer data:', error);
      setIsHealthy(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const handleServiceSwitch = (useMock: boolean) => {
    try {
      unifiedRelayerService.switchService(useMock);
      const newServiceInfo = unifiedRelayerService.getServiceInfo();
      setServiceInfo(newServiceInfo);
      onServiceChange?.(newServiceInfo.type);
      
      addToastNotification?.({
        type: 'success',
        title: 'Service Switched',
        message: `Now using ${useMock ? 'Mock' : 'Real'} Relayer Service`,
      });

      // Refresh data after switching
      setTimeout(refreshData, 500);
    } catch (error) {
      addToastNotification?.({
        type: 'error',
        title: 'Service Switch Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleMockControlUpdate = () => {
    const controls = unifiedRelayerService.getMockControls();
    if (controls) {
      controls.setOnlineStatus(mockOnline);
      controls.setLatency(mockLatency);
      controls.setSuccessRate(mockSuccessRate);
      
      addToastNotification?.({
        type: 'info',
        title: 'Mock Service Updated',
        message: `Online: ${mockOnline}, Latency: ${mockLatency}ms, Success: ${(mockSuccessRate * 100).toFixed(1)}%`,
      });
    }
  };

  const handleAddRandomSwap = () => {
    const controls = unifiedRelayerService.getMockControls();
    if (controls) {
      const newSwap = controls.addRandomSwap();
      onSwapUpdate?.(newSwap);
      
      addToastNotification?.({
        type: 'success',
        title: 'Demo Swap Added',
        message: `Added swap: ${newSwap.id}`,
      });

      // Refresh data to show the new swap
      setTimeout(refreshData, 500);
    }
  };

  const getStatusColor = (healthy: boolean) => {
    return healthy ? 'text-success' : 'text-error';
  };

  const getStatusIcon = (healthy: boolean) => {
    return healthy ? '🟢' : '🔴';
  };

  const formatAmount = (amount: string, decimals: number = 18): string => {
    try {
      const value = parseFloat(amount) / Math.pow(10, decimals);
      if (value < 0.001) return value.toExponential(2);
      if (value < 1) return value.toFixed(4);
      if (value < 1000) return value.toFixed(2);
      return (value / 1000).toFixed(1) + 'K';
    } catch {
      return '0';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Relayer Service Control Panel
            </h2>
            <p className="text-gray-600">
              Monitor and control the cross-chain relayer service
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`badge ${serviceInfo.type === 'mock' ? 'badge-info' : 'badge-success'}`}>
              {serviceInfo.type === 'mock' ? '🎭 Mock Service' : '🚀 Real Service'}
            </div>
            <button
              onClick={refreshData}
              disabled={isLoading}
              className={`btn btn-sm btn-outline ${isLoading ? 'loading' : ''}`}
            >
              {isLoading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Service Status */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Service Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`text-2xl ${getStatusColor(isHealthy)}`}>
              {getStatusIcon(isHealthy)}
            </div>
            <div className="text-sm font-medium">Service Health</div>
            <div className={`text-xs ${getStatusColor(isHealthy)}`}>
              {isHealthy ? 'Healthy' : 'Unhealthy'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {serviceInfo.type === 'mock' ? 'DEMO' : 'LIVE'}
            </div>
            <div className="text-sm font-medium">Service Mode</div>
            <div className="text-xs text-gray-600">
              {serviceInfo.type === 'mock' ? 'Mock/Demo Mode' : 'Production Mode'}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats ? stats.totalSwaps : '0'}
            </div>
            <div className="text-sm font-medium">Total Swaps</div>
            <div className="text-xs text-gray-600">
              All time
            </div>
          </div>
        </div>
      </div>

      {/* Service Controls */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Service Controls</h3>
        
        {/* Service Type Switch */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Service Type
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => handleServiceSwitch(true)}
              disabled={serviceInfo.type === 'mock'}
              className={`btn btn-sm ${serviceInfo.type === 'mock' ? 'btn-info' : 'btn-outline'}`}
            >
              🎭 Mock Service (Demo)
            </button>
            <button
              onClick={() => handleServiceSwitch(false)}
              disabled={serviceInfo.type === 'real'}
              className={`btn btn-sm ${serviceInfo.type === 'real' ? 'btn-success' : 'btn-outline'}`}
            >
              🚀 Real Service
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Switch between demo mock service and real relayer backend
          </div>
        </div>

        {/* Mock Service Controls */}
        {serviceInfo.type === 'mock' && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-medium mb-3 text-blue-800">Mock Service Controls</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={mockOnline}
                    onChange={(e) => setMockOnline(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Service Online</span>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latency: {mockLatency}ms
                </label>
                <input
                  type="range"
                  min="50"
                  max="2000"
                  value={mockLatency}
                  onChange={(e) => setMockLatency(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Success Rate: {(mockSuccessRate * 100).toFixed(1)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={mockSuccessRate}
                  onChange={(e) => setMockSuccessRate(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleMockControlUpdate}
                className="btn btn-xs btn-primary"
              >
                Apply Changes
              </button>
              <button
                onClick={handleAddRandomSwap}
                className="btn btn-xs btn-outline"
              >
                Add Random Swap
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      {stats && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">
                {stats.completedSwaps}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-yellow-600">
                {stats.pendingSwaps}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-600">
                {stats.failedSwaps}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">
                {(stats.successRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
          </div>
          
          {/* Daily/Weekly Stats */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium mb-2">Daily Stats</h4>
              <div className="text-sm space-y-1">
                <div>Created: {stats.dailyStats.swapsCreated}</div>
                <div>Completed: {stats.dailyStats.swapsCompleted}</div>
                <div>Volume: {formatAmount(stats.dailyStats.volume)}</div>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium mb-2">Weekly Stats</h4>
              <div className="text-sm space-y-1">
                <div>Created: {stats.weeklyStats.swapsCreated}</div>
                <div>Completed: {stats.weeklyStats.swapsCompleted}</div>
                <div>Volume: {formatAmount(stats.weeklyStats.volume)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Swaps */}
      {recentSwaps.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Recent Swaps</h3>
          <div className="space-y-3">
            {recentSwaps.map((swap) => (
              <div
                key={swap.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono text-gray-600">
                      #{swap.id}
                    </span>
                    <span
                      className={`badge badge-xs ${
                        swap.status === 'completed' ? 'badge-success' :
                        swap.status === 'pending' ? 'badge-warning' :
                        swap.status === 'failed' ? 'badge-error' : 'badge-info'
                      }`}
                    >
                      {swap.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatAmount(swap.makerAmount)} → {formatAmount(swap.takerAmount)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(swap.createdAt).toLocaleString()}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {swap.makerChain} → {swap.takerChain}
                  </div>
                  {swap.metadata && (
                    <div className="text-xs text-gray-500">
                      {swap.metadata.fromTokenSymbol} → {swap.metadata.toTokenSymbol}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service Configuration */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">Current Config</h4>
            <div className="space-y-1">
              <div>Service Type: {serviceInfo.type}</div>
              <div>Auto Demo: {serviceInfo.config.enableAutoDemo ? 'Enabled' : 'Disabled'}</div>
              {serviceInfo.config.baseUrl && (
                <div>Base URL: {serviceInfo.config.baseUrl}</div>
              )}
              {serviceInfo.config.timeout && (
                <div>Timeout: {serviceInfo.config.timeout}ms</div>
              )}
            </div>
          </div>
          
          {serviceInfo.status && (
            <div>
              <h4 className="font-medium mb-2">Mock Service Status</h4>
              <div className="space-y-1">
                <div>Online: {serviceInfo.status.isOnline ? 'Yes' : 'No'}</div>
                <div>Latency: {serviceInfo.status.latency}ms</div>
                <div>Success Rate: {(serviceInfo.status.successRate * 100).toFixed(1)}%</div>
                <div>Total Swaps: {serviceInfo.status.totalSwaps}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RelayerControlPanel;