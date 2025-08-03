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
    title: 'Getting Started',
    icon: '🚀',
    articles: [
      {
        id: 'what-is-fusion',
        title: 'What is 1inch Fusion?',
        description: 'Learn about the basic concepts and advantages of Fusion',
        content: `
# What is 1inch Fusion?

1inch Fusion is a revolutionary decentralized trading protocol that provides users with optimal trading experience through Dutch auction mechanisms.

## Key Features

### 🎯 Dutch Auction
- Price starts high and gradually decreases until a resolver accepts
- Ensures users get the best possible price
- Automatic price discovery mechanism

### ⚡ Zero Gas Fee Trading
- Resolvers bear the Gas fees
- Users don't need to pay network fees
- Lowers trading barriers

### 🛡️ MEV Protection
- Prevents Maximum Extractable Value attacks
- Protects users from arbitrage bots
- Ensures fair trading environment

### 🌐 Cross-chain Support
- Supports Ethereum and Sui networks
- Unified trading experience
- Seamless network switching
        `
      },
      {
        id: 'how-to-start',
        title: 'How to Get Started?',
        description: 'Complete guide for first-time Fusion users',
        content: `
# How to Get Started with Fusion?

## Step 1: Connect Wallet
1. Click the "Connect Wallet" button in the top right corner
2. Select your wallet type (MetaMask, WalletConnect, etc.)
3. Authorize the connection and confirm

## Step 2: Select Network
1. Choose Ethereum or Sui in the network selector
2. Ensure your wallet switches to the corresponding network
3. Check that the network status is normal

## Step 3: Make Your First Trade
1. Go to the swap page
2. Select the token pair you want to swap
3. Enter the swap amount
4. Set trading parameters (slippage, deadline, etc.)
5. Confirm and submit the transaction

## Step 4: Monitor Orders
1. View transaction status on the orders page
2. Track auction progress in real-time
3. View final execution price
        `
      }
    ]
  },
  {
    id: 'trading',
    title: 'Trading Guide',
    icon: '💱',
    articles: [
      {
        id: 'dutch-auction',
        title: 'Dutch Auction Explained',
        description: 'Deep dive into how Dutch auctions work',
        content: `
# Dutch Auction Explained

## What is a Dutch Auction?

A Dutch auction is a price discovery mechanism where the price starts high and gradually decreases until a buyer is willing to accept the current price.

## Application in Fusion

### Price Decay Mechanism
- **Starting Price**: Slightly above market price to ensure profitability
- **Ending Price**: Slightly below market price to ensure order execution
- **Decay Time**: Usually 2-5 minutes, customizable

### Resolver Competition
- Multiple resolvers monitor the auction
- Submit execution at optimal timing
- Competition ensures best price

### User Benefits
- Get better prices than traditional AMMs
- Zero Gas fee trading
- MEV protection

## Best Practices

1. **Set reasonable starting premium**: 2-5% is usually appropriate
2. **Choose appropriate auction duration**: Tokens with good liquidity can be shorter
3. **Monitor market conditions**: Adjust parameters during volatile periods
        `
      },
      {
        id: 'order-types',
        title: 'Order Types Explained',
        description: 'Learn about different order types and their uses',
        content: `
# Order Types Explained

## Auction Orders

### Features
- Executed through Dutch auction
- Price gradually decays
- Resolver competition for execution

### Use Cases
- Large transactions
- Seeking best price
- Not urgent for immediate execution

### Parameter Settings
- **Starting Premium**: 2-10%
- **Auction Duration**: 2-10 minutes
- **Minimum Receive Amount**: Consider slippage

## Instant Orders

### Features
- Immediate execution
- Fixed price
- Fast confirmation

### Use Cases
- Small transactions
- Need immediate execution
- Low price sensitivity

### Considerations
- May pay small Gas fees
- Price may not be as optimized as auction
- Suitable for urgent trades

## Limit Orders

### Features
- Set target price
- Wait for market to reach
- Long-term validity

### Use Cases
- Waiting for better prices
- Long-term investment strategy
- Automated trading
        `
      }
    ]
  },
  {
    id: 'networks',
    title: 'Network Support',
    icon: '🌐',
    articles: [
      {
        id: 'ethereum-guide',
        title: 'Ethereum Network Guide',
        description: 'Complete guide for using Fusion on Ethereum',
        content: `
# Ethereum Network Guide

## Network Information
- **Network Name**: Ethereum Mainnet
- **Chain ID**: 1
- **Block Time**: ~12 seconds
- **Confirmation Time**: 1-2 minutes

## Supported Tokens
- ETH (Native token)
- USDC, USDT, DAI (Stablecoins)
- WBTC, LINK, UNI (Major tokens)
- All ERC-20 tokens

## Gas Fees
- **Auction Orders**: Zero Gas fees
- **Instant Orders**: Standard Gas fees
- **Token Approval**: One-time Gas fee

## Best Practices

### Gas Optimization
1. Use auction orders to avoid Gas fees
2. Batch approvals to reduce transaction count
3. Approve during low Gas fee periods

### Security Recommendations
1. Verify contract addresses
2. Check token approval amounts
3. Use hardware wallets

### Performance Optimization
1. Choose appropriate auction duration
2. Monitor network congestion
3. Adjust slippage tolerance
        `
      },
      {
        id: 'sui-guide',
        title: 'Sui Network Guide',
        description: 'Complete guide for using Fusion on Sui',
        content: `
# Sui Network Guide

## Network Information
- **Network Name**: Sui Testnet
- **Consensus Mechanism**: Narwhal & Bullshark
- **TPS**: 2,000+
- **Confirmation Time**: 2-3 seconds

## Supported Tokens
- SUI (Native token)
- USDC, USDT (Bridged stablecoins)
- WETH (Bridged Ethereum)
- Native Sui tokens

## Transaction Fees
- **Ultra-low fees**: Usually < $0.01
- **Fast confirmation**: 2-3 seconds
- **High throughput**: No network congestion

## Sui Special Features

### Parallel Execution
- Unrelated transactions processed in parallel
- Higher network throughput
- Lower latency

### Object Model
- Unique data structure
- More secure asset management
- More flexible programming model

### Move Language
- Resource-oriented programming
- Built-in security features
- Formal verification support

## Best Practices

### Wallet Setup
1. Install Sui Wallet
2. Get testnet SUI
3. Connect to testnet

### Transaction Optimization
1. Leverage fast confirmation
2. Use shorter auction durations
3. Monitor Epoch changes

### Security Notes
1. Only use testnet funds
2. Don't use mainnet private keys
3. Regularly backup wallet
        `
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: '🔧',
    articles: [
      {
        id: 'common-issues',
        title: 'Common Issues Resolution',
        description: 'Resolve common issues encountered during use',
        content: `
# Common Issues Resolution

## Wallet Connection Issues

### Issue: Unable to Connect Wallet
**Solutions:**
1. Ensure wallet extension is installed and enabled
2. Refresh page and retry
3. Check if wallet is unlocked
4. Try manual connection

### Issue: Network Mismatch
**Solutions:**
1. Switch to correct network in wallet
2. Use network selector for automatic switching
3. Manually add network configuration

## Transaction Issues

### Issue: Transaction Failed
**Possible Causes:**
- Insufficient Gas fees
- Slippage too low
- Insufficient token balance
- Network congestion

**Solutions:**
1. Check if balance is sufficient
2. Increase slippage tolerance
3. Increase Gas price
4. Wait for network recovery

### Issue: Auction Not Executed
**Possible Causes:**
- Starting price too high
- Insufficient market liquidity
- Resolvers offline

**Solutions:**
1. Lower starting premium
2. Extend auction duration
3. Switch to instant orders

## Performance Issues

### Issue: Slow Page Loading
**Solutions:**
1. Check network connection
2. Clear browser cache
3. Disable unnecessary extensions
4. Use latest browser version

### Issue: Price Update Delay
**Solutions:**
1. Refresh page
2. Check RPC connection
3. Switch to other RPC nodes
        `
      },
      {
        id: 'error-codes',
        title: 'Error Code Explanations',
        description: 'Understand the meaning and solutions for various error codes',
        content: `
# Error Code Explanations

## Wallet Errors

### 4001 - User Rejected
- **Meaning**: User rejected the transaction in wallet
- **Solution**: Restart transaction and confirm in wallet

### 4100 - Unauthorized
- **Meaning**: Wallet not connected or unauthorized
- **Solution**: Reconnect wallet and authorize

### 4902 - Network Not Found
- **Meaning**: Target network not configured in wallet
- **Solution**: Add network configuration or switch manually

## Contract Errors

### INSUFFICIENT_BALANCE
- **Meaning**: Insufficient token balance
- **Solution**: Check balance or reduce transaction amount

### INSUFFICIENT_ALLOWANCE
- **Meaning**: Insufficient token allowance
- **Solution**: Increase token allowance

### SLIPPAGE_TOO_HIGH
- **Meaning**: Price slippage exceeds set value
- **Solution**: Increase slippage tolerance or wait for price stability

### DEADLINE_EXCEEDED
- **Meaning**: Transaction exceeded set deadline
- **Solution**: Extend transaction deadline or retry immediately

## Network Errors

### NETWORK_ERROR
- **Meaning**: Network connection issue
- **Solution**: Check network connection or switch RPC

### RPC_ERROR
- **Meaning**: RPC node response error
- **Solution**: Switch to other RPC nodes

### TIMEOUT_ERROR
- **Meaning**: Request timeout
- **Solution**: Retry request or check network conditions

## Auction Errors

### AUCTION_EXPIRED
- **Meaning**: Auction has expired
- **Solution**: Create new auction order

### NO_RESOLVERS
- **Meaning**: No available resolvers
- **Solution**: Wait for resolvers to come online or use instant orders

### PRICE_TOO_HIGH
- **Meaning**: Starting price too high
- **Solution**: Lower starting premium and recreate
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
          <h1 className="text-3xl font-bold mb-2">Help Center</h1>
          <p className="text-blue-100 mb-6">Find the answers and guides you need</p>
          
          {/* Search */}
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="Search help documentation..."
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
              <h3 className="font-medium text-gray-900 mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link 
                  href="/fusion/shared/demo"
                  className="block p-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                >
                  🎮 Feature Demo
                </Link>
                <Link 
                  href="/fusion/shared/settings"
                  className="block p-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                >
                  ⚙️ Settings Center
                </Link>
                <a 
                  href="https://discord.gg/1inch"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                >
                  💬 Community Support ↗
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
                  <h3 className="font-medium text-gray-900 mb-4">Was this article helpful?</h3>
                  <div className="flex space-x-4">
                    <button className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                      <span>👍</span>
                      <span>Helpful</span>
                    </button>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                      <span>👎</span>
                      <span>Needs Improvement</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Topic</h3>
                <p className="text-gray-600">Choose what you want to learn from the left menu</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact Support */}
      <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-purple-900 mb-2">Have other questions?</h3>
            <p className="text-purple-700 text-sm">Contact our support team for personalized help</p>
          </div>
          <div className="flex space-x-4">
            <a 
              href="mailto:support@1inch.io"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              📧 Send Email
            </a>
            <a 
              href="https://discord.gg/1inch"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              💬 Join Discord
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}