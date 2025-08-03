"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";

interface FAQItem {
  question: string;
  answer: string;
  category: "general" | "trading" | "technical" | "fees";
}

const faqData: FAQItem[] = [
  {
    question: "What is 1inch Fusion?",
    answer:
      "1inch Fusion is an intent-based trading protocol that allows users to submit swap intents and have resolvers compete to fill orders at the best possible price. It provides MEV protection, cross-chain capabilities, and optimized execution.",
    category: "general",
  },
  {
    question: "How does intent-based trading work?",
    answer:
      "Instead of executing swaps immediately, you submit an 'intent' describing what you want to achieve. Resolvers then compete to fulfill your intent, often resulting in better prices and execution than traditional AMM swaps.",
    category: "general",
  },
  {
    question: "What are the different order presets?",
    answer:
      "Fast preset prioritizes quick execution with higher fees, Medium provides balanced execution, and Slow preset offers lower fees but may take longer to execute. Choose based on your urgency and fee preferences.",
    category: "trading",
  },
  {
    question: "Why do I need to approve tokens?",
    answer:
      "Token approval allows the 1inch Fusion smart contract to spend your tokens when an order is filled. This is a standard security practice in DeFi that gives you control over how much can be spent.",
    category: "technical",
  },
  {
    question: "What happens if my order isn't filled?",
    answer:
      "Orders have expiration times. If not filled within the time limit, they expire and can be cancelled without any cost. You can then create a new order with different parameters.",
    category: "trading",
  },
  {
    question: "Are there any fees for using Fusion?",
    answer:
      "1inch Fusion charges a small protocol fee, and you'll also pay gas fees for transactions. The exact fees depend on network conditions and the preset you choose.",
    category: "fees",
  },
  {
    question: "Is my private key safe?",
    answer:
      "This demo interface requires a private key for testing purposes only. NEVER use real private keys or mainnet funds. Always use testnets and test keys for development and testing.",
    category: "technical",
  },
  {
    question: "Can I cancel an order?",
    answer:
      "Yes, you can cancel pending orders at any time before they're filled. Cancelled orders don't incur any fees beyond the gas cost of the cancellation transaction.",
    category: "trading",
  },
  {
    question: "What is MEV protection?",
    answer:
      "MEV (Maximal Extractable Value) protection prevents bots from front-running your transactions or extracting value from your trades. Fusion's design inherently provides this protection.",
    category: "general",
  },
  {
    question: "How do I track my orders?",
    answer:
      "Use the Orders page to view active orders and the History page to see completed transactions. You can also view transaction details on Etherscan using the provided links.",
    category: "trading",
  },
];

const FusionHelpPage: NextPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const categories = [
    { id: "all", name: "All Topics", icon: "📚" },
    { id: "general", name: "General", icon: "❓" },
    { id: "trading", name: "Trading", icon: "💱" },
    { id: "technical", name: "Technical", icon: "⚙️" },
    { id: "fees", name: "Fees", icon: "💰" },
  ];

  const filteredFAQ = faqData.filter(item => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch =
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="breadcrumbs text-sm mb-6">
          <ul>
            <li>
              <Link href="/" className="link link-hover">
                Home
              </Link>
            </li>
            <li>
              <Link href="/fusion" className="link link-hover">
                Fusion
              </Link>
            </li>
            <li>Help</li>
          </ul>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Fusion Help Center
            </span>
          </h1>
          <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
            Find answers to common questions about 1inch Fusion and get help with trading.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Link href="/fusion" className="card bg-base-200 hover:bg-base-300 transition-colors">
            <div className="card-body text-center">
              <div className="text-3xl mb-2">🚀</div>
              <h3 className="card-title justify-center">Start Trading</h3>
              <p className="text-sm">Create your first Fusion order</p>
            </div>
          </Link>

          <Link href="/fusion/orders" className="card bg-base-200 hover:bg-base-300 transition-colors">
            <div className="card-body text-center">
              <div className="text-3xl mb-2">📋</div>
              <h3 className="card-title justify-center">View Orders</h3>
              <p className="text-sm">Track your active orders</p>
            </div>
          </Link>

          <Link href="/fusion/settings" className="card bg-base-200 hover:bg-base-300 transition-colors">
            <div className="card-body text-center">
              <div className="text-3xl mb-2">⚙️</div>
              <h3 className="card-title justify-center">Settings</h3>
              <p className="text-sm">Customize your experience</p>
            </div>
          </Link>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="form-control">
            <div className="input-group">
              <input
                type="text"
                placeholder="Search help topics..."
                className="input input-bordered flex-1"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <button className="btn btn-square">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(category => (
            <button
              key={category.id}
              className={`btn btn-sm ${selectedCategory === category.id ? "btn-primary" : "btn-outline"}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span className="mr-1">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="space-y-4 mb-8">
          {filteredFAQ.length > 0 ? (
            filteredFAQ.map((item, index) => (
              <div key={index} className="collapse collapse-plus bg-base-200">
                <input type="checkbox" checked={expandedItems.has(index)} onChange={() => toggleExpanded(index)} />
                <div className="collapse-title text-lg font-medium">{item.question}</div>
                <div className="collapse-content">
                  <p className="text-base-content/80">{item.answer}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-bold mb-2">No Results Found</h3>
              <p className="text-base-content/70">Try adjusting your search terms or category filter.</p>
            </div>
          )}
        </div>

        {/* Getting Started Guide */}
        <div className="bg-base-200 p-6 rounded-2xl mb-8">
          <h2 className="text-xl font-bold mb-4">Getting Started Guide</h2>
          <div className="steps steps-vertical lg:steps-horizontal">
            <div className="step step-primary">
              <div className="text-left">
                <h3 className="font-bold">Connect Wallet</h3>
                <p className="text-sm text-base-content/70">Connect your Web3 wallet to start trading</p>
              </div>
            </div>
            <div className="step step-primary">
              <div className="text-left">
                <h3 className="font-bold">Initialize SDK</h3>
                <p className="text-sm text-base-content/70">Enter your private key (testnet only)</p>
              </div>
            </div>
            <div className="step step-primary">
              <div className="text-left">
                <h3 className="font-bold">Select Tokens</h3>
                <p className="text-sm text-base-content/70">Choose tokens to swap and enter amount</p>
              </div>
            </div>
            <div className="step">
              <div className="text-left">
                <h3 className="font-bold">Create Order</h3>
                <p className="text-sm text-base-content/70">Submit your swap intent to the network</p>
              </div>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="space-y-4">
          <div className="alert alert-warning">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <h3 className="font-bold">Demo Environment</h3>
              <div className="text-sm">
                This is a demonstration interface. Never use real private keys or mainnet funds. Always test on testnets
                first.
              </div>
            </div>
          </div>

          <div className="alert alert-info">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <div>
              <h3 className="font-bold">Need More Help?</h3>
              <div className="text-sm">
                Visit the official 1inch documentation or join the community Discord for additional support.
              </div>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="text-center mt-8">
          <h3 className="text-lg font-bold mb-4">Still Need Help?</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="https://docs.1inch.io/docs/fusion-swap/introduction"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              📖 Documentation
            </a>
            <a href="https://discord.gg/1inch" target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              💬 Discord
            </a>
            <a href="https://github.com/1inch" target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              🐙 GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FusionHelpPage;
