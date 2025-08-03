'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ResolverStats {
  status: 'online' | 'offline' | 'maintenance';
  totalResolved: number;
  successRate: number;
  avgResolutionTime: number;
  activeResolvers: number;
  pendingOrders: number;
}

interface ResolverActivity {
  id: string;
  orderId: string;
  type: 'resolve' | 'settle' | 'refund';
  status: 'success' | 'pending' | 'failed';
  timestamp: string;
  gasUsed?: number;
  resolver: string;
  amount: string;
  token: string;
}

const mockResolverStats: ResolverStats = {
  status: 'online',
  totalResolved: 1247,
  successRate: 98.5,
  avgResolutionTime: 45,
  activeResolvers: 8,
  pendingOrders: 23
};

const mockResolverActivity: ResolverActivity[] = [
  {
    id: '0xres1',
    orderId: '0x1234...5678',
    type: 'resolve',
    status: 'success',
    timestamp: '2025-07-27 12:30:45',
    gasUsed: 150000,
    resolver: '0xResolver1',
    amount: '1.0',
    token: 'ETH'
  },
  {
    id: '0xres2',
    orderId: '0x2345...6789',
    type: 'settle',
    status: 'pending',
    timestamp: '2025-07-27 12:28:12',
    resolver: '0xResolver2',
    amount: '6932.0',
    token: 'USDC'
  },
  {
    id: '0xres3',
    orderId: '0x3456...7890',
    type: 'resolve',
    status: 'success',
    timestamp: '2025-07-27 12:25:33',
    gasUsed: 142000,
    resolver: '0xResolver1',
    amount: '500.0',
    token: 'DAI'
  },
  {
    id: '0xres4',
    orderId: '0x4567...8901',
    type: 'refund',
    status: 'failed',
    timestamp: '2025-07-27 12:20:18',
    gasUsed: 85000,
    resolver: '0xResolver3',
    amount: '0.8',
    token: 'ETH'
  }
];

export default function ResolverPage() {
  const [stats, setStats] = useState<ResolverStats>(mockResolverStats);
  const [activity, setActivity] = useState<ResolverActivity[]>(mockResolverActivity);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      // Simulate real-time updates
      setStats(prev => ({
        ...prev,
        totalResolved: prev.totalResolved + Math.floor(Math.random() * 3),
        pendingOrders: Math.max(0, prev.pendingOrders + Math.floor(Math.random() * 3) - 1)
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [isLive]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': case 'success': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-blue-600 bg-blue-100';
      case 'offline': case 'failed': return 'text-red-600 bg-red-100';
      case 'maintenance': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'maintenance': return 'Maintenance';
      case 'success': return 'Success';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'resolve': return 'Resolve';
      case 'settle': return 'Settle';
      case 'refund': return 'Refund';
      default: return 'Unknown';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <nav className="text-sm breadcrumbs mb-4">
              <ul>
                <li><Link href="/fusion" className="text-blue-600 hover:text-blue-800">Fusion</Link></li>
                <li className="text-gray-500">Resolver</li>
              </ul>
            </nav>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Cross-Chain Resolver</h1>
            <p className="text-gray-600">Monitor and manage cross-chain order resolution services</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${stats.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium text-gray-700">
                {stats.status === 'online' ? 'Service Normal' : 'Service Error'}
              </span>
            </div>
            <button
              onClick={() => setIsLive(!isLive)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isLive 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              {isLive ? 'Live Monitoring' : 'Start Live Monitoring'}
            </button>
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {stats.totalResolved.toLocaleString()}
            </div>
            <div className="text-sm text-blue-700">Total Resolved</div>
          </div>
          
          <div className="bg-green-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {stats.successRate}%
            </div>
            <div className="text-sm text-green-700">Success Rate</div>
          </div>
          
          <div className="bg-purple-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {stats.avgResolutionTime}s
            </div>
            <div className="text-sm text-purple-700">Avg Resolution Time</div>
          </div>
          
          <div className="bg-orange-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {stats.activeResolvers}
            </div>
            <div className="text-sm text-orange-700">Active Resolvers</div>
          </div>
          
          <div className="bg-yellow-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-yellow-600 mb-1">
              {stats.pendingOrders}
            </div>
            <div className="text-sm text-yellow-700">Pending Orders</div>
          </div>
          
          <div className={`rounded-xl p-4 ${getStatusColor(stats.status).replace('text-', 'bg-').replace('-600', '-50')}`}>
            <div className={`text-2xl font-bold mb-1 ${getStatusColor(stats.status).split(' ')[0]}`}>
              {getStatusText(stats.status)}
            </div>
            <div className={`text-sm ${getStatusColor(stats.status).split(' ')[0].replace('-600', '-700')}`}>
              System Status
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link 
            href="/fusion/resolver/dashboard"
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all"
          >
            <div className="text-2xl mb-2">📊</div>
            <div className="font-semibold mb-1">Resolver Dashboard</div>
            <div className="text-sm text-blue-100">View detailed resolver performance metrics</div>
          </Link>
          
          <Link 
            href="/fusion/resolver/monitoring"
            className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl hover:from-green-600 hover:to-green-700 transition-all"
          >
            <div className="text-2xl mb-2">🔍</div>
            <div className="font-semibold mb-1">Real-time Monitoring</div>
            <div className="text-sm text-green-100">Monitor cross-chain order resolution status</div>
          </Link>
          
          <Link 
            href="/fusion/resolver/settings"
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all"
          >
            <div className="text-2xl mb-2">⚙️</div>
            <div className="font-semibold mb-1">Resolver Settings</div>
            <div className="text-sm text-purple-100">Configure resolver parameters and strategies</div>
          </Link>
        </div>

        {/* Recent Resolver Activity */}
        <div className="bg-gray-50 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Resolver Activity</h3>
            <Link 
              href="/fusion/resolver/monitoring"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All →
            </Link>
          </div>
          
          <div className="space-y-3">
            {activity.map((item) => (
              <div key={item.id} className="bg-white rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {getStatusText(item.status)}
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {getTypeText(item.type)} - {item.amount} {item.token}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.timestamp}
                  </div>
                </div>
                
                <div className="grid md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Order ID:</span>
                    <div className="font-mono text-gray-900">{item.orderId}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Resolver:</span>
                    <div className="font-mono text-gray-900">{item.resolver}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Gas Used:</span>
                    <div className="text-gray-900">
                      {item.gasUsed ? `${item.gasUsed.toLocaleString()} gas` : 'N/A'}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Link 
                      href={`/fusion/ethereum/orders/${item.orderId}`}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mt-8 grid md:grid-cols-2 gap-8">
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resolver Performance</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Average Response Time</span>
                <span className="font-semibold text-gray-900">{stats.avgResolutionTime} seconds</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full w-3/4"></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-700">System Availability</span>
                <span className="font-semibold text-green-600">99.8%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full w-full"></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Processing Efficiency</span>
                <span className="font-semibold text-blue-600">Excellent</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full w-5/6"></div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">Ethereum Connection</span>
                </div>
                <span className="text-green-600 font-medium">Normal</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">Sui Network Connection</span>
                </div>
                <span className="text-green-600 font-medium">Normal</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-700">Cross-chain Bridge Status</span>
                </div>
                <span className="text-yellow-600 font-medium">Slight Delay</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">Resolver Cluster</span>
                </div>
                <span className="text-green-600 font-medium">All Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}