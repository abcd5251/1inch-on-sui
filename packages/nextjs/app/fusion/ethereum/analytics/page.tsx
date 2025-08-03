'use client';

import { useState } from 'react';
import Link from 'next/link';

interface AnalyticsData {
  totalVolume: string;
  totalOrders: number;
  avgGasSaved: string;
  successRate: number;
  topTokens: Array<{
    symbol: string;
    volume: string;
    change24h: number;
  }>;
  recentActivity: Array<{
    type: 'swap' | 'order_created' | 'order_filled';
    amount: string;
    token: string;
    time: string;
    txHash: string;
  }>;
}

const mockAnalyticsData: AnalyticsData = {
  totalVolume: '$4,720,000',
  totalOrders: 1247,
  avgGasSaved: '23%',
  successRate: 98.5,
  topTokens: [
    { symbol: 'USDC', volume: '$1,635,000', change24h: 12.5 },
    { symbol: 'WETH', volume: '$1,385,000', change24h: -3.2 },
    { symbol: 'USDT', volume: '$925,000', change24h: 8.7 },
    { symbol: 'DAI', volume: '$775,000', change24h: 15.3 }
  ],
  recentActivity: [
    {
      type: 'order_filled',
      amount: '3,466',
      token: 'USDC',
      time: '2025-07-27 12:28:00',
      txHash: '0xabc123...def456'
    },
    {
      type: 'swap',
      amount: '0.5',
      token: 'WETH',
      time: '2025-07-27 12:25:00',
      txHash: '0xdef456...ghi789'
    },
    {
      type: 'order_created',
      amount: '6,932',
      token: 'USDT',
      time: '2025-07-27 12:22:00',
      txHash: '0xghi789...jkl012'
    }
  ]
};

export default function EthereumAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('24h');
  const [data] = useState<AnalyticsData>(mockAnalyticsData);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'swap': return '🔄';
      case 'order_created': return '📝';
      case 'order_filled': return '✅';
      default: return '📊';
    }
  };

  const getActivityText = (type: string) => {
    switch (type) {
      case 'swap': return 'Instant Swap';
      case 'order_created': return 'Order Created';
      case 'order_filled': return 'Order Filled';
      default: return 'Unknown Activity';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ethereum Analytics</h1>
        <p className="text-gray-600">Real-time monitoring of Fusion performance on Ethereum network</p>
      </div>

      {/* Time Range Selector */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Time Range</h2>
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: '24h', label: '24 Hours' },
              { key: '7d', label: '7 Days' },
              { key: '30d', label: '30 Days' },
              { key: '90d', label: '90 Days' }
            ].map(range => (
              <button
                key={range.key}
                onClick={() => setTimeRange(range.key as any)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  timeRange === range.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl">💰</div>
            <div className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
              +12.5%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{data.totalVolume}</div>
          <div className="text-sm text-gray-600">Total Volume</div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl">📋</div>
            <div className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
              +8.3%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{data.totalOrders.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Total Orders</div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl">⛽</div>
            <div className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
              +5.2%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{data.avgGasSaved}</div>
          <div className="text-sm text-gray-600">Avg Gas Saved</div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl">✅</div>
            <div className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
              +0.3%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{data.successRate}%</div>
          <div className="text-sm text-gray-600">Success Rate</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Top Tokens */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Top Tokens</h2>
            <Link 
              href="/fusion/ethereum/tokens"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All →
            </Link>
          </div>
          <div className="space-y-4">
            {data.topTokens.map((token, index) => (
              <div key={token.symbol} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{token.symbol}</div>
                    <div className="text-sm text-gray-600">{token.volume}</div>
                  </div>
                </div>
                <div className={`text-sm font-medium ${
                  token.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {token.change24h >= 0 ? '+' : ''}{token.change24h}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
            <Link 
              href="/fusion/ethereum/orders"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All →
            </Link>
          </div>
          <div className="space-y-4">
            {data.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                  <div>
                    <div className="font-semibold text-gray-900">{getActivityText(activity.type)}</div>
                    <div className="text-sm text-gray-600">
                      {activity.amount} {activity.token}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">{activity.time}</div>
                  <a 
                    href={`https://etherscan.io/tx/${activity.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    View Transaction ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Placeholder */}
      <div className="mt-8 grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Volume Trends</h2>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">📈</div>
              <div className="text-gray-600">Volume Chart</div>
              <div className="text-sm text-gray-500 mt-1">Coming Soon</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Gas Fee Analysis</h2>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">⛽</div>
              <div className="text-gray-600">Gas Fee Chart</div>
              <div className="text-sm text-gray-500 mt-1">Coming Soon</div>
            </div>
          </div>
        </div>
      </div>

      {/* Network Status */}
      <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Network Status</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl mb-2">🟢</div>
            <div className="font-semibold text-gray-900">Network Status</div>
            <div className="text-sm text-green-600">Normal</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">⚡</div>
            <div className="font-semibold text-gray-900">Current Gas Price</div>
            <div className="text-sm text-gray-600">25 Gwei</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">🔗</div>
            <div className="font-semibold text-gray-900">Latest Block</div>
            <div className="text-sm text-gray-600">#18,950,123</div>
          </div>
        </div>
      </div>
    </div>
  );
}