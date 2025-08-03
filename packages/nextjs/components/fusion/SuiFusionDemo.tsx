"use client";

import React, { useState, useEffect } from "react";
import { DutchAuctionVisualizer } from "./DutchAuctionVisualizer";
import { useSuiFusion } from "~~/hooks/fusion/useSuiFusion";
import { notification } from "~~/utils/scaffold-eth";

interface SuiFusionDemoProps {
  className?: string;
}

export const SuiFusionDemo: React.FC<SuiFusionDemoProps> = ({ className = "" }) => {
  const [demoStep, setDemoStep] = useState(0);
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const [auctionStartTime, setAuctionStartTime] = useState<number | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const suiFusion = useSuiFusion({
    network: "testnet",
    useMockService: true,
  });

  const demoSteps = [
    {
      title: "🔧 Initialize Service",
      description: "Initialize Sui Fusion service with mock data and wallet connection",
      duration: "~2s",
      action: async () => {
        await suiFusion.initializeWithPrivateKey("demo-key");
        notification.success("🎉 Service initialized successfully!");
      }
    },
    {
      title: "💰 Check Token Balances",
      description: "Verify available token balances for trading",
      duration: "~1s", 
      action: async () => {
        const balances = await suiFusion.getAllBalances();
        notification.success(`📊 Found ${balances.length} token balances`);
      }
    },
    {
      title: "📈 Get Auction Quote",
      description: "Request 1-minute Dutch auction quote for 1 SUI → USDC swap",
      duration: "~1s",
      action: async () => {
        await suiFusion.getAuctionQuote(
          {
            fromToken: "0x2::sui::SUI",
            toToken: "0x2::coin::COIN<0x123::usdc::USDC>",
            amount: "1000000000", // 1 SUI
            slippage: 0.5,
          },
          {
            duration: 60, // 1 minute auction
            startRateMultiplier: 1.08, // Start 8% above market
            endRateMultiplier: 0.92, // End 8% below market  
            priceDecayFunction: "linear",
            partialFillAllowed: true,
          }
        );
        notification.success("🎯 Dutch auction quote received!");
      }
    },
    {
      title: "🎯 Create Fusion Order",
      description: "Create 1-minute Dutch auction order with retrieved quote",
      duration: "~2s",
      action: async () => {
        if (!suiFusion.auctionQuote) {
          notification.error("❌ Please get auction quote first");
          return;
        }
        
        setAuctionStartTime(Date.now());
        await suiFusion.createFusionOrder({
          fromToken: "0x2::sui::SUI",
          toToken: "0x2::coin::COIN<0x123::usdc::USDC>",
          amount: "1000000000",
          slippage: 0.5,
          orderType: "market",
          expirationTime: Date.now() + 3600000,
          enableAuction: true,
          auctionDetails: suiFusion.auctionQuote.auctionDetails,
          partialFillAllowed: true,
          minFillAmount: "100000000", // Min 0.1 SUI
          maxFillAmount: "1000000000", // Max 1 SUI
        });
        notification.success("🚀 Dutch auction order created!");
      }
    },
    {
      title: "⏱️ Monitor Live Auction",
      description: "Watch real-time 60-second auction progress and price decay",
      duration: "60s",
      action: async () => {
        notification.info("🔍 Monitoring live auction... Watch the price decay below!");
      }
    },
    {
      title: "🏆 Auction Complete",
      description: "View final auction results and potential fills",
      duration: "~1s",
      action: async () => {
        const timeTaken = auctionStartTime ? Math.round((Date.now() - auctionStartTime) / 1000) : 60;
        notification.success(`✅ Auction completed in ${timeTaken} seconds!`);
      }
    }
  ];

  const runFullDemo = async () => {
    setIsRunningDemo(true);
    setDemoStep(0);
    
    for (let i = 0; i < demoSteps.length; i++) {
      setDemoStep(i);
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait 0.5 second
      
      try {
        await demoSteps[i].action();
        // Shorter delays for 1-minute demo efficiency
        if (i === 4) {
          // Skip delay for monitoring step to let auction run
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds between steps
        }
      } catch (error) {
        console.error(`Demo step ${i} failed:`, error);
        notification.error(`Demo step failed: ${demoSteps[i].title}`);
      }
    }
    
    setIsRunningDemo(false);
    setDemoStep(demoSteps.length);
  };

  const runSingleStep = async (stepIndex: number) => {
    setDemoStep(stepIndex);
    try {
      await demoSteps[stepIndex].action();
    } catch (error) {
      console.error(`Step ${stepIndex} failed:`, error);
      notification.error(`Step failed: ${demoSteps[stepIndex].title}`);
    }
  };

  return (
    <div className={`w-full space-y-6 ${className}`}>
      {/* Demo Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            🎯 Sui Fusion Live Demo
          </span>
        </h2>
        <p className="text-base-content/70">
          Experience the complete Dutch auction flow with real-time visualization
        </p>
      </div>

      {/* Demo Controls */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h3 className="card-title">Demo Controls</h3>
            <button
              className="btn btn-primary btn-sm"
              onClick={runFullDemo}
              disabled={isRunningDemo}
            >
              {isRunningDemo ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Running...
                </>
              ) : (
                "Run Full Demo 🚀"
              )}
            </button>
          </div>

          {/* Demo Steps */}
          <div className="space-y-3">
            {demoSteps.map((step, index) => (
              <div key={index} className={`card bg-base-200 ${demoStep === index ? 'ring-2 ring-primary' : ''}`}>
                <div className="card-body p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        demoStep > index ? 'bg-success text-success-content' :
                        demoStep === index ? 'bg-primary text-primary-content animate-pulse' :
                        'bg-base-300 text-base-content'
                      }`}>
                        {demoStep > index ? '✓' : index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{step.title}</h4>
                          {step.duration && (
                            <span className="badge badge-sm badge-outline">{step.duration}</span>
                          )}
                        </div>
                        <p className="text-sm text-base-content/70">{step.description}</p>
                        {demoStep === index && isRunningDemo && (
                          <div className="mt-2">
                            <div className="flex items-center gap-2 text-xs text-primary">
                              <span className="loading loading-spinner loading-xs"></span>
                              正在执行...
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => runSingleStep(index)}
                      disabled={isRunningDemo}
                    >
                      Run Step
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Visualization */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Dutch Auction Visualizer */}
        {suiFusion.lastFusionOrder?.auctionDetails && (
          <DutchAuctionVisualizer
            auctionDetails={suiFusion.lastFusionOrder.auctionDetails}
            order={suiFusion.lastFusionOrder}
            className="w-full"
          />
        )}

        {/* Demo Data */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h3 className="card-title">📊 Live Demo Data</h3>
            
            {/* Service Status */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Service Status:</span>
                <span className={`badge ${suiFusion.isServiceInitialized() ? 'badge-success' : 'badge-error'}`}>
                  {suiFusion.isServiceInitialized() ? '🟢 Ready' : '🔴 Not Ready'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">Network:</span>
                <span className="badge badge-primary">{suiFusion.getNetworkInfo().network}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">Orders Created:</span>
                <span className="badge badge-accent">{suiFusion.fusionOrders.length}</span>
              </div>
            </div>

            {/* Current Quote */}
            {suiFusion.auctionQuote && (
              <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                <h4 className="font-semibold text-primary mb-2">🎯 Current Auction Quote</h4>
                <div className="text-xs space-y-1">
                  <div>Rate: {suiFusion.auctionQuote.rate} USDC per SUI</div>
                  <div>Start Rate: {suiFusion.auctionQuote.auctionDetails.startRate}</div>
                  <div>End Rate: {suiFusion.auctionQuote.auctionDetails.endRate}</div>
                  <div>Duration: {suiFusion.auctionQuote.auctionDetails.duration}s</div>
                  <div>Resolvers: {suiFusion.auctionQuote.resolvers.length}</div>
                  <div>MEV Protection: {suiFusion.auctionQuote.mevProtection ? '✅' : '❌'}</div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {suiFusion.isLoading && (
              <div className="flex items-center justify-center p-4">
                <span className="loading loading-spinner loading-md"></span>
                <span className="ml-2">Processing...</span>
              </div>
            )}

            {/* Error State */}
            {suiFusion.error && (
              <div className="alert alert-error mt-4">
                <span className="text-sm">{suiFusion.error}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Demo Completion */}
      {demoStep >= demoSteps.length && !isRunningDemo && (
        <div className="alert alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-bold">1-Minute Demo Completed! 🎉</h4>
            <div className="text-sm">
              You've successfully experienced the complete Sui Fusion Dutch auction flow in just 1 minute!
              {suiFusion.lastFusionOrder?.auctionDetails && " Watch the auction visualization above for live updates!"}
            </div>
            <div className="text-xs text-base-content/70 mt-2">
              ⏱️ Auction Duration: 60 seconds • 🎯 Price Range: ±8% • 🔄 Real-time Updates
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuiFusionDemo;