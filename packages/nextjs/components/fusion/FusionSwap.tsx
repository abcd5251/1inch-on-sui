"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
// Note: PresetEnum is now part of the sui-fusion-sdk types
// import { PresetEnum } from "@1inch/fusion-sdk/api";
import { useFusion } from "~~/hooks/fusion/useFusion";
import { useRelayerWebSocket } from "~~/hooks/useRelayerWebSocket";
import { RelayerApiService } from "~~/services/relayer/RelayerApiService";
import { CreateSwapRequest, SwapData } from "~~/types/swap";
import { notification } from "~~/utils/scaffold-eth";

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

const COMMON_TOKENS: Token[] = [
  {
    address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
  },
  {
    address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    symbol: "WETH",
    name: "Wrapped Ethereum",
    decimals: 18,
  },
  {
    address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
  },
  {
    address: "0x111111111117dC0aa78b770fA6A738034120C302",
    symbol: "1INCH",
    name: "1inch Token",
    decimals: 18,
  },
];

export const FusionSwap: React.FC = () => {
  const { address } = useAccount();
  const [privateKey, setPrivateKey] = useState("");
  const [fromToken, setFromToken] = useState(COMMON_TOKENS[3]); // 1INCH
  const [toToken, setToToken] = useState(COMMON_TOKENS[1]); // WETH
  const [amount, setAmount] = useState("");
  const [preset, setPreset] = useState<PresetEnum>(PresetEnum.fast);
  const [showPrivateKeyInput, setShowPrivateKeyInput] = useState(false);

  // Relayer integration state
  const [currentSwap, setCurrentSwap] = useState<SwapData | null>(null);
  const [swapHistory, setSwapHistory] = useState<SwapData[]>([]);
  const [isCreatingSwap, setIsCreatingSwap] = useState(false);
  const [relayerError, setRelayerError] = useState<string | null>(null);

  // Initialize Relayer API service
  const relayerApi = useCallback(() => new RelayerApiService(), []);

  const fusion = useFusion({
    network: "ethereum",
    rpcUrl: "https://eth.llamarpc.com",
    authKey: process.env.NEXT_PUBLIC_1INCH_AUTH_KEY,
  });

  // WebSocket connection for real-time updates
  const {
    isConnected: wsConnected,
    subscribeToSwap,
    unsubscribeFromSwap,
  } = useRelayerWebSocket({
    onSwapCreated: swap => {
      notification.success(`New swap created: ${swap.id}`);
      setSwapHistory(prev => [swap, ...prev]);
    },
    onSwapUpdated: swap => {
      if (currentSwap?.id === swap.id) {
        setCurrentSwap(swap);
      }
      setSwapHistory(prev => prev.map(s => (s.id === swap.id ? swap : s)));
    },
    onSwapStatusChanged: swap => {
      if (currentSwap?.id === swap.id) {
        setCurrentSwap(swap);
        notification.info(`Swap status updated: ${swap.status}`);
      }
      setSwapHistory(prev => prev.map(s => (s.id === swap.id ? swap : s)));
    },
    onSwapError: swap => {
      if (currentSwap?.id === swap.id) {
        setCurrentSwap(swap);
        notification.error(`Swap error: ${swap.errorMessage || "Unknown error"}`);
      }
    },
    onConnect: () => {
      notification.success("Connected to Relayer WebSocket");
    },
    onDisconnect: () => {
      notification.warning("Disconnected from Relayer WebSocket");
    },
    onError: error => {
      console.error("WebSocket error:", error);
      notification.error("WebSocket connection error");
    },
  });

  const handleInitialize = async () => {
    if (!privateKey) {
      notification.error("Please enter your private key");
      return;
    }
    await fusion.initializeWithPrivateKey(privateKey);
  };

  const handleGetQuote = async () => {
    if (!amount || !fromToken || !toToken) {
      notification.error("Please fill in all fields");
      return;
    }

    const amountWei = (parseFloat(amount) * Math.pow(10, fromToken.decimals)).toString();
    await fusion.getQuote({
      fromTokenAddress: fromToken.address,
      toTokenAddress: toToken.address,
      amount: amountWei,
    });
  };

  const handleApprove = async () => {
    if (!privateKey || !amount || !fromToken) {
      notification.error("Please fill in all required fields");
      return;
    }

    const amountWei = (parseFloat(amount) * Math.pow(10, fromToken.decimals)).toString();
    await fusion.approveToken(fromToken.address, amountWei, privateKey);
  };

  const handleCreateOrder = async () => {
    if (!address || !amount || !fromToken || !toToken) {
      notification.error("Please connect wallet and fill in all fields");
      return;
    }

    setIsCreatingSwap(true);
    setRelayerError(null);

    try {
      const amountWei = (parseFloat(amount) * Math.pow(10, fromToken.decimals)).toString();

      // Create order with 1inch Fusion SDK
      const order = await fusion.createOrder({
        fromTokenAddress: fromToken.address,
        toTokenAddress: toToken.address,
        amount: amountWei,
        walletAddress: address,
        preset,
      });

      if (order && fusion.lastOrder) {
        // Create swap record in Relayer backend
        const swapRequest: CreateSwapRequest = {
          orderId: fusion.lastOrder.orderHash,
          maker: address,
          makerAsset: fromToken.address,
          takerAsset: toToken.address,
          makerAmount: amountWei,
          takerAmount: fusion.quote?.toTokenAmount || "0",
          makerChain: "ethereum",
          takerChain: "ethereum",
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
          signature: fusion.lastOrder.signature,
          metadata: {
            preset,
            fromTokenSymbol: fromToken.symbol,
            toTokenSymbol: toToken.symbol,
            quote: fusion.quote,
          },
        };

        const response = await relayerApi().createSwap(swapRequest);
        if (response.success && response.data) {
          setCurrentSwap(response.data);
          subscribeToSwap(response.data.id);
          notification.success("Swap created successfully!");
        } else {
          throw new Error(response.error || "Failed to create swap record");
        }
      }
    } catch (error) {
      console.error("Error creating swap:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setRelayerError(errorMessage);
      notification.error(`Failed to create swap: ${errorMessage}`);
    } finally {
      setIsCreatingSwap(false);
    }
  };

  // Load swap history on component mount
  useEffect(() => {
    const loadSwapHistory = async () => {
      if (address) {
        try {
          const response = await relayerApi().getSwaps({ maker: address, limit: 10 });
          if (response.success && response.data) {
            setSwapHistory(response.data.data);
          }
        } catch (error) {
          console.error("Error loading swap history:", error);
        }
      }
    };

    loadSwapHistory();
  }, [address]);

  // Clear current swap and unsubscribe when component unmounts or swap changes
  useEffect(() => {
    return () => {
      if (currentSwap) {
        unsubscribeFromSwap(currentSwap.id);
      }
    };
  }, [currentSwap, unsubscribeFromSwap]);

  // Clear relayer error when inputs change
  useEffect(() => {
    if (relayerError) {
      setRelayerError(null);
    }
  }, [amount, fromToken, toToken, relayerError]);

  const clearCurrentSwap = useCallback(() => {
    if (currentSwap) {
      unsubscribeFromSwap(currentSwap.id);
      setCurrentSwap(null);
    }
  }, [currentSwap, unsubscribeFromSwap]);

  const swapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto p-6 bg-base-100 rounded-2xl shadow-xl">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">1inch Fusion Swap</h2>
        <p className="text-sm text-base-content/70">Cross-chain swaps powered by 1inch Fusion</p>
      </div>

      {/* Wallet Connection Status */}
      <div className="bg-base-200 p-4 rounded-lg">
        <div className="text-sm font-medium mb-2">Connected Wallet:</div>
        {address ? <Address address={address} /> : <div className="text-warning">Please connect your wallet</div>}
      </div>

      {/* Private Key Input (for demo purposes) */}
      <div className="bg-warning/10 p-4 rounded-lg border border-warning/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Private Key (Demo)</span>
          <button className="btn btn-xs btn-ghost" onClick={() => setShowPrivateKeyInput(!showPrivateKeyInput)}>
            {showPrivateKeyInput ? "Hide" : "Show"}
          </button>
        </div>
        {showPrivateKeyInput && (
          <div className="space-y-2">
            <input
              type="password"
              placeholder="Enter private key for demo"
              className="input input-sm w-full"
              value={privateKey}
              onChange={e => setPrivateKey(e.target.value)}
            />
            <button
              className="btn btn-sm btn-primary w-full"
              onClick={handleInitialize}
              disabled={fusion.isLoading || !privateKey}
            >
              {fusion.isLoading ? "Initializing..." : "Initialize SDK"}
            </button>
          </div>
        )}
        <div className="text-xs text-warning mt-2">
          ⚠️ Never use real private keys in production. This is for demo only.
        </div>
      </div>

      {/* SDK Status */}
      <div className={`alert ${fusion.isInitialized ? "alert-success" : "alert-info"}`}>
        <span className="text-sm">SDK Status: {fusion.isInitialized ? "✅ Initialized" : "❌ Not Initialized"}</span>
      </div>

      {/* WebSocket Status */}
      <div className={`alert ${wsConnected ? "alert-success" : "alert-warning"}`}>
        <span className="text-sm">Relayer Connection: {wsConnected ? "🔗 Connected" : "⚠️ Disconnected"}</span>
      </div>

      {/* Current Swap Status */}
      {currentSwap && (
        <div className="bg-info/10 p-4 rounded-lg border border-info/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-info">Current Swap</h3>
            <button className="btn btn-xs btn-ghost" onClick={clearCurrentSwap}>
              ✕
            </button>
          </div>
          <div className="text-sm space-y-1">
            <div>ID: {currentSwap.id}</div>
            <div>
              Status:{" "}
              <span
                className={`badge ${
                  currentSwap.status === "completed"
                    ? "badge-success"
                    : currentSwap.status === "failed"
                      ? "badge-error"
                      : currentSwap.status === "pending"
                        ? "badge-warning"
                        : "badge-info"
                }`}
              >
                {currentSwap.status}
              </span>
            </div>
            <div>
              From: {currentSwap.makerAmount} {fromToken.symbol}
            </div>
            <div>
              To: {currentSwap.takerAmount} {toToken.symbol}
            </div>
            {currentSwap.txHash && (
              <div>
                Tx: {currentSwap.txHash.slice(0, 10)}...{currentSwap.txHash.slice(-8)}
              </div>
            )}
            {currentSwap.errorMessage && <div className="text-error">Error: {currentSwap.errorMessage}</div>}
          </div>
        </div>
      )}

      {/* From Token */}
      <div className="space-y-2">
        <label className="text-sm font-medium">From</label>
        <div className="flex gap-2">
          <select
            className="select select-bordered flex-1"
            value={fromToken.address}
            onChange={e => {
              const token = COMMON_TOKENS.find(t => t.address === e.target.value);
              if (token) setFromToken(token);
            }}
          >
            {COMMON_TOKENS.map(token => (
              <option key={token.address} value={token.address}>
                {token.symbol} - {token.name}
              </option>
            ))}
          </select>
        </div>
        <input
          type="number"
          placeholder="Amount"
          className="input input-bordered w-full"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
      </div>

      {/* Swap Button */}
      <div className="flex justify-center">
        <button className="btn btn-circle btn-outline" onClick={swapTokens}>
          ↕️
        </button>
      </div>

      {/* To Token */}
      <div className="space-y-2">
        <label className="text-sm font-medium">To</label>
        <select
          className="select select-bordered w-full"
          value={toToken.address}
          onChange={e => {
            const token = COMMON_TOKENS.find(t => t.address === e.target.value);
            if (token) setToToken(token);
          }}
        >
          {COMMON_TOKENS.map(token => (
            <option key={token.address} value={token.address}>
              {token.symbol} - {token.name}
            </option>
          ))}
        </select>
      </div>

      {/* Preset Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Speed Preset</label>
        <select
          className="select select-bordered w-full"
          value={preset}
          onChange={e => setPreset(e.target.value as PresetEnum)}
        >
          <option value={PresetEnum.fast}>Fast</option>
          <option value={PresetEnum.medium}>Medium</option>
          <option value={PresetEnum.slow}>Slow</option>
        </select>
      </div>

      {/* Quote Display */}
      {fusion.quote && (
        <div className="bg-base-200 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Quote</h3>
          <div className="text-sm space-y-1">
            <div>From Amount: {fusion.quote.fromTokenAmount}</div>
            <div>To Amount: {fusion.quote.toTokenAmount}</div>
            <div>Gas Cost: {(fusion.quote as any).gasCostInfo?.gasCost || "N/A"}</div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          className="btn btn-outline w-full"
          onClick={handleGetQuote}
          disabled={fusion.isLoading || !fusion.isInitialized || !amount || !fromToken || !toToken}
        >
          {fusion.isLoading ? "Getting Quote..." : "Get Quote"}
        </button>

        <button
          className="btn btn-secondary w-full"
          onClick={handleApprove}
          disabled={fusion.isLoading || !fusion.isInitialized || !amount || !fromToken}
        >
          {fusion.isLoading ? "Approving..." : "Approve Token"}
        </button>

        <button
          className="btn btn-primary w-full"
          onClick={handleCreateOrder}
          disabled={
            fusion.isLoading || isCreatingSwap || !fusion.isInitialized || !amount || !fromToken || !toToken || !address
          }
        >
          {isCreatingSwap ? "Creating Swap..." : fusion.isLoading ? "Creating Order..." : "Create Swap Order"}
        </button>

        {/* Quick Links */}
        <div className="flex gap-2 pt-2">
          <Link href="/fusion/orders" className="btn btn-xs btn-ghost flex-1">
            View Orders
          </Link>
          <Link href="/fusion/history" className="btn btn-xs btn-ghost flex-1">
            History
          </Link>
          <Link href="/fusion/settings" className="btn btn-xs btn-ghost flex-1">
            Settings
          </Link>
        </div>
      </div>

      {/* Error Display */}
      {(fusion.error || relayerError) && (
        <div className="alert alert-error">
          <span className="text-sm">{relayerError || fusion.error}</span>
          <button
            className="btn btn-xs btn-ghost"
            onClick={() => {
              if (relayerError) setRelayerError(null);
              if (fusion.error) fusion.clearError();
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Last Order Display */}
      {fusion.lastOrder && (
        <div className="bg-success/10 p-4 rounded-lg border border-success/20">
          <h3 className="font-medium mb-2 text-success">Order Created Successfully!</h3>
          <div className="text-sm space-y-1">
            <div>Order Hash: {fusion.lastOrder.orderHash}</div>
            <div>Status: {fusion.lastOrder.status}</div>
          </div>
        </div>
      )}

      {/* Swap History */}
      {swapHistory.length > 0 && (
        <div className="bg-base-200 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Recent Swaps</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {swapHistory.slice(0, 5).map(swap => (
              <div key={swap.id} className="bg-base-100 p-3 rounded border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-base-content/70">#{swap.id}</span>
                  <span
                    className={`badge badge-xs ${
                      swap.status === "completed"
                        ? "badge-success"
                        : swap.status === "failed"
                          ? "badge-error"
                          : swap.status === "pending"
                            ? "badge-warning"
                            : "badge-info"
                    }`}
                  >
                    {swap.status}
                  </span>
                </div>
                <div className="text-sm">
                  <div>
                    {swap.makerAmount} → {swap.takerAmount}
                  </div>
                  {swap.txHash && (
                    <div className="text-xs text-base-content/60">
                      Tx: {swap.txHash.slice(0, 8)}...{swap.txHash.slice(-6)}
                    </div>
                  )}
                  <div className="text-xs text-base-content/60">{new Date(swap.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
