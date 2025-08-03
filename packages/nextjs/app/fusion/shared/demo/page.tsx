'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DemoStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
}

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
    currentPrice: 1850,
    startPrice: 1900,
    endPrice: 1800,
    timeRemaining: 0,
    totalDuration: 180, // 3 minutes
    resolvers: 0
  });

  const [orderBook, setOrderBook] = useState({
    bids: [
      { price: 1849, amount: 2.5, total: 4622.5 },
      { price: 1848, amount: 1.8, total: 3326.4 },
      { price: 1847, amount: 3.2, total: 5910.4 },
      { price: 1846, amount: 0.9, total: 1661.4 },
      { price: 1845, amount: 2.1, total: 3874.5 }
    ],
    asks: [
      { price: 1851, amount: 1.5, total: 2776.5 },
      { price: 1852, amount: 2.3, total: 4259.6 },
      { price: 1853, amount: 1.7, total: 3150.1 },
      { price: 1854, amount: 2.8, total: 5191.2 },
      { price: 1855, amount: 1.2, total: 2226.0 }
    ]
  });

  // 模拟荷兰式拍卖
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
      title: '荷兰式拍卖演示',
      description: '观看实时的荷兰式拍卖价格衰减过程',
      component: (
        <div className="space-y-6">
          {/* 拍卖控制 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">拍卖控制</h3>
              <div className="flex space-x-3">
                <button
                  onClick={startAuction}
                  disabled={auctionState.isActive}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  开始拍卖
                </button>
                <button
                  onClick={stopAuction}
                  disabled={!auctionState.isActive}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  停止拍卖
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  ${auctionState.currentPrice}
                </div>
                <div className="text-sm text-gray-500">当前价格</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.floor(auctionState.timeRemaining / 60)}:{(auctionState.timeRemaining % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-sm text-gray-500">剩余时间</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {auctionState.resolvers}
                </div>
                <div className="text-sm text-gray-500">活跃解析器</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  auctionState.isActive ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {auctionState.isActive ? '进行中' : '已停止'}
                </div>
                <div className="text-sm text-gray-500">状态</div>
              </div>
            </div>
          </div>

          {/* 价格图表 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">价格衰减曲线</h3>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 p-4">
                <svg className="w-full h-full">
                  {/* 价格线 */}
                  <line
                    x1="10%"
                    y1="20%"
                    x2="90%"
                    y2="80%"
                    stroke="#3B82F6"
                    strokeWidth="3"
                    strokeDasharray={auctionState.isActive ? "0" : "5,5"}
                  />
                  
                  {/* 当前价格点 */}
                  {auctionState.isActive && (
                    <circle
                      cx={`${10 + (80 * (auctionState.totalDuration - auctionState.timeRemaining) / auctionState.totalDuration)}%`}
                      cy={`${20 + (60 * (auctionState.startPrice - auctionState.currentPrice) / (auctionState.startPrice - auctionState.endPrice))}%`}
                      r="6"
                      fill="#EF4444"
                      className="animate-pulse"
                    />
                  )}
                  
                  {/* 标签 */}
                  <text x="10%" y="15%" className="text-xs fill-gray-600">起始价格: ${auctionState.startPrice}</text>
                  <text x="90%" y="85%" className="text-xs fill-gray-600 text-end">结束价格: ${auctionState.endPrice}</text>
                </svg>
              </div>
              {!auctionState.isActive && (
                <div className="text-gray-500 text-center">
                  <div className="text-4xl mb-2">📈</div>
                  <div>点击"开始拍卖"查看实时价格变化</div>
                </div>
              )}
            </div>
          </div>

          {/* 解析器活动 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">解析器活动</h3>
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      i < auctionState.resolvers ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                    }`}></div>
                    <span className="font-medium">解析器 #{i + 1}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {i < auctionState.resolvers ? '监控中' : '离线'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    orderbook: {
      title: '订单簿可视化',
      description: '查看实时的买卖订单深度',
      component: (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">ETH/USDC 订单簿</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 买单 */}
            <div>
              <h4 className="font-medium text-green-600 mb-3">买单 (Bids)</h4>
              <div className="space-y-1">
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 font-medium pb-2 border-b">
                  <div>价格 (USDC)</div>
                  <div className="text-right">数量 (ETH)</div>
                  <div className="text-right">总额 (USDC)</div>
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

            {/* 卖单 */}
            <div>
              <h4 className="font-medium text-red-600 mb-3">卖单 (Asks)</h4>
              <div className="space-y-1">
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 font-medium pb-2 border-b">
                  <div>价格 (USDC)</div>
                  <div className="text-right">数量 (ETH)</div>
                  <div className="text-right">总额 (USDC)</div>
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

          {/* 价差信息 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-green-600">${orderBook.bids[0].price}</div>
                <div className="text-xs text-gray-500">最高买价</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">
                  ${(orderBook.asks[0].price - orderBook.bids[0].price).toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">价差</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-600">${orderBook.asks[0].price}</div>
                <div className="text-xs text-gray-500">最低卖价</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    network: {
      title: '网络状态监控',
      description: '实时监控 Ethereum 和 Sui 网络状态',
      component: (
        <div className="space-y-6">
          {/* Ethereum 网络 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <span className="w-4 h-4 bg-blue-500 rounded-full"></span>
                <span>Ethereum 主网</span>
              </h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600">正常</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">15.2</div>
                <div className="text-sm text-gray-600">TPS</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">12.1s</div>
                <div className="text-sm text-gray-600">区块时间</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-xl font-bold text-yellow-600">25 gwei</div>
                <div className="text-sm text-gray-600">Gas 价格</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-600">18,542,891</div>
                <div className="text-sm text-gray-600">最新区块</div>
              </div>
            </div>
          </div>

          {/* Sui 网络 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <span className="w-4 h-4 bg-cyan-500 rounded-full"></span>
                <span>Sui 测试网</span>
              </h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600">正常</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-cyan-50 rounded-lg">
                <div className="text-xl font-bold text-cyan-600">2,847</div>
                <div className="text-sm text-gray-600">TPS</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">2.3s</div>
                <div className="text-sm text-gray-600">确认时间</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-xl font-bold text-yellow-600">0.001 SUI</div>
                <div className="text-sm text-gray-600">交易费用</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-600">425</div>
                <div className="text-sm text-gray-600">当前 Epoch</div>
              </div>
            </div>
          </div>

          {/* 网络比较 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">网络性能对比</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4">指标</th>
                    <th className="text-center py-3 px-4">Ethereum</th>
                    <th className="text-center py-3 px-4">Sui</th>
                    <th className="text-center py-3 px-4">优势</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-3 px-4 font-medium">交易速度</td>
                    <td className="text-center py-3 px-4">15.2 TPS</td>
                    <td className="text-center py-3 px-4">2,847 TPS</td>
                    <td className="text-center py-3 px-4">
                      <span className="text-cyan-600 font-medium">Sui</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">确认时间</td>
                    <td className="text-center py-3 px-4">12.1s</td>
                    <td className="text-center py-3 px-4">2.3s</td>
                    <td className="text-center py-3 px-4">
                      <span className="text-cyan-600 font-medium">Sui</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">交易费用</td>
                    <td className="text-center py-3 px-4">$0.50-5.00</td>
                    <td className="text-center py-3 px-4">$0.001</td>
                    <td className="text-center py-3 px-4">
                      <span className="text-cyan-600 font-medium">Sui</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">生态成熟度</td>
                    <td className="text-center py-3 px-4">成熟</td>
                    <td className="text-center py-3 px-4">发展中</td>
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
    { id: 'auction', title: '荷兰式拍卖', icon: '🎯' },
    { id: 'orderbook', title: '订单簿', icon: '📊' },
    { id: 'network', title: '网络监控', icon: '🌐' }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">功能演示</h1>
        <p className="text-gray-600">体验 1inch Fusion 的核心功能和特性</p>
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
            <h3 className="font-semibold text-gray-900">开始交易</h3>
          </div>
          <p className="text-gray-600 text-sm">体验真实的代币交换功能</p>
        </Link>

        <Link 
          href="/fusion/shared/help"
          className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <span className="text-xl">📚</span>
            </div>
            <h3 className="font-semibold text-gray-900">学习指南</h3>
          </div>
          <p className="text-gray-600 text-sm">查看详细的使用文档</p>
        </Link>

        <Link 
          href="/fusion/shared/settings"
          className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              <span className="text-xl">⚙️</span>
            </div>
            <h3 className="font-semibold text-gray-900">个性化设置</h3>
          </div>
          <p className="text-gray-600 text-sm">自定义您的交易体验</p>
        </Link>
      </div>

      {/* Demo Notice */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <div className="text-yellow-600 text-xl">⚠️</div>
          <div>
            <h3 className="font-semibold text-yellow-800 mb-2">演示环境说明</h3>
            <div className="text-yellow-700 text-sm space-y-1">
              <p>• 这是一个功能演示环境，所有数据均为模拟数据</p>
              <p>• 请勿使用真实资金或主网私钥进行操作</p>
              <p>• 实际交易性能可能因网络条件而异</p>
              <p>• 如需真实交易，请访问生产环境</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}