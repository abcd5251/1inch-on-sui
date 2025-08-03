"use client";

import { useEffect, useState } from "react";
import { useCrossChainWallet } from "~~/hooks/cross-chain/useCrossChainWallet";

interface ChainStatus {
  name: string;
  connected: boolean;
  address?: string | null;
  balance?: string;
  chainId?: number;
}

/**
 * Cross-chain status display component
 * Shows connection status and balance information for Ethereum and Sui networks
 */
export const CrossChainStatus = () => {
  const { state, getSuiBalance } = useCrossChainWallet();
  const [balances, setBalances] = useState<{
    sui?: string;
    eth?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Get Sui balance
  useEffect(() => {
    const fetchSuiBalance = async () => {
      if (state.sui.isConnected && state.sui.address) {
        try {
          setIsLoading(true);
          const balance = await getSuiBalance();
          if (balance) {
            const formattedBalance = (parseInt(balance.totalBalance) / 1e9).toFixed(4);
            setBalances(prev => ({ ...prev, sui: formattedBalance }));
          }
        } catch (error) {
          console.error("Failed to fetch Sui balance:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchSuiBalance();
  }, [state.sui.isConnected, state.sui.address, getSuiBalance]);

  const chains: ChainStatus[] = [
    {
      name: "Ethereum",
      connected: state.ethereum.isConnected,
      address: state.ethereum.address,
      balance: balances.eth,
      chainId: state.ethereum.chainId,
    },
    {
      name: "Sui",
      connected: state.sui.isConnected,
      address: state.sui.address,
      balance: balances.sui,
    },
  ];

  const getChainIcon = (chainName: string) => {
    switch (chainName.toLowerCase()) {
      case "ethereum":
        return (
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">Ξ</span>
          </div>
        );
      case "sui":
        return (
          <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">?</span>
          </div>
        );
    }
  };

  const getStatusColor = (connected: boolean) => {
    return connected ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  };

  const getStatusText = (connected: boolean) => {
    return connected ? "Connected" : "Disconnected";
  };

  return (
    <div className="bg-base-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Cross-Chain Status</h3>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              state.isBothConnected
                ? "bg-green-500 animate-pulse"
                : state.isEitherConnected
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
          ></div>
          <span className="text-sm font-medium">
            {state.isBothConnected
              ? "Cross-Chain Ready"
              : state.isEitherConnected
                ? "Partially Connected"
                : "Not Connected"}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {chains.map(chain => (
          <div key={chain.name} className="flex items-center justify-between p-3 bg-base-100 rounded-lg border">
            <div className="flex items-center gap-3">
              {getChainIcon(chain.name)}
              <div>
                <div className="font-medium">{chain.name}</div>
                <div className={`text-sm ${getStatusColor(chain.connected)}`}>
                  {getStatusText(chain.connected)}
                  {chain.chainId && <span className="text-gray-500 ml-2">(Chain ID: {chain.chainId})</span>}
                </div>
              </div>
            </div>

            <div className="text-right">
              {chain.connected && chain.address && (
                <>
                  <div className="text-sm font-mono">
                    {chain.address.slice(0, 6)}...{chain.address.slice(-4)}
                  </div>
                  {chain.balance !== undefined && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {isLoading ? (
                        <div className="loading loading-spinner loading-xs"></div>
                      ) : (
                        `${chain.balance} ${chain.name === "Sui" ? "SUI" : "ETH"}`
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Cross-chain operation readiness status */}
      <div className="mt-4 p-3 bg-base-100 rounded-lg border">
        <div className="flex items-center justify-between">
          <span className="font-medium">Cross-Chain Operations</span>
          <span
            className={`text-sm px-2 py-1 rounded ${
              state.isBothConnected
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
            }`}
          >
            {state.isBothConnected ? "Available" : "Unavailable"}
          </span>
        </div>
        {!state.isBothConnected && (
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Connect both Ethereum and Sui wallets to enable cross-chain swaps
          </div>
        )}
      </div>
    </div>
  );
};
