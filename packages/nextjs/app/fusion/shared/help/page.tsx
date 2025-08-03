'use client';

import { useState } from 'react';
import Link from 'next/link';

interface HelpSection {
  id: string;
  title: string;
  icon: string;
  articles: Array<{
    id: string;
    title: string;
    description: string;
    content: string;
  }>;
}

const helpSections: HelpSection[] = [
  {
    id: 'getting-started',
    title: '快速开始',
    icon: '🚀',
    articles: [
      {
        id: 'what-is-fusion',
        title: '什么是 1inch Fusion？',
        description: '了解 Fusion 的基本概念和优势',
        content: `
# 什么是 1inch Fusion？

1inch Fusion 是一个革命性的去中心化交易协议，通过荷兰式拍卖机制为用户提供最优的交易体验。

## 主要特性

### 🎯 荷兰式拍卖
- 价格从高开始，逐渐降低直到有解析器接受
- 确保用户获得最佳可能价格
- 自动价格发现机制

### ⚡ 零 Gas 费交易
- 解析器承担 Gas 费用
- 用户无需支付网络费用
- 降低交易门槛

### 🛡️ MEV 保护
- 防止最大可提取价值攻击
- 保护用户免受套利机器人影响
- 确保公平交易环境

### 🌐 跨链支持
- 支持 Ethereum 和 Sui 网络
- 统一的交易体验
- 无缝网络切换
        `
      },
      {
        id: 'how-to-start',
        title: '如何开始使用？',
        description: '第一次使用 Fusion 的完整指南',
        content: `
# 如何开始使用 Fusion？

## 步骤 1：连接钱包
1. 点击右上角的"连接钱包"按钮
2. 选择您的钱包类型（MetaMask、WalletConnect 等）
3. 授权连接并确认

## 步骤 2：选择网络
1. 在网络选择器中选择 Ethereum 或 Sui
2. 确保钱包切换到对应网络
3. 检查网络状态是否正常

## 步骤 3：进行第一笔交易
1. 进入交换页面
2. 选择要交换的代币对
3. 输入交换数量
4. 设置交易参数（滑点、期限等）
5. 确认并提交交易

## 步骤 4：监控订单
1. 在订单页面查看交易状态
2. 实时跟踪拍卖进度
3. 查看最终执行价格
        `
      }
    ]
  },
  {
    id: 'trading',
    title: '交易指南',
    icon: '💱',
    articles: [
      {
        id: 'dutch-auction',
        title: '荷兰式拍卖详解',
        description: '深入了解荷兰式拍卖的工作原理',
        content: `
# 荷兰式拍卖详解

## 什么是荷兰式拍卖？

荷兰式拍卖是一种价格发现机制，价格从高开始逐渐降低，直到有买家愿意接受当前价格。

## 在 Fusion 中的应用

### 价格衰减机制
- **起始价格**：略高于市场价格，确保有利可图
- **结束价格**：略低于市场价格，确保订单被执行
- **衰减时间**：通常 2-5 分钟，可自定义

### 解析器竞争
- 多个解析器监控拍卖
- 在最优时机提交执行
- 竞争确保最佳价格

### 用户收益
- 获得比传统 AMM 更好的价格
- 零 Gas 费交易
- MEV 保护

## 最佳实践

1. **合理设置起始溢价**：2-5% 通常是合适的
2. **选择适当的拍卖时长**：流动性好的代币可以更短
3. **监控市场条件**：波动期间调整参数
        `
      },
      {
        id: 'order-types',
        title: '订单类型说明',
        description: '了解不同类型的订单及其用途',
        content: `
# 订单类型说明

## 拍卖订单

### 特点
- 通过荷兰式拍卖执行
- 价格逐渐衰减
- 解析器竞争执行

### 适用场景
- 大额交易
- 追求最佳价格
- 不急于立即执行

### 参数设置
- **起始溢价**：2-10%
- **拍卖时长**：2-10 分钟
- **最小接收量**：考虑滑点

## 即时订单

### 特点
- 立即执行
- 固定价格
- 快速确认

### 适用场景
- 小额交易
- 需要立即执行
- 价格敏感度低

### 注意事项
- 可能支付少量 Gas 费
- 价格可能不如拍卖优化
- 适合紧急交易

## 限价订单

### 特点
- 设定目标价格
- 等待市场达到
- 长期有效

### 适用场景
- 等待更好价格
- 长期投资策略
- 自动化交易
        `
      }
    ]
  },
  {
    id: 'networks',
    title: '网络支持',
    icon: '🌐',
    articles: [
      {
        id: 'ethereum-guide',
        title: 'Ethereum 网络指南',
        description: '在 Ethereum 上使用 Fusion 的完整指南',
        content: `
# Ethereum 网络指南

## 网络信息
- **网络名称**：Ethereum Mainnet
- **链 ID**：1
- **区块时间**：~12 秒
- **确认时间**：1-2 分钟

## 支持的代币
- ETH（原生代币）
- USDC、USDT、DAI（稳定币）
- WBTC、LINK、UNI（主流代币）
- 所有 ERC-20 代币

## Gas 费用
- **拍卖订单**：零 Gas 费
- **即时订单**：标准 Gas 费
- **代币授权**：一次性 Gas 费

## 最佳实践

### Gas 优化
1. 使用拍卖订单避免 Gas 费
2. 批量授权减少交易次数
3. 在 Gas 费低时进行授权

### 安全建议
1. 验证合约地址
2. 检查代币授权额度
3. 使用硬件钱包

### 性能优化
1. 选择合适的拍卖时长
2. 监控网络拥堵情况
3. 调整滑点容忍度
        `
      },
      {
        id: 'sui-guide',
        title: 'Sui 网络指南',
        description: '在 Sui 上使用 Fusion 的完整指南',
        content: `
# Sui 网络指南

## 网络信息
- **网络名称**：Sui Testnet
- **共识机制**：Narwhal & Bullshark
- **TPS**：2,000+
- **确认时间**：2-3 秒

## 支持的代币
- SUI（原生代币）
- USDC、USDT（桥接稳定币）
- WETH（桥接以太坊）
- 原生 Sui 代币

## 交易费用
- **极低费用**：通常 < $0.01
- **快速确认**：2-3 秒
- **高吞吐量**：无网络拥堵

## Sui 特色功能

### 并行执行
- 无关交易并行处理
- 更高的网络吞吐量
- 更低的延迟

### 对象模型
- 独特的数据结构
- 更安全的资产管理
- 更灵活的编程模型

### Move 语言
- 资源导向编程
- 内置安全特性
- 形式化验证支持

## 最佳实践

### 钱包设置
1. 安装 Sui Wallet
2. 获取测试网 SUI
3. 连接到测试网

### 交易优化
1. 利用快速确认
2. 使用较短的拍卖时长
3. 监控 Epoch 变化

### 安全注意
1. 仅使用测试网资金
2. 不要使用主网私钥
3. 定期备份钱包
        `
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: '故障排除',
    icon: '🔧',
    articles: [
      {
        id: 'common-issues',
        title: '常见问题解决',
        description: '解决使用过程中遇到的常见问题',
        content: `
# 常见问题解决

## 钱包连接问题

### 问题：无法连接钱包
**解决方案：**
1. 确保钱包扩展已安装并启用
2. 刷新页面重试
3. 检查钱包是否解锁
4. 尝试手动连接

### 问题：网络不匹配
**解决方案：**
1. 在钱包中切换到正确网络
2. 使用网络选择器自动切换
3. 手动添加网络配置

## 交易问题

### 问题：交易失败
**可能原因：**
- Gas 费不足
- 滑点过低
- 代币余额不足
- 网络拥堵

**解决方案：**
1. 检查余额是否充足
2. 增加滑点容忍度
3. 提高 Gas 价格
4. 等待网络恢复

### 问题：拍卖未执行
**可能原因：**
- 起始价格过高
- 市场流动性不足
- 解析器离线

**解决方案：**
1. 降低起始溢价
2. 延长拍卖时间
3. 切换到即时订单

## 性能问题

### 问题：页面加载慢
**解决方案：**
1. 检查网络连接
2. 清除浏览器缓存
3. 禁用不必要的扩展
4. 使用最新版本浏览器

### 问题：价格更新延迟
**解决方案：**
1. 刷新页面
2. 检查 RPC 连接
3. 切换到其他 RPC 节点
        `
      },
      {
        id: 'error-codes',
        title: '错误代码说明',
        description: '了解各种错误代码的含义和解决方法',
        content: `
# 错误代码说明

## 钱包错误

### 4001 - 用户拒绝
- **含义**：用户在钱包中拒绝了交易
- **解决**：重新发起交易并在钱包中确认

### 4100 - 未授权
- **含义**：钱包未连接或未授权
- **解决**：重新连接钱包并授权

### 4902 - 网络不存在
- **含义**：钱包中没有配置目标网络
- **解决**：添加网络配置或手动切换

## 合约错误

### INSUFFICIENT_BALANCE
- **含义**：代币余额不足
- **解决**：检查余额或减少交易数量

### INSUFFICIENT_ALLOWANCE
- **含义**：代币授权额度不足
- **解决**：增加代币授权额度

### SLIPPAGE_TOO_HIGH
- **含义**：价格滑点超过设定值
- **解决**：增加滑点容忍度或等待价格稳定

### DEADLINE_EXCEEDED
- **含义**：交易超过设定期限
- **解决**：延长交易期限或立即重试

## 网络错误

### NETWORK_ERROR
- **含义**：网络连接问题
- **解决**：检查网络连接或切换 RPC

### RPC_ERROR
- **含义**：RPC 节点响应错误
- **解决**：切换到其他 RPC 节点

### TIMEOUT_ERROR
- **含义**：请求超时
- **解决**：重试请求或检查网络状况

## 拍卖错误

### AUCTION_EXPIRED
- **含义**：拍卖已过期
- **解决**：创建新的拍卖订单

### NO_RESOLVERS
- **含义**：没有可用的解析器
- **解决**：等待解析器上线或使用即时订单

### PRICE_TOO_HIGH
- **含义**：起始价格过高
- **解决**：降低起始溢价重新创建
        `
      }
    ]
  }
];

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState<string>('getting-started');
  const [activeArticle, setActiveArticle] = useState<string>('what-is-fusion');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentSection = helpSections.find(s => s.id === activeSection);
  const currentArticle = currentSection?.articles.find(a => a.id === activeArticle);

  const filteredSections = helpSections.map(section => ({
    ...section,
    articles: section.articles.filter(article => 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.articles.length > 0);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8">
          <h1 className="text-3xl font-bold mb-2">帮助中心</h1>
          <p className="text-blue-100 mb-6">找到您需要的答案和指南</p>
          
          {/* Search */}
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="搜索帮助文档..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              🔍
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-1/3 bg-gray-50 p-6 border-r border-gray-200">
            <nav className="space-y-2">
              {(searchQuery ? filteredSections : helpSections).map(section => (
                <div key={section.id}>
                  <button
                    onClick={() => {
                      setActiveSection(section.id);
                      if (section.articles.length > 0) {
                        setActiveArticle(section.articles[0].id);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{section.icon}</span>
                      <span className="font-medium">{section.title}</span>
                    </div>
                  </button>
                  
                  {activeSection === section.id && (
                    <div className="ml-6 mt-2 space-y-1">
                      {section.articles.map(article => (
                        <button
                          key={article.id}
                          onClick={() => setActiveArticle(article.id)}
                          className={`w-full text-left p-2 rounded text-sm transition-colors ${
                            activeArticle === article.id
                              ? 'bg-blue-50 text-blue-600'
                              : 'hover:bg-gray-100 text-gray-600'
                          }`}
                        >
                          {article.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Quick Links */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-4">快速链接</h3>
              <div className="space-y-2">
                <Link 
                  href="/fusion/shared/demo"
                  className="block p-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                >
                  🎮 功能演示
                </Link>
                <Link 
                  href="/fusion/shared/settings"
                  className="block p-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                >
                  ⚙️ 设置中心
                </Link>
                <a 
                  href="https://discord.gg/1inch"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                >
                  💬 社区支持 ↗
                </a>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-8">
            {currentArticle ? (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {currentArticle.title}
                  </h2>
                  <p className="text-gray-600">{currentArticle.description}</p>
                </div>

                <div className="prose prose-lg max-w-none">
                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {currentArticle.content}
                  </div>
                </div>

                {/* Feedback */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-4">这篇文章对您有帮助吗？</h3>
                  <div className="flex space-x-4">
                    <button className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                      <span>👍</span>
                      <span>有帮助</span>
                    </button>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                      <span>👎</span>
                      <span>需要改进</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">选择一个主题</h3>
                <p className="text-gray-600">从左侧菜单选择您想了解的内容</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact Support */}
      <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-purple-900 mb-2">还有其他问题？</h3>
            <p className="text-purple-700 text-sm">联系我们的支持团队获取个性化帮助</p>
          </div>
          <div className="flex space-x-4">
            <a 
              href="mailto:support@1inch.io"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              📧 发送邮件
            </a>
            <a 
              href="https://discord.gg/1inch"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              💬 加入 Discord
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}