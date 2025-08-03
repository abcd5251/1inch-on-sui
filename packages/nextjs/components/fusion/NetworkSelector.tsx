"use client";

import { useCallback } from "react";
import { NETWORK_CONFIG, NetworkType, useUnifiedFusionSDK } from "~~/hooks/fusion/useUnifiedFusionSDK";

interface NetworkSelectorProps {
  onNetworkChange?: (network: NetworkType) => void;
  className?: string;
}

/**
 * 网络选择器组件
 * 允许用户在 Sui 和以太坊网络之间切换
 */
export const NetworkSelector = ({ onNetworkChange, className = "" }: NetworkSelectorProps) => {
  const { activeNetwork, switchNetwork, getNetworkInfo, SUPPORTED_NETWORKS } = useUnifiedFusionSDK();

  const handleNetworkChange = useCallback(
    (network: NetworkType) => {
      switchNetwork(network);
      onNetworkChange?.(network);
    },
    [switchNetwork, onNetworkChange],
  );

  return (
    <div className={`flex flex-col space-y-4 ${className}`}>
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">选择网络:</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SUPPORTED_NETWORKS.map(network => {
          const config = NETWORK_CONFIG[network];
          const info = getNetworkInfo(network);
          const isActive = activeNetwork === network;
          const isConnected = info?.isConnected || false;
          const isInitialized = info?.isInitialized || false;
          const hasError = !!info?.error;

          return (
            <div
              key={network}
              className={`
                relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                ${
                  isActive
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }
                ${hasError ? "border-red-300 bg-red-50 dark:bg-red-900/20" : ""}
              `}
              onClick={() => handleNetworkChange(network)}
            >
              {/* 网络图标和名称 */}
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">{config.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{config.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{config.chainId}</p>
                </div>
              </div>

              {/* 状态指示器 */}
              <div className="flex flex-wrap gap-2 mb-2">
                {/* 连接状态 */}
                <span
                  className={`
                    inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                    ${
                      isConnected
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                    }
                  `}
                >
                  <span
                    className={`
                      w-2 h-2 rounded-full mr-1
                      ${isConnected ? "bg-green-500" : "bg-gray-400"}
                    `}
                  />
                  {isConnected ? "已连接" : "未连接"}
                </span>

                {/* 初始化状态 */}
                {isConnected && (
                  <span
                    className={`
                      inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                      ${
                        isInitialized
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }
                    `}
                  >
                    {isInitialized ? "已初始化" : "未初始化"}
                  </span>
                )}

                {/* 错误状态 */}
                {hasError && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    错误
                  </span>
                )}
              </div>

              {/* 地址显示 */}
              {info?.address && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-medium">地址: </span>
                  <span className="font-mono">
                    {info.address.slice(0, 6)}...{info.address.slice(-4)}
                  </span>
                </div>
              )}

              {/* 错误信息 */}
              {hasError && (
                <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                  <span className="font-medium">错误: </span>
                  <span>{info?.error}</span>
                </div>
              )}

              {/* 活跃网络指示器 */}
              {isActive && (
                <div className="absolute top-2 right-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 当前活跃网络信息 */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">当前网络:</span>
          <span className="text-lg">{NETWORK_CONFIG[activeNetwork].icon}</span>
          <span className="font-semibold text-gray-900 dark:text-white">{NETWORK_CONFIG[activeNetwork].name}</span>
        </div>
      </div>

      {/* 网络切换提示 */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">💡 点击上方网络卡片可切换到对应网络</div>
    </div>
  );
};

/**
 * 简化版网络选择器（下拉菜单形式）
 */
export const CompactNetworkSelector = ({ onNetworkChange, className = "" }: NetworkSelectorProps) => {
  const { activeNetwork, switchNetwork, SUPPORTED_NETWORKS } = useUnifiedFusionSDK();

  const handleNetworkChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const network = event.target.value as NetworkType;
      switchNetwork(network);
      onNetworkChange?.(network);
    },
    [switchNetwork, onNetworkChange],
  );

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">网络:</label>
      <select
        value={activeNetwork}
        onChange={handleNetworkChange}
        className="
          px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
          bg-white dark:bg-gray-800 text-gray-900 dark:text-white
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          text-sm
        "
      >
        {SUPPORTED_NETWORKS.map(network => {
          const config = NETWORK_CONFIG[network];
          return (
            <option key={network} value={network}>
              {config.icon} {config.name}
            </option>
          );
        })}
      </select>
    </div>
  );
};
