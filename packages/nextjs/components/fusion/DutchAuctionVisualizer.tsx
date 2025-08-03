"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { AuctionDetails, FusionOrder } from "@1inch/sui-fusion-sdk";
import { useUnifiedStore } from "~~/services/store/unifiedStore";

// ==================== Extended Interfaces ====================

interface AuctionBid {
  id: string;
  bidder: string;
  price: number;
  timestamp: number;
  txHash?: string;
  status: 'pending' | 'confirmed' | 'failed';
}

interface DutchAuctionVisualizerProps {
  auctionDetails: AuctionDetails;
  order?: FusionOrder;
  className?: string;
  showBidding?: boolean;
  showChart?: boolean;
  onBidPlace?: (price: number) => void;
  onAuctionEnd?: (winningBid: AuctionBid | null) => void;
}

// ==================== Price Chart Component ====================

const PriceChart: React.FC<{
  auctionDetails: AuctionDetails;
  currentRate: number;
  bids: AuctionBid[];
  progress: number;
}> = ({ auctionDetails, currentRate, bids, progress }) => {
  const startRate = parseFloat(auctionDetails.startRate);
  const endRate = parseFloat(auctionDetails.endRate);
  
  // Generate price points for the chart
  const pricePoints = useMemo(() => {
    const points = [];
    const numPoints = 50;
    
    for (let i = 0; i <= numPoints; i++) {
      const timeProgress = i / numPoints;
      const rate = startRate - (startRate - endRate) * timeProgress;
      points.push({
        x: (timeProgress * 100),
        y: rate,
        isCurrentPosition: Math.abs(timeProgress - progress) < 0.02,
      });
    }
    
    return points;
  }, [startRate, endRate, progress]);
  
  const maxRate = Math.max(startRate, ...bids.map(b => b.price));
  const minRate = endRate;
  const rateRange = maxRate - minRate;
  
  const getYPosition = (rate: number) => {
    return 100 - ((rate - minRate) / rateRange) * 100;
  };
  
  return (
    <div className="relative h-32 bg-base-200 rounded-lg p-2">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        {/* Price decay line */}
        <polyline
          points={pricePoints.map(p => `${p.x},${getYPosition(p.y)}`).join(' ')}
          fill="none"
          stroke="hsl(var(--p))"
          strokeWidth="2"
          className="drop-shadow-sm"
        />
        
        {/* Current position indicator */}
        <circle
          cx={progress * 100}
          cy={getYPosition(currentRate)}
          r="2"
          fill="hsl(var(--er))"
          className="animate-pulse"
        />
        
        {/* Bid markers */}
        {bids.map((bid) => {
          const totalDuration = auctionDetails.endTime - auctionDetails.startTime;
          const bidProgress = Math.max(0, Math.min(1, (bid.timestamp - auctionDetails.startTime) / totalDuration));
          
          return (
            <circle
              key={bid.id}
              cx={bidProgress * 100}
              cy={getYPosition(bid.price)}
              r="1.5"
              fill={bid.status === 'confirmed' ? 'hsl(var(--su))' : 'hsl(var(--wa))'}
              stroke="white"
              strokeWidth="0.5"
            />
          );
        })}
        
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="hsl(var(--bc) / 0.1)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" opacity="0.3" />
      </svg>
      
      {/* Rate labels */}
      <div className="absolute top-1 left-1 text-xs font-medium bg-base-100 px-1 rounded">
        {startRate.toFixed(4)}
      </div>
      <div className="absolute bottom-1 left-1 text-xs font-medium bg-base-100 px-1 rounded">
        {endRate.toFixed(4)}
      </div>
      <div className="absolute top-1 right-1 text-xs font-medium text-error bg-base-100 px-1 rounded">
        {currentRate.toFixed(6)}
      </div>
    </div>
  );
};

