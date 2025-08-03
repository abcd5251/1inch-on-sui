"use client";

import React from 'react';
import Link from 'next/link';

const SuiHeader: React.FC = () => {
  return (
    <div className="sui-header bg-cyan-500 text-white py-2 px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🌊</span>
          <div>
            <h2 className="font-semibold">Sui Network</h2>
            <p className="text-xs text-cyan-100">Sui Mainnet - High Performance Blockchain</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-xs text-cyan-100">
            <div>TPS: ~2,000</div>
            <div>Epoch: #150</div>
          </div>
          
          <Link 
            href="/fusion/ethereum"
            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 rounded text-sm transition-colors"
          >
            Switch to Ethereum
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SuiHeader;