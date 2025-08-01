"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ConnectButton as SuiConnectButton, useWallet } from "@suiet/wallet-kit";
import { toast } from "react-hot-toast";
import { WalletInstallGuide } from "~~/components/wallet/WalletInstallGuide";
import { useCrossChainWallet } from "~~/hooks/cross-chain/useCrossChainWallet";

/**
 * Cross-chain wallet connection button component
 * Displays both Ethereum and Sui wallet connection status
 */
export const CrossChainWalletButton = () => {
  const { state, connectBoth, disconnectBoth } = useCrossChainWallet();
  const suiWallet = useWallet();
  const [isConnectingBoth, setIsConnectingBoth] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const handleConnectBoth = async () => {
    setIsConnectingBoth(true);
    try {
      await connectBoth();
      toast.success("Both wallets connected successfully!");
    } catch (error: any) {
      console.error("Failed to connect both wallets:", error);
      const message = error?.message || "Failed to connect both wallets";
      toast.error(message);
    } finally {
      setIsConnectingBoth(false);
    }
  };

  const handleDisconnectBoth = async () => {
    try {
      await disconnectBoth();
      toast.success("Both wallets disconnected");
    } catch (error) {
      console.error("Failed to disconnect both wallets:", error);
      toast.error("Failed to disconnect wallets");
    }
  };

  // Calculate cross-chain status based on actual wallet states
  const isSuiConnected = suiWallet.connected;
  const isEthConnected = state.ethereum.isConnected;
  const isBothConnected = isSuiConnected && isEthConnected;
  const isEitherConnected = isSuiConnected || isEthConnected;

  return (
    <>
      <WalletInstallGuide isOpen={showInstallGuide} onClose={() => setShowInstallGuide(false)} />
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        {/* Ethereum wallet connection */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Ethereum</span>
          <ConnectButton
            chainStatus="icon"
            accountStatus={{
              smallScreen: "avatar",
              largeScreen: "address",
            }}
          />
        </div>

        {/* Sui wallet connection */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Sui Network</span>
          <SuiConnectButton />
        </div>

        {/* Cross-chain status indicator */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Cross-Chain</span>
          {isBothConnected ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-700 dark:text-green-300 font-medium">Ready</span>
              <button onClick={handleDisconnectBoth} className="text-xs text-green-600 hover:text-green-800 ml-2">
                Disconnect All
              </button>
            </div>
          ) : isEitherConnected ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-yellow-700 dark:text-yellow-300">Partial</span>
              <button
                onClick={handleConnectBoth}
                disabled={isConnectingBoth}
                className="text-xs text-blue-600 hover:text-blue-800 ml-2"
              >
                {isConnectingBoth ? "Connecting..." : "Connect All"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectBoth}
              disabled={isConnectingBoth}
              className="btn btn-outline btn-sm px-4 py-2 rounded-lg"
            >
              {isConnectingBoth ? (
                <div className="flex items-center gap-2">
                  <div className="loading loading-spinner loading-xs"></div>
                  <span className="text-sm">Connecting...</span>
                </div>
              ) : (
                <span className="text-sm">Connect Both</span>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
};
