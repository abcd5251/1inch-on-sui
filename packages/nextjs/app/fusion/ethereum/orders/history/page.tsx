'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Order {
  id: string;
  type: 'swap' | 'limit';
  status: 'pending' | 'filled' | 'cancelled' | 'expired';
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  createdAt: string;
  expiresAt: string;
  completedAt?: string;
  txHash?: string;
  fillPercentage: number;
  totalValue?: string;
}

const mockHistoryOrders: Order[] = [
  {
    id: '0x1234...5678',
    type: 'swap',
    status: 'filled',
    fromToken: 'ETH',
    toToken: 'USDC',
    fromAmount: '1.0',
    toAmount: '3466.0',
    createdAt: '2025-07-27 10:30:00',
    expiresAt: '2025-07-27 10:50:00',
    completedAt: '2025-07-27 10:35:00',
    txHash: '0xabcd...efgh',
    fillPercentage: 100,
    totalValue: '3466.0 USDC'
  },
  {
    id: '0x4567...8901',
    type: 'limit',
    status: 'expired',
    fromToken: 'DAI',
    toToken: 'ETH',
    fromAmount: '6932.0',
    toAmount: '1.2',
    createdAt: '2025-07-26 14:00:00',
    expiresAt: '2025-07-26 18:00:00',
    fillPercentage: 0,
    totalValue: '0 ETH'
  },
  {
    id: '0x5678...9012',
    type: 'swap',
    status: 'cancelled',
    fromToken: 'USDT',
    toToken: 'ETH',
    fromAmount: '1500.0',
    toAmount: '0.8',
    createdAt: '2025-07-25 09:15:00',
    expiresAt: '2025-07-25 10:15:00',
    fillPercentage: 45,
    totalValue: '675.0 USDT'
  }
];

export default function HistoryOrdersPage() {
  const [orders] = useState<Order[]>(mockHistoryOrders);
  const [filter, setFilter] = useState<'all' | 'filled' | 'cancelled' | 'expired'>('all');

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'filled': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'expired': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'filled': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'expired': return 'Expired';
      default: return 'Unknown';
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <nav className="text-sm breadcrumbs mb-4">
              <ul>
                <li><Link href="/fusion/ethereum/orders" className="text-blue-600 hover:text-blue-800">Order Management</Link></li>
                <li className="text-gray-500">Order History</li>
              </ul>
            </nav>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Order History</h1>
            <p className="text-gray-600">View completed, cancelled, and expired orders</p>
          </div>
          <Link 
            href="/fusion/ethereum/swap"
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Create New Order
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-8">
          {[
            { key: 'all', label: 'All' },
            { key: 'filled', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled' },
            { key: 'expired', label: 'Expired' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label} ({orders.filter(o => tab.key === 'all' || o.status === tab.key).length})
            </button>
          ))}
        </div>

        {/* History Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📜</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Order History</h3>
              <p className="text-gray-600 mb-6">No historical orders found matching the criteria</p>
              <Link 
                href="/fusion/ethereum/swap"
                className="inline-flex items-center bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Create New Order
              </Link>
            </div>
          ) : (
            filteredOrders.map(order => (
              <div key={order.id} className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors border-l-4 border-l-gray-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Order ID: {order.id}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-500">
                      {order.type === 'swap' ? 'Market Swap' : 'Limit Order'}
                    </div>
                    {order.totalValue && (
                      <div className="text-sm font-medium text-gray-700">
                        Total Value: {order.totalValue}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-5 gap-6">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Send</div>
                    <div className="font-semibold text-gray-900">
                      {order.fromAmount} {order.fromToken}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Receive</div>
                    <div className="font-semibold text-gray-900">
                      {order.toAmount} {order.toToken}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Created</div>
                    <div className="font-semibold text-gray-900">
                      {order.createdAt}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">
                      {order.status === 'filled' ? 'Completed' : 'Expired'}
                    </div>
                    <div className="font-semibold text-gray-900">
                      {order.completedAt || order.expiresAt}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Fill Rate</div>
                    <div className={`font-semibold ${
                      order.fillPercentage === 100 ? 'text-green-600' : 
                      order.fillPercentage > 0 ? 'text-orange-600' : 'text-gray-600'
                    }`}>
                      {order.fillPercentage}%
                    </div>
                  </div>
                </div>

                {order.fillPercentage > 0 && order.fillPercentage < 100 && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          order.fillPercentage === 100 ? 'bg-green-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${order.fillPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center mt-4">
                  <div className="flex space-x-4">
                    {order.txHash && (
                      <a 
                        href={`https://etherscan.io/tx/${order.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Transaction ↗
                      </a>
                    )}
                    <Link 
                      href={`/fusion/ethereum/orders/${order.id}`}
                      className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                    >
View Details
                    </Link>
                  </div>
                  {order.status === 'filled' && (
                    <button className="text-green-600 hover:text-green-800 text-sm font-medium">
Repeat Order
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* History Summary */}
        {filteredOrders.length > 0 && (
          <div className="mt-8 grid md:grid-cols-4 gap-6">
            <div className="bg-green-50 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {orders.filter(o => o.status === 'filled').length}
              </div>
              <div className="text-sm text-green-700">Successfully Completed</div>
            </div>
            <div className="bg-red-50 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-red-600 mb-2">
                {orders.filter(o => o.status === 'cancelled').length}
              </div>
              <div className="text-sm text-red-700">User Cancelled</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-gray-600 mb-2">
                {orders.filter(o => o.status === 'expired').length}
              </div>
              <div className="text-sm text-gray-700">Expired</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {Math.round(orders.filter(o => o.status === 'filled').length / orders.length * 100)}%
              </div>
              <div className="text-sm text-blue-700">Success Rate</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}