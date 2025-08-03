'use client';

import { useState } from 'react';
import Link from 'next/link';

interface VolumeData {
  date: string;
  volume: number;
  trades: number;
  avgSize: number;
  topToken?: string;
}

const mockVolumeData: VolumeData[] = [
  { date: '2025-07-27', volume: 2407500, trades: 156, avgSize: 15432, topToken: 'ETH' },
  { date: '2025-07-26', volume: 1888800, trades: 134, avgSize: 14094, topToken: 'USDC' },
  { date: '2025-07-25', volume: 2794500, trades: 189, avgSize: 14787, topToken: 'ETH' },
  { date: '2025-07-24', volume: 2119600, trades: 145, avgSize: 14618, topToken: 'DAI' },
  { date: '2025-07-23', volume: 1714540, trades: 112, avgSize: 15308, topToken: 'ETH' },
  { date: '2025-07-22', volume: 2601000, trades: 167, avgSize: 15570, topToken: 'USDC' },
  { date: '2025-07-21', volume: 2312000, trades: 153, avgSize: 15111, topToken: 'ETH' }
];

const topTokens = [
  { symbol: 'ETH', volume: 6163200, percentage: 42.5, trades: 245 },
  { symbol: 'USDC', volume: 4044600, percentage: 27.8, trades: 189 },
  { symbol: 'DAI', volume: 2310000, percentage: 15.9, trades: 134 },
  { symbol: 'USDT', volume: 1540400, percentage: 10.6, trades: 98 },
  { symbol: 'WBTC', volume: 462240, percentage: 3.2, trades: 45 }
];

export default function VolumeAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [volumeData] = useState<VolumeData[]>(mockVolumeData);

  const totalVolume = volumeData.reduce((sum, day) => sum + day.volume, 0);
  const totalTrades = volumeData.reduce((sum, day) => sum + day.trades, 0);
  const avgTradeSize = totalVolume / totalTrades;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <nav className="text-sm breadcrumbs mb-4">
              <ul>
                <li><Link href="/fusion/ethereum/analytics" className="text-blue-600 hover:text-blue-800">Analytics</Link></li>
                <li className="text-gray-500">Volume Analytics</li>
              </ul>
            </nav>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Volume Analytics</h1>
            <p className="text-gray-600">Fusion trading volume statistics on Ethereum network</p>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: '7d', label: '7 Days' },
              { key: '30d', label: '30 Days' },
              { key: '90d', label: '90 Days' }
            ].map(range => (
              <button
                key={range.key}
                onClick={() => setTimeRange(range.key as any)}
                className={`py-2 px-4 rounded-md font-medium transition-colors ${
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

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-blue-700">Total Volume</div>
              <div className="text-blue-500">📊</div>
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {formatCurrency(totalVolume)}
            </div>
            <div className="text-sm text-blue-600">+12.5% vs last week</div>
          </div>
          
          <div className="bg-green-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-green-700">Total Trades</div>
              <div className="text-green-500">🔄</div>
            </div>
            <div className="text-2xl font-bold text-green-600 mb-1">
              {formatNumber(totalTrades)}
            </div>
            <div className="text-sm text-green-600">+8.3% vs last week</div>
          </div>
          
          <div className="bg-purple-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-purple-700">Average Trade Size</div>
              <div className="text-purple-500">💰</div>
            </div>
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {formatCurrency(avgTradeSize)}
            </div>
            <div className="text-sm text-purple-600">+3.7% vs last week</div>
          </div>
          
          <div className="bg-orange-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-orange-700">Peak Daily Volume</div>
              <div className="text-orange-500">📈</div>
            </div>
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {formatCurrency(Math.max(...volumeData.map(d => d.volume)))}
            </div>
            <div className="text-sm text-orange-600">July 25th</div>
          </div>
        </div>

        {/* Volume Chart */}
        <div className="bg-gray-50 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Volume Trend</h3>
          <div className="space-y-3">
            {volumeData.map((day, index) => {
              const maxVolume = Math.max(...volumeData.map(d => d.volume));
              const percentage = (day.volume / maxVolume) * 100;
              
              return (
                <div key={day.date} className="flex items-center space-x-4">
                  <div className="w-20 text-sm text-gray-600 font-mono">
                    {day.date.slice(5)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-full bg-gray-200 rounded-full h-4 relative">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                          {formatCurrency(day.volume)}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{day.trades} trades</span>
                      <span>Avg {formatCurrency(day.avgSize)}</span>
                      <span>Top token: {day.topToken}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Tokens by Volume */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Trading Tokens</h3>
            <div className="space-y-3">
              {topTokens.map((token, index) => (
                <div key={token.symbol} className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-semibold text-gray-900">{token.symbol}</div>
                      <div className="text-sm text-gray-600">{token.percentage}%</div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${token.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{formatCurrency(token.volume)}</span>
                      <span>{token.trades} trades</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Volume Distribution */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Volume Distribution</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-gray-700">Small trades (&lt; $1K)</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full w-3/4"></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">75%</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-gray-700">Medium trades ($1K - $10K)</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full w-1/5"></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">20%</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-gray-700">Large trades (&gt; $10K)</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full w-1/20"></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">5%</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-700 mb-2">💡 Insights</div>
              <div className="text-sm text-blue-800">
                Small trades dominate, indicating Fusion protocol popularity among retail users.
                Growing average trade size shows increasing user confidence.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}