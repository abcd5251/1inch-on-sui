/**
 * Swap Manager Component
 * Demonstrates real-time swap management with Relayer integration
 */
import React, { useState } from "react";
import { useRelayerIntegration } from "../../hooks/useRelayerIntegration";
import { CreateSwapRequest, SwapData } from "../../types/swap";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

/**
 * Connection status indicator component
 */
const ConnectionStatus: React.FC<{ isConnected: boolean; isConnecting: boolean; error?: string | null }> = ({
  isConnected,
  isConnecting,
  error,
}) => {
  const getStatusColor = () => {
    if (error) return "text-red-500";
    if (isConnected) return "text-green-500";
    if (isConnecting) return "text-yellow-500";
    return "text-gray-500";
  };

  const getStatusText = () => {
    if (error) return `连接错误: ${error}`;
    if (isConnected) return "已连接";
    if (isConnecting) return "连接中...";
    return "未连接";
  };

  return (
    <div className="flex items-center space-x-2">
      <div
        className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : isConnecting ? "bg-yellow-500" : "bg-red-500"}`}
      />
      <span className={`text-sm ${getStatusColor()}`}>{getStatusText()}</span>
    </div>
  );
};

/**
 * Swap status badge component
 */
const SwapStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "待处理";
      case "processing":
        return "处理中";
      case "completed":
        return "已完成";
      case "failed":
        return "失败";
      case "cancelled":
        return "已取消";
      default:
        return status;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}
    >
      {getStatusText(status)}
    </span>
  );
};

/**
 * Swap card component
 */
const SwapCard: React.FC<{
  swap: SwapData;
  onSubscribe: (orderId: string) => void;
  onUnsubscribe: (orderId: string) => void;
  isSubscribed: boolean;
}> = ({ swap, onSubscribe, onUnsubscribe, isSubscribed }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">订单 #{swap.orderId.slice(0, 8)}...</h3>
          <p className="text-sm text-gray-500">
            {formatDistanceToNow(new Date(swap.createdAt), { addSuffix: true, locale: zhCN })}
          </p>
        </div>
        <SwapStatusBadge status={swap.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500">源链</p>
          <p className="text-sm text-gray-900">{swap.sourceChain}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">目标链</p>
          <p className="text-sm text-gray-900">{swap.targetChain}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">源代币</p>
          <p className="text-sm text-gray-900">{swap.sourceToken}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">目标代币</p>
          <p className="text-sm text-gray-900">{swap.targetToken}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500">源金额</p>
          <p className="text-sm text-gray-900">{swap.sourceAmount}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">目标金额</p>
          <p className="text-sm text-gray-900">{swap.targetAmount}</p>
        </div>
      </div>

      {swap.sourceTransactionHash && (
        <div className="mb-2">
          <p className="text-sm font-medium text-gray-500">源交易哈希</p>
          <p className="text-xs text-gray-900 font-mono break-all">{swap.sourceTransactionHash}</p>
        </div>
      )}

      {swap.targetTransactionHash && (
        <div className="mb-2">
          <p className="text-sm font-medium text-gray-500">目标交易哈希</p>
          <p className="text-xs text-gray-900 font-mono break-all">{swap.targetTransactionHash}</p>
        </div>
      )}

      {swap.errorMessage && (
        <div className="mb-4">
          <p className="text-sm font-medium text-red-500">错误信息</p>
          <p className="text-sm text-red-600">{swap.errorMessage}</p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <button
          onClick={() => (isSubscribed ? onUnsubscribe(swap.orderId) : onSubscribe(swap.orderId))}
          className={`px-3 py-1 rounded text-sm font-medium ${
            isSubscribed ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"
          }`}
        >
          {isSubscribed ? "取消订阅" : "订阅更新"}
        </button>
        <p className="text-xs text-gray-500">
          更新于 {formatDistanceToNow(new Date(swap.updatedAt), { addSuffix: true, locale: zhCN })}
        </p>
      </div>
    </div>
  );
};

/**
 * Create swap form component
 */
const CreateSwapForm: React.FC<{
  onCreateSwap: (swapData: CreateSwapRequest) => void;
  isCreating: boolean;
}> = ({ onCreateSwap, isCreating }) => {
  const [formData, setFormData] = useState<CreateSwapRequest>({
    sourceChain: "ethereum",
    targetChain: "sui",
    sourceToken: "USDC",
    targetToken: "SUI",
    sourceAmount: "",
    targetAmount: "",
    maker: "",
    taker: "",
    deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateSwap(formData);
  };

  const handleInputChange = (field: keyof CreateSwapRequest, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">创建新的跨链交换</h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">源链</label>
          <select
            value={formData.sourceChain}
            onChange={e => handleInputChange("sourceChain", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ethereum">Ethereum</option>
            <option value="bsc">BSC</option>
            <option value="polygon">Polygon</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">目标链</label>
          <select
            value={formData.targetChain}
            onChange={e => handleInputChange("targetChain", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="sui">Sui</option>
            <option value="aptos">Aptos</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">源代币</label>
          <input
            type="text"
            value={formData.sourceToken}
            onChange={e => handleInputChange("sourceToken", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="USDC"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">目标代币</label>
          <input
            type="text"
            value={formData.targetToken}
            onChange={e => handleInputChange("targetToken", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="SUI"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">源金额</label>
          <input
            type="text"
            value={formData.sourceAmount}
            onChange={e => handleInputChange("sourceAmount", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="100"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">目标金额</label>
          <input
            type="text"
            value={formData.targetAmount}
            onChange={e => handleInputChange("targetAmount", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="95"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">制造者地址</label>
          <input
            type="text"
            value={formData.maker}
            onChange={e => handleInputChange("maker", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0x..."
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">接受者地址</label>
          <input
            type="text"
            value={formData.taker}
            onChange={e => handleInputChange("taker", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0x..."
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isCreating}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCreating ? "创建中..." : "创建交换"}
      </button>
    </form>
  );
};

/**
 * Main Swap Manager component
 */
export const SwapManager: React.FC = () => {
  const [state, actions] = useRelayerIntegration({
    autoConnect: true,
    autoRefresh: true,
    refreshInterval: 30000,
  });

  const [subscribedSwaps, setSubscribedSwaps] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"active" | "history" | "create">("active");

  // Handle swap subscription
  const handleSubscribe = (orderId: string) => {
    actions.subscribeToSwap(orderId);
    setSubscribedSwaps(prev => new Set([...prev, orderId]));
  };

  const handleUnsubscribe = (orderId: string) => {
    actions.unsubscribeFromSwap(orderId);
    setSubscribedSwaps(prev => {
      const newSet = new Set(prev);
      newSet.delete(orderId);
      return newSet;
    });
  };

  // Handle swap creation
  const handleCreateSwap = async (swapData: CreateSwapRequest) => {
    const newSwap = await actions.createSwap(swapData);
    if (newSwap) {
      setActiveTab("active");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">跨链交换管理器</h1>
          <div className="flex items-center space-x-4">
            <ConnectionStatus
              isConnected={state.isConnected}
              isConnecting={state.isConnecting}
              error={state.connectionError}
            />
            <button
              onClick={actions.reconnect}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
            >
              重新连接
            </button>
          </div>
        </div>

        {/* Error display */}
        {state.lastError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex justify-between items-center">
              <p className="text-red-700">{state.lastError}</p>
              <button onClick={actions.clearError} className="text-red-500 hover:text-red-700">
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold text-gray-900">活跃交换</h3>
            <p className="text-2xl font-bold text-blue-600">{state.activeSwaps.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold text-gray-900">历史交换</h3>
            <p className="text-2xl font-bold text-green-600">{state.swapHistory.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold text-gray-900">订阅数量</h3>
            <p className="text-2xl font-bold text-purple-600">{subscribedSwaps.size}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: "active", label: "活跃交换", count: state.activeSwaps.length },
              { key: "history", label: "历史记录", count: state.swapHistory.length },
              { key: "create", label: "创建交换", count: null },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">{tab.count}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === "create" && <CreateSwapForm onCreateSwap={handleCreateSwap} isCreating={state.isCreatingSwap} />}

        {activeTab === "active" && (
          <div>
            {state.isLoadingSwaps ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">加载中...</p>
              </div>
            ) : state.activeSwaps.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">暂无活跃的交换订单</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {state.activeSwaps.map(swap => (
                  <SwapCard
                    key={swap.orderId}
                    swap={swap}
                    onSubscribe={handleSubscribe}
                    onUnsubscribe={handleUnsubscribe}
                    isSubscribed={subscribedSwaps.has(swap.orderId)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div>
            {state.swapHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">暂无历史交换记录</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {state.swapHistory.map(swap => (
                  <SwapCard
                    key={swap.orderId}
                    swap={swap}
                    onSubscribe={handleSubscribe}
                    onUnsubscribe={handleUnsubscribe}
                    isSubscribed={subscribedSwaps.has(swap.orderId)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SwapManager;
