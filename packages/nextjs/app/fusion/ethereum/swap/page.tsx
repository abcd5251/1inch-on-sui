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
      // TODO: 实现实际的交换逻辑
      console.log('执行以太坊交换:', formData);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 模拟交易
    } catch (error) {
      console.error('交换失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmountChange = (value: string) => {
    setFormData(prev => ({ ...prev, amount: value }));
    // TODO: 实现价格估算
    if (value && !isNaN(Number(value))) {
      const estimated = (Number(value) * 1800).toFixed(2); // 模拟汇率
      setEstimatedOutput(estimated);
    } else {
      setEstimatedOutput('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">以太坊交换</h1>
          <p className="text-gray-600">使用 1inch Fusion 进行高效交易</p>
        </div>

        <div className="space-y-6">
          {/* From Token */}
          <div className="bg-gray-50 rounded-xl p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              发送
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
              余额: 2.5 {formData.fromToken}
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
              接收
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
              估算输出 (包含滑点)
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="font-medium text-gray-900 mb-4">高级设置</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  滑点容忍度 (%)
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
                  交易期限 (分钟)
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
              <h3 className="font-medium text-blue-900 mb-3">交易信息</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">汇率:</span>
                  <span className="text-blue-900 font-medium">1 {formData.fromToken} = 1800 {formData.toToken}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">网络费用:</span>
                  <span className="text-blue-900 font-medium">~$12.50</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">最小接收:</span>
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
                <span>交易中...</span>
              </div>
            ) : (
              '执行交换'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}