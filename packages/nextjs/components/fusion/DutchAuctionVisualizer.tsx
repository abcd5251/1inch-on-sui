"use client";

import React, { useEffect, useState } from "react";
import { AuctionDetails, FusionOrder } from "@1inch/sui-fusion-sdk";

interface DutchAuctionVisualizerProps {
  auctionDetails: AuctionDetails;
  order?: FusionOrder;
  className?: string;
}

export const DutchAuctionVisualizer: React.FC<DutchAuctionVisualizerProps> = ({
  auctionDetails,
  order,
  className = "",
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    // Update every 500ms for smoother demo experience
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Calculate auction progress
  const totalDuration = auctionDetails.endTime - auctionDetails.startTime;
  const elapsed = currentTime - auctionDetails.startTime;
  const progress = Math.max(0, Math.min(1, elapsed / totalDuration));
  const remainingTime = Math.max(0, auctionDetails.endTime - currentTime);

  // Calculate current rate based on linear decay
  const startRate = parseFloat(auctionDetails.startRate);
  const endRate = parseFloat(auctionDetails.endRate);
  const calculatedCurrentRate = startRate - (startRate - endRate) * progress;

  // Use provided current rate or calculated rate
  const displayRate = auctionDetails.currentRate 
    ? parseFloat(auctionDetails.currentRate) 
    : calculatedCurrentRate;

  const isActive = remainingTime > 0 && (!order || order.status === 'pending');
  const isExpired = remainingTime <= 0;
  const isFilled = order?.status === 'filled';

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.floor(seconds)}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (isFilled) return 'text-success';
    if (isExpired) return 'text-error';
    if (isActive) return 'text-warning';
    return 'text-base-content';
  };

  const getStatusIcon = () => {
    if (isFilled) return '✅';
    if (isExpired) return '⏰';
    if (isActive) return '🎯';
    return '⭕';
  };

  const getStatusText = () => {
    if (isFilled) return 'Filled';
    if (isExpired) return 'Expired';
    if (isActive) return 'Active';
    return 'Inactive';
  };

  return (
    <div className={`card bg-base-100 shadow-lg ${className}`}>
      <div className="card-body p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">🎯 Dutch Auction</h3>
          <div className={`badge badge-lg ${getStatusColor()}`}>
            {getStatusIcon()} {getStatusText()}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Auction Progress</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="w-full bg-base-300 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-1000 ${
                isActive ? 'bg-gradient-to-r from-primary to-accent' : 
                isFilled ? 'bg-success' : 'bg-error'
              }`}
              style={{ width: `${progress * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Current Rate Display */}
        <div className="text-center mb-4">
          <div className="text-sm text-base-content/70">Current Exchange Rate</div>
          <div className="text-3xl font-bold text-primary">
            {displayRate.toFixed(4)}
          </div>
          <div className="text-sm text-base-content/60">
            USDC per SUI
          </div>
          <div className="text-xs text-base-content/50 mt-1">
            {progress < 0.3 ? '🔥 Premium Rate' : 
             progress < 0.7 ? '📊 Market Rate' : 
             '💰 Discount Rate'}
          </div>
        </div>

        {/* Rate Range */}
        <div className="flex justify-between mb-4">
          <div className="text-center">
            <div className="text-xs text-base-content/70">Start Rate</div>
            <div className="text-sm font-semibold text-success">
              {startRate.toFixed(4)}
            </div>
            <div className="text-xs text-success">+8% Premium</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-base-content/70">End Rate</div>
            <div className="text-sm font-semibold text-error">
              {endRate.toFixed(4)}
            </div>
            <div className="text-xs text-error">-8% Discount</div>
          </div>
        </div>

        {/* Time Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-base-content/70">Remaining Time</div>
            <div className={`font-mono font-semibold text-lg ${isActive ? 'text-warning animate-pulse' : 'text-base-content'}`}>
              {isActive ? formatTime(remainingTime / 1000) : '00:00'}
            </div>
            {isActive && remainingTime < 10000 && (
              <div className="text-xs text-warning">🔥 Final seconds!</div>
            )}
          </div>
          <div>
            <div className="text-base-content/70">Total Duration</div>
            <div className="font-mono font-semibold text-lg">
              {formatTime(auctionDetails.duration)}
            </div>
            <div className="text-xs text-base-content/50">
              1-minute demo
            </div>
          </div>
        </div>

        {/* Fill Information */}
        {order && order.fillHistory && order.fillHistory.length > 0 && (
          <div className="mt-4 p-3 bg-success/10 rounded-lg">
            <div className="text-sm font-semibold text-success mb-2">
              ✅ Order Filled!
            </div>
            {order.fillHistory.map((fill, index) => (
              <div key={fill.fillId} className="text-xs">
                <div>Fill #{index + 1}: {fill.fillAmount} at rate {parseFloat(fill.fillRate).toFixed(6)}</div>
                <div className="text-base-content/50">
                  Resolver: {fill.resolver.slice(0, 8)}...{fill.resolver.slice(-6)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Auction Stats */}
        <div className="mt-4 text-xs text-base-content/70">
          <div className="flex justify-between">
            <span>Decay Function:</span>
            <span className="capitalize">{auctionDetails.priceDecayFunction}</span>
          </div>
          <div className="flex justify-between">
            <span>Partial Fills:</span>
            <span>{order?.partialFillAllowed ? 'Allowed' : 'Not Allowed'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DutchAuctionVisualizer;