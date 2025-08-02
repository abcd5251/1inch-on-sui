"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowPathIcon, ChartLineIcon, PauseIcon, PlayIcon } from "@heroicons/react/24/outline";

interface AuctionParams {
  startPrice: number;
  endPrice: number;
  duration: number; // in seconds
  auctionType: "linear" | "exponential" | "competitive";
}

interface AuctionState {
  currentPrice: number;
  timeElapsed: number;
  isActive: boolean;
  participants: number;
  bestBid: number | null;
}

export const DutchAuctionVisualizer = () => {
  const [params, setParams] = useState<AuctionParams>({
    startPrice: 2.2,
    endPrice: 1.8,
    duration: 300, // 5 minutes
    auctionType: "linear",
  });

  const [state, setState] = useState<AuctionState>({
    currentPrice: 2.2,
    timeElapsed: 0,
    isActive: false,
    participants: 0,
    bestBid: null,
  });

  const [priceHistory, setPriceHistory] = useState<{ time: number; price: number; bid?: number }[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate current price based on auction type
  const calculatePrice = (timeElapsed: number): number => {
    const progress = Math.min(timeElapsed / params.duration, 1);
    const { startPrice, endPrice, auctionType } = params;

    switch (auctionType) {
      case "linear":
        return startPrice - (startPrice - endPrice) * progress;

      case "exponential":
        // Exponential decay
        const decayRate = Math.log(startPrice / endPrice) / params.duration;
        return startPrice * Math.exp(-decayRate * timeElapsed);

      case "competitive":
        // Competitive with step-down
        const steps = 10;
        const stepDuration = params.duration / steps;
        const currentStep = Math.floor(timeElapsed / stepDuration);
        const stepPrice = startPrice - (startPrice - endPrice) * (currentStep / steps);

        // Add some randomness for competitive bidding simulation
        const competitiveAdjustment = 1 - Math.random() * 0.02; // Up to 2% reduction
        return stepPrice * competitiveAdjustment;

      default:
        return startPrice;
    }
  };

  // Start auction
  const startAuction = () => {
    if (state.isActive) return;

    setState(prev => ({
      ...prev,
      isActive: true,
      timeElapsed: 0,
      currentPrice: params.startPrice,
      participants: Math.floor(Math.random() * 10) + 5,
      bestBid: null,
    }));

    setPriceHistory([{ time: 0, price: params.startPrice }]);

    intervalRef.current = setInterval(() => {
      setState(prev => {
        const newTimeElapsed = prev.timeElapsed + 1;
        const newPrice = calculatePrice(newTimeElapsed);
        const isComplete = newTimeElapsed >= params.duration;

        // Simulate random bids
        let newBid = null;
        if (Math.random() < 0.1 && !isComplete) {
          // 10% chance of bid each second
          newBid = newPrice + Math.random() * 0.05; // Slightly above current price
        }

        // Update price history
        setPriceHistory(history => [...history, { time: newTimeElapsed, price: newPrice, bid: newBid || undefined }]);

        if (isComplete && intervalRef.current) {
          clearInterval(intervalRef.current);
          return {
            ...prev,
            isActive: false,
            timeElapsed: params.duration,
            currentPrice: params.endPrice,
            bestBid: newBid || prev.bestBid,
          };
        }

        return {
          ...prev,
          timeElapsed: newTimeElapsed,
          currentPrice: newPrice,
          bestBid: newBid || prev.bestBid,
        };
      });
    }, 1000);
  };

  // Stop auction
  const stopAuction = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(prev => ({ ...prev, isActive: false }));
  };

  // Reset auction
  const resetAuction = () => {
    stopAuction();
    setState({
      currentPrice: params.startPrice,
      timeElapsed: 0,
      isActive: false,
      participants: 0,
      bestBid: null,
    });
    setPriceHistory([]);
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Chart component
  const PriceChart = () => {
    if (priceHistory.length === 0) return null;

    const maxPrice = Math.max(...priceHistory.map(h => h.price));
    const minPrice = Math.min(...priceHistory.map(h => h.price));
    const priceRange = maxPrice - minPrice;

    return (
      <div className="bg-base-100 rounded-lg p-4 h-64">
        <h3 className="text-lg font-semibold mb-4">Price Movement</h3>
        <div className="relative h-48">
          <svg width="100%" height="100%" className="overflow-visible">
            <defs>
              <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--p))" stopOpacity="0.3" />
                <stop offset="100%" stopColor="hsl(var(--p))" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(percent => (
              <line
                key={percent}
                x1="0"
                y1={`${percent}%`}
                x2="100%"
                y2={`${percent}%`}
                stroke="hsl(var(--bc))"
                strokeOpacity="0.1"
                strokeWidth="1"
              />
            ))}

            {/* Price line */}
            <polyline
              fill="none"
              stroke="hsl(var(--p))"
              strokeWidth="2"
              points={priceHistory
                .map((point, index) => {
                  const x = (index / (priceHistory.length - 1)) * 100;
                  const y = 100 - ((point.price - minPrice) / priceRange) * 100;
                  return `${x},${y}`;
                })
                .join(" ")}
            />

            {/* Area under curve */}
            <polygon
              fill="url(#priceGradient)"
              points={`0,100 ${priceHistory
                .map((point, index) => {
                  const x = (index / (priceHistory.length - 1)) * 100;
                  const y = 100 - ((point.price - minPrice) / priceRange) * 100;
                  return `${x},${y}`;
                })
                .join(" ")} 100,100`}
            />

            {/* Bid markers */}
            {priceHistory.map((point, index) => {
              if (!point.bid) return null;
              const x = (index / (priceHistory.length - 1)) * 100;
              const y = 100 - ((point.bid - minPrice) / priceRange) * 100;
              return (
                <circle
                  key={`bid-${index}`}
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="3"
                  fill="hsl(var(--s))"
                  stroke="white"
                  strokeWidth="1"
                />
              );
            })}
          </svg>
        </div>

        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-2">
          <span>${minPrice.toFixed(3)}</span>
          <span>${((maxPrice + minPrice) / 2).toFixed(3)}</span>
          <span>${maxPrice.toFixed(3)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-base-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <ChartLineIcon className="h-6 w-6 text-primary" />
          Dutch Auction Simulator
        </h2>

        {/* Control buttons */}
        <div className="flex gap-2">
          {!state.isActive ? (
            <button
              onClick={startAuction}
              className="btn btn-primary btn-sm"
              disabled={state.timeElapsed >= params.duration}
            >
              <PlayIcon className="h-4 w-4" />
              Start
            </button>
          ) : (
            <button onClick={stopAuction} className="btn btn-secondary btn-sm">
              <PauseIcon className="h-4 w-4" />
              Pause
            </button>
          )}
          <button onClick={resetAuction} className="btn btn-outline btn-sm">
            <ArrowPathIcon className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parameters */}
        <div className="bg-base-100 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Auction Parameters</h3>

          <div className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Start Price ($)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={params.startPrice}
                onChange={e => setParams(prev => ({ ...prev, startPrice: parseFloat(e.target.value) || 0 }))}
                className="input input-bordered input-sm"
                disabled={state.isActive}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">End Price ($)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={params.endPrice}
                onChange={e => setParams(prev => ({ ...prev, endPrice: parseFloat(e.target.value) || 0 }))}
                className="input input-bordered input-sm"
                disabled={state.isActive}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Duration (seconds)</span>
              </label>
              <input
                type="number"
                value={params.duration}
                onChange={e => setParams(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                className="input input-bordered input-sm"
                disabled={state.isActive}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Auction Type</span>
              </label>
              <select
                value={params.auctionType}
                onChange={e => setParams(prev => ({ ...prev, auctionType: e.target.value as any }))}
                className="select select-bordered select-sm"
                disabled={state.isActive}
              >
                <option value="linear">Linear</option>
                <option value="exponential">Exponential</option>
                <option value="competitive">Competitive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-base-100 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Current Status</h3>

          <div className="space-y-4">
            <div className="stat">
              <div className="stat-title">Current Price</div>
              <div className="stat-value text-2xl text-primary">${state.currentPrice.toFixed(3)}</div>
            </div>

            <div className="stat">
              <div className="stat-title">Time Elapsed</div>
              <div className="stat-value text-lg">
                {formatTime(state.timeElapsed)} / {formatTime(params.duration)}
              </div>
            </div>

            <div className="stat">
              <div className="stat-title">Active Participants</div>
              <div className="stat-value text-lg text-secondary">{state.participants}</div>
            </div>

            {state.bestBid && (
              <div className="stat">
                <div className="stat-title">Best Bid</div>
                <div className="stat-value text-lg text-accent">${state.bestBid.toFixed(3)}</div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span>{Math.round((state.timeElapsed / params.duration) * 100)}%</span>
            </div>
            <progress
              className="progress progress-primary w-full"
              value={state.timeElapsed}
              max={params.duration}
            ></progress>
          </div>

          {/* Status indicator */}
          <div className="mt-4">
            <div
              className={`badge ${
                state.isActive ? "badge-success" : state.timeElapsed >= params.duration ? "badge-info" : "badge-ghost"
              }`}
            >
              {state.isActive ? "Active" : state.timeElapsed >= params.duration ? "Completed" : "Ready"}
            </div>
          </div>
        </div>

        {/* Chart */}
        <PriceChart />
      </div>

      {/* Auction Type Explanation */}
      <div className="mt-6 bg-base-100 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Auction Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-base-200 rounded-lg">
            <h4 className="font-medium text-primary mb-2">Linear</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Price decreases steadily over time in a straight line from start to end price.
            </p>
          </div>
          <div className="p-3 bg-base-200 rounded-lg">
            <h4 className="font-medium text-secondary mb-2">Exponential</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Price decreases rapidly at first, then slows down following an exponential decay curve.
            </p>
          </div>
          <div className="p-3 bg-base-200 rounded-lg">
            <h4 className="font-medium text-accent mb-2">Competitive</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Price decreases in steps with competitive adjustments based on bidding activity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
