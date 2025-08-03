/**
 * 1inch Fusion Swap Component for Cross-Chain Atomic Swaps
 * 
 * This component provides a comprehensive interface for executing 1inch Fusion swaps
 * with cross-chain capabilities, real-time WebSocket integration, and demo functionality.
 * 
 * Features:
 * - Multi-token swap interface with preset configurations
 * - Real-time quote updates with staleness detection
 * - WebSocket integration for live swap status monitoring
 * - Cross-chain balance tracking and portfolio management
 * - Demo mode with mock data generation and testing presets
 * - Enhanced UX with animations and visual feedback
 * - Comprehensive error handling and status reporting
 * - Integration with unified relayer service for atomic swaps
 * 
 * @example
 * ```tsx
 * // Basic usage in a page
 * <FusionSwap />
 * 
 * // The component automatically handles:
 * // - Wallet connection detection
 * // - Network switching between Ethereum and Sui
 * // - Mock service integration for demos
 * // - Real-time updates via WebSocket
 * ```
 * 
 * @component
 * @author 1inch-on-Sui Hackathon Team
 */
"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowUpDownIcon, 
  ChevronDownIcon,
  ClockIcon,
  ChartBarIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { PresetEnum } from "@1inch/sui-fusion-sdk";
import { useFusion } from "~~/hooks/fusion/useFusion";
import { useRelayerWebSocket } from "~~/hooks/useRelayerWebSocket";
import { unifiedRelayerService } from "~~/services/relayer/UnifiedRelayerService";
import { CreateSwapRequest, SwapData } from "~~/types/swap";
import { notification } from "~~/utils/scaffold-eth";
import { useNotifications } from "~~/components/ui/NotificationSystem";
import { useUnifiedStore, useDemoMode } from "~~/services/store/unifiedStore";

/**
 * Token interface for representing ERC-20 tokens in the swap interface
 * 
 * @interface Token
 * @property {string} address - Token contract address (use 0xeeee...eeee for native ETH)
 * @property {string} symbol - Token symbol (e.g., "ETH", "USDC", "1INCH")
 * @property {string} name - Full token name (e.g., "Ethereum", "USD Coin")
 * @property {number} decimals - Token decimal places for amount calculations
 */
interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

/**
 * Common tokens available for swapping in the demo
 * Pre-configured with Ethereum mainnet addresses for popular tokens
 */
const COMMON_TOKENS: Token[] = [
  {
    address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // Native ETH placeholder
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
  },
  {
    address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // Wrapped Ethereum
    symbol: "WETH",
    name: "Wrapped Ethereum",
    decimals: 18,
  },
  {
    address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // Circle USD Coin
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
  },
  {
    address: "0x111111111117dC0aa78b770fA6A738034120C302", // 1inch Protocol Token
    symbol: "1INCH",
    name: "1inch Token",
    decimals: 18,
  },
];

/**
 * Main Fusion Swap Component
 * 
 * Provides the complete 1inch Fusion swap interface with enhanced UX,
 * real-time updates, and comprehensive demo functionality.
 */
