"use client";

import React from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { SuiFusionDemo } from "~~/components/fusion/SuiFusionDemo";

const DemoPage: NextPage = () => {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Navigation */}
        <div className="mb-6">
          <Link href="/fusion" className="btn btn-sm btn-outline">
            ← Back to Fusion
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              🎯 Sui Fusion Dutch Auction Demo
            </span>
          </h1>
          <p className="text-lg text-base-content/70 max-w-3xl mx-auto">
            Experience the complete 1inch Fusion flow on Sui with real-time Dutch auction visualization, 
            mock data, and live price decay monitoring.
          </p>
        </div>

        {/* Demo Component */}
        <SuiFusionDemo />

        {/* Technical Details */}
        <div className="mt-12 grid md:grid-cols-2 gap-8">
          {/* How It Works */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h3 className="card-title text-primary">🔧 How This Demo Works</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <strong className="text-accent">Mock Services:</strong> Uses MockFusionService to simulate 
                  real blockchain interactions without requiring actual funds or smart contracts.
                </div>
                <div>
                  <strong className="text-primary">Real-Time Updates:</strong> The Dutch auction visualizer 
                  updates every second to show live price decay and auction progress.
                </div>
                <div>
                  <strong className="text-secondary">Resolver Competition:</strong> Simulates multiple 
                  resolvers competing to fill orders at profitable rates.
                </div>
                <div>
                  <strong className="text-warning">MEV Protection:</strong> Demonstrates how Dutch auctions 
                  naturally protect against MEV through price discovery mechanisms.
                </div>
              </div>
            </div>
          </div>

          {/* Key Features */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h3 className="card-title text-accent">⭐ Key Features Demonstrated</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <span className="text-primary">📈</span>
                  <div>
                    <strong>Price Decay Functions:</strong> Linear and exponential decay algorithms 
                    for optimal price discovery.
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-accent">🔄</span>
                  <div>
                    <strong>Partial Fills:</strong> Support for multiple resolvers filling different 
                    portions of large orders.
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-secondary">⚡</span>
                  <div>
                    <strong>Fast Settlement:</strong> Real-time monitoring and instant execution 
                    when profitable rates are reached.
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-warning">🛡️</span>
                  <div>
                    <strong>Security:</strong> Trustless execution with smart contract guarantees 
                    and no counterparty risk.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SDK Integration */}
        <div className="mt-8 bg-gradient-to-r from-primary/5 to-accent/5 p-6 rounded-2xl">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <span className="mr-2">🔗</span>
            SDK Integration Details
          </h2>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <h3 className="font-semibold mb-2 text-primary">📦 Sui Fusion SDK</h3>
              <p className="text-base-content/70">
                Complete TypeScript SDK with FusionService, AuctionService, and ResolverService 
                for seamless Sui integration.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-accent">⚛️ React Integration</h3>
              <p className="text-base-content/70">
                Custom hooks (useSuiFusion) provide reactive state management and seamless 
                UI integration with real-time updates.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-secondary">🧪 Mock Testing</h3>
              <p className="text-base-content/70">
                Comprehensive mock services allow full feature testing without blockchain 
                dependencies or real funds.
              </p>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="mt-8 alert alert-warning">
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
            <h3 className="font-bold">Demo Environment Notice</h3>
            <div className="text-sm">
              This demo uses mock data and simulated blockchain interactions. In production, you would need:
              real Sui tokens, deployed smart contracts, actual resolver networks, and proper wallet integration.
              Never use real private keys in demo environments.
            </div>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="mt-12 flex justify-center space-x-4">
          <Link href="/fusion" className="btn btn-primary">
            Try Live Swap Interface
          </Link>
          <Link href="/fusion/orders" className="btn btn-outline">
            View Order Management
          </Link>
          <Link href="/fusion/analytics" className="btn btn-outline">
            Explore Analytics
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DemoPage;