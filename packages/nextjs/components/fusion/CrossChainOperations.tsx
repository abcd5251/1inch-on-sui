"use client";

import { useCallback, useEffect, useState } from "react";
import { useCrossChainWallet } from "~~/hooks/cross-chain/useCrossChainWallet";
import { useCoins } from "~~/hooks/fusion/useCoins";
import { useFusionSDK } from "~~/hooks/fusion/useFusionSDK";

export interface CrossChainSwapData {
  id: string;
  status: "initiated" | "locked" | "confirmed" | "completed" | "failed" | "expired";
  sourceChain: "sui" | "ethereum";
  targetChain: "sui" | "ethereum";
  sourceAmount: string;
  targetAmount: string;
  sourceToken: string;
  targetToken: string;
  hashLock?: string;
  timeLock?: {
    expiryTime: number;
    withdrawalDelay: number;
  };
  secret?: string;
  txHashes: {
    initiation?: string;
    lock?: string;
    reveal?: string;
    refund?: string;
  };
  createdAt: number;
  updatedAt: number;
}

interface CrossChainOperationsProps {
  onInitiateSwap?: (data: any) => Promise<void>;
  onConfirmSwap?: (swapId: string, secret: string) => Promise<void>;
  onRefundSwap?: (swapId: string) => Promise<void>;
  className?: string;
}

