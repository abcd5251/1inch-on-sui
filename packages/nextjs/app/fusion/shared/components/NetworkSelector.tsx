"use client";

import React from 'react';
import { useFusion } from '../context/FusionContext';

interface NetworkSelectorProps {
  className?: string;
  showLabel?: boolean;
}

export const NetworkSelector: React.FC<NetworkSelectorProps> = ({ 
  className = '',
  showLabel = true 
}) => {
  const { selectedNetwork, setSelectedNetwork, isLoading } = useFusion();

  const networks = [
    {
      id: 'ethereum' as const,
      name: 'Ethereum',
      icon: '⟠',
      color: 'bg-blue-500',
      description: 'Ethereum Network'
    },
    {
      id: 'sui' as const,
      name: 'Sui',
      icon: '🌊',
      color: 'bg-cyan-500',
      description: 'Sui Network'
    }
  ];

  if (isLoading) {
    return (
      <div className={`network-selector-loading ${className}`}>
        <div className="animate-pulse flex space-x-2">
          <div className="h-10 w-24 bg-gray-200 rounded"></div>
          <div className="h-10 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`network-selector ${className}`}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择网络
        </label>
      )}
      
      <div className="flex space-x-2">
        {networks.map((network) => {
          const isSelected = selectedNetwork === network.id;
          
          return (
            <button
              key={network.id}
              onClick={() => setSelectedNetwork(network.id)}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all duration-200
                ${isSelected 
                  ? `${network.color} text-white border-transparent shadow-lg` 
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:shadow-md'
                }
              `}
              title={network.description}
            >
              <span className="text-lg">{network.icon}</span>
              <span className="font-medium">{network.name}</span>
              {isSelected && (
                <span className="ml-1 text-xs">✓</span>
              )}
            </button>
          );
        })}
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        当前选择: {networks.find(n => n.id === selectedNetwork)?.name}
      </div>
    </div>
  );
};

export default NetworkSelector;