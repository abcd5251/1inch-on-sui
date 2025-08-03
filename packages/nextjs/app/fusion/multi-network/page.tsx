/**
 * Multi-Network Demo Page for 1inch Fusion Cross-Chain Swaps
 * 
 * This page demonstrates the cross-chain capabilities of 1inch Fusion,
 * showing how atomic swaps work between Ethereum and Sui networks.
 * 
 * Features:
 * - Dual network interface with parallel swap controls
 * - Real-time cross-chain balance synchronization
 * - Interactive network switching and comparison
 * - Live atomic swap status monitoring
 * - Educational content about cross-chain mechanics
 * - Comprehensive demo controls and simulations
 * 
 * @page
 * @author 1inch-on-Sui Hackathon Team
 */
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRightIcon,
  ArrowLeftRightIcon,
  GlobeAltIcon,
  LinkIcon as ChainIcon,
  CpuChipIcon,
  ClockIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { DemoLayout } from "~~/components/demo/DemoLayout";
import { FusionSwap } from "~~/components/fusion/FusionSwap";
import { useNotifications } from "~~/components/ui/NotificationSystem";
import { useDemoMode, useCrossChainBalances } from "~~/services/store/unifiedStore";

/**
 * Network configuration interface
 */
interface NetworkConfig {
  id: string;
  name: string;
  symbol: string;
  color: string;
  bgColor: string;
  icon: string;
  chainId: number;
  rpcUrl: string;
  explorer: string;
  status: 'active' | 'maintenance' | 'offline';
  metrics: {
    tps: number;
    blockTime: string;
    gasPrice: string;
    finalityTime: string;
  };
}

/**
 * Cross-chain swap state interface
 */
interface CrossChainSwap {
  id: string;
  fromNetwork: string;
  toNetwork: string;
  fromAmount: string;
  toAmount: string;
  fromToken: string;
  toToken: string;
  status: 'pending' | 'locked' | 'processing' | 'completed' | 'failed';
  hash: string;
  timestamp: number;
  estimatedTime: number;
}

/**
 * Network configurations for the demo
 */
const NETWORKS: NetworkConfig[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: '⟠',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
    status: 'active',
    metrics: {
      tps: 15.2,
      blockTime: '12.1s',
      gasPrice: '25 gwei',
      finalityTime: '~13 min',
    },
  },
  {
    id: 'sui',
    name: 'Sui',
    symbol: 'SUI',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 border-cyan-200',
    icon: '🌊',
    chainId: 101,
    rpcUrl: 'https://fullnode.testnet.sui.io',
    explorer: 'https://explorer.sui.io',
    status: 'active',
    metrics: {
      tps: 2847,
      blockTime: '2.3s',
      gasPrice: '0.001 SUI',
      finalityTime: '~3s',
    },
  },
];

