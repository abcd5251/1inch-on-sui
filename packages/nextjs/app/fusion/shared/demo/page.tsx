/**
 * Comprehensive 1inch Fusion Demo Page
 * 
 * This page provides an interactive demonstration of key 1inch Fusion features:
 * - Dutch auction simulation with real-time price decay
 * - Order book visualization with dynamic bid/ask spreads
 * - Network status monitoring for Ethereum and Sui
 * - Live performance metrics and comparative analysis
 * 
 * Features:
 * - Real-time auction simulation with resolver activity
 * - Interactive order book with live price updates
 * - Network performance comparison and monitoring
 * - Educational content and guided exploration
 * - Demo environment safety notices and warnings
 * 
 * @page
 * @author 1inch-on-Sui Hackathon Team
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DemoLayout } from '~~/components/demo/DemoLayout';

/**
 * Interface for demo step configuration
 */
interface DemoStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
}

/**
 * State interface for Dutch auction simulation
 */
interface AuctionState {
  isActive: boolean;
  currentPrice: number;
  startPrice: number;
  endPrice: number;
  timeRemaining: number;
  totalDuration: number;
  resolvers: number;
}

export default function DemoPage() {
  const [activeDemo, setActiveDemo] = useState<string>('auction');
  const [auctionState, setAuctionState] = useState<AuctionState>({
    isActive: false,
    currentPrice: 3466,
    startPrice: 3520,
    endPrice: 3400,
    timeRemaining: 0,
    totalDuration: 180, // 3 minutes
    resolvers: 0
  });

  const [orderBook, setOrderBook] = useState({
    bids: [
      { price: 3465, amount: 2.5, total: 8662.5 },
      { price: 3464, amount: 1.8, total: 6235.2 },
      { price: 3463, amount: 3.2, total: 11081.6 },
      { price: 3462, amount: 0.9, total: 3115.8 },
      { price: 3461, amount: 2.1, total: 7268.1 }
    ],
    asks: [
      { price: 3467, amount: 1.5, total: 5200.5 },
      { price: 3468, amount: 2.3, total: 7976.4 },
      { price: 3469, amount: 1.7, total: 5897.3 },
      { price: 3470, amount: 2.8, total: 9716.0 },
      { price: 3471, amount: 1.2, total: 4165.2 }
    ]
  });

  // Simulate Dutch auction
  useEffect(() => {
    if (!auctionState.isActive) return;

    const interval = setInterval(() => {
      setAuctionState(prev => {
        if (prev.timeRemaining <= 0) {
          return { ...prev, isActive: false, timeRemaining: 0 };
        }

        const progress = (prev.totalDuration - prev.timeRemaining) / prev.totalDuration;
        const currentPrice = prev.startPrice - (prev.startPrice - prev.endPrice) * progress;
        const resolvers = Math.floor(Math.random() * 5) + 1;

        return {
          ...prev,
          timeRemaining: prev.timeRemaining - 1,
          currentPrice: Math.round(currentPrice * 100) / 100,
          resolvers
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [auctionState.isActive]);

  const startAuction = () => {
    setAuctionState(prev => ({
      ...prev,
      isActive: true,
      timeRemaining: prev.totalDuration,
      currentPrice: prev.startPrice,
      resolvers: 0
    }));
  };

  const stopAuction = () => {
    setAuctionState(prev => ({ ...prev, isActive: false }));
  };

  const demos = {
    auction: {
      title: 'Dutch Auction Demo',
      description: 'Watch real-time Dutch auction price decay process',
      component: (
        <div className="space-y-6">
          {/* Auction Controls */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Auction Controls</h3>
              <div className="flex space-x-3">
                <button
                  onClick={startAuction}
                  disabled={auctionState.isActive}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Auction
                </button>
                <button
                  onClick={stopAuction}
                  disabled={!auctionState.isActive}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Stop Auction
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  ${auctionState.currentPrice}
                </div>
                <div className="text-sm text-gray-600 font-medium">Current Price</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.floor(auctionState.timeRemaining / 60)}:{(auctionState.timeRemaining % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-sm text-gray-600 font-medium">Time Remaining</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {auctionState.resolvers}
                </div>
                <div className="text-sm text-gray-600 font-medium">Active Resolvers</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  auctionState.isActive ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {auctionState.isActive ? 'Active' : 'Stopped'}
                </div>
                <div className="text-sm text-gray-600 font-medium">Status</div>
              </div>
            </div>
          </div>

          {/* Price Chart */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Price Decay Curve</h3>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 p-4">
                <svg className="w-full h-full">
                  {/* Price Line */}
                  <line
                    x1="10%"
                    y1="20%"
                    x2="90%"
                    y2="80%"
                    stroke="#3B82F6"
                    strokeWidth="3"
                    strokeDasharray={auctionState.isActive ? "0" : "5,5"}
                  />
                  
                  {/* Current Price Point */}
                  {auctionState.isActive && (
                    <circle
                      cx={`${10 + (80 * (auctionState.totalDuration - auctionState.timeRemaining) / auctionState.totalDuration)}%`}
                      cy={`${20 + (60 * (auctionState.startPrice - auctionState.currentPrice) / (auctionState.startPrice - auctionState.endPrice))}%`}
                      r="6"
                      fill="#EF4444"
                      className="animate-pulse"
                    />
                  )}
                  
                  {/* Labels */}
                  <text x="10%" y="15%" className="text-xs fill-gray-700 font-medium">Start Price: ${auctionState.startPrice}</text>
                  <text x="90%" y="85%" className="text-xs fill-gray-700 font-medium text-end">End Price: ${auctionState.endPrice}</text>
                </svg>
              </div>
              {!auctionState.isActive && (
                <div className="text-gray-500 text-center">
                  <div className="text-4xl mb-2">📈</div>
                  <div>Click "Start Auction" to see real-time price changes</div>
                </div>
              )}
            </div>
          </div>

          {/* Resolver Activity */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Resolver Activity</h3>
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      i < auctionState.resolvers ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                    }`}></div>
                    <span className="font-medium">Resolver #{i + 1}</span>
                  </div>
                  <div className="text-sm text-gray-600 font-medium">
                    {i < auctionState.resolvers ? 'Monitoring' : 'Offline'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    orderbook: {
      title: 'Order Book Visualization',
      description: 'View real-time buy and sell order depth',
      component: (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">ETH/USDC Order Book</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Buy Orders */}
            <div>
              <h4 className="font-medium text-green-600 mb-3">Buy Orders (Bids)</h4>
              <div className="space-y-1">
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 font-medium pb-2 border-b">
                  <div>Price (USDC)</div>
                  <div className="text-right">Amount (ETH)</div>
                  <div className="text-right">Total (USDC)</div>
                </div>
                {orderBook.bids.map((bid, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 text-sm py-1 hover:bg-green-50 rounded">
                    <div className="text-green-600 font-medium">${bid.price}</div>
                    <div className="text-right">{bid.amount}</div>
                    <div className="text-right">${bid.total}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sell Orders */}
            <div>
              <h4 className="font-medium text-red-600 mb-3">Sell Orders (Asks)</h4>
              <div className="space-y-1">
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 font-medium pb-2 border-b">
                  <div>Price (USDC)</div>
                  <div className="text-right">Amount (ETH)</div>
                  <div className="text-right">Total (USDC)</div>
                </div>
                {orderBook.asks.map((ask, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 text-sm py-1 hover:bg-red-50 rounded">
                    <div className="text-red-600 font-medium">${ask.price}</div>
                    <div className="text-right">{ask.amount}</div>
                    <div className="text-right">${ask.total}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Spread Information */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-green-600">${orderBook.bids[0].price}</div>
                <div className="text-xs text-gray-600 font-medium">Highest Bid</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">
                  ${(orderBook.asks[0].price - orderBook.bids[0].price).toFixed(2)}
                </div>
                <div className="text-xs text-gray-600 font-medium">Spread</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-600">${orderBook.asks[0].price}</div>
                <div className="text-xs text-gray-600 font-medium">Lowest Ask</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    network: {
      title: 'Network Status Monitoring',
      description: 'Real-time monitoring of Ethereum and Sui network status',
      component: (
        <div className="space-y-6">
          {/* Ethereum Network */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <span className="w-4 h-4 bg-blue-500 rounded-full"></span>
                <span>Ethereum Mainnet</span>
              </h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600">Normal</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">15.2</div>
                <div className="text-sm text-gray-700 font-medium">TPS</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">12.1s</div>
                <div className="text-sm text-gray-700 font-medium">Block Time</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-xl font-bold text-yellow-600">25 gwei</div>
                <div className="text-sm text-gray-700 font-medium">Gas Price</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-600">18,542,891</div>
                <div className="text-sm text-gray-700 font-medium">Latest Block</div>
              </div>
            </div>
          </div>

          {/* Sui Network */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <span className="w-4 h-4 bg-cyan-500 rounded-full"></span>
                <span>Sui Testnet</span>
              </h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600">Normal</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-cyan-50 rounded-lg">
                <div className="text-xl font-bold text-cyan-600">2,847</div>
                <div className="text-sm text-gray-700 font-medium">TPS</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">2.3s</div>
                <div className="text-sm text-gray-700 font-medium">Confirmation Time</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-xl font-bold text-yellow-600">0.001 SUI</div>
                <div className="text-sm text-gray-700 font-medium">Transaction Fee</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-600">425</div>
                <div className="text-sm text-gray-700 font-medium">Current Epoch</div>
              </div>
            </div>
          </div>

          {/* Network Comparison */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Network Performance Comparison</h3>
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
                    <td className="py-3 px-4 font-medium">Transaction Speed</td>
                    <td className="text-center py-3 px-4">15.2 TPS</td>
                    <td className="text-center py-3 px-4">2,847 TPS</td>
                    <td className="text-center py-3 px-4">
                      <span className="text-cyan-600 font-medium">Sui</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">Confirmation Time</td>
                    <td className="text-center py-3 px-4">12.1s</td>
                    <td className="text-center py-3 px-4">2.3s</td>
                    <td className="text-center py-3 px-4">
                      <span className="text-cyan-600 font-medium">Sui</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">Transaction Fee</td>
                    <td className="text-center py-3 px-4">$0.50-5.00</td>
                    <td className="text-center py-3 px-4">$0.001</td>
                    <td className="text-center py-3 px-4">
                      <span className="text-cyan-600 font-medium">Sui</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">Ecosystem Maturity</td>
                    <td className="text-center py-3 px-4">Mature</td>
                    <td className="text-center py-3 px-4">Developing</td>
                    <td className="text-center py-3 px-4">
                      <span className="text-blue-600 font-medium">Ethereum</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
    }
  };

  const demoTabs = [
    { id: 'auction', title: 'Dutch Auction', icon: '🎯' },
    { id: 'orderbook', title: 'Order Book', icon: '📊' },
    { id: 'network', title: 'Network Monitor', icon: '🌐' }
  ];

  return (
    <DemoLayout showControls={true} className="bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Feature Demo</h1>
        <p className="text-gray-600">Experience the core features and capabilities of 1inch Fusion</p>
      </div>

      {/* Demo Tabs */}
      <div className="mb-8">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {demoTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveDemo(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md font-medium transition-colors ${
                activeDemo === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Demo Content */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {demos[activeDemo as keyof typeof demos].title}
          </h2>
          <p className="text-gray-600">
            {demos[activeDemo as keyof typeof demos].description}
          </p>
        </div>
        
        {demos[activeDemo as keyof typeof demos].component}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link 
          href="/fusion/ethereum/swap"
          className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <span className="text-xl">💱</span>
            </div>
            <h3 className="font-semibold text-gray-900">Start Trading</h3>
          </div>
          <p className="text-gray-600 text-sm">Experience real token swap functionality</p>
        </Link>

        <Link 
          href="/fusion/shared/help"
          className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <span className="text-xl">📚</span>
            </div>
            <h3 className="font-semibold text-gray-900">Learning Guide</h3>
          </div>
          <p className="text-gray-600 text-sm">View detailed usage documentation</p>
        </Link>

        <Link 
          href="/fusion/shared/settings"
          className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              <span className="text-xl">⚙️</span>
            </div>
            <h3 className="font-semibold text-gray-900">Personalized Settings</h3>
          </div>
          <p className="text-gray-600 text-sm">Customize your trading experience</p>
        </Link>
      </div>

      {/* Demo Notice */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <div className="text-yellow-600 text-xl">⚠️</div>
          <div>
            <h3 className="font-semibold text-yellow-800 mb-2">Demo Environment Notice</h3>
            <div className="text-yellow-700 text-sm space-y-1">
              <p>• This is a feature demonstration environment, all data is simulated</p>
              <p>• Do not use real funds or mainnet private keys for operations</p>
              <p>• Actual trading performance may vary depending on network conditions</p>
              <p>• For real trading, please visit the production environment</p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </DemoLayout>
  );
}