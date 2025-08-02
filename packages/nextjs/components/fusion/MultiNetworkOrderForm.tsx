"use client";

import { useCallback, useState } from "react";
import { NetworkType, useUnifiedFusionSDK } from "~~/hooks/fusion/useUnifiedFusionSDK";
import { CompactNetworkSelector } from "./NetworkSelector";
import { ETHEREUM_TOKENS } from "~~/hooks/fusion/useEthereumFusionSDK";

interface OrderFormData {
  fromToken: string;
  toToken: string;
  amount: string;
  orderType: "simple" | "dutch" | "crosschain";
  network: NetworkType;
  // 简单订单
  takingAmount?: string;
  expiryHours?: string;
  // 荷兰拍卖
  initialTakingAmount?: string;
  finalTakingAmount?: string;
  auctionDurationHours?: string;
  // 跨链
  targetChainId?: string;
  safetyDepositAmount?: string;
}

interface MultiNetworkOrderFormProps {
  onSubmit?: (data: OrderFormData) => Promise<void>;
  isLoading?: boolean;
}

// 预定义代币列表
const SUI_TOKENS = {
  SUI: "0x2::sui::SUI",
  USDC: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
  WETH: "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN",
};

const TOKEN_OPTIONS = {
  sui: [
    { value: SUI_TOKENS.SUI, label: "SUI", symbol: "SUI" },
    { value: SUI_TOKENS.USDC, label: "USD Coin", symbol: "USDC" },
    { value: SUI_TOKENS.WETH, label: "Wrapped Ether", symbol: "WETH" },
  ],
  ethereum: [
    { value: ETHEREUM_TOKENS.NATIVE, label: "Ether", symbol: "ETH" },
    { value: ETHEREUM_TOKENS.USDC, label: "USD Coin", symbol: "USDC" },
    { value: ETHEREUM_TOKENS.WETH, label: "Wrapped Ether", symbol: "WETH" },
    { value: ETHEREUM_TOKENS.ONEINCH, label: "1INCH Token", symbol: "1INCH" },
  ],
};

/**
 * 多网络订单创建表单
 * 支持 Sui 和以太坊网络的订单创建
 */
