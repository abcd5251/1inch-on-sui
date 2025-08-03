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

const mockActiveOrders: Order[] = [
  {
    id: '0x2345...6789',
    type: 'limit',
    status: 'pending',
    fromToken: 'USDC',
    toToken: 'ETH',
    fromAmount: '3466.0',
    toAmount: '1.0',
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

export default function ActiveOrdersPage() {
  const [orders] = useState<Order[]>(mockActiveOrders);

  const getStatusColor = (status: Order['status']) => {
    return 'text-blue-600 bg-blue-100';
  };

  const getStatusText = (status: Order['status']) => {
    return 'Active';
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <nav className="text-sm breadcrumbs mb-4">
              <ul>
                <li><Link href="/fusion/ethereum/orders" className="text-blue-600 hover:text-blue-800">Order Management</Link></li>
                <li className="text-gray-500">Active Orders</li>
              </ul>
            </nav>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Active Orders</h1>
            <p className="text-gray-600">Currently executing trade orders</p>
          </div>
          <Link 
            href="/fusion/ethereum/swap"
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Create New Order
          </Link>
        </div>

        {/* Active Orders List */}
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⏳</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Orders</h3>
              <p className="text-gray-600 mb-6">There are no orders currently being executed</p>
              <Link 
                href="/fusion/ethereum/swap"
                className="inline-flex items-center bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Create New Order
              </Link>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-blue-50 border border-blue-200 rounded-xl p-6 hover:bg-blue-100 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Order ID: {order.id}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm text-gray-500">
                      {order.type === 'swap' ? 'Market Swap' : 'Limit Order'}
                    </div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
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
                    <div className="text-sm text-gray-500 mb-1">Created</div>
                    <div className="font-semibold text-gray-900">
                      {order.createdAt}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Expires</div>
                    <div className="font-semibold text-gray-900 text-orange-600">
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
                    <Link 
                      href={`/fusion/ethereum/orders/${order.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
View Details
                    </Link>
                    <button className="text-gray-600 hover:text-gray-800 text-sm font-medium">
Edit Order
                    </button>
                  </div>
                  <button className="text-red-600 hover:text-red-800 text-sm font-medium">
Cancel Order
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Active Orders Summary */}
        {orders.length > 0 && (
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {orders.length}
              </div>
              <div className="text-sm text-blue-700">Total Active Orders</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-orange-600 mb-2">
                {orders.filter(o => o.fillPercentage > 0).length}
              </div>
              <div className="text-sm text-orange-700">Partially Filled Orders</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {Math.round(orders.reduce((sum, o) => sum + o.fillPercentage, 0) / orders.length)}%
              </div>
              <div className="text-sm text-purple-700">Average Fill Rate</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}