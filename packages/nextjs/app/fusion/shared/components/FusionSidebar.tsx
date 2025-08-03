"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFusion } from '../context/FusionContext';

const FusionSidebar: React.FC = () => {
  const { selectedNetwork } = useFusion();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const menuItems = [
    {
      category: '交易功能',
      items: [
        {
          label: '快速交易',
          href: `/fusion/${selectedNetwork}/swap`,
          icon: '🔄',
          description: '执行代币交换'
        },
        {
          label: '订单管理',
          href: `/fusion/${selectedNetwork}/orders`,
          icon: '📋',
          description: '管理交易订单'
        },
        {
          label: '活跃订单',
          href: `/fusion/${selectedNetwork}/orders/active`,
          icon: '⚡',
          description: '查看活跃订单'
        },
        {
          label: '历史记录',
          href: `/fusion/${selectedNetwork}/orders/history`,
          icon: '📜',
          description: '查看历史订单'
        }
      ]
    },
    {
      category: '数据分析',
      items: [
        {
          label: '分析概览',
          href: `/fusion/${selectedNetwork}/analytics`,
          icon: '📊',
          description: '查看数据分析'
        },
        {
          label: '交易量分析',
          href: `/fusion/${selectedNetwork}/analytics/volume`,
          icon: '📈',
          description: '交易量统计'
        },
        {
          label: '性能分析',
          href: `/fusion/${selectedNetwork}/analytics/performance`,
          icon: '⚡',
          description: '性能指标'
        }
      ]
    },
    {
      category: '工具与设置',
      items: [
        {
          label: '功能演示',
          href: '/fusion/shared/demo',
          icon: '🎮',
          description: '功能演示'
        },
        {
          label: '解析器管理',
          href: '/fusion/resolver',
          icon: '🔧',
          description: '管理解析器'
        },
        {
          label: '设置',
          href: '/fusion/shared/settings',
          icon: '⚙️',
          description: '用户设置'
        },
        {
          label: '帮助',
          href: '/fusion/shared/help',
          icon: '❓',
          description: '帮助文档'
        }
      ]
    }
  ];
  
  const isActiveLink = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };
  
  return (
    <aside className={`fusion-sidebar bg-white border-r border-gray-200 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Collapse Toggle */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-between text-gray-600 hover:text-gray-900 transition-colors"
        >
          {!isCollapsed && <span className="font-medium">导航菜单</span>}
          <svg 
            className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
      
      {/* Menu Items */}
      <nav className="p-4 space-y-6">
        {menuItems.map((category) => (
          <div key={category.category}>
            {!isCollapsed && (
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {category.category}
              </h3>
            )}
            
            <ul className="space-y-1">
              {category.items.map((item) => {
                const isActive = isActiveLink(item.href);
                
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`
                        flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200
                        ${isActive 
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500' 
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }
                        ${isCollapsed ? 'justify-center' : ''}
                      `}
                      title={isCollapsed ? item.label : item.description}
                    >
                      <span className="text-lg flex-shrink-0">{item.icon}</span>
                      {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{item.label}</span>
                          <p className="text-xs text-gray-500 truncate">{item.description}</p>
                        </div>
                      )}
                      
                      {!isCollapsed && isActive && (
                        <span className="text-blue-500 text-xs">●</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      
      {/* Network Status */}
      {!isCollapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                selectedNetwork === 'ethereum' ? 'bg-blue-500' : 'bg-cyan-500'
              }`}></div>
              <span className="text-sm font-medium text-gray-700">
                {selectedNetwork === 'ethereum' ? 'Ethereum' : 'Sui'} 网络
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">连接正常</p>
          </div>
        </div>
      )}
    </aside>
  );
};

export default FusionSidebar;