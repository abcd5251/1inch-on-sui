"use client";

import React from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { useFusion } from "./shared/context/FusionContext";
import NetworkSelector from "./shared/components/NetworkSelector";

const FusionPage: NextPage = () => {
  const { selectedNetwork } = useFusion();

  return (
    <div className="fusion-home min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              1inch Fusion
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            体验下一代跨链交易聚合平台。获得最佳汇率，享受最小滑点和MEV保护。
          </p>
          
          {/* Network Selector */}
          <div className="flex justify-center mb-8">
            <NetworkSelector className="bg-white shadow-lg rounded-xl p-6" />
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-8 rounded-2xl shadow-lg text-center hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">闪电般快速</h3>
            <p className="text-gray-600">优化路由算法，实现最快的交易执行</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-lg text-center hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🛡️</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">MEV 保护</h3>
            <p className="text-gray-600">先进的MEV攻击防护机制</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-lg text-center hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">最佳汇率</h3>
            <p className="text-gray-600">聚合流动性，提供最优价格</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">快速开始</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Link 
              href="/fusion/swap"
              className="group bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-3xl mb-3">🔄</div>
              <h3 className="font-bold mb-2">开始交易</h3>
              <p className="text-sm opacity-90">执行代币交换</p>
            </Link>
            
            <Link 
              href="/fusion/auctions"
              className="group bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-xl hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-bold mb-2">荷兰拍卖</h3>
              <p className="text-sm opacity-90">实时拍卖监控</p>
            </Link>
            
            <Link 
              href={`/fusion/${selectedNetwork}/orders`}
              className="group bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-3xl mb-3">📋</div>
              <h3 className="font-bold mb-2">我的订单</h3>
              <p className="text-sm opacity-90">管理交易订单</p>
            </Link>
            
            <Link 
              href={`/fusion/${selectedNetwork}/analytics`}
              className="group bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-bold mb-2">数据分析</h3>
              <p className="text-sm opacity-90">查看交易统计</p>
            </Link>
            
            <Link 
              href="/fusion/shared/demo"
              className="group bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-3xl mb-3">🚀</div>
              <h3 className="font-bold mb-2">功能演示</h3>
              <p className="text-sm opacity-90">体验实时演示</p>
            </Link>
          </div>
        </div>

        {/* Network Status */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-900">网络状态</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full mb-4">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                当前网络: {selectedNetwork === 'ethereum' ? 'Ethereum' : 'Sui'}
              </div>
              
              {selectedNetwork === 'ethereum' ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Gas Price:</span>
                    <span className="font-semibold">~25 gwei</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Block Time:</span>
                    <span className="font-semibold">~12s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Network:</span>
                    <span className="font-semibold text-green-600">Mainnet</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">TPS:</span>
                    <span className="font-semibold">~2,500</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Finality:</span>
                    <span className="font-semibold">~2.5s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Network:</span>
                    <span className="font-semibold text-orange-600">Testnet</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">实时统计</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">活跃订单:</span>
                  <span className="font-semibold text-blue-600">1,247</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">24h 交易量:</span>
                  <span className="font-semibold text-green-600">$2.4M</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">成功率:</span>
                  <span className="font-semibold text-purple-600">98.7%</span>
                </div>
              </div>
            </div>
          </div>
          
          {selectedNetwork === 'sui' && (
            <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-orange-800 text-sm text-center">
                🔴 这是演示环境，请勿使用真实私钥或主网资金
              </p>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">1inch Fusion 工作原理</h2>
            <p className="text-lg text-gray-600">
              体验基于意图的下一代 DEX 交易技术
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="font-bold mb-3 text-gray-900">意图交易</h3>
              <p className="text-sm text-gray-600">
                用户表达交易意图，解析器竞争提供最佳执行方案
              </p>
            </div>

            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <div className="text-3xl mb-4">⏰</div>
              <h3 className="font-bold mb-3 text-gray-900">荷兰式拍卖</h3>
              <p className="text-sm text-gray-600">
                价格随时间递减，确保最优价格发现和快速执行
              </p>
            </div>

            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <div className="text-3xl mb-4">🛡️</div>
              <h3 className="font-bold mb-3 text-gray-900">MEV 保护</h3>
              <p className="text-sm text-gray-600">
                通过解析器竞争和时间价格发现机制防护MEV攻击
              </p>
            </div>

            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <div className="text-3xl mb-4">🌉</div>
              <h3 className="font-bold mb-3 text-gray-900">跨链支持</h3>
              <p className="text-sm text-gray-600">
                支持 Ethereum 和 Sui 等多网络无缝交易
              </p>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
};

export default FusionPage;
