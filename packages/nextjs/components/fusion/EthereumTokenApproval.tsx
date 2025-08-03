"use client";

import React, { useCallback, useState } from "react";
// import Web3, { TransactionReceipt } from "web3";
import { ETHEREUM_TOKENS, useEthereumFusionSDK } from "~~/hooks/fusion/useEthereumFusionSDK";

interface TokenApprovalProps {
  onApprovalComplete?: (txHash: string) => void;
  onError?: (error: string) => void;
}

interface ApprovalStatus {
  token: string;
  spender: string;
  allowance: string;
  isApproved: boolean;
  isLoading: boolean;
}

/**
 * 以太坊代币授权组件
 * 用于管理 ERC20 代币的授权操作
 */
export const EthereumTokenApproval = ({ onApprovalComplete, onError }: TokenApprovalProps) => {
  const { approveToken, isInitialized, address, error: sdkError } = useEthereumFusionSDK();

  const [selectedToken, setSelectedToken] = useState<string>("");
  const [approvalAmount, setApprovalAmount] = useState<string>("");
  const [isApproving, setIsApproving] = useState(false);
  const [approvalStatuses, setApprovalStatuses] = useState<ApprovalStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 预定义代币列表
  const tokenOptions = [
    { value: ETHEREUM_TOKENS.USDC, label: "USDC", symbol: "USDC" },
    { value: ETHEREUM_TOKENS.WETH, label: "Wrapped Ether", symbol: "WETH" },
    { value: ETHEREUM_TOKENS.ONEINCH, label: "1INCH Token", symbol: "1INCH" },
  ];

  // 处理代币授权
  const handleApproval = useCallback(
    async (amount: string, tokenAddress: string) => {
      if (!tokenAddress || !amount) {
        setError("请选择代币和输入授权数量");
        return;
      }

      if (!isInitialized) {
        setError("以太坊 SDK 未初始化");
        return;
      }

      setIsApproving(true);
      setError(null);

      try {
        const txHash = await approveToken({
          tokenAddress,
          amount,
        });

        // 更新授权状态
        setApprovalStatuses(prev => [
          ...prev.filter(status => status.token !== tokenAddress),
          {
            token: tokenAddress,
            spender: "1inch Fusion Protocol",
            allowance: amount,
            isApproved: true,
            isLoading: false,
          },
        ]);

        // 重置表单
        setSelectedToken("");
        setApprovalAmount("");

        // 调用回调
        onApprovalComplete?.(txHash);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "授权失败";
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsApproving(false);
      }
    },
    [isInitialized, approveToken, onApprovalComplete, onError],
  );

  // 快速授权预设金额
  const handleQuickApproval = useCallback(
    async (tokenAddress: string, amount: string) => {
      if (!isInitialized) {
        setError("以太坊 SDK 未初始化");
        return;
      }

      setIsApproving(true);
      setError(null);

      try {
        const txHash = await approveToken({
          tokenAddress,
          amount,
        });

        // 更新授权状态
        setApprovalStatuses(prev => [
          ...prev.filter(status => status.token !== tokenAddress),
          {
            token: tokenAddress,
            spender: "1inch Fusion Protocol",
            allowance: amount,
            isApproved: true,
            isLoading: false,
          },
        ]);

        onApprovalComplete?.(txHash);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "授权失败";
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsApproving(false);
      }
    },
    [isInitialized, approveToken, onApprovalComplete, onError],
  );

  // 获取代币符号
  const getTokenSymbol = (address: string) => {
    const token = tokenOptions.find(t => t.value === address);
    return token?.symbol || address.slice(0, 8) + "...";
  };

  // 获取代币标签
  const getTokenLabel = (address: string) => {
    const token = tokenOptions.find(t => t.value === address);
    return token?.label || "未知代币";
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">以太坊代币授权</h2>

      {/* 网络状态 */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">以太坊网络状态:</span>
            <span
              className={`ml-2 px-2 py-1 rounded text-xs ${
                isInitialized
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {isInitialized ? "已连接" : "未连接"}
            </span>
          </div>
        </div>
        {address && (
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            钱包地址: {address.slice(0, 10)}...{address.slice(-6)}
          </div>
        )}
      </div>

      {isInitialized ? (
        <>
          {/* 快速授权按钮 */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">快速授权</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tokenOptions.map(token => (
                <div key={token.value} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="text-center mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">{token.symbol}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{token.label}</p>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleQuickApproval(token.value, "1000")}
                      disabled={isApproving}
                      className="w-full py-2 px-3 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                    >
                      授权 1,000
                    </button>
                    <button
                      onClick={() => handleQuickApproval(token.value, "10000")}
                      disabled={isApproving}
                      className="w-full py-2 px-3 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50"
                    >
                      授权 10,000
                    </button>
                    <button
                      onClick={() =>
                        handleQuickApproval(
                          token.value,
                          "115792089237316195423570985008687907853269984665640564039457584007913129639935",
                        )
                      }
                      disabled={isApproving}
                      className="w-full py-2 px-3 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 disabled:opacity-50"
                    >
                      无限授权
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 自定义授权表单 */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">自定义授权</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">选择代币</label>
                <select
                  value={selectedToken}
                  onChange={e => setSelectedToken(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">选择要授权的代币</option>
                  {tokenOptions.map(token => (
                    <option key={token.value} value={token.value}>
                      {token.symbol} - {token.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">授权数量</label>
                <input
                  type="text"
                  value={approvalAmount}
                  onChange={e => setApprovalAmount(e.target.value)}
                  placeholder="输入授权数量（如：1000）"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <button
                onClick={() => handleApproval(approvalAmount, selectedToken)}
                disabled={isApproving || !selectedToken || !approvalAmount}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {isApproving ? "授权中..." : "确认授权"}
              </button>
            </div>
          </div>

          {/* 授权状态列表 */}
          {approvalStatuses.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">授权状态</h3>
              <div className="space-y-3">
                {approvalStatuses.map((status, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{getTokenSymbol(status.token)}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{getTokenLabel(status.token)}</p>
                      </div>
                      <div className="text-right">
                        <div
                          className={`px-2 py-1 rounded text-xs ${
                            status.isApproved
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}
                        >
                          {status.isApproved ? "已授权" : "待授权"}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">数量: {status.allowance}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400 mb-4">请先连接以太坊钱包</div>
          <p className="text-sm text-gray-400 dark:text-gray-500">需要连接 MetaMask 或其他以太坊钱包才能进行代币授权</p>
        </div>
      )}

      {/* 错误信息 */}
      {(error || sdkError) && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-400 text-sm">{error || sdkError}</p>
        </div>
      )}

      {/* 说明信息 */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">授权说明</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
          <li>• 授权允许 1inch Fusion Protocol 使用您的代币进行交易</li>
          <li>• 您可以随时撤销或修改授权额度</li>
          <li>• 无限授权可以避免重复授权，但请谨慎使用</li>
          <li>• 每次授权都需要支付 Gas 费用</li>
        </ul>
      </div>
    </div>
  );
};