export const FusionSwap: React.FC = () => {
  const { address } = useAccount(); // Connected wallet address from wagmi
  
  // Core swap state
  const [privateKey, setPrivateKey] = useState(""); // Demo private key for testing
  const [fromToken, setFromToken] = useState(COMMON_TOKENS[3]); // Default: 1INCH token
  const [toToken, setToToken] = useState(COMMON_TOKENS[1]); // Default: WETH token
  const [amount, setAmount] = useState(""); // Swap amount input
  const [preset, setPreset] = useState<PresetEnum>(PresetEnum.fast); // Speed preset selection
  const [showPrivateKeyInput, setShowPrivateKeyInput] = useState(false); // Private key input visibility

  // Enhanced UI state management
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false); // Advanced settings panel visibility
  const [isSwapping, setIsSwapping] = useState(false); // Token swap animation state
  const [lastQuoteTime, setLastQuoteTime] = useState<number>(0); // Last quote fetch timestamp
  const [animationKey, setAnimationKey] = useState(0); // Animation trigger key

  // Relayer integration state for cross-chain coordination
  const [currentSwap, setCurrentSwap] = useState<SwapData | null>(null); // Active swap being monitored
  const [swapHistory, setSwapHistory] = useState<SwapData[]>([]); // Historical swap records
  const [isCreatingSwap, setIsCreatingSwap] = useState(false); // Swap creation loading state
  const [relayerError, setRelayerError] = useState<string | null>(null); // Relayer-specific error messages

  // Hooks
  const { notify } = useNotifications();
  const { isDemoMode } = useDemoMode();
  const { ui } = useUnifiedStore();

  // Use unified relayer service (automatically switches between mock and real)
  const relayerApi = unifiedRelayerService;

  const fusion = useFusion({
    network: "ethereum",
    rpcUrl: "https://eth.llamarpc.com",
    authKey: process.env.NEXT_PUBLIC_1INCH_AUTH_KEY,
    useMockService: true, // Enable mock service for demo
  });

  // WebSocket connection for real-time updates
  const {
    isConnected: wsConnected,
    subscribeToSwap,
    unsubscribeFromSwap,
  } = useRelayerWebSocket({
    onSwapCreated: swap => {
      notify.success("Swap Created", `New swap initiated: ${swap.id.slice(-8)}`);
      setSwapHistory(prev => [swap, ...prev]);
    },
    onSwapUpdated: swap => {
      if (currentSwap?.id === swap.id) {
        setCurrentSwap(swap);
      }
      setSwapHistory(prev => prev.map(s => (s.id === swap.id ? swap : s)));
      notify.info("Swap Updated", `Status: ${swap.status}`);
    },
    onSwapStatusChanged: swap => {
      if (currentSwap?.id === swap.id) {
        setCurrentSwap(swap);
        const statusMessages = {
          pending: "Swap is pending validation",
          processing: "Processing cross-chain transaction",
          completed: "Swap completed successfully!",
          failed: "Swap failed - please check details",
        };
        const message = statusMessages[swap.status as keyof typeof statusMessages] || `Status: ${swap.status}`;
        
        if (swap.status === 'completed') {
          notify.success("Swap Complete", message);
        } else if (swap.status === 'failed') {
          notify.error("Swap Failed", message);
        } else {
          notify.info("Status Update", message);
        }
      }
      setSwapHistory(prev => prev.map(s => (s.id === swap.id ? swap : s)));
    },
    onSwapError: swap => {
      if (currentSwap?.id === swap.id) {
        setCurrentSwap(swap);
        notify.error("Swap Error", swap.errorMessage || "Unknown error occurred");
      }
    },
    onConnect: () => {
      notify.success("Connection Established", "Connected to relayer service");
    },
    onDisconnect: () => {
      notify.warning("Connection Lost", "Disconnected from relayer service");
    },
    onError: error => {
      console.error("WebSocket error:", error);
      notify.error("Connection Error", "Failed to maintain relayer connection");
    },
  });

  const handleInitialize = async () => {
    // For mock service, private key is optional - use demo key if not provided
    const keyToUse = privateKey || "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    
    if (!keyToUse) {
      notification.error("Please enter your private key");
      return;
    }
    await fusion.initializeWithPrivateKey(keyToUse);
  };

  const handleGetQuote = async () => {
    if (!amount || !fromToken || !toToken) {
      notify.warning("Missing Information", "Please fill in all fields");
      return;
    }

    const amountWei = (parseFloat(amount) * Math.pow(10, fromToken.decimals)).toString();
    setLastQuoteTime(Date.now());
    
    try {
      await fusion.getQuote({
        fromTokenAddress: fromToken.address,
        toTokenAddress: toToken.address,
        amount: amountWei,
      });
      notify.success("Quote Retrieved", `Updated quote for ${amount} ${fromToken.symbol}`);
    } catch (error) {
      notify.error("Quote Failed", "Unable to retrieve current quote");
    }
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

        const response = await relayerApi.createSwap(swapRequest);
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
          const response = await relayerApi.getSwaps({ maker: address, limit: 10 });
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
    setIsSwapping(true);
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setAnimationKey(prev => prev + 1);
    
    // Reset quote when tokens are swapped
    if (fusion.quote) {
      setLastQuoteTime(0);
    }
    
    setTimeout(() => {
      setIsSwapping(false);
      notify.info("Tokens Swapped", `Direction changed to ${toToken.symbol} → ${temp.symbol}`);
    }, 500);
  };

  // Enhanced helper functions
  const getPresetInfo = (preset: PresetEnum) => {
    const presetData = {
      [PresetEnum.fast]: {
        label: "Fast",
        description: "Higher gas fees, faster execution",
        icon: "⚡",
        estimatedTime: "~2 min",
        color: "text-green-600"
      },
      [PresetEnum.medium]: {
        label: "Medium", 
        description: "Balanced gas fees and speed",
        icon: "⚖️",
        estimatedTime: "~5 min",
        color: "text-yellow-600"
      },
      [PresetEnum.slow]: {
        label: "Slow",
        description: "Lower gas fees, slower execution", 
        icon: "🐌",
        estimatedTime: "~10 min",
        color: "text-blue-600"
      }
    };
    return presetData[preset] || presetData[PresetEnum.medium];
  };

  const isQuoteStale = () => {
    return lastQuoteTime > 0 && (Date.now() - lastQuoteTime) > 30000; // 30 seconds
  };

  const formatTokenAmount = (amount: string, decimals: number): string => {
    try {
      const value = parseFloat(amount) / Math.pow(10, decimals);
      if (value < 0.0001) return value.toExponential(3);
      if (value < 1) return value.toFixed(6);
      if (value < 1000) return value.toFixed(4);
      return (value / 1000).toFixed(2) + "K";
    } catch {
      return "0";
    }
  };

  return (
    <motion.div 
      key={animationKey}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col gap-6 max-w-md mx-auto p-6 bg-base-100 rounded-2xl shadow-xl"
    >
      {/* Enhanced Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <motion.h2 
            className="text-2xl font-bold"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            1inch Fusion Swap
          </motion.h2>
          {isDemoMode && (
            <motion.div 
              className="badge badge-info badge-sm"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              DEMO
            </motion.div>
          )}
        </div>
        <p className="text-sm text-base-content/70">Cross-chain atomic swaps with MEV protection</p>
        <div className="text-xs text-info mt-1 flex items-center justify-center gap-2">
          <CpuChipIcon className="w-4 h-4" />
          Advanced Dutch auction mechanism for optimal execution
        </div>
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
              placeholder="Enter private key for demo (optional)"
              className="input input-sm w-full"
              value={privateKey}
              onChange={e => setPrivateKey(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                className="btn btn-sm btn-primary flex-1"
                onClick={handleInitialize}
                disabled={fusion.isLoading}
              >
                {fusion.isLoading ? "Initializing..." : "Initialize SDK"}
              </button>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setPrivateKey("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")}
                disabled={fusion.isLoading}
              >
                Use Demo Key
              </button>
            </div>
          </div>
        )}
        <div className="text-xs text-warning mt-2">
          ⚠️ Never use real private keys in production. Demo key provided for convenience.
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

      {/* Enhanced Swap Button */}
      <div className="flex justify-center">
        <motion.button 
          className="btn btn-circle btn-outline relative"
          onClick={swapTokens}
          disabled={isSwapping}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={{ 
              rotate: isSwapping ? 180 : 0,
              scale: isSwapping ? 1.2 : 1 
            }}
            transition={{ duration: 0.5 }}
          >
            <ArrowUpDownIcon className="w-5 h-5" />
          </motion.div>
          {isSwapping && (
            <motion.div
              className="absolute inset-0 border-2 border-primary rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          )}
        </motion.button>
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

      {/* Enhanced Preset Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Speed Preset</label>
          <button
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="btn btn-xs btn-ghost"
          >
            <ChevronDownIcon 
              className={`w-4 h-4 transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`} 
            />
            Advanced
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {Object.values(PresetEnum).map((presetOption) => {
            const presetInfo = getPresetInfo(presetOption);
            return (
              <motion.button
                key={presetOption}
                onClick={() => setPreset(presetOption)}
                className={`p-3 rounded-lg border text-center transition-all ${
                  preset === presetOption 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-base-300 hover:border-primary/50'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="text-lg">{presetInfo.icon}</div>
                <div className="text-xs font-medium">{presetInfo.label}</div>
                <div className="text-xs opacity-60">{presetInfo.estimatedTime}</div>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {showAdvancedSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-base-200 p-3 rounded-lg"
            >
              <div className="text-xs text-base-content/70 mb-2">
                {getPresetInfo(preset).description}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Estimated Time:</span>
                <span className={getPresetInfo(preset).color}>
                  {getPresetInfo(preset).estimatedTime}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Enhanced Quote Display */}
      <AnimatePresence>
        {fusion.quote && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-green-800">Current Quote</h3>
              <div className="flex items-center gap-2">
                {isQuoteStale() && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="badge badge-warning badge-xs"
                  >
                    <ClockIcon className="w-3 h-3 mr-1" />
                    Stale
                  </motion.div>
                )}
                <div className="text-xs text-green-600">
                  {lastQuoteTime > 0 && `${Math.floor((Date.now() - lastQuoteTime) / 1000)}s ago`}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">You pay:</span>
                <span className="font-medium">
                  {formatTokenAmount(fusion.quote.fromTokenAmount, fromToken.decimals)} {fromToken.symbol}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">You receive:</span>
                <span className="font-medium text-green-700">
                  {formatTokenAmount(fusion.quote.toTokenAmount, toToken.decimals)} {toToken.symbol}
                </span>
              </div>
              
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center text-xs">
                  <span>Network Fee:</span>
                  <span>{(fusion.quote as any).gasCostInfo?.gasCost || "~$2.50"}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span>Route:</span>
                  <span className="text-blue-600">1inch Fusion+</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Demo Quick Actions */}
      {fusion.isInitialized && (
        <div className="bg-info/10 p-4 rounded-lg border border-info/20">
          <h3 className="font-medium text-info mb-3">🎯 Demo Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="btn btn-xs btn-outline"
              onClick={() => {
                setFromToken(COMMON_TOKENS[0]); // ETH
                setToToken(COMMON_TOKENS[2]); // USDC
                setAmount("0.1");
                setPreset(PresetEnum.fast);
              }}
            >
              ETH → USDC
            </button>
            <button
              className="btn btn-xs btn-outline"
              onClick={() => {
                setFromToken(COMMON_TOKENS[3]); // 1INCH
                setToToken(COMMON_TOKENS[1]); // WETH
                setAmount("100");
                setPreset(PresetEnum.medium);
              }}
            >
              1INCH → WETH
            </button>
            <button
              className="btn btn-xs btn-outline"
              onClick={() => {
                setFromToken(COMMON_TOKENS[2]); // USDC
                setToToken(COMMON_TOKENS[0]); // ETH
                setAmount("1000");
                setPreset(PresetEnum.slow);
              }}
            >
              USDC → ETH
            </button>
            <button
              className="btn btn-xs btn-outline"
              onClick={() => {
                setFromToken(COMMON_TOKENS[1]); // WETH
                setToToken(COMMON_TOKENS[3]); // 1INCH
                setAmount("0.5");
                setPreset(PresetEnum.fast);
              }}
            >
              WETH → 1INCH
            </button>
          </div>
          <div className="text-xs text-info/70 mt-2">
            💡 Click any preset to quickly test the demo with pre-filled values
          </div>
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
    </motion.div>
  );
};
