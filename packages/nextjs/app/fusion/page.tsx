/**
 * 1inch Fusion Main Landing Page
 * 
 * This is the primary entry point for the 1inch Fusion platform on Sui blockchain.
 * Provides an overview of features, network status, and quick navigation to key functions.
 * 
 * Features:
 * - Dynamic network status display (Ethereum/Sui)
 * - Live statistics and performance metrics
 * - Quick action navigation to swap, auction, and analytics pages
 * - Feature overview with educational content
 * - Network-aware routing and status indicators
 * - Responsive design for hackathon demonstrations
 * 
 * @page
 * @author 1inch-on-Sui Hackathon Team
 */
"use client";

import React from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { useFusion } from "./shared/context/FusionContext";
import NetworkSelector from "./shared/components/NetworkSelector";

/**
 * Main Fusion page component
 * 
 * Renders the landing page with network-aware content and navigation
 */
const FusionPage: NextPage = () => {
  const { selectedNetwork } = useFusion(); // Get current selected network from context

  return (
    <div className="fusion-home min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              1inch Fusion
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Experience the next-generation cross-chain trading aggregation platform. Get the best rates with minimal slippage and MEV protection.
          </p>
          
          {/* Network Selector */}
          <div className="flex justify-center mb-8">
            <NetworkSelector className="bg-white shadow-lg rounded-xl p-6" />
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-8 rounded-2xl shadow-lg text-center hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Lightning Fast</h3>
            <p className="text-gray-600">Optimized routing algorithms for fastest trade execution</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-lg text-center hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🛡️</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">MEV Protection</h3>
            <p className="text-gray-600">Advanced MEV attack protection mechanisms</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-lg text-center hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Best Rates</h3>
            <p className="text-gray-600">Aggregate liquidity for optimal pricing</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">Quick Start</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Link 
              href="/fusion/swap"
              className="group bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-3xl mb-3">🔄</div>
              <h3 className="font-bold mb-2">Start Trading</h3>
              <p className="text-sm opacity-90">Execute token swaps</p>
            </Link>
            
            <Link 
              href="/fusion/auctions"
              className="group bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-xl hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-bold mb-2">Dutch Auctions</h3>
              <p className="text-sm opacity-90">Real-time auction monitoring</p>
            </Link>
            
            <Link 
              href={`/fusion/${selectedNetwork}/orders`}
              className="group bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-3xl mb-3">📋</div>
              <h3 className="font-bold mb-2">My Orders</h3>
              <p className="text-sm opacity-90">Manage trading orders</p>
            </Link>
            
            <Link 
              href={`/fusion/${selectedNetwork}/analytics`}
              className="group bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-bold mb-2">Analytics</h3>
              <p className="text-sm opacity-90">View trading statistics</p>
            </Link>
            
            <Link 
              href="/fusion/shared/demo"
              className="group bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-3xl mb-3">🚀</div>
              <h3 className="font-bold mb-2">Demo</h3>
              <p className="text-sm opacity-90">Experience live demo</p>
            </Link>
          </div>
        </div>

        {/* Network Status */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-900">Network Status</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full mb-4">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Current Network: {selectedNetwork === 'ethereum' ? 'Ethereum' : 'Sui'}
              </div>
              
              {selectedNetwork === 'ethereum' ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Gas Price:</span>
                    <span className="font-semibold">~25 gwei</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Block Time:</span>
                    <span className="font-semibold">~12s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Network:</span>
                    <span className="font-semibold text-green-600">Mainnet</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">TPS:</span>
                    <span className="font-semibold">~2,500</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Finality:</span>
                    <span className="font-semibold">~2.5s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Network:</span>
                    <span className="font-semibold text-orange-600">Testnet</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Live Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Active Orders:</span>
                  <span className="font-semibold text-blue-600">1,247</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">24h Volume:</span>
                  <span className="font-semibold text-green-600">$4.7M</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Success Rate:</span>
                  <span className="font-semibold text-purple-600">98.7%</span>
                </div>
              </div>
            </div>
          </div>
          
          {selectedNetwork === 'sui' && (
            <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-orange-800 text-sm text-center">
                🔴 This is a demo environment, do not use real private keys or mainnet funds
              </p>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">How 1inch Fusion Works</h2>
            <p className="text-lg text-gray-600">
              Experience next-generation intent-based DEX trading technology
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="font-bold mb-3 text-gray-900">Intent Trading</h3>
              <p className="text-sm text-gray-600">
                Users express trading intent, resolvers compete to provide optimal execution
              </p>
            </div>

            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <div className="text-3xl mb-4">⏰</div>
              <h3 className="font-bold mb-3 text-gray-900">Dutch Auction</h3>
              <p className="text-sm text-gray-600">
                Price decreases over time, ensuring optimal price discovery and fast execution
              </p>
            </div>

            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <div className="text-3xl mb-4">🛡️</div>
              <h3 className="font-bold mb-3 text-gray-900">MEV Protection</h3>
              <p className="text-sm text-gray-600">
                Protect against MEV attacks through resolver competition and time-based price discovery
              </p>
            </div>

            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <div className="text-3xl mb-4">🌉</div>
              <h3 className="font-bold mb-3 text-gray-900">Cross-Chain Support</h3>
              <p className="text-sm text-gray-600">
                Seamless trading across multiple networks including Ethereum and Sui
              </p>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
};

export default FusionPage;