export default function MultiNetworkPage() {
  const [selectedFromNetwork, setSelectedFromNetwork] = useState(NETWORKS[0]);
  const [selectedToNetwork, setSelectedToNetwork] = useState(NETWORKS[1]);
  const [swapDirection, setSwapDirection] = useState<'eth-to-sui' | 'sui-to-eth'>('eth-to-sui');
  const [activeSwaps, setActiveSwaps] = useState<CrossChainSwap[]>([]);
  const [showNetworkDetails, setShowNetworkDetails] = useState(false);

  // Hooks
  const { notify } = useNotifications();
  const { isDemoMode } = useDemoMode();
  const { 
    refreshBalances, 
    isRefreshing, 
    totalUSDCBalance, 
    portfolioBreakdown 
  } = useCrossChainBalances();

  // Simulate cross-chain swaps in demo mode
  useEffect(() => {
    if (!isDemoMode) return;

    const interval = setInterval(() => {
      if (Math.random() > 0.8 && activeSwaps.length < 3) {
        const newSwap: CrossChainSwap = {
          id: `swap_${Date.now()}`,
          fromNetwork: Math.random() > 0.5 ? 'ethereum' : 'sui',
          toNetwork: Math.random() > 0.5 ? 'ethereum' : 'sui',
          fromAmount: (Math.random() * 10 + 0.1).toFixed(3),
          toAmount: (Math.random() * 10 + 0.1).toFixed(3),
          fromToken: Math.random() > 0.5 ? 'ETH' : 'USDC',
          toToken: Math.random() > 0.5 ? 'SUI' : 'USDC',
          status: 'pending',
          hash: `0x${Math.random().toString(16).substr(2, 8)}`,
          timestamp: Date.now(),
          estimatedTime: 180, // 3 minutes
        };
        
        setActiveSwaps(prev => [newSwap, ...prev]);
        notify.info("Cross-Chain Swap", `New swap initiated: ${newSwap.fromToken} → ${newSwap.toToken}`);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [isDemoMode, activeSwaps.length, notify]);

  // Update swap statuses
  useEffect(() => {
    if (activeSwaps.length === 0) return;

    const interval = setInterval(() => {
      setActiveSwaps(prev => prev.map(swap => {
        if (swap.status === 'completed' || swap.status === 'failed') {
          return swap;
        }

        const elapsed = (Date.now() - swap.timestamp) / 1000;
        const progress = elapsed / swap.estimatedTime;

        if (progress > 1) {
          return { ...swap, status: 'completed' };
        } else if (progress > 0.8) {
          return { ...swap, status: 'processing' };
        } else if (progress > 0.3) {
          return { ...swap, status: 'locked' };
        }

        return swap;
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [activeSwaps]);

  const switchNetworks = () => {
    const temp = selectedFromNetwork;
    setSelectedFromNetwork(selectedToNetwork);
    setSelectedToNetwork(temp);
    setSwapDirection(swapDirection === 'eth-to-sui' ? 'sui-to-eth' : 'eth-to-sui');
    notify.info("Networks Switched", `Direction: ${selectedToNetwork.name} → ${temp.name}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'locked': return 'text-blue-600 bg-blue-100';
      case 'processing': return 'text-purple-600 bg-purple-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <ClockIcon className="w-4 h-4" />;
      case 'locked': return <ChainIcon className="w-4 h-4" />;
      case 'processing': return <CpuChipIcon className="w-4 h-4 animate-spin" />;
      case 'completed': return <CheckCircleIcon className="w-4 h-4" />;
      case 'failed': return <ExclamationTriangleIcon className="w-4 h-4" />;
      default: return <InformationCircleIcon className="w-4 h-4" />;
    }
  };

  return (
    <DemoLayout showControls={true} className="bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Multi-Network Atomic Swaps
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
            Experience seamless cross-chain trading between Ethereum and Sui networks
            using 1inch Fusion's atomic swap technology with MEV protection.
          </p>
          
          {isDemoMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center space-x-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                🎭
              </motion.div>
              <span className="font-medium">Hackathon Demo Mode Active</span>
            </motion.div>
          )}
        </div>

        {/* Network Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* From Network */}
          <motion.div 
            className={`p-6 rounded-2xl border-2 ${selectedFromNetwork.bgColor} ${
              selectedFromNetwork.id === 'ethereum' ? 'border-blue-300' : 'border-cyan-300'
            }`}
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-center">
              <div className="text-4xl mb-3">{selectedFromNetwork.icon}</div>
              <h3 className={`text-xl font-bold ${selectedFromNetwork.color} mb-2`}>
                {selectedFromNetwork.name}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>TPS:</span>
                  <span className="font-medium">{selectedFromNetwork.metrics.tps}</span>
                </div>
                <div className="flex justify-between">
                  <span>Block Time:</span>
                  <span className="font-medium">{selectedFromNetwork.metrics.blockTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gas:</span>
                  <span className="font-medium">{selectedFromNetwork.metrics.gasPrice}</span>
                </div>
              </div>
              <div className="mt-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Active
                </span>
              </div>
            </div>
          </motion.div>

          {/* Swap Direction Control */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <motion.button
              onClick={switchNetworks}
              className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full shadow-lg hover:shadow-xl"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowLeftRightIcon className="w-6 h-6" />
            </motion.button>
            
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Cross-Chain Bridge</div>
              <div className="font-bold text-gray-900">
                {selectedFromNetwork.symbol} → {selectedToNetwork.symbol}
              </div>
            </div>

            {/* Bridge Status */}
            <div className="bg-white rounded-lg p-3 border border-gray-200 min-w-[150px]">
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1">Bridge Status</div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-700">Operational</span>
                </div>
              </div>
            </div>
          </div>

          {/* To Network */}
          <motion.div 
            className={`p-6 rounded-2xl border-2 ${selectedToNetwork.bgColor} ${
              selectedToNetwork.id === 'ethereum' ? 'border-blue-300' : 'border-cyan-300'
            }`}
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-center">
              <div className="text-4xl mb-3">{selectedToNetwork.icon}</div>
              <h3 className={`text-xl font-bold ${selectedToNetwork.color} mb-2`}>
                {selectedToNetwork.name}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>TPS:</span>
                  <span className="font-medium">{selectedToNetwork.metrics.tps}</span>
                </div>
                <div className="flex justify-between">
                  <span>Block Time:</span>
                  <span className="font-medium">{selectedToNetwork.metrics.blockTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gas:</span>
                  <span className="font-medium">{selectedToNetwork.metrics.gasPrice}</span>
                </div>
              </div>
              <div className="mt-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Active
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Portfolio Overview */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Cross-Chain Portfolio</h3>
            <button
              onClick={() => refreshBalances(true)}
              disabled={isRefreshing}
              className="btn btn-sm btn-outline"
            >
              {isRefreshing ? (
                <CpuChipIcon className="w-4 h-4 animate-spin" />
              ) : (
                "🔄 Refresh"
              )}
            </button>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="text-2xl font-bold text-blue-600">
                ${portfolioBreakdown.values ? 
                  (portfolioBreakdown.values.ethereum + portfolioBreakdown.values.sui).toFixed(2) : 
                  '0.00'
                }
              </div>
              <div className="text-sm text-gray-600">Total Portfolio Value</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="text-2xl font-bold text-green-600">
                {totalUSDCBalance.total.toFixed(2)} USDC
              </div>
              <div className="text-sm text-gray-600">Total USDC Balance</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <div className="text-2xl font-bold text-purple-600">
                {portfolioBreakdown.ethereum.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Ethereum Allocation</div>
            </div>
            
            <div className="text-center p-4 bg-cyan-50 rounded-xl">
              <div className="text-2xl font-bold text-cyan-600">
                {portfolioBreakdown.sui.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Sui Allocation</div>
            </div>
          </div>
        </div>

        {/* Active Swaps Monitoring */}
        {activeSwaps.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Active Cross-Chain Swaps</h3>
            <div className="space-y-4">
              {activeSwaps.slice(0, 5).map(swap => (
                <motion.div
                  key={swap.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(swap.status)}`}>
                        {getStatusIcon(swap.status)}
                        <span className="capitalize">{swap.status}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{swap.fromAmount} {swap.fromToken}</span>
                        <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{swap.toAmount} {swap.toToken}</span>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        {swap.fromNetwork} → {swap.toNetwork}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        {new Date(swap.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        Hash: {swap.hash}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Network Comparison */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Network Performance Comparison</h3>
            <button
              onClick={() => setShowNetworkDetails(!showNetworkDetails)}
              className="btn btn-sm btn-ghost"
            >
              {showNetworkDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4">Metric</th>
                  <th className="text-center py-3 px-4">Ethereum</th>
                  <th className="text-center py-3 px-4">Sui</th>
                  <th className="text-center py-3 px-4">Advantage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3 px-4 font-medium">Transaction Throughput</td>
                  <td className="text-center py-3 px-4">{NETWORKS[0].metrics.tps} TPS</td>
                  <td className="text-center py-3 px-4">{NETWORKS[1].metrics.tps} TPS</td>
                  <td className="text-center py-3 px-4">
                    <span className="text-cyan-600 font-medium">Sui</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Confirmation Time</td>
                  <td className="text-center py-3 px-4">{NETWORKS[0].metrics.blockTime}</td>
                  <td className="text-center py-3 px-4">{NETWORKS[1].metrics.blockTime}</td>
                  <td className="text-center py-3 px-4">
                    <span className="text-cyan-600 font-medium">Sui</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Transaction Cost</td>
                  <td className="text-center py-3 px-4">{NETWORKS[0].metrics.gasPrice}</td>
                  <td className="text-center py-3 px-4">{NETWORKS[1].metrics.gasPrice}</td>
                  <td className="text-center py-3 px-4">
                    <span className="text-cyan-600 font-medium">Sui</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Finality Time</td>
                  <td className="text-center py-3 px-4">{NETWORKS[0].metrics.finalityTime}</td>
                  <td className="text-center py-3 px-4">{NETWORKS[1].metrics.finalityTime}</td>
                  <td className="text-center py-3 px-4">
                    <span className="text-cyan-600 font-medium">Sui</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <AnimatePresence>
            {showNetworkDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 grid md:grid-cols-2 gap-6"
              >
                {NETWORKS.map(network => (
                  <div key={network.id} className={`p-4 rounded-lg border ${network.bgColor}`}>
                    <h4 className={`font-bold ${network.color} mb-3`}>{network.name} Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Chain ID:</span>
                        <span className="font-medium">{network.chainId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>RPC URL:</span>
                        <span className="font-medium text-xs truncate">{network.rpcUrl}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Explorer:</span>
                        <a 
                          href={network.explorer} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs"
                        >
                          View Explorer
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Swap Interface */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
            Cross-Chain Swap Interface
          </h3>
          <div className="max-w-md mx-auto">
            <FusionSwap />
          </div>
        </div>

        {/* Information Notice */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="w-6 h-6 text-blue-600 mt-1" />
            <div>
              <h3 className="font-bold text-blue-900 mb-2">Cross-Chain Technology</h3>
              <div className="text-blue-800 text-sm space-y-2">
                <p>
                  • <strong>Atomic Swaps:</strong> Transactions either complete fully on both chains or fail entirely, ensuring no funds are lost
                </p>
                <p>
                  • <strong>Hash Time-Locked Contracts (HTLCs):</strong> Smart contracts that ensure secure cross-chain value transfer
                </p>
                <p>
                  • <strong>MEV Protection:</strong> Dutch auction mechanism protects against Maximal Extractable Value attacks
                </p>
                <p>
                  • <strong>Trustless Operation:</strong> No intermediaries required - transactions are secured by cryptographic proofs
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DemoLayout>
  );
}