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
              Help Documentation
            </Link>
            <Link 
              href="/fusion/shared/demo" 
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Feature Demo
            </Link>
            <Link 
              href="/fusion/resolver" 
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Resolver Management
            </Link>
          </div>
          
          {/* Center - Status */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">System Running Normally</span>
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
              Supported Networks: Ethereum, Sui | Version: v2.0.0
            </div>
            
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>Last Updated: {new Date().toLocaleDateString('en-US')}</span>
              <span>•</span>
              <span>Service Status: Normal</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FusionFooter;