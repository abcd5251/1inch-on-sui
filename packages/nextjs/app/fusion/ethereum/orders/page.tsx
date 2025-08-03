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
  txHash?: string;
  fillPercentage: number;
}

const mockOrders: Order[] = [
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
    txHash: '0xabcd...efgh',
    fillPercentage: 100
  },
  {
    id: '0x2345...6789',
    type: 'limit',
    status: 'pending',
    fromToken: 'USDC',
    toToken: 'ETH',
    fromAmount: '3812.6',
    toAmount: '1.1',
    createdAt: '2025-07-27 11:00:00',
    expiresAt: '2025-07-27 12:00:00',
    fillPercentage: 0
  },
  {
    id: '0x3456...7890',
    type: 'swap',
    status: 'pending',
    fromToken: 'DAI',
    toToken: 'USDC',
    fromAmount: '500.0',
    toAmount: '499.5',
    createdAt: '2025-07-27 11:15:00',
    expiresAt: '2025-07-27 11:35:00',
    fillPercentage: 65
  }
];

export default function EthereumOrdersPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'history'>('all');
  const [orders] = useState<Order[]>(mockOrders);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'filled': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-blue-600 bg-blue-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'expired': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'filled': return 'Filled';
      case 'pending': return 'Pending';
      case 'cancelled': return 'Cancelled';
      case 'expired': return 'Expired';
      default: return 'Unknown';
    }
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ethereum Orders</h1>
            <p className="text-gray-600">Manage your trading orders</p>
          </div>
          <Link 
            href="/fusion/ethereum/swap"
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Create New Order
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-8">
          {[
            { key: 'all', label: 'All Orders' },
            { key: 'active', label: 'Active Orders' },
            { key: 'history', label: 'Order History' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Orders</h3>
              <p className="text-gray-600 mb-6">You don't have any trading orders yet</p>
              <Link 
                href="/fusion/ethereum/swap"
                className="inline-flex items-center bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Create First Order
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
                    <div className="text-sm text-gray-500">
                      Order ID: {order.id}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {order.type === 'swap' ? 'Market Swap' : 'Limit Order'}
                  </div>
                </div>

                <div className="grid md:grid-cols-4 gap-6">
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
                    <div className="text-sm text-gray-500 mb-1">Created At</div>
                    <div className="font-semibold text-gray-900">
                      {order.createdAt}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Expires At</div>
                    <div className="font-semibold text-gray-900">
                      {order.expiresAt}
                    </div>
                  </div>
                </div>

                {order.fillPercentage > 0 && order.fillPercentage < 100 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Fill Progress</span>
                      <span>{order.fillPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
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
                  {order.status === 'pending' && (
                    <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                      Cancel Order
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
            <div className="bg-blue-50 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {orders.filter(o => o.status === 'pending').length}
              </div>
              <div className="text-sm text-blue-700">Active Orders</div>
            </div>
            <div className="bg-green-50 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {orders.filter(o => o.status === 'filled').length}
              </div>
              <div className="text-sm text-green-700">Completed</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {orders.length}
              </div>
              <div className="text-sm text-purple-700">Total Orders</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-orange-600 mb-2">
                {Math.round(orders.filter(o => o.status === 'filled').length / orders.length * 100)}%
              </div>
              <div className="text-sm text-orange-700">Success Rate</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}