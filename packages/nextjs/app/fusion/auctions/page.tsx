'use client';

import { useEffect } from 'react';
import { useUnifiedStore } from '~~/services/store/unifiedStore';
import { AuctionMonitor } from '~~/components/fusion/AuctionMonitor';
import Link from 'next/link';

export default function AuctionMonitoringPage() {
  const {
    ui: { selectedNetwork },
    setSelectedNetwork,
    auctions: { activeAuctions },
    refreshBalances,
  } = useUnifiedStore();

  // Auto-refresh balances when page loads
  useEffect(() => {
    refreshBalances();
  }, [refreshBalances]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dutch Auction Monitoring</h1>
              <p className="mt-2 text-lg text-gray-600">
                Real-time monitoring of active auctions across Ethereum and Sui networks
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center space-x-4">
              <Link
                href="/fusion/swap"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Create New Auction
              </Link>
              <Link
                href="/fusion"
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Back to Fusion
              </Link>
            </div>
          </div>
        </div>

        {/* Network Selector */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Monitor Network:</span>
            <div className="flex space-x-2">
              {(['ethereum', 'sui', 'cross-chain'] as const).map((network) => (
                <button
                  key={network}
                  onClick={() => setSelectedNetwork(network)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedNetwork === network
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                  }`}
                >
                  {network === 'cross-chain' ? 'Cross-Chain' : network.charAt(0).toUpperCase() + network.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Auctions</p>
                <p className="text-2xl font-bold text-gray-900">{activeAuctions.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Network</p>
                <p className="text-2xl font-bold text-gray-900 capitalize">
                  {selectedNetwork === 'cross-chain' ? 'Cross-Chain' : selectedNetwork}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Real-Time Updates</p>
                <p className="text-2xl font-bold text-green-600">Live</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main Auction Monitor */}
        <AuctionMonitor
          className="w-full"
          maxAuctions={10}
          showOfflineMessage={true}
        />

        {/* Help Section */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h2 className="text-lg font-medium text-blue-900 mb-3">How Dutch Auctions Work</h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-blue-800">
            <div>
              <h3 className="font-medium mb-2">Price Discovery</h3>
              <p>
                Auctions start at a premium price and gradually decrease over time until filled by a resolver. 
                This ensures optimal price execution while protecting against MEV attacks.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Real-Time Monitoring</h3>
              <p>
                Watch live price updates, bid placements, and auction completions. 
                Enable WebSocket connection for instant notifications and updates.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Cross-Chain Support</h3>
              <p>
                Monitor auctions across Ethereum, Sui, and cross-chain atomic swaps. 
                Each network has optimized auction parameters for best execution.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Resolver Competition</h3>
              <p>
                Multiple resolvers compete to fill orders, ensuring competitive rates and reliable execution. 
                View resolver performance and success rates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}