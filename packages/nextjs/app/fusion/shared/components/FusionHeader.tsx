"use client";

import React from 'react';
import Link from 'next/link';
import { useFusion } from '../context/FusionContext';
import NetworkSelector from './NetworkSelector';

const FusionHeader: React.FC = () => {
  const { selectedNetwork, userPreferences } = useFusion();
  
  return (
    <header className="fusion-header bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <Link href="/fusion" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Fusion</h1>
            </Link>
            
            <div className="hidden md:block text-sm text-gray-500">
              Cross-Chain Trading Aggregation Platform
            </div>
          </div>
          
          {/* Network Selector */}
          <div className="flex items-center space-x-4">
            <NetworkSelector showLabel={false} className="hidden sm:block" />
            
            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              <Link 
                href={`/fusion/${selectedNetwork}/swap`}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Quick Trade
              </Link>
              
              <Link 
                href={`/fusion/${selectedNetwork}/orders`}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                My Orders
              </Link>
            </div>
            
            {/* Settings */}
            <Link 
              href="/fusion/shared/settings"
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Mobile Network Selector */}
      <div className="sm:hidden px-4 pb-3">
        <NetworkSelector showLabel={false} />
      </div>
    </header>
  );
};

export default FusionHeader;