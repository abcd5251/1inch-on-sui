"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { FusionSwap } from "~~/components/fusion/FusionSwap";
import { SuiFusionSwap } from "~~/components/fusion/SuiFusionSwap";
import { DutchAuctionVisualizer } from "~~/components/fusion/DutchAuctionVisualizer";
import { useSuiFusion } from "~~/hooks/fusion/useSuiFusion";

const FusionPage: NextPage = () => {
  const [activeTab, setActiveTab] = useState("sui"); // Default to Sui for demo
  const [showDemo, setShowDemo] = useState(false);
  
  // Initialize Sui Fusion for demo
  const suiFusion = useSuiFusion({
    network: "testnet",
    useMockService: true, // Enable mock service for demo
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8 px-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              1inch Fusion
            </span>
          </h1>
          <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
            Experience the next generation of cross-chain swaps with 1inch Fusion. Get the best rates with minimal
            slippage and MEV protection.
          </p>
        </div>

        {/* Network Tabs */}
        <div className="flex justify-center mb-8">
          <div className="tabs tabs-boxed">
            <button
              className={`tab ${activeTab === "ethereum" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("ethereum")}
            >
              <span className="mr-2">⟠</span>
              Ethereum
            </button>
            <button className={`tab ${activeTab === "sui" ? "tab-active" : ""}`} onClick={() => setActiveTab("sui")}>
              <span className="mr-2">🌊</span>
              Sui
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-base-200 p-6 rounded-2xl text-center">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-bold mb-2">Lightning Fast</h3>
            <p className="text-sm text-base-content/70">Optimized routing for the fastest possible swaps</p>
          </div>
          <div className="bg-base-200 p-6 rounded-2xl text-center">
            <div className="text-3xl mb-3">🛡️</div>
            <h3 className="font-bold mb-2">MEV Protected</h3>
            <p className="text-sm text-base-content/70">Advanced protection against MEV attacks</p>
          </div>
          <div className="bg-base-200 p-6 rounded-2xl text-center">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="font-bold mb-2">Best Rates</h3>
            <p className="text-sm text-base-content/70">Aggregated liquidity for optimal pricing</p>
          </div>
        </div>

        {/* Demo Controls */}
        {activeTab === "sui" && (
          <div className="flex justify-center mb-8">
            <div className="card bg-gradient-to-r from-primary/10 to-accent/10 shadow-lg">
              <div className="card-body text-center">
                <h3 className="card-title justify-center">
                  <span className="text-2xl">🎯</span>
                  Live Dutch Auction Demo
                </h3>
                <p className="text-sm text-base-content/70 mb-4">
                  Experience real-time Dutch auction with mock data. Watch prices decay and see resolver competition.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowDemo(!showDemo)}
                >
                  {showDemo ? "Hide Demo" : "Show Live Demo"} 🚀
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4 justify-center mb-8">
          <Link href="/fusion/demo" className="btn btn-primary">
            🎯 Live Demo
          </Link>
          <Link href="/fusion/orders" className="btn btn-outline">
            View Orders
          </Link>
          <Link href="/fusion/analytics" className="btn btn-outline">
            Analytics
          </Link>
          <Link href="/fusion/history" className="btn btn-outline">
            History
          </Link>
          <Link href="/fusion/settings" className="btn btn-outline">
            Settings
          </Link>
          <Link href="/fusion/help" className="btn btn-outline">
            Help
          </Link>
        </div>

        {/* Demo Visualization */}
        {showDemo && activeTab === "sui" && (
          <div className="mb-8">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Live Dutch Auction */}
              {suiFusion.lastFusionOrder?.auctionDetails && (
                <DutchAuctionVisualizer
                  auctionDetails={suiFusion.lastFusionOrder.auctionDetails}
                  order={suiFusion.lastFusionOrder}
                  className="w-full"
                />
              )}
              
              {/* Demo Stats */}
              <div className="card bg-base-100 shadow-lg">
                <div className="card-body">
                  <h3 className="card-title">📊 Demo Statistics</h3>
                  <div className="stats stats-vertical w-full">
                    <div className="stat">
                      <div className="stat-title">Orders Created</div>
                      <div className="stat-value text-primary">
                        {suiFusion.fusionOrders.length}
                      </div>
                      <div className="stat-desc">Total fusion orders</div>
                    </div>
                    <div className="stat">
                      <div className="stat-title">Service Status</div>
                      <div className="stat-value text-success">
                        {suiFusion.isServiceInitialized() ? "🟢 Ready" : "🔴 Not Ready"}
                      </div>
                      <div className="stat-desc">Mock service active</div>
                    </div>
                    <div className="stat">
                      <div className="stat-title">Network</div>
                      <div className="stat-value text-accent">
                        {suiFusion.getNetworkInfo().network}
                      </div>
                      <div className="stat-desc">Sui testnet</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Demo Instructions */}
            <div className="mt-6 alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <h4 className="font-bold">How to use the demo:</h4>
                <ol className="list-decimal list-inside text-sm space-y-1 mt-2">
                  <li>Switch to Sui tab and enable Dutch Auction in the swap form</li>
                  <li>Create a fusion order to see live auction visualization</li>
                  <li>Watch the real-time price decay and auction progress</li>
                  <li>Observe resolver competition and potential fills</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Main Swap Component */}
        <div className="flex justify-center">{activeTab === "ethereum" ? <FusionSwap /> : <SuiFusionSwap />}</div>

        {/* Info Section */}
        <div className="mt-12 bg-base-200 p-6 rounded-2xl">
          <h2 className="text-xl font-bold mb-4">How 1inch Fusion Works</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">🔄 Intent-Based Trading</h3>
              <p className="text-sm text-base-content/70">
                Submit your swap intent and let resolvers compete to fill your order at the best possible price.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🎯 Dutch Auction Mechanism</h3>
              <p className="text-sm text-base-content/70">
                Prices start above market rate and decay over time, incentivizing fast fills while ensuring fair pricing.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">⏱️ Time-Based Execution</h3>
              <p className="text-sm text-base-content/70">
                Orders are executed within specified time windows with automatic fallback mechanisms.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🛡️ MEV Protection</h3>
              <p className="text-sm text-base-content/70">
                Advanced protection against MEV attacks through resolver competition and private mempools.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🌉 Cross-Chain Support</h3>
              <p className="text-sm text-base-content/70">
                Seamlessly swap tokens across different blockchains with built-in bridge functionality.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🔐 Secure & Trustless</h3>
              <p className="text-sm text-base-content/70">
                All swaps are secured by smart contracts with no need to trust intermediaries.
              </p>
            </div>
          </div>
        </div>

        {/* Dutch Auction Details */}
        {activeTab === "sui" && (
          <div className="mt-8 bg-gradient-to-r from-primary/5 to-accent/5 p-6 rounded-2xl">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">🎯</span>
              Dutch Auction on Sui
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold mb-2 text-primary">📈 Price Discovery</h3>
                <p className="text-sm text-base-content/70">
                  Start at premium rates (5%+ above market) and decay linearly or exponentially to below-market rates.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-accent">⚡ Fast Settlement</h3>
                <p className="text-sm text-base-content/70">
                  Resolvers compete to fill orders as soon as rates become profitable, ensuring quick execution.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-secondary">🔄 Partial Fills</h3>
                <p className="text-sm text-base-content/70">
                  Support for partial fills allows large orders to be filled incrementally by multiple resolvers.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Warning */}
        <div className="mt-6 alert alert-warning">
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
      </div>
    </div>
  );
};

export default FusionPage;
