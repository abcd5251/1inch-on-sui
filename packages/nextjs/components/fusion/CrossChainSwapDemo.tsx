"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FusionOrder, AuctionDetails } from "@1inch/sui-fusion-sdk";
import { DutchAuctionVisualizer } from "./DutchAuctionVisualizer";
import { useUnifiedStore } from "~~/services/store/unifiedStore";

// ==================== Cross-Chain Swap Interfaces ====================

interface SwapStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  network: 'ethereum' | 'sui';
  txHash?: string;
  timestamp?: number;
  estimatedTime?: number; // in seconds
}

interface CrossChainSwapState {
  swapId: string;
  steps: SwapStep[];
  currentStep: number;
  isActive: boolean;
  totalProgress: number;
  estimatedCompletionTime: number;
}

interface CrossChainSwapDemoProps {
  className?: string;
  autoStart?: boolean;
  onSwapComplete?: (swapId: string) => void;
  onSwapFailed?: (swapId: string, error: string) => void;
}

// ==================== Mock Cross-Chain Swap Steps ====================

const createMockSwapSteps = (swapType: 'eth_to_sui' | 'sui_to_eth'): SwapStep[] => {
  const baseSteps: SwapStep[] = [
    {
      id: 'step_1',
      title: 'Initialize Cross-Chain Order',
      description: 'Creating 1inch Fusion order with hashlock conditions',
      status: 'pending',
      network: swapType === 'eth_to_sui' ? 'ethereum' : 'sui',
      estimatedTime: 15
    },
    {
      id: 'step_2', 
      title: 'Deploy HTLC Contract',
      description: 'Deploying Hash Time-Locked Contract for atomic swap',
      status: 'pending',
      network: swapType === 'eth_to_sui' ? 'ethereum' : 'sui',
      estimatedTime: 30
    },
    {
      id: 'step_3',
      title: 'Lock Source Tokens',
      description: `Locking tokens in HTLC on ${swapType === 'eth_to_sui' ? 'Ethereum' : 'Sui'}`,
      status: 'pending', 
      network: swapType === 'eth_to_sui' ? 'ethereum' : 'sui',
      estimatedTime: 45
    },
    {
      id: 'step_4',
      title: 'Relayer Coordination',
      description: 'Cross-chain relayer validates and coordinates swap',
      status: 'pending',
      network: swapType === 'eth_to_sui' ? 'ethereum' : 'sui',
      estimatedTime: 20
    },
    {
      id: 'step_5',
      title: 'Target Chain Validation',
      description: `Validating conditions on ${swapType === 'eth_to_sui' ? 'Sui' : 'Ethereum'}`,
      status: 'pending',
      network: swapType === 'eth_to_sui' ? 'sui' : 'ethereum',
      estimatedTime: 25
    },
    {
      id: 'step_6',
      title: 'Execute Atomic Swap',
      description: 'Revealing secret and claiming tokens on both chains',
      status: 'pending',
      network: swapType === 'eth_to_sui' ? 'sui' : 'ethereum',
      estimatedTime: 60
    },
    {
      id: 'step_7',
      title: 'Finalize Transaction',
      description: 'Cross-chain swap completed successfully',
      status: 'pending',
      network: swapType === 'eth_to_sui' ? 'sui' : 'ethereum',
      estimatedTime: 10
    }
  ];

  return baseSteps;
};

// ==================== Main Component ====================

