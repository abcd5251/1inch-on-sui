'use client';

import { useState } from 'react';
import { useFusion } from '../../shared/context/FusionContext';

interface SwapFormData {
  fromToken: string;
  toToken: string;
  amount: string;
  slippage: number;
  deadline: number;
}

export default function EthereumSwapPage() {
  const { selectedNetwork } = useFusion();
  const [formData, setFormData] = useState<SwapFormData>({
    fromToken: 'ETH',
    toToken: 'USDC',
    amount: '',
    slippage: 0.5,
    deadline: 20
  });
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedOutput, setEstimatedOutput] = useState<string>('');

  const handleSwap = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement actual swap logic
      console.log('Execute Ethereum swap:', formData);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate transaction
    } catch (error) {
      console.error('Swap failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmountChange = (value: string) => {
    setFormData(prev => ({ ...prev, amount: value }));
    // TODO: Implement price estimation
    if (value && !isNaN(Number(value))) {
      const estimated = (Number(value) * 3466).toFixed(2); // Simulate exchange rate
      setEstimatedOutput(estimated);
    } else {
      setEstimatedOutput('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ethereum Swap</h1>
          <p className="text-gray-600">Efficient trading using 1inch Fusion</p>
        </div>

        <div className="space-y-6">
          {/* From Token */}
          <div className="bg-gray-50 rounded-xl p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Send
            </label>
            <div className="flex items-center space-x-4">
              <select 
                value={formData.fromToken}
                onChange={(e) => setFormData(prev => ({ ...prev, fromToken: e.target.value }))}
                className="bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ETH">ETH</option>
                <option value="USDC">USDC</option>
                <option value="USDT">USDT</option>
                <option value="DAI">DAI</option>
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
              Balance: 2.5 {formData.fromToken}
            </div>
          </div>

          {/* Swap Direction */}
          <div className="flex justify-center">
            <button 
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  fromToken: prev.toToken,
                  toToken: prev.fromToken
                }));
              }}
              className="bg-blue-100 hover:bg-blue-200 text-blue-600 p-3 rounded-full transition-colors"
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
                value={formData.toToken}
                onChange={(e) => setFormData(prev => ({ ...prev, toToken: e.target.value }))}
                className="bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="USDC">USDC</option>
                <option value="ETH">ETH</option>
                <option value="USDT">USDT</option>
                <option value="DAI">DAI</option>
              </select>
              <div className="flex-1 text-2xl font-semibold text-gray-900">
                {estimatedOutput || '0.0'}
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Estimated Output (including slippage)
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="font-medium text-gray-900 mb-4">Advanced Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slippage Tolerance (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.slippage}
                  onChange={(e) => setFormData(prev => ({ ...prev, slippage: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Deadline (minutes)
                </label>
                <input
                  type="number"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Transaction Info */}
          {estimatedOutput && (
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="font-medium text-blue-900 mb-3">Transaction Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Exchange Rate:</span>
                  <span className="text-blue-900 font-medium">1 {formData.fromToken} = 3466 {formData.toToken}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Network Fee:</span>
                  <span className="text-blue-900 font-medium">~$18.50</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Minimum Received:</span>
                  <span className="text-blue-900 font-medium">{(Number(estimatedOutput) * (1 - formData.slippage / 100)).toFixed(2)} {formData.toToken}</span>
                </div>
              </div>
            </div>
          )}

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            disabled={!formData.amount || isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Trading...</span>
              </div>
            ) : (
              'Execute Swap'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}