export const DutchAuctionVisualizer: React.FC<DutchAuctionVisualizerProps> = ({
  auctionDetails,
  order,
  className = "",
  showBidding = false,
  showChart = false,
  onBidPlace,
  onAuctionEnd,
}) => {
  const { addToastNotification, addAuctionNotification } = useUnifiedStore();
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [bids, setBids] = useState<AuctionBid[]>([]);
  const [userBidAmount, setUserBidAmount] = useState('');
  const [isPlacingBid, setIsPlacingBid] = useState(false);

  // Generate mock bids for demo
  const generateMockBids = useCallback(() => {
    if (!showBidding) return;
    
    const startRate = parseFloat(auctionDetails.startRate);
    const endRate = parseFloat(auctionDetails.endRate);
    const mockBids: AuctionBid[] = [];
    
    // Generate 2-5 mock bids
    const numBids = Math.floor(Math.random() * 4) + 2;
    
    for (let i = 0; i < numBids; i++) {
      const timeProgress = Math.random() * 0.7; // Don't go too far into auction
      const timestamp = auctionDetails.startTime + (auctionDetails.endTime - auctionDetails.startTime) * timeProgress;
      const rateAtTime = startRate - (startRate - endRate) * timeProgress;
      const bidRate = rateAtTime * (1 + Math.random() * 0.03); // Up to 3% above current rate
      
      mockBids.push({
        id: `mock_bid_${i}`,
        bidder: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
        price: Number(bidRate.toFixed(6)),
        timestamp,
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        status: Math.random() > 0.1 ? 'confirmed' : 'pending',
      });
    }
    
    setBids(mockBids.sort((a, b) => b.timestamp - a.timestamp));
  }, [auctionDetails, showBidding]);

  useEffect(() => {
    // Generate initial mock bids
    generateMockBids();
  }, [generateMockBids]);

  useEffect(() => {
    // Update every 500ms for smoother demo experience
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Add occasional mock bids during auction
  useEffect(() => {
    if (!isActive || !showBidding) return;

    const interval = setInterval(() => {
      if (Math.random() < 0.2) { // 20% chance to add a bid
        const newBid: AuctionBid = {
          id: `live_bid_${Date.now()}`,
          bidder: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
          price: displayRate * (1 + Math.random() * 0.02), // Up to 2% above current rate
          timestamp: Date.now(),
          status: Math.random() > 0.1 ? 'confirmed' : 'pending',
        };
        
        setBids(prev => [newBid, ...prev].slice(0, 10)); // Keep only last 10 bids
        
        if (addAuctionNotification) {
          addAuctionNotification({
            auctionId: 'current',
            type: 'bid_placed',
            message: `New bid: ${newBid.price.toFixed(6)}`,
          });
        }
      }
    }, 4000); // Check every 4 seconds

    return () => clearInterval(interval);
  }, [isActive, showBidding, displayRate, addAuctionNotification]);

  // Handle user bid placement
  const handlePlaceBid = useCallback(async () => {
    if (!userBidAmount || isPlacingBid || !addToastNotification) return;
    
    const bidAmount = Number(userBidAmount);
    if (bidAmount <= displayRate) {
      addToastNotification({
        type: 'error',
        title: 'Invalid Bid',
        message: 'Bid must be higher than current rate',
      });
      return;
    }

    setIsPlacingBid(true);
    
    try {
      // Mock bid placement delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const userBid: AuctionBid = {
        id: `user_bid_${Date.now()}`,
        bidder: 'You',
        price: bidAmount,
        timestamp: Date.now(),
        status: 'pending',
      };
      
      setBids(prev => [userBid, ...prev]);
      setUserBidAmount('');
      
      onBidPlace?.(bidAmount);
      
      addToastNotification({
        type: 'success',
        title: 'Bid Placed',
        message: `Your bid of ${bidAmount.toFixed(6)} has been submitted`,
      });
      
      // Simulate confirmation after a delay
      setTimeout(() => {
        setBids(prev => prev.map(bid => 
          bid.id === userBid.id ? { ...bid, status: 'confirmed' } : bid
        ));
      }, 2000);
      
    } catch (error) {
      addToastNotification({
        type: 'error',
        title: 'Bid Failed',
        message: 'Failed to place bid. Please try again.',
      });
    } finally {
      setIsPlacingBid(false);
    }
  }, [userBidAmount, isPlacingBid, displayRate, onBidPlace, addToastNotification]);

  // Check for auction end
  useEffect(() => {
    if (!isActive && remainingTime <= 0 && onAuctionEnd) {
      const confirmedBids = bids.filter(bid => bid.status === 'confirmed');
      const bestBid = confirmedBids.reduce((best, current) => 
        !best || current.price > best.price ? current : best, null as AuctionBid | null
      );
      
      onAuctionEnd(bestBid);
    }
  }, [isActive, remainingTime, bids, onAuctionEnd]);

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