export const CrossChainSwapDemo: React.FC<CrossChainSwapDemoProps> = ({ 
  className = "",
  autoStart = false,
  onSwapComplete,
  onSwapFailed
}) => {
  const { toggleDemoMode, isDemoMode } = useUnifiedStore();
  
  const [swapState, setSwapState] = useState<CrossChainSwapState>({
    swapId: '',
    steps: [],
    currentStep: 0,
    isActive: false,
    totalProgress: 0,
    estimatedCompletionTime: 0
  });

  const [selectedSwapType, setSelectedSwapType] = useState<'eth_to_sui' | 'sui_to_eth'>('eth_to_sui');
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);

  // Sample Dutch auction for demo
  const [mockAuction, setMockAuction] = useState<AuctionDetails>({
    startTime: Date.now(),
    duration: 180, // 3 minutes
    startRate: "3520.0", // 8% above market
    endRate: "3400.0", // 8% below market
    currentRate: "3466.0",
    priceDecayFunction: "linear",
    remainingTime: 180
  });

  // Initialize swap demo
  const initializeSwap = useCallback(() => {
    const swapId = `swap_${Date.now()}`;
    const steps = createMockSwapSteps(selectedSwapType);
    const totalTime = steps.reduce((acc, step) => acc + (step.estimatedTime || 0), 0);
    
    setSwapState({
      swapId,
      steps,
      currentStep: 0,
      isActive: true,
      totalProgress: 0,
      estimatedCompletionTime: totalTime
    });

    // Update mock auction for demo
    setMockAuction(prev => ({
      ...prev,
      startTime: Date.now(),
      remainingTime: 180,
      currentRate: prev.startRate
    }));
  }, [selectedSwapType]);

  // Simulate swap progress
  useEffect(() => {
    if (!swapState.isActive || swapState.currentStep >= swapState.steps.length) return;

    const currentStep = swapState.steps[swapState.currentStep];
    const stepDuration = (currentStep.estimatedTime || 30) * 1000; // Convert to milliseconds

    // Mark current step as in progress
    setSwapState(prev => ({
      ...prev,
      steps: prev.steps.map((step, index) => 
        index === prev.currentStep 
          ? { ...step, status: 'in_progress', timestamp: Date.now() }
          : step
      )
    }));

    const timer = setTimeout(() => {
      setSwapState(prev => {
        const newSteps = [...prev.steps];
        
        // Complete current step
        newSteps[prev.currentStep] = {
          ...newSteps[prev.currentStep],
          status: 'completed',
          txHash: `0x${Math.random().toString(16).substr(2, 64)}`
        };

        const nextStep = prev.currentStep + 1;
        const isComplete = nextStep >= newSteps.length;
        const progress = ((nextStep) / newSteps.length) * 100;

        if (isComplete) {
          onSwapComplete?.(prev.swapId);
        }

        return {
          ...prev,
          steps: newSteps,
          currentStep: nextStep,
          isActive: !isComplete,
          totalProgress: progress
        };
      });
    }, stepDuration);

    return () => clearTimeout(timer);
  }, [swapState.currentStep, swapState.isActive, onSwapComplete]);

  // Auto-start feature
  useEffect(() => {
    if (autoStart && !swapState.isActive && swapState.currentStep === 0) {
      const timer = setTimeout(initializeSwap, 2000);
      return () => clearTimeout(timer);
    }
  }, [autoStart, swapState.isActive, swapState.currentStep, initializeSwap]);

  // Update auction details during swap
  useEffect(() => {
    if (!swapState.isActive) return;

    const interval = setInterval(() => {
      setMockAuction(prev => {
        const elapsed = (Date.now() - prev.startTime) / 1000;
        const progress = Math.min(elapsed / prev.duration, 1);
        const startRate = parseFloat(prev.startRate);
        const endRate = parseFloat(prev.endRate);
        const currentRate = startRate - (startRate - endRate) * progress;
        const remainingTime = Math.max(0, prev.duration - elapsed);

        return {
          ...prev,
          currentRate: currentRate.toFixed(2),
          remainingTime: Math.floor(remainingTime)
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [swapState.isActive]);

  const resetDemo = useCallback(() => {
    setSwapState({
      swapId: '',
      steps: [],
      currentStep: 0,
      isActive: false,
      totalProgress: 0,
      estimatedCompletionTime: 0
    });
  }, []);

  const getNetworkIcon = (network: 'ethereum' | 'sui') => {
    return network === 'ethereum' ? '🔷' : '💫';
  };

  const getStepStatusIcon = (status: SwapStep['status']) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Cross-Chain Atomic Swap Demo
            </h2>
            <p className="text-gray-600">
              Experience 1inch Fusion+ cross-chain swaps with Dutch auction MEV protection
            </p>
          </div>
          <div className="text-4xl">⚡</div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Demo Controls</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Swap Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Swap Direction
            </label>
            <select
              value={selectedSwapType}
              onChange={(e) => setSelectedSwapType(e.target.value as 'eth_to_sui' | 'sui_to_eth')}
              disabled={swapState.isActive}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="eth_to_sui">🔷 Ethereum → Sui 💫</option>
              <option value="sui_to_eth">💫 Sui → Ethereum 🔷</option>
            </select>
          </div>

          {/* Demo Controls */}
          <div className="flex flex-col space-y-2">
            <button
              onClick={initializeSwap}
              disabled={swapState.isActive}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {swapState.isActive ? "Swap In Progress..." : "Start Cross-Chain Swap"}
            </button>
            <button
              onClick={resetDemo}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Reset Demo
            </button>
          </div>

          {/* Advanced Options */}
          <div className="flex flex-col space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showAdvancedDetails}
                onChange={(e) => setShowAdvancedDetails(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Show Advanced Details</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isDemoMode}
                onChange={toggleDemoMode}
                className="mr-2"
              />
              <span className="text-sm">Enable Demo Mode</span>
            </label>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      {swapState.swapId && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Swap Progress</h3>
            <div className="text-sm text-gray-600">
              Swap ID: {swapState.swapId.slice(0, 12)}...
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{Math.round(swapState.totalProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${swapState.totalProgress}%` }}
              ></div>
            </div>
          </div>

          {/* Swap Steps */}
          <div className="space-y-3">
            {swapState.steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center space-x-3 p-3 rounded-lg border ${
                  step.status === 'completed' 
                    ? 'bg-green-50 border-green-200' 
                    : step.status === 'in_progress'
                    ? 'bg-blue-50 border-blue-200'
                    : step.status === 'failed'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{getStepStatusIcon(step.status)}</span>
                  <span className="text-lg">{getNetworkIcon(step.network)}</span>
                </div>
                
                <div className="flex-1">
                  <div className="font-medium">{step.title}</div>
                  <div className="text-sm text-gray-600">{step.description}</div>
                  
                  {showAdvancedDetails && step.txHash && (
                    <div className="text-xs text-gray-500 mt-1">
                      Tx: {step.txHash.slice(0, 10)}...{step.txHash.slice(-8)}
                    </div>
                  )}
                </div>
                
                {step.status === 'in_progress' && (
                  <div className="text-sm text-blue-600 animate-pulse">
                    Processing...
                  </div>
                )}
                
                {step.estimatedTime && step.status === 'pending' && (
                  <div className="text-sm text-gray-500">
                    ~{step.estimatedTime}s
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dutch Auction Visualization */}
      {swapState.isActive && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            Real-Time Dutch Auction - MEV Protection Active
          </h3>
          <DutchAuctionVisualizer
            auctionDetails={mockAuction}
            showBidding={true}
            showChart={true}
            className="w-full"
          />
        </div>
      )}

      {/* Completion Status */}
      {swapState.totalProgress === 100 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">🎉</div>
            <div>
              <h3 className="text-lg font-semibold text-green-800">
                Cross-Chain Swap Completed Successfully!
              </h3>
              <div className="text-green-600 text-sm mt-1">
                Atomic swap executed with MEV protection. Both chains settled atomically.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Technical Details */}
      {showAdvancedDetails && swapState.swapId && (
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Technical Implementation Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Protocol Features:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Hash Time-Locked Contracts (HTLC)</li>
                <li>• Atomic cross-chain execution</li>
                <li>• MEV protection via Dutch auctions</li>
                <li>• Relayer-coordinated settlement</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Security Guarantees:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Trustless atomic swaps</li>
                <li>• Timeout-based fund recovery</li>
                <li>• Cross-chain state verification</li>
                <li>• Front-running protection</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};