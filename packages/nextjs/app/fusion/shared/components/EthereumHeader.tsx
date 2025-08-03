"use client";

import React from 'react';
import Link from 'next/link';

const EthereumHeader: React.FC = () => {
  return (
    <div className="ethereum-header bg-blue-500 text-white py-2 px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">⟠</span>
          <div>
            <h2 className="font-semibold">Ethereum Network</h2>
            <p className="text-xs text-blue-100">以太坊主网 - 去中心化交易</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-xs text-blue-100">
            <div>Gas Price: ~20 Gwei</div>
            <div>Block: #18,500,000</div>
          </div>
          
          <Link 
            href="/fusion/sui"
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
          >
            切换到 Sui
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EthereumHeader;