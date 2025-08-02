/**
 * Relayer Demo Page
 * Demonstrates the real-time communication integration between NextJS and Relayer
 */

import React from 'react';
import Head from 'next/head';
import { SwapManager } from '../components/relayer/SwapManager';

/**
 * Relayer Demo Page Component
 */
const RelayerDemoPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Relayer 实时通信演示 - 1inch on Sui</title>
        <meta name="description" content="演示 NextJS 与 Relayer 之间的实时通信集成" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  1inch on Sui - Relayer 演示
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <a
                  href="/"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  返回首页
                </a>
                <a
                  href="https://github.com/1inch/1inch-on-sui"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="bg-white">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                实时跨链交换管理
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                体验 NextJS 前端与 Relayer 后端之间的实时 WebSocket 通信
              </p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-md mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">实时更新</h3>
                <p className="text-gray-600">
                  通过 WebSocket 连接实时接收交换状态更新，无需手动刷新页面
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-md mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">状态管理</h3>
                <p className="text-gray-600">
                  统一管理所有交换订单的状态，支持订阅特定订单的更新通知
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-md mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">API 集成</h3>
                <p className="text-gray-600">
                  完整的 REST API 集成，支持创建、查询、更新交换订单等操作
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-gray-50 py-8">
          <SwapManager />
        </div>

        {/* Instructions Section */}
        <div className="bg-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900">使用说明</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">开始使用</h4>
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                  <li>确保 Relayer 服务正在运行（默认端口 3001）</li>
                  <li>检查页面顶部的连接状态指示器</li>
                  <li>点击"创建交换"标签页创建新的跨链交换订单</li>
                  <li>在"活跃交换"标签页查看正在进行的订单</li>
                  <li>点击"订阅更新"按钮接收实时状态更新</li>
                </ol>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">技术特性</h4>
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  <li>WebSocket 实时通信</li>
                  <li>自动重连机制</li>
                  <li>错误处理和重试逻辑</li>
                  <li>状态订阅管理</li>
                  <li>响应式 UI 设计</li>
                  <li>TypeScript 类型安全</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-gray-800 text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-gray-400">
                © 2024 1inch on Sui. 这是一个演示项目，展示 NextJS 与 Relayer 的实时通信集成。
              </p>
              <div className="mt-4 space-x-6">
                <a
                  href="https://1inch.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white"
                >
                  1inch
                </a>
                <a
                  href="https://sui.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white"
                >
                  Sui Network
                </a>
                <a
                  href="https://nextjs.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white"
                >
                  Next.js
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default RelayerDemoPage;