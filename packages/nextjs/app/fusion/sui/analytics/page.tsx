'use client';

import { useState } from 'react';
import Link from 'next/link';

interface SuiAnalyticsData {
  totalVolume: string;
  totalAuctions: number;
  avgExecutionTime: string;
  successRate: number;
  topTokens: Array<{
    symbol: string;
    volume: string;
    change24h: number;
    auctionCount: number;
  }>;
  recentAuctions: Array<{
    type: 'auction_started' | 'auction_filled' | 'instant_swap';
    amount: string;
    token: string;
    time: string;
    txHash: string;
    resolverCount?: number;
  }>;
  auctionStats: {
    avgDuration: string;
    avgResolvers: number;
    priceImprovement: string;
    mevProtection: number;
  };
}

const mockSuiAnalyticsData: SuiAnalyticsData = {
  totalVolume: '$1,850,000',
  totalAuctions: 892,
  avgExecutionTime: '2.3s',
  successRate: 99.2,
  topTokens: [
    { symbol: 'SUI', volume: '$650,000', change24h: 18.5, auctionCount: 245 },
    { symbol: 'USDC', volume: '$520,000', change24h: 8.2, auctionCount: 198 },
    { symbol: 'WETH', volume: '$380,000', change24h: -2.1, auctionCount: 156 },
    { symbol: 'USDT', volume: '$300,000', change24h: 12.7, auctionCount: 134 }
  ],
  recentAuctions: [
    {
      type: 'auction_filled',
      amount: '100',
      token: 'SUI',
      time: '2025-07-27 12:29:00',
      txHash: '0xabc123...def456',
      resolverCount: 8
    },
    {
      type: 'auction_started',
      amount: '50',
      token: 'USDC',
      time: '2025-07-27 12:27:00',
      txHash: '0xdef456...ghi789',
      resolverCount: 5
    },
    {
      type: 'instant_swap',
      amount: '0.25',
      token: 'WETH',
      time: '2025-07-27 12:24:00',
      txHash: '0xghi789...jkl012'
    }
  ],
  auctionStats: {
    avgDuration: '4.2分钟',
    avgResolvers: 6.8,
    priceImprovement: '1.8%',
    mevProtection: 99.7
  }
};

export default function SuiAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('24h');
  const [data] = useState<SuiAnalyticsData>(mockSuiAnalyticsData);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'auction_started': return '🎯';
      case 'auction_filled': return '✅';
      case 'instant_swap': return '⚡';
      default: return '📊';
    }
  };

  const getActivityText = (type: string) => {
    switch (type) {
      case 'auction_started': return '拍卖开始';
      case 'auction_filled': return '拍卖完成';
      case 'instant_swap': return '即时交换';
      default: return '未知活动';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sui 分析</h1>
        <p className="text-gray-600">实时监控 Fusion 在 Sui 网络上的荷兰式拍卖表现</p>
      </div>

      {/* Time Range Selector */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">时间范围</h2>
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: '24h', label: '24小时' },
              { key: '7d', label: '7天' },
              { key: '30d', label: '30天' },
              { key: '90d', label: '90天' }
            ].map(range => (
              <button
                key={range.key}
                onClick={() => setTimeRange(range.key as any)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  timeRange === range.key
                    ? 'bg-white text-orange-600 shadow-sm'
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
              +15.2%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{data.totalVolume}</div>
          <div className="text-sm text-gray-600">总交易量</div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl">🎯</div>
            <div className="text-sm text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
              +11.7%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{data.totalAuctions.toLocaleString()}</div>
          <div className="text-sm text-gray-600">总拍卖数</div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl">⚡</div>
            <div className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
              -8.5%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{data.avgExecutionTime}</div>
          <div className="text-sm text-gray-600">平均执行时间</div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl">✅</div>
            <div className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
              +0.5%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{data.successRate}%</div>
          <div className="text-sm text-gray-600">成功率</div>
        </div>
      </div>

      {/* Auction-specific Stats */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl shadow-lg p-6 mb-8 border border-orange-200">
        <h2 className="text-xl font-semibold text-orange-900 mb-6">荷兰式拍卖统计</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">{data.auctionStats.avgDuration}</div>
            <div className="text-sm text-orange-700">平均拍卖时长</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">{data.auctionStats.avgResolvers}</div>
            <div className="text-sm text-orange-700">平均解析器数量</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">{data.auctionStats.priceImprovement}</div>
            <div className="text-sm text-orange-700">平均价格改善</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">{data.auctionStats.mevProtection}%</div>
            <div className="text-sm text-orange-700">MEV 保护率</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Top Tokens */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">热门代币</h2>
            <Link 
              href="/fusion/sui/tokens"
              className="text-orange-600 hover:text-orange-800 text-sm font-medium"
            >
              查看全部 →
            </Link>
          </div>
          <div className="space-y-4">
            {data.topTokens.map((token, index) => (
              <div key={token.symbol} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-sm font-bold text-orange-600">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{token.symbol}</div>
                    <div className="text-sm text-gray-600">{token.volume} • {token.auctionCount} 拍卖</div>
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
            <h2 className="text-xl font-semibold text-gray-900">最近活动</h2>
            <Link 
              href="/fusion/sui/orders"
              className="text-orange-600 hover:text-orange-800 text-sm font-medium"
            >
              查看全部 →
            </Link>
          </div>
          <div className="space-y-4">
            {data.recentAuctions.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                  <div>
                    <div className="font-semibold text-gray-900">{getActivityText(activity.type)}</div>
                    <div className="text-sm text-gray-600">
                      {activity.amount} {activity.token}
                      {activity.resolverCount && (
                        <span className="ml-2 text-orange-600">• {activity.resolverCount} 解析器</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">{activity.time}</div>
                  <a 
                    href={`https://suiexplorer.com/txblock/${activity.txHash}?network=testnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-orange-600 hover:text-orange-800"
                  >
                    查看交易 ↗
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
          <h2 className="text-xl font-semibold text-gray-900 mb-6">拍卖价格趋势</h2>
          <div className="h-64 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg flex items-center justify-center border border-orange-200">
            <div className="text-center">
              <div className="text-4xl mb-2">📈</div>
              <div className="text-orange-700 font-medium">荷兰式拍卖价格图表</div>
              <div className="text-sm text-orange-600 mt-1">即将推出</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">解析器竞争分析</h2>
          <div className="h-64 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center border border-blue-200">
            <div className="text-center">
              <div className="text-4xl mb-2">🏆</div>
              <div className="text-blue-700 font-medium">解析器表现图表</div>
              <div className="text-sm text-blue-600 mt-1">即将推出</div>
            </div>
          </div>
        </div>
      </div>

      {/* Network Status */}
      <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Sui 网络状态</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl mb-2">🟢</div>
            <div className="font-semibold text-gray-900">网络状态</div>
            <div className="text-sm text-green-600">正常运行</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">⚡</div>
            <div className="font-semibold text-gray-900">当前 TPS</div>
            <div className="text-sm text-gray-600">2,847</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">🕐</div>
            <div className="font-semibold text-gray-900">当前 Epoch</div>
            <div className="text-sm text-gray-600">#245</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">🎯</div>
            <div className="font-semibold text-gray-900">活跃拍卖</div>
            <div className="text-sm text-orange-600">23 个</div>
          </div>
        </div>
      </div>

      {/* Demo Environment Warning */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <h3 className="font-semibold text-yellow-800 mb-2">演示环境提醒</h3>
            <p className="text-yellow-700 text-sm">
              当前数据来自 Sui 测试网环境，仅用于演示目的。请勿使用真实私钥或主网资金进行测试。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}