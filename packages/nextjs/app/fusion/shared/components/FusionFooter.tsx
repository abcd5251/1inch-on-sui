"use client";

import React from 'react';
import Link from 'next/link';

const FusionFooter: React.FC = () => {
  return (
    <footer className="fusion-footer bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Left side - Links */}
          <div className="flex items-center space-x-6">
            <Link 
              href="/fusion/shared/help" 
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              帮助文档
            </Link>
            <Link 
              href="/fusion/shared/demo" 
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              功能演示
            </Link>
            <Link 
              href="/fusion/resolver" 
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              解析器管理
            </Link>
          </div>
          
          {/* Center - Status */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">系统运行正常</span>
            </div>
          </div>
          
          {/* Right side - Copyright */}
          <div className="text-sm text-gray-500">
            © 2024 1inch Fusion. All rights reserved.
          </div>
        </div>
        
        {/* Bottom row - Additional info */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            <div className="text-xs text-gray-500">
              支持的网络: Ethereum, Sui | 版本: v2.0.0
            </div>
            
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>最后更新: {new Date().toLocaleDateString('zh-CN')}</span>
              <span>•</span>
              <span>服务状态: 正常</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FusionFooter;