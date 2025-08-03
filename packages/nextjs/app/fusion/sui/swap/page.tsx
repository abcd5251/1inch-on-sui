'use client';

import { useState } from 'react';
import { useFusion } from '../../shared/context/FusionContext';

interface SuiSwapFormData {
  fromToken: string;
  toToken: string;
  amount: string;
  enableDutchAuction: boolean;
  auctionDuration: number;
  startPremium: number;
}

export default function SuiSwapPage() {
  const { selectedNetwork } = useFusion();
  const [formData, setFormData] = useState<SuiSwapFormData>({
    fromToken: 'SUI',
    toToken: 'USDC',
    amount: '',
    enableDutchAuction: true,
    auctionDuration: 300, // 5分钟
    startPremium: 5 // 5%
  });
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedOutput, setEstimatedOutput] = useState<string>('');
  const [auctionPreview, setAuctionPreview] = useState<any>(null);

  const handleSwap = async () => {
    setIsLoading(true);
    try {
      // TODO: 实现实际的Sui交换逻辑
      console.log('执行Sui交换:', formData);
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
      const baseRate = 0.5; // SUI to USDC 基础汇率
      const estimated = (Number(value) * baseRate).toFixed(2);
      setEstimatedOutput(estimated);
      
      // 生成拍卖预览
      if (formData.enableDutchAuction) {
        const startPrice = Number(estimated) * (1 + formData.startPremium / 100);
        const endPrice = Number(estimated) * 0.95; // 5% 折扣
        setAuctionPreview({
          startPrice: startPrice.toFixed(2),
          endPrice: endPrice.toFixed(2),
          duration: formData.auctionDuration
        });
      }
    } else {
      setEstimatedOutput('');
      setAuctionPreview(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sui 交换</h1>
          <p className="text-gray-600">体验高速、低成本的 Sui 网络交易</p>
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
                <option value="SUI">SUI</option>
                <option value="USDC">USDC</option>
                <option value="USDT">USDT</option>
                <option value="WETH">WETH</option>
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
              余额: 100.0 {formData.fromToken}
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
                <option value="SUI">SUI</option>
                <option value="USDT">USDT</option>
                <option value="WETH">WETH</option>
              </select>
              <div className="flex-1 text-2xl font-semibold text-gray-900">
                {estimatedOutput || '0.0'}
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              估算输出
            </div>
          </div>

          {/* Dutch Auction Settings */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-orange-900">🎯 荷兰式拍卖</h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableDutchAuction}
                  onChange={(e) => setFormData(prev => ({ ...prev, enableDutchAuction: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>
            
            {formData.enableDutchAuction && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-orange-700 mb-2">
                      拍卖时长 (秒)
                    </label>
                    <input
                      type="number"
                      value={formData.auctionDuration}
                      onChange={(e) => setFormData(prev => ({ ...prev, auctionDuration: Number(e.target.value) }))}
                      className="w-full border border-orange-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-700 mb-2">
                      起始溢价 (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.startPremium}
                      onChange={(e) => setFormData(prev => ({ ...prev, startPremium: Number(e.target.value) }))}
                      className="w-full border border-orange-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {auctionPreview && (
                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <h4 className="font-medium text-orange-900 mb-3">拍卖预览</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-orange-700">起始价格:</span>
                        <span className="text-orange-900 font-medium">{auctionPreview.startPrice} {formData.toToken}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-700">结束价格:</span>
                        <span className="text-orange-900 font-medium">{auctionPreview.endPrice} {formData.toToken}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-700">价格衰减:</span>
                        <span className="text-orange-900 font-medium">线性递减</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Transaction Info */}
          {estimatedOutput && (
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="font-medium text-blue-900 mb-3">交易信息</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">汇率:</span>
                  <span className="text-blue-900 font-medium">1 {formData.fromToken} = 0.5 {formData.toToken}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">网络费用:</span>
                  <span className="text-blue-900 font-medium">~$0.01</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">预期执行时间:</span>
                  <span className="text-blue-900 font-medium">{formData.enableDutchAuction ? '< 5分钟' : '< 3秒'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            disabled={!formData.amount || isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>创建订单中...</span>
              </div>
            ) : (
              formData.enableDutchAuction ? '创建拍卖订单' : '立即交换'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}