export const CrossChainOperations = ({
  onInitiateSwap,
  onConfirmSwap,
  onRefundSwap,
  className = "",
}: CrossChainOperationsProps) => {
  const { state, isFullyConnected, getCrossChainReadiness } = useCrossChainWallet();
  const { initiateCrossChainSwap, confirmCrossChainSwap, isInitialized: sdkInitialized, address } = useFusionSDK();
  const { selectCoinsForAmount, hasEnoughBalance, formatBalance, parseAmount, suiBalance } = useCoins();

  const [activeTab, setActiveTab] = useState<"initiate" | "monitor" | "history">("initiate");
  const [isLoading, setIsLoading] = useState(false);
  const [realTimeSwaps, setRealTimeSwaps] = useState<CrossChainSwapData[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Mock swap data
  const [swaps] = useState<CrossChainSwapData[]>([
    {
      id: "swap-1",
      status: "locked",
      sourceChain: "sui",
      targetChain: "ethereum",
      sourceAmount: "10.0",
      targetAmount: "20.0",
      sourceToken: "SUI",
      targetToken: "USDC",
      hashLock: "0xabcd...1234",
      timeLock: {
        expiryTime: Date.now() + 3600000, // 1 hour from now
        withdrawalDelay: 1800000, // 30 minutes
      },
      txHashes: {
        initiation: "0x1234...abcd",
        lock: "0x5678...efgh",
      },
      createdAt: Date.now() - 600000, // 10 minutes ago
      updatedAt: Date.now() - 300000, // 5 minutes ago
    },
    {
      id: "swap-2",
      status: "completed",
      sourceChain: "ethereum",
      targetChain: "sui",
      sourceAmount: "5.0",
      targetAmount: "2.5",
      sourceToken: "USDC",
      targetToken: "SUI",
      txHashes: {
        initiation: "0xaaaa...bbbb",
        lock: "0xcccc...dddd",
        reveal: "0xeeee...ffff",
      },
      createdAt: Date.now() - 1800000, // 30 minutes ago
      updatedAt: Date.now() - 900000, // 15 minutes ago
    },
  ]);

  const [newSwap, setNewSwap] = useState({
    sourceChain: "sui" as "sui" | "ethereum",
    targetChain: "ethereum" as "sui" | "ethereum",
    sourceAmount: "",
    targetAmount: "",
    sourceToken: "SUI",
    targetToken: "USDC",
    safetyDeposit: "0.1",
  });

  const readiness = getCrossChainReadiness();

  // 清除消息
  const clearMessages = useCallback(() => {
    setSubmitError(null);
    setSubmitSuccess(null);
  }, []);

  // 验证表单
  const validateSwapForm = useCallback((): string | null => {
    if (!isFullyConnected) {
      return "Please connect both Ethereum and Sui wallets";
    }

    if (!sdkInitialized) {
      return "Fusion SDK not initialized";
    }

    if (!newSwap.sourceAmount || parseFloat(newSwap.sourceAmount) <= 0) {
      return "Please enter a valid source amount";
    }

    if (!newSwap.targetAmount || parseFloat(newSwap.targetAmount) <= 0) {
      return "Please enter a valid target amount";
    }

    // 检查余额（假设从 SUI 发起）
    if (newSwap.sourceChain === "sui" && newSwap.sourceToken === "SUI") {
      const sourceAmountWei = parseAmount(newSwap.sourceAmount, 9);
      const safetyDepositWei = parseAmount(newSwap.safetyDeposit, 9);
      const totalRequired = BigInt(sourceAmountWei) + BigInt(safetyDepositWei);

      if (!hasEnoughBalance("0x2::sui::SUI", totalRequired.toString())) {
        return `Insufficient SUI balance. Required: ${formatBalance(totalRequired.toString(), 9)} SUI (including safety deposit)`;
      }
    }

    return null;
  }, [isFullyConnected, sdkInitialized, newSwap, parseAmount, hasEnoughBalance, formatBalance]);

  const handleInitiateSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    const validationError = validateSwapForm();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      // 选择代币对象
      const sourceAmountWei = parseAmount(newSwap.sourceAmount, 9);
      const safetyDepositWei = parseAmount(newSwap.safetyDeposit, 9);

      const sourceCoins = selectCoinsForAmount("0x2::sui::SUI", sourceAmountWei);
      const safetyDepositCoins = selectCoinsForAmount("0x2::sui::SUI", safetyDepositWei);

      if (sourceCoins.length === 0 || safetyDepositCoins.length === 0) {
        throw new Error("No suitable SUI coins found");
      }

      // 使用第一个代币对象
      const sourceCoinId = sourceCoins[0].coinObjectId;
      const safetyDepositId = safetyDepositCoins[0].coinObjectId;

      // 构建跨链交换参数
      const swapParams = {
        sourceChain: newSwap.sourceChain,
        targetChain: newSwap.targetChain,
        sourceAmount: sourceAmountWei,
        targetAmount: parseAmount(newSwap.targetAmount, 6), // 假设 USDC 6位小数
        sourceToken: newSwap.sourceToken,
        targetToken: newSwap.targetToken,
        safetyDepositAmount: safetyDepositWei,
        targetChainId: newSwap.targetChain === "ethereum" ? "1" : "sui",
        evmOrderHash: new Uint8Array(32), // 需要从 EVM 侧获取
        contractAddress: new Uint8Array(20), // EVM 合约地址
        tokenAddress: new Uint8Array(20), // 目标代币地址
        recipient: new Uint8Array(20), // 接收者地址
        secret: crypto.getRandomValues(new Uint8Array(32)), // 生成随机密钥
        timeLockConfig: {
          srcWithdrawalDelay: "3600000", // 1小时
          dstWithdrawalDelay: "7200000", // 2小时
          srcPublicWithdrawalDelay: "86400000", // 24小时
          dstPublicWithdrawalDelay: "172800000", // 48小时
          emergencyWithdrawalDelay: "259200000", // 72小时
        },
        metadata: new Uint8Array(0),
      };

      console.log("Initiating cross-chain swap with params:", swapParams);
      const result = await initiateCrossChainSwap(swapParams);
      console.log("Cross-chain swap initiated successfully:", result);

      if (result) {
        setSubmitSuccess(`Cross-chain swap initiated successfully! Transaction: ${result.digest}`);

        // 创建本地交换记录
        const newSwapData: CrossChainSwapData = {
          id: result.digest || Date.now().toString(),
          status: "initiated",
          sourceChain: newSwap.sourceChain,
          targetChain: newSwap.targetChain,
          sourceAmount: newSwap.sourceAmount,
          targetAmount: newSwap.targetAmount,
          sourceToken: newSwap.sourceToken,
          targetToken: newSwap.targetToken,
          txHashes: {
            initiation: result.digest,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        setRealTimeSwaps(prev => [newSwapData, ...prev]);

        // 重置表单
        setNewSwap({
          ...newSwap,
          sourceAmount: "",
          targetAmount: "",
        });

        // 切换到监控页面
        setActiveTab("monitor");

        // 调用外部回调
        if (onInitiateSwap) {
          await onInitiateSwap(swapParams);
        }
      }
    } catch (error) {
      console.error("Failed to initiate cross-chain swap:", error);
      setSubmitError(error instanceof Error ? error.message : "Failed to initiate cross-chain swap");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: CrossChainSwapData["status"]) => {
    switch (status) {
      case "initiated":
        return "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900";
      case "locked":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900";
      case "confirmed":
        return "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900";
      case "completed":
        return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900";
      case "failed":
        return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900";
      case "expired":
        return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900";
    }
  };

  const getChainIcon = (chain: "sui" | "ethereum") => {
    return chain === "sui" ? (
      <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-bold">S</span>
      </div>
    ) : (
      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-bold">Ξ</span>
      </div>
    );
  };

  const formatTimeRemaining = (expiryTime: number) => {
    const remaining = expiryTime - Date.now();
    if (remaining <= 0) return "Expired";

    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  return (
    <div className={`bg-base-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Cross-Chain Operations</h2>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              readiness.canInitiateCrossChain ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`}
          ></div>
          <span className="text-sm">{readiness.canInitiateCrossChain ? "Ready" : "Not Ready"}</span>
        </div>
      </div>

      {/* Readiness Check */}
      {!readiness.canInitiateCrossChain && (
        <div className="alert alert-warning mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <div>
            <div className="font-medium">Cross-Chain Operations Unavailable</div>
            <div className="text-sm">
              Missing connections: {readiness.missingConnections.ethereum && "Ethereum"}{" "}
              {readiness.missingConnections.ethereum && readiness.missingConnections.sui && " & "}{" "}
              {readiness.missingConnections.sui && "Sui"}
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {submitSuccess && (
        <div className="alert alert-success mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <div className="font-medium">Success!</div>
            <div className="text-sm">{submitSuccess}</div>
          </div>
          <button onClick={clearMessages} className="btn btn-ghost btn-sm">
            ×
          </button>
        </div>
      )}

      {/* Error Message */}
      {submitError && (
        <div className="alert alert-error mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <div className="font-medium">Error</div>
            <div className="text-sm">{submitError}</div>
          </div>
          <button onClick={clearMessages} className="btn btn-ghost btn-sm">
            ×
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tabs tabs-boxed mb-6">
        {[
          { key: "initiate", label: "Initiate Swap" },
          { key: "monitor", label: "Active Swaps" },
          { key: "history", label: "History" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`tab ${activeTab === key ? "tab-active" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Initiate Swap Tab */}
      {activeTab === "initiate" && (
        <>
          {/* Balance Display */}
          <div className="bg-base-100 p-4 rounded-lg border mb-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Available Balance</h3>
              <div className="text-right">
                <div className="text-sm text-gray-600 dark:text-gray-400">SUI Balance</div>
                <div className="font-medium">{formatBalance(suiBalance, 9)} SUI</div>
              </div>
            </div>
          </div>

          <form onSubmit={handleInitiateSwap} className="space-y-6">
            {/* Chain Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-base-100 p-4 rounded-lg border">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  {getChainIcon(newSwap.sourceChain)}
                  Source Chain
                </h3>
                <div className="space-y-3">
                  <div className="form-control">
                    <select
                      value={newSwap.sourceChain}
                      onChange={e =>
                        setNewSwap(prev => ({
                          ...prev,
                          sourceChain: e.target.value as "sui" | "ethereum",
                          targetChain: e.target.value === "sui" ? "ethereum" : "sui",
                        }))
                      }
                      className="select select-bordered select-sm"
                    >
                      <option value="sui">Sui Network</option>
                      <option value="ethereum">Ethereum</option>
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Amount</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.0"
                      value={newSwap.sourceAmount}
                      onChange={e => setNewSwap(prev => ({ ...prev, sourceAmount: e.target.value }))}
                      className="input input-bordered input-sm"
                      required
                    />
                  </div>
                  <div className="form-control">
                    <select
                      value={newSwap.sourceToken}
                      onChange={e => setNewSwap(prev => ({ ...prev, sourceToken: e.target.value }))}
                      className="select select-bordered select-sm"
                    >
                      <option value="SUI">SUI</option>
                      <option value="USDC">USDC</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-base-100 p-4 rounded-lg border">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  {getChainIcon(newSwap.targetChain)}
                  Target Chain
                </h3>
                <div className="space-y-3">
                  <div className="form-control">
                    <select
                      value={newSwap.targetChain}
                      onChange={e =>
                        setNewSwap(prev => ({
                          ...prev,
                          targetChain: e.target.value as "sui" | "ethereum",
                          sourceChain: e.target.value === "sui" ? "ethereum" : "sui",
                        }))
                      }
                      className="select select-bordered select-sm"
                    >
                      <option value="ethereum">Ethereum</option>
                      <option value="sui">Sui Network</option>
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Amount</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.0"
                      value={newSwap.targetAmount}
                      onChange={e => setNewSwap(prev => ({ ...prev, targetAmount: e.target.value }))}
                      className="input input-bordered input-sm"
                      required
                    />
                  </div>
                  <div className="form-control">
                    <select
                      value={newSwap.targetToken}
                      onChange={e => setNewSwap(prev => ({ ...prev, targetToken: e.target.value }))}
                      className="select select-bordered select-sm"
                    >
                      <option value="USDC">USDC</option>
                      <option value="SUI">SUI</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Safety Deposit */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Safety Deposit (SUI)</span>
                <span className="label-text-alt">Required for cross-chain security</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={newSwap.safetyDeposit}
                onChange={e => setNewSwap(prev => ({ ...prev, safetyDeposit: e.target.value }))}
                className="input input-bordered"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!readiness.canInitiateCrossChain || isLoading}
                className="btn btn-primary"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="loading loading-spinner loading-sm"></div>
                    Initiating...
                  </div>
                ) : (
                  "Initiate Cross-Chain Swap"
                )}
              </button>
            </div>
          </form>
        </>
      )}

      {/* Monitor Active Swaps Tab */}
      {activeTab === "monitor" && (
        <div className="space-y-4">
          {/* Combine real-time and mock swaps */}
          {[...realTimeSwaps, ...swaps]
            .filter(swap => !["completed", "failed", "expired"].includes(swap.status))
            .map(swap => (
              <div key={swap.id} className="bg-base-100 rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getChainIcon(swap.sourceChain)}
                      <span className="text-sm font-medium">
                        {swap.sourceAmount} {swap.sourceToken}
                      </span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                      {getChainIcon(swap.targetChain)}
                      <span className="text-sm font-medium">
                        {swap.targetAmount} {swap.targetToken}
                      </span>
                    </div>
                  </div>
                  <div className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(swap.status)}`}>
                    {swap.status.toUpperCase()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-500">Hash Lock</div>
                    <div className="font-mono">{swap.hashLock || "Not set"}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-500">Time Remaining</div>
                    <div className="font-mono">
                      {swap.timeLock ? formatTimeRemaining(swap.timeLock.expiryTime) : "No limit"}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-500">Swap ID</div>
                    <div className="font-mono">{swap.id}</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 mt-4">
                  {swap.status === "locked" && (
                    <>
                      <button
                        onClick={() => onConfirmSwap && onConfirmSwap(swap.id, "example-secret")}
                        className="btn btn-success btn-sm"
                      >
                        Confirm Swap
                      </button>
                      <button onClick={() => onRefundSwap && onRefundSwap(swap.id)} className="btn btn-error btn-sm">
                        Refund
                      </button>
                    </>
                  )}
                  {swap.txHashes.initiation && (
                    <button
                      onClick={() =>
                        window.open(
                          `https://suiexplorer.com/txblock/${swap.txHashes.initiation}?network=devnet`,
                          "_blank",
                        )
                      }
                      className="btn btn-ghost btn-sm"
                    >
                      View TX
                    </button>
                  )}
                </div>
              </div>
            ))}

          {[...realTimeSwaps, ...swaps].filter(swap => !["completed", "failed", "expired"].includes(swap.status))
            .length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">🔄</div>
              <div className="text-lg font-medium mb-2">No active swaps</div>
              <div className="text-sm">
                {!readiness.canInitiateCrossChain
                  ? "Connect both wallets to initiate cross-chain swaps"
                  : "Initiate a cross-chain swap to see it here"}
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {[...realTimeSwaps, ...swaps].map(swap => (
            <div key={swap.id} className="bg-base-100 rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getChainIcon(swap.sourceChain)}
                  <span className="text-sm">
                    {swap.sourceAmount} {swap.sourceToken}
                  </span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  {getChainIcon(swap.targetChain)}
                  <span className="text-sm">
                    {swap.targetAmount} {swap.targetToken}
                  </span>
                </div>
                <div className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(swap.status)}`}>
                  {swap.status.toUpperCase()}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {new Date(swap.createdAt).toLocaleDateString()} {new Date(swap.createdAt).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
