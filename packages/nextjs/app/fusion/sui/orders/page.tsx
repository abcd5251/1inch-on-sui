'use client';

import { useState } from 'react';
import Link from 'next/link';

interface SuiOrder {
  id: string;
  type: 'auction' | 'instant';
  status: 'pending' | 'filled' | 'cancelled' | 'expired';
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  createdAt: string;
  expiresAt: string;
  txHash?: string;
  fillPercentage: number;
  auctionDetails?: {
    startPrice: string;
    currentPrice: string;
    endPrice: string;
    timeRemaining: number;
    resolverCount: number;
  };
}

const mockSuiOrders: SuiOrder[] = [
  {
    id: '0xabc123...def456',
    type: 'auction',
    status: 'pending',
    fromToken: 'SUI',
    toToken: 'USDC',
    fromAmount: '100.0',
    toAmount: '50.0',
    createdAt: '2025-07-27 11:30:00',
    expiresAt: '2025-07-27 11:35:00',
    fillPercentage: 0,
    auctionDetails: {
      startPrice: '52.5',
      currentPrice: '51.2',
      endPrice: '47.5',
      timeRemaining: 180,
      resolverCount: 5
    }
  },
  {
    id: '0xdef456...ghi789',
    type: 'instant',
    status: 'filled',
    fromToken: 'USDC',
    toToken: 'SUI',
    fromAmount: '25.0',
    toAmount: '50.0',
    createdAt: '2025-07-27 10:45:00',
    expiresAt: '2025-07-27 10:48:00',
    txHash: '0x789abc...012def',
    fillPercentage: 100
  },
  {
    id: '0xghi789...jkl012',
    type: 'auction',
    status: 'filled',
    fromToken: 'SUI',
    toToken: 'WETH',
    fromAmount: '200.0',
    toAmount: '0.05',
    createdAt: '2025-07-27 09:30:00',
    expiresAt: '2025-07-27 09:35:00',
    txHash: '0x012def...345ghi',
    fillPercentage: 100,
    auctionDetails: {
      startPrice: '0.0525',
      currentPrice: '0.05',
      endPrice: '0.0475',
      timeRemaining: 0,
      resolverCount: 8
    }
  }
];

export default function SuiOrdersPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'history'>('all');
  const [orders] = useState<SuiOrder[]>(mockSuiOrders);

  const getStatusColor = (status: SuiOrder['status']) => {
    switch (status) {
      case 'filled': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-orange-600 bg-orange-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'expired': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: SuiOrder['status']) => {
    switch (status) {
      case 'filled': return '已完成';
      case 'pending': return '拍卖中';
      case 'cancelled': return '已取消';
      case 'expired': return '已过期';
      default: return '未知';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'active') return order.status === 'pending';
    if (activeTab === 'history') return order.status !== 'pending';
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sui 订单</h1>
            <p className="text-gray-600">管理您的荷兰式拍卖和即时交易订单</p>
          </div>
          <Link 
            href="/fusion/sui/swap"
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            创建新订单
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-8">
          {[
            { key: 'all', label: '全部订单' },
            { key: 'active', label: '活跃拍卖' },
            { key: 'history', label: '历史订单' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-6">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">暂无订单</h3>
              <p className="text-gray-600 mb-6">您还没有任何拍卖订单</p>
              <Link 
                href="/fusion/sui/swap"
                className="inline-flex items-center bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                创建第一个订单
              </Link>
            </div>
          ) : (
            filteredOrders.map(order => (
              <div key={order.id} className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">
                        {order.type === 'auction' ? '🎯' : '⚡'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {order.type === 'auction' ? '荷兰式拍卖' : '即时交易'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      订单 ID: {order.id}
                    </div>
                  </div>
                  {order.auctionDetails && order.status === 'pending' && (
                    <div className="text-right">
                      <div className="text-sm text-gray-500">剩余时间</div>
                      <div className="text-lg font-bold text-orange-600">
                        {formatTime(order.auctionDetails.timeRemaining)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-4 gap-6 mb-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">发送</div>
                    <div className="font-semibold text-gray-900">
                      {order.fromAmount} {order.fromToken}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">接收</div>
                    <div className="font-semibold text-gray-900">
                      {order.toAmount} {order.toToken}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">创建时间</div>
                    <div className="font-semibold text-gray-900">
                      {order.createdAt}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">过期时间</div>
                    <div className="font-semibold text-gray-900">
                      {order.expiresAt}
                    </div>
                  </div>
                </div>

                {/* Auction Details */}
                {order.auctionDetails && (
                  <div className="bg-orange-50 rounded-lg p-4 mb-4 border border-orange-200">
                    <h4 className="font-medium text-orange-900 mb-3">拍卖详情</h4>
                    <div className="grid md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-orange-700 mb-1">起始价格</div>
                        <div className="font-semibold text-orange-900">
                          {order.auctionDetails.startPrice} {order.toToken}
                        </div>
                      </div>
                      <div>
                        <div className="text-orange-700 mb-1">当前价格</div>
                        <div className="font-semibold text-orange-900">
                          {order.auctionDetails.currentPrice} {order.toToken}
                        </div>
                      </div>
                      <div>
                        <div className="text-orange-700 mb-1">结束价格</div>
                        <div className="font-semibold text-orange-900">
                          {order.auctionDetails.endPrice} {order.toToken}
                        </div>
                      </div>
                      <div>
                        <div className="text-orange-700 mb-1">竞争解析器</div>
                        <div className="font-semibold text-orange-900">
                          {order.auctionDetails.resolverCount} 个
                        </div>
                      </div>
                    </div>
                    
                    {order.status === 'pending' && (
                      <div className="mt-3">
                        <div className="flex justify-between text-sm text-orange-600 mb-2">
                          <span>价格衰减进度</span>
                          <span>{Math.round((1 - order.auctionDetails.timeRemaining / 300) * 100)}%</span>
                        </div>
                        <div className="w-full bg-orange-200 rounded-full h-2">
                          <div 
                            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.round((1 - order.auctionDetails.timeRemaining / 300) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {order.fillPercentage > 0 && order.fillPercentage < 100 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>填充进度</span>
                      <span>{order.fillPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${order.fillPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="flex space-x-4">
                    {order.txHash && (
                      <a 
                        href={`https://suiexplorer.com/txblock/${order.txHash}?network=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                      >
                        查看交易 ↗
                      </a>
                    )}
                    <Link 
                      href={`/fusion/sui/orders/${order.id}`}
                      className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                    >
                      查看详情
                    </Link>
                  </div>
                  {order.status === 'pending' && (
                    <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                      取消订单
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Stats */}
        {filteredOrders.length > 0 && (
          <div className="mt-8 grid md:grid-cols-4 gap-6">
            <div className="bg-orange-50 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-orange-600 mb-2">
                {orders.filter(o => o.status === 'pending').length}
              </div>
              <div className="text-sm text-orange-700">活跃拍卖</div>
            </div>
            <div className="bg-green-50 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {orders.filter(o => o.status === 'filled').length}
              </div>
              <div className="text-sm text-green-700">已完成</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {orders.filter(o => o.type === 'auction').length}
              </div>
              <div className="text-sm text-blue-700">拍卖订单</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                2.3s
              </div>
              <div className="text-sm text-purple-700">平均执行时间</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}