export const MultiNetworkOrderForm = ({ onSubmit, isLoading = false }: MultiNetworkOrderFormProps) => {
  const { activeNetwork, createOrder, getQuote, initializeNetwork, getNetworkInfo } = useUnifiedFusionSDK();
  
  const [formData, setFormData] = useState<OrderFormData>({
    fromToken: "",
    toToken: "",
    amount: "",
    orderType: "simple",
    network: activeNetwork,
    takingAmount: "",
    expiryHours: "1",
    initialTakingAmount: "",
    finalTakingAmount: "",
    auctionDurationHours: "1",
    targetChainId: "1",
    safetyDepositAmount: "",
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 更新表单数据
  const updateFormData = useCallback((updates: Partial<OrderFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  // 网络切换处理
  const handleNetworkChange = useCallback((network: NetworkType) => {
    updateFormData({ 
      network, 
      fromToken: "", 
      toToken: "",
      amount: "",
    });
    setQuote(null);
  }, [updateFormData]);

  // 获取报价
  const handleGetQuote = useCallback(async () => {
    if (!formData.fromToken || !formData.toToken || !formData.amount) {
      setError("请填写完整的代币和数量信息");
      return;
    }

    setQuoteLoading(true);
    setError(null);

    try {
      const quoteResult = await getQuote({
        fromToken: formData.fromToken,
        toToken: formData.toToken,
        amount: formData.amount,
        network: formData.network,
      });
      
      setQuote(quoteResult);
      
      // 自动填充预期接收数量
      if (quoteResult.toAmount) {
        updateFormData({ takingAmount: quoteResult.toAmount });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取报价失败");
    } finally {
      setQuoteLoading(false);
    }
  }, [formData, getQuote, updateFormData]);

  // 提交订单
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fromToken || !formData.toToken || !formData.amount) {
      setError("请填写完整的订单信息");
      return;
    }

    const networkInfo = getNetworkInfo(formData.network);
    if (!networkInfo?.isInitialized) {
      setError(`${formData.network} 网络未初始化，请先初始化`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let preset: any = {};
      
      if (formData.orderType === "simple") {
        preset = {
          type: "simple",
          takingAmount: formData.takingAmount || "0",
          expiryTime: Date.now() + (parseInt(formData.expiryHours || "1") * 3600000),
        };
      } else if (formData.orderType === "dutch") {
        preset = {
          type: "dutch",
          initialTakingAmount: formData.initialTakingAmount || "0",
          finalTakingAmount: formData.finalTakingAmount || "0",
          startTime: Date.now(),
          endTime: Date.now() + (parseInt(formData.auctionDurationHours || "1") * 3600000),
        };
      } else if (formData.orderType === "crosschain") {
        preset = {
          type: "crosschain",
          takingAmount: formData.takingAmount || "0",
          targetChainId: formData.targetChainId || "1",
          safetyDepositAmount: formData.safetyDepositAmount || "0",
          expiryTime: Date.now() + (parseInt(formData.expiryHours || "1") * 3600000),
        };
      }

      const result = await createOrder({
        fromToken: formData.fromToken,
        toToken: formData.toToken,
        amount: formData.amount,
        network: formData.network,
        preset,
      });

      // 调用外部提交处理器
      if (onSubmit) {
        await onSubmit(formData);
      }

      // 重置表单
      setFormData({
        fromToken: "",
        toToken: "",
        amount: "",
        orderType: "simple",
        network: formData.network,
        takingAmount: "",
        expiryHours: "1",
        initialTakingAmount: "",
        finalTakingAmount: "",
        auctionDurationHours: "1",
        targetChainId: "1",
        safetyDepositAmount: "",
      });
      setQuote(null);
      
      alert("订单创建成功！");
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建订单失败");
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, createOrder, getNetworkInfo, onSubmit]);

  // 初始化网络
  const handleInitializeNetwork = useCallback(async () => {
    try {
      await initializeNetwork(formData.network);
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络初始化失败");
    }
  }, [formData.network, initializeNetwork]);

  const currentTokenOptions = TOKEN_OPTIONS[formData.network] || [];
  const networkInfo = getNetworkInfo(formData.network);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">创建多网络订单</h2>
      
      {/* 网络选择器 */}
      <div className="mb-6">
        <CompactNetworkSelector onNetworkChange={handleNetworkChange} />
      </div>

      {/* 网络状态 */}
      {networkInfo && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                网络状态: 
              </span>
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                networkInfo.isInitialized 
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
              }`}>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 订单类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            订单类型
          </label>
          <select
            value={formData.orderType}
            onChange={(e) => updateFormData({ orderType: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="simple">简单订单</option>
            <option value="dutch">荷兰拍卖</option>
            <option value="crosschain">跨链订单</option>
          </select>
        </div>

        {/* 代币选择 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              出售代币
            </label>
            <select
              value={formData.fromToken}
              onChange={(e) => updateFormData({ fromToken: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            >
              <option value="">选择代币</option>
              {currentTokenOptions.map((token) => (
                <option key={token.value} value={token.value}>
                  {token.symbol} - {token.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              购买代币
            </label>
            <select
              value={formData.toToken}
              onChange={(e) => updateFormData({ toToken: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            >
              <option value="">选择代币</option>
              {currentTokenOptions.map((token) => (
                <option key={token.value} value={token.value}>
                  {token.symbol} - {token.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 数量 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            出售数量
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={formData.amount}
              onChange={(e) => updateFormData({ amount: e.target.value })}
              placeholder="输入数量"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            />
            <button
              type="button"
              onClick={handleGetQuote}
              disabled={quoteLoading || !formData.fromToken || !formData.toToken || !formData.amount}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {quoteLoading ? "获取中..." : "获取报价"}
            </button>
          </div>
        </div>

        {/* 报价显示 */}
        {quote && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">报价信息</h4>
            <div className="text-sm text-blue-800 dark:text-blue-400">
              <p>预期接收: {quote.toAmount}</p>
              <p>预估 Gas: {quote.estimatedGas}</p>
              <p>网络: {quote.network}</p>
            </div>
          </div>
        )}

        {/* 订单类型特定字段 */}
        {formData.orderType === "simple" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                期望接收数量
              </label>
              <input
                type="text"
                value={formData.takingAmount}
                onChange={(e) => updateFormData({ takingAmount: e.target.value })}
                placeholder="自动填充或手动输入"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                过期时间（小时）
              </label>
              <input
                type="number"
                value={formData.expiryHours}
                onChange={(e) => updateFormData({ expiryHours: e.target.value })}
                min="1"
                max="168"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {formData.orderType === "dutch" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                起始价格
              </label>
              <input
                type="text"
                value={formData.initialTakingAmount}
                onChange={(e) => updateFormData({ initialTakingAmount: e.target.value })}
                placeholder="起始接收数量"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                结束价格
              </label>
              <input
                type="text"
                value={formData.finalTakingAmount}
                onChange={(e) => updateFormData({ finalTakingAmount: e.target.value })}
                placeholder="结束接收数量"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                拍卖时长（小时）
              </label>
              <input
                type="number"
                value={formData.auctionDurationHours}
                onChange={(e) => updateFormData({ auctionDurationHours: e.target.value })}
                min="1"
                max="168"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {formData.orderType === "crosschain" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                目标链 ID
              </label>
              <input
                type="text"
                value={formData.targetChainId}
                onChange={(e) => updateFormData({ targetChainId: e.target.value })}
                placeholder="1 (以太坊)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                安全保证金
              </label>
              <input
                type="text"
                value={formData.safetyDepositAmount}
                onChange={(e) => updateFormData({ safetyDepositAmount: e.target.value })}
                placeholder="保证金数量"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                过期时间（小时）
              </label>
              <input
                type="number"
                value={formData.expiryHours}
                onChange={(e) => updateFormData({ expiryHours: e.target.value })}
                min="1"
                max="168"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* 错误信息 */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={isSubmitting || isLoading || !networkInfo?.isInitialized}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          {isSubmitting || isLoading ? "创建中..." : "创建订单"}
        </button>
      </form>
    </div>
  );
};