'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUnifiedStore } from '~~/services/store/unifiedStore';
import type { TokenInfo, NetworkType } from '~~/services/store/unifiedStore';
import { DutchAuctionVisualizer } from '~~/components/fusion/DutchAuctionVisualizer';
import type { AuctionDetails } from '@1inch/sui-fusion-sdk';

// ==================== Network Configuration ====================

const NETWORK_TOKENS: Record<NetworkType, TokenInfo[]> = {
  ethereum: [
    { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
    { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86a33E6441d3e2DbEcC39ee4bd65A58da0e17', decimals: 6 },
    { symbol: 'USDT', name: 'Tether USD', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6 },
    { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6b175474e89094c44da98b954eedeac495271d0f', decimals: 18 },
  ],
  sui: [
    { symbol: 'SUI', name: 'Sui', address: '0x2::sui::SUI', decimals: 9 },
    { symbol: 'USDC', name: 'USD Coin', address: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN', decimals: 6 },
    { symbol: 'USDT', name: 'Tether USD', address: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN', decimals: 6 },
    { symbol: 'WETH', name: 'Wrapped Ethereum', address: '0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN', decimals: 8 },
  ],
  'cross-chain': [
    // Combined tokens for cross-chain swaps
    { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
    { symbol: 'SUI', name: 'Sui', address: '0x2::sui::SUI', decimals: 9 },
    { symbol: 'USDC-ETH', name: 'USDC (Ethereum)', address: '0xA0b86a33E6441d3e2DbEcC39ee4bd65A58da0e17', decimals: 6 },
    { symbol: 'USDC-SUI', name: 'USDC (Sui)', address: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN', decimals: 6 },
  ],
};

const NETWORK_CONFIG = {
  ethereum: {
    name: 'Ethereum',
    color: 'blue',
    features: ['slippage', 'deadline'],
    mockRate: 1800, // ETH to USDC
    networkFee: '$12.50',
    executionTime: '< 30 seconds',
  },
  sui: {
    name: 'Sui',
    color: 'orange',
    features: ['dutchAuction'],
    mockRate: 0.5, // SUI to USDC
    networkFee: '$0.01',
    executionTime: '< 3 seconds',
  },
  'cross-chain': {
    name: 'Cross-Chain',
    color: 'purple',
    features: ['slippage', 'deadline', 'dutchAuction', 'htlc'],
    mockRate: 1, // 1:1 for USDC cross-chain
    networkFee: '$5.20',
    executionTime: '2-5 minutes',
  },
};

// ==================== Auction Preview Interface ====================

interface AuctionPreview {
  startPrice: string;
  endPrice: string;
  duration: number;
  priceDecay: string;
}

// ==================== Main Component ====================

export default function UnifiedSwapPage() {
  // Store state
  const {
    ui: { selectedNetwork },
    swap: { formData, quote, isLoadingQuote, estimatedOutput, isExecuting, error },
    userPreferences,
    wallets,
    updateSwapForm,
    setSwapQuote,
    setSwapLoading,
    swapTokens,
    resetSwapForm,
    setSwapError,
    addToastNotification,
  } = useUnifiedStore();

  // Local state for network-specific features
  const [auctionPreview, setAuctionPreview] = useState<AuctionPreview | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [auctionDetails, setAuctionDetails] = useState<AuctionDetails | null>(null);

  // Network configuration
  const networkConfig = NETWORK_CONFIG[selectedNetwork];
  const availableTokens = NETWORK_TOKENS[selectedNetwork];
  const currentWallet = wallets[selectedNetwork === 'ethereum' ? 'ethereum' : 'sui'];

  // ==================== Token Selection Logic ====================

  const getDefaultTokens = useCallback(() => {
    switch (selectedNetwork) {
      case 'ethereum':
        return {
          fromToken: availableTokens.find(t => t.symbol === 'ETH') || availableTokens[0],
          toToken: availableTokens.find(t => t.symbol === 'USDC') || availableTokens[1],
        };
      case 'sui':
        return {
          fromToken: availableTokens.find(t => t.symbol === 'SUI') || availableTokens[0],
          toToken: availableTokens.find(t => t.symbol === 'USDC') || availableTokens[1],
        };
      case 'cross-chain':
        return {
          fromToken: availableTokens.find(t => t.symbol === 'ETH') || availableTokens[0],
          toToken: availableTokens.find(t => t.symbol === 'USDC-SUI') || availableTokens[3],
        };
      default:
        return { fromToken: availableTokens[0], toToken: availableTokens[1] };
    }
  }, [selectedNetwork, availableTokens]);

  // Initialize form with network-appropriate defaults
  useEffect(() => {
    if (!formData.fromToken || !formData.toToken) {
      const defaults = getDefaultTokens();
      updateSwapForm(defaults);
    }
  }, [selectedNetwork, formData.fromToken, formData.toToken, getDefaultTokens, updateSwapForm]);

  // ==================== Price Estimation Logic ====================

  const calculateEstimatedOutput = useCallback((amount: string, fromToken: TokenInfo | null, toToken: TokenInfo | null) => {
    if (!amount || !fromToken || !toToken || isNaN(Number(amount))) {
      return '';
    }

    const numAmount = Number(amount);
    let estimated = 0;

    // Mock price calculation based on network and tokens
    if (selectedNetwork === 'cross-chain') {
      // Cross-chain USDC swap
      if (fromToken.symbol.includes('USDC') && toToken.symbol.includes('USDC')) {
        estimated = numAmount * 0.999; // Small cross-chain fee
      } else {
        estimated = numAmount * networkConfig.mockRate;
      }
    } else {
      estimated = numAmount * networkConfig.mockRate;
    }

    return estimated.toFixed(6);
  }, [selectedNetwork, networkConfig.mockRate]);

  // ==================== Dutch Auction Logic ====================

  const updateAuctionPreview = useCallback((output: string, fromToken: TokenInfo | null, toToken: TokenInfo | null) => {
    if (!output || !fromToken || !toToken || !networkConfig.features.includes('dutchAuction')) {
      setAuctionPreview(null);
      return;
    }

    const baseOutput = Number(output);
    const startPremium = formData.deadline || 5; // Reuse deadline field for start premium
    const auctionDuration = 300; // 5 minutes default

    const startPrice = baseOutput * (1 + startPremium / 100);
    const endPrice = baseOutput * 0.95; // 5% discount

    setAuctionPreview({
      startPrice: startPrice.toFixed(6),
      endPrice: endPrice.toFixed(6),
      duration: auctionDuration,
      priceDecay: 'Linear',
    });

    // Create auction details for visualizer
    const now = Date.now();
    setAuctionDetails({
      auctionId: 'preview',
      startTime: now,
      endTime: now + (auctionDuration * 1000),
      duration: auctionDuration,
      startRate: startPrice.toString(),
      endRate: endPrice.toString(),
      currentRate: startPrice.toString(),
      priceDecayFunction: 'linear',
      tokenPair: `${fromToken?.symbol}/${toToken?.symbol}`,
      status: 'preview',
    });
  }, [formData.deadline, networkConfig.features]);

  // ==================== Form Handlers ====================

  const handleAmountChange = useCallback((value: string) => {
    updateSwapForm({ amount: value });
    
    const estimated = calculateEstimatedOutput(value, formData.fromToken, formData.toToken);
    
    // Set estimated output in store if needed
    // setSwapQuote({ estimatedOutput: estimated }); // Would need to update store structure
    
    // Update auction preview for networks that support it
    updateAuctionPreview(estimated, formData.fromToken, formData.toToken);
  }, [formData.fromToken, formData.toToken, updateSwapForm, calculateEstimatedOutput, updateAuctionPreview]);

  const handleTokenSelect = useCallback((field: 'fromToken' | 'toToken', tokenSymbol: string) => {
    const selectedToken = availableTokens.find(t => t.symbol === tokenSymbol);
    if (selectedToken) {
      updateSwapForm({ [field]: selectedToken });
      
      // Recalculate if amount exists
      if (formData.amount) {
        const estimated = calculateEstimatedOutput(
          formData.amount,
          field === 'fromToken' ? selectedToken : formData.fromToken,
          field === 'toToken' ? selectedToken : formData.toToken
        );
        updateAuctionPreview(
          estimated,
          field === 'fromToken' ? selectedToken : formData.fromToken,
          field === 'toToken' ? selectedToken : formData.toToken
        );
      }
    }
  }, [availableTokens, formData.amount, formData.fromToken, formData.toToken, updateSwapForm, calculateEstimatedOutput, updateAuctionPreview]);

  const handleSwapTokens = useCallback(() => {
    swapTokens();
    // Recalculate after swap
    if (formData.amount) {
      const estimated = calculateEstimatedOutput(formData.amount, formData.toToken, formData.fromToken);
      updateAuctionPreview(estimated, formData.toToken, formData.fromToken);
    }
  }, [swapTokens, formData.amount, formData.fromToken, formData.toToken, calculateEstimatedOutput, updateAuctionPreview]);

  const handleExecuteSwap = useCallback(async () => {
    if (!formData.fromToken || !formData.toToken || !formData.amount) {
      setSwapError('Please fill in all required fields');
      return;
    }

    if (currentWallet.status !== 'connected') {
      setSwapError('Please connect your wallet first');
      return;
    }

    setSwapLoading(true);
    setSwapError(undefined);

    try {
      // TODO: Implement actual swap logic
      console.log('Executing swap:', {
        network: selectedNetwork,
        formData,
        auctionPreview: networkConfig.features.includes('dutchAuction') ? auctionPreview : null,
      });

      // Mock transaction
      await new Promise(resolve => setTimeout(resolve, 2000));

      addToastNotification({
        type: 'success',
        title: 'Swap Successful',
        message: `Successfully swapped ${formData.amount} ${formData.fromToken.symbol} for ${formData.toToken.symbol}`,
      });

      // Reset form after successful swap
      resetSwapForm();
      setAuctionPreview(null);
      
    } catch (error) {
      console.error('Swap failed:', error);
      setSwapError(error instanceof Error ? error.message : 'Swap failed');
      addToastNotification({
        type: 'error',
        title: 'Swap Failed',
        message: 'Please try again or contact support',
      });
    } finally {
      setSwapLoading(false);
    }
  }, [
    formData,
    selectedNetwork,
    currentWallet.status,
    networkConfig.features,
    auctionPreview,
    setSwapLoading,
    setSwapError,
    addToastNotification,
    resetSwapForm,
  ]);

  // ==================== Computed Values ====================

  const estimatedOutputDisplay = calculateEstimatedOutput(formData.amount, formData.fromToken, formData.toToken);
  const minimumReceived = estimatedOutputDisplay ? 
    (Number(estimatedOutputDisplay) * (1 - (formData.slippage || 0.5) / 100)).toFixed(6) : '';
  
  const isFormValid = !!(
    formData.fromToken && 
    formData.toToken && 
    formData.amount && 
    Number(formData.amount) > 0 &&
    currentWallet.status === 'connected'
  );

  const networkColorClasses = {
    blue: {
      gradient: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
      accent: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      ring: 'focus:ring-blue-500',
    },
    orange: {
      gradient: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
      accent: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      ring: 'focus:ring-orange-500',
    },
    purple: {
      gradient: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
      accent: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      ring: 'focus:ring-purple-500',
    },
  };

  const colors = networkColorClasses[networkConfig.color as keyof typeof networkColorClasses] || networkColorClasses.blue;

  // ==================== Render ====================

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {networkConfig.name} {selectedNetwork === 'cross-chain' ? 'Atomic ' : ''}Swap
          </h1>
          <p className="text-gray-600">
            {selectedNetwork === 'ethereum' && 'Use 1inch Fusion for efficient trading'}
            {selectedNetwork === 'sui' && 'Experience high-speed, low-cost Sui network trading'}
            {selectedNetwork === 'cross-chain' && 'Bridge-free atomic swaps with HTLC security'}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* From Token */}
          <div className="bg-gray-50 rounded-xl p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Send
            </label>
            <div className="flex items-center space-x-4">
              <select 
                value={formData.fromToken?.symbol || ''}
                onChange={(e) => handleTokenSelect('fromToken', e.target.value)}
                className={`bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 ${colors.ring} focus:border-transparent`}
              >
                {availableTokens.map(token => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="0.0"
                value={formData.amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="flex-1 bg-transparent text-2xl font-semibold text-gray-900 placeholder-gray-400 border-none outline-none"
              />
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Balance: {currentWallet.balance || '0.0'} {formData.fromToken?.symbol}
            </div>
          </div>

          {/* Swap Direction */}
          <div className="flex justify-center">
            <button 
              onClick={handleSwapTokens}
              className={`${colors.bg} hover:bg-opacity-80 ${colors.accent} p-3 rounded-full transition-colors`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* To Token */}
          <div className="bg-gray-50 rounded-xl p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Receive
            </label>
            <div className="flex items-center space-x-4">
              <select 
                value={formData.toToken?.symbol || ''}
                onChange={(e) => handleTokenSelect('toToken', e.target.value)}
                className={`bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 ${colors.ring} focus:border-transparent`}
              >
                {availableTokens.map(token => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
              <div className="flex-1 text-2xl font-semibold text-gray-900">
                {estimatedOutputDisplay || '0.0'}
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Estimated output {networkConfig.features.includes('slippage') && '(including slippage)'}
            </div>
          </div>

          {/* Network-Specific Settings */}
          
          {/* Ethereum/Cross-chain: Advanced Settings */}
          {(networkConfig.features.includes('slippage') || networkConfig.features.includes('deadline')) && (
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Advanced Settings</h3>
                <button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  {showAdvancedSettings ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {showAdvancedSettings && (
                <div className="grid grid-cols-2 gap-4">
                  {networkConfig.features.includes('slippage') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Slippage Tolerance (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.slippage || 0.5}
                        onChange={(e) => updateSwapForm({ slippage: Number(e.target.value) })}
                        className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 ${colors.ring} focus:border-transparent`}
                      />
                    </div>
                  )}
                  {networkConfig.features.includes('deadline') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Transaction Deadline (minutes)
                      </label>
                      <input
                        type="number"
                        value={formData.deadline || 20}
                        onChange={(e) => updateSwapForm({ deadline: Number(e.target.value) })}
                        className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 ${colors.ring} focus:border-transparent`}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sui/Cross-chain: Dutch Auction Settings */}
          {networkConfig.features.includes('dutchAuction') && (
            <div className={`${colors.bg} rounded-xl p-6 ${colors.border} border`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-medium ${colors.accent.replace('text-', 'text-').replace('-600', '-900')}`}>
                  🎯 Dutch Auction
                </h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isReversed} // Reuse this field for auction enabled
                    onChange={(e) => updateSwapForm({ isReversed: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-${networkConfig.color}-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-${networkConfig.color}-500`}></div>
                </label>
              </div>
              
              {formData.isReversed && auctionDetails && (
                <div className="space-y-4">
                  <DutchAuctionVisualizer
                    auctionDetails={auctionDetails}
                    className="mb-4"
                    showBidding={true}
                    showChart={true}
                    onBidPlace={(price) => {
                      addToastNotification({
                        type: 'info',
                        title: 'Bid Placed',
                        message: `Bid of ${price.toFixed(6)} ${formData.toToken?.symbol} submitted`,
                      });
                    }}
                    onAuctionEnd={(winningBid) => {
                      if (winningBid) {
                        addToastNotification({
                          type: 'success',
                          title: 'Auction Complete',
                          message: `Won by ${winningBid.bidder} at ${winningBid.price.toFixed(6)}`,
                        });
                      }
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Cross-chain: HTLC Info */}
          {networkConfig.features.includes('htlc') && (
            <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
              <h3 className="font-medium text-purple-900 mb-3">🔒 HTLC Security</h3>
              <div className="space-y-2 text-sm text-purple-800">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Atomic swap guarantee - funds are safe</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Time-locked smart contracts</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>No bridge custody risk</span>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Info */}
          {estimatedOutputDisplay && (
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="font-medium text-blue-900 mb-3">Transaction Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Exchange Rate:</span>
                  <span className="text-blue-900 font-medium">
                    1 {formData.fromToken?.symbol} = {networkConfig.mockRate} {formData.toToken?.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Network Fee:</span>
                  <span className="text-blue-900 font-medium">{networkConfig.networkFee}</span>
                </div>
                {minimumReceived && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">Minimum Received:</span>
                    <span className="text-blue-900 font-medium">
                      {minimumReceived} {formData.toToken?.symbol}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-blue-700">Expected Execution:</span>
                  <span className="text-blue-900 font-medium">{networkConfig.executionTime}</span>
                </div>
              </div>
            </div>
          )}

          {/* Swap Button */}
          <button
            onClick={handleExecuteSwap}
            disabled={!isFormValid || isExecuting}
            className={`w-full bg-gradient-to-r ${colors.gradient} disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed`}
          >
            {isExecuting ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>
                  {selectedNetwork === 'cross-chain' ? 'Creating HTLC...' : 
                   networkConfig.features.includes('dutchAuction') && formData.isReversed ? 'Creating Auction...' : 
                   'Executing...'}
                </span>
              </div>
            ) : (
              <>
                {!isFormValid && currentWallet.status !== 'connected' ? 'Connect Wallet' :
                 selectedNetwork === 'cross-chain' ? 'Create Cross-Chain Swap' :
                 networkConfig.features.includes('dutchAuction') && formData.isReversed ? 'Create Auction Order' :
                 'Execute Swap'}
              </>
            )}
          </button>

          {/* Wallet Connection Status */}
          {currentWallet.status !== 'connected' && (
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Connect your {selectedNetwork === 'ethereum' ? 'Ethereum' : 'Sui'} wallet to continue
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}