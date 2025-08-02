"use client";

import { useEffect, useState } from "react";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

interface BridgeStatus {
  chainId: string;
  chainName: string;
  status: "online" | "offline" | "maintenance" | "degraded";
  latency: number;
  lastBlock: number;
  gasPrice: string;
  tvl: string;
}

interface CrossChainTransaction {
  id: string;
  fromChain: string;
  toChain: string;
  status: "pending" | "confirming" | "completed" | "failed";
  amount: string;
  token: string;
  timestamp: number;
  txHash?: string;
  estimatedCompletion?: number;
}

export const CrossChainBridgeStatus = () => {
  const [bridgeStatuses, setBridgeStatuses] = useState<BridgeStatus[]>([]);
  const [transactions, setTransactions] = useState<CrossChainTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data generation
  useEffect(() => {
    const generateMockData = () => {
      const chains: BridgeStatus[] = [
        {
          chainId: "sui",
          chainName: "Sui",
          status: "online",
          latency: 250,
          lastBlock: 12345678,
          gasPrice: "0.001 SUI",
          tvl: "$2.5M",
        },
        {
          chainId: "ethereum",
          chainName: "Ethereum",
          status: "online",
          latency: 1200,
          lastBlock: 18500000,
          gasPrice: "15 gwei",
          tvl: "$45.2M",
        },
        {
          chainId: "bsc",
          chainName: "BSC",
          status: "degraded",
          latency: 3000,
          lastBlock: 32100000,
          gasPrice: "3 gwei",
          tvl: "$8.7M",
        },
        {
          chainId: "polygon",
          chainName: "Polygon",
          status: "maintenance",
          latency: 0,
          lastBlock: 48900000,
          gasPrice: "30 gwei",
          tvl: "$12.1M",
        },
      ];

      const mockTransactions: CrossChainTransaction[] = [
        {
          id: "tx_001",
          fromChain: "Ethereum",
          toChain: "Sui",
          status: "completed",
          amount: "1.5",
          token: "ETH",
          timestamp: Date.now() - 300000,
          txHash: "0x1234...5678",
        },
        {
          id: "tx_002",
          fromChain: "Sui",
          toChain: "Ethereum",
          status: "confirming",
          amount: "100",
          token: "USDC",
          timestamp: Date.now() - 120000,
          estimatedCompletion: Date.now() + 180000,
        },
        {
          id: "tx_003",
          fromChain: "BSC",
          toChain: "Sui",
          status: "pending",
          amount: "0.8",
          token: "BNB",
          timestamp: Date.now() - 60000,
          estimatedCompletion: Date.now() + 240000,
        },
        {
          id: "tx_004",
          fromChain: "Sui",
          toChain: "Polygon",
          status: "failed",
          amount: "250",
          token: "USDT",
          timestamp: Date.now() - 900000,
          txHash: "0xabcd...efgh",
        },
      ];

      setBridgeStatuses(chains);
      setTransactions(mockTransactions);
      setIsLoading(false);
    };

    setTimeout(generateMockData, 1000);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
      case "completed":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "offline":
      case "failed":
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case "maintenance":
      case "degraded":
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case "pending":
      case "confirming":
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
      case "completed":
        return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900";
      case "offline":
      case "failed":
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900";
      case "maintenance":
      case "degraded":
        return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900";
      case "pending":
      case "confirming":
        return "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900";
      default:
        return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900";
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  const formatETA = (timestamp: number) => {
    const diff = timestamp - Date.now();
    const minutes = Math.floor(diff / 60000);

    if (minutes <= 0) return "Soon";
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  if (isLoading) {
    return (
      <div className="bg-base-200 rounded-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="loading loading-spinner loading-lg"></div>
          <span className="ml-4 text-lg">Loading bridge status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        <LinkIcon className="h-6 w-6 text-primary" />
        Cross-Chain Bridge Status
      </h2>

      {/* Bridge Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {bridgeStatuses.map(bridge => (
          <div key={bridge.chainId} className="bg-base-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{bridge.chainName}</h3>
              {getStatusIcon(bridge.status)}
            </div>

            <div
              className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-3 ${getStatusColor(bridge.status)}`}
            >
              {bridge.status.charAt(0).toUpperCase() + bridge.status.slice(1)}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Latency:</span>
                <span>{bridge.latency > 0 ? `${bridge.latency}ms` : "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Block:</span>
                <span>#{bridge.lastBlock.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Gas:</span>
                <span>{bridge.gasPrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">TVL:</span>
                <span className="font-medium text-primary">{bridge.tvl}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Transactions */}
      <div className="bg-base-100 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Recent Cross-Chain Transactions</h3>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">No cross-chain transactions found</div>
        ) : (
          <div className="space-y-3">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  {getStatusIcon(tx.status)}

                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span>{tx.fromChain}</span>
                      <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                      <span>{tx.toChain}</span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {tx.amount} {tx.token} • {formatTimeAgo(tx.timestamp)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-1 ${getStatusColor(tx.status)}`}
                  >
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </div>

                  {tx.estimatedCompletion && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      ETA: {formatETA(tx.estimatedCompletion)}
                    </div>
                  )}

                  {tx.txHash && (
                    <div className="text-xs font-mono text-primary cursor-pointer hover:underline">{tx.txHash}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bridge Health Summary */}
      <div className="mt-6 bg-base-100 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Bridge Health Summary</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {bridgeStatuses.filter(b => b.status === "online").length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Chains Online</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {transactions.filter(t => t.status === "pending" || t.status === "confirming").length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Pending Transactions</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {Math.round((transactions.filter(t => t.status === "completed").length / transactions.length) * 100) || 0}
              %
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};
