"use client";

import React, { useState } from "react";
import { FusionOrder } from "@1inch/sui-fusion-sdk";
import { DutchAuctionVisualizer } from "./DutchAuctionVisualizer";

interface FusionOrderDisplayProps {
  orders: FusionOrder[];
  className?: string;
}

export const FusionOrderDisplay: React.FC<FusionOrderDisplayProps> = ({ orders, className = "" }) => {
  const [selectedOrder, setSelectedOrder] = useState<FusionOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [auctionFilter, setAuctionFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning">Pending</span>;
      case 'filled':
        return <span className="badge badge-success">Filled</span>;
      case 'cancelled':
        return <span className="badge badge-error">Cancelled</span>;
      case 'expired':
        return <span className="badge badge-neutral">Expired</span>;
      default:
        return <span className="badge badge-ghost">{status}</span>;
    }
  };

  const getTokenSymbol = (tokenType: string): string => {
    if (tokenType.includes("sui::SUI")) return "SUI";
    if (tokenType.includes("usdc")) return "USDC";
    if (tokenType.includes("usdt")) return "USDT";
    if (tokenType.includes("weth")) return "WETH";
    return "UNKNOWN";
  };

  const formatAmount = (amount: string, tokenType: string): string => {
    const decimals = tokenType.includes("sui::SUI") ? 9 : 
                    tokenType.includes("usdc") || tokenType.includes("usdt") ? 6 : 18;
    const formattedAmount = (parseFloat(amount) / Math.pow(10, decimals)).toFixed(6);
    return formattedAmount;
  };

  // Filter and sort orders
  const filteredAndSortedOrders = React.useMemo(() => {
    let filtered = orders;

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Apply auction filter
    if (auctionFilter === "auction") {
      filtered = filtered.filter(order => order.enableAuction);
    } else if (auctionFilter === "regular") {
      filtered = filtered.filter(order => !order.enableAuction);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.createdAt - a.createdAt;
        case "oldest":
          return a.createdAt - b.createdAt;
        case "amount":
          return parseFloat(b.fromAmount) - parseFloat(a.fromAmount);
        case "status":
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filtered;
  }, [orders, statusFilter, auctionFilter, sortBy]);

  if (!orders || orders.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-xl font-semibold mb-2">No Fusion Orders Found</h3>
        <p className="text-base-content/70 mb-4">
          You haven't created any Fusion orders yet. Start by creating your first Dutch auction order!
        </p>
        <button className="btn btn-primary" onClick={() => window.location.href = '/fusion'}>
          Create Fusion Order
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filter and Sort Controls */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Status Filter */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Status</span>
                </label>
                <select 
                  className="select select-sm select-bordered w-32"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="filled">Filled</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Auction Filter */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Type</span>
                </label>
                <select 
                  className="select select-sm select-bordered w-36"
                  value={auctionFilter}
                  onChange={(e) => setAuctionFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="auction">Dutch Auction</option>
                  <option value="regular">Regular Order</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Sort By</span>
                </label>
                <select 
                  className="select select-sm select-bordered w-32"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="amount">Amount</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="text-sm text-base-content/70">
              Showing {filteredAndSortedOrders.length} of {orders.length} orders
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="grid gap-4">
        {filteredAndSortedOrders.map((order) => (
          <div key={order.id} className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Order Basic Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">
                      {formatAmount(order.fromAmount, order.fromToken)} {getTokenSymbol(order.fromToken)}
                      {" → "}
                      {formatAmount(order.toAmount, order.toToken)} {getTokenSymbol(order.toToken)}
                    </h3>
                    {getStatusBadge(order.status)}
                    {order.enableAuction && (
                      <span className="badge badge-primary">🎯 Dutch Auction</span>
                    )}
                  </div>
                  
                  <div className="text-sm text-base-content/70 space-y-1">
                    <div>Order ID: {order.id.slice(0, 12)}...{order.id.slice(-8)}</div>
                    <div>Created: {new Date(order.createdAt).toLocaleString()}</div>
                    <div>Expires: {new Date(order.expiresAt).toLocaleString()}</div>
                    {order.partialFillAllowed && (
                      <div className="text-accent">✓ Partial fills allowed</div>
                    )}
                  </div>
                </div>

                {/* Order Actions */}
                <div className="flex flex-col gap-2">
                  {order.enableAuction && order.auctionDetails && (
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                    >
                      {selectedOrder?.id === order.id ? "Hide Auction" : "View Auction"} 🎯
                    </button>
                  )}
                  
                  <div className="text-xs text-right">
                    <div>Type: {order.orderType}</div>
                    {order.txHash && (
                      <div className="text-primary cursor-pointer hover:underline">
                        Tx: {order.txHash.slice(0, 8)}...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Fill History */}
              {order.fillHistory && order.fillHistory.length > 0 && (
                <div className="mt-4 p-3 bg-success/10 rounded-lg">
                  <h4 className="font-semibold text-success mb-2">Fill History</h4>
                  {order.fillHistory.map((fill, index) => (
                    <div key={fill.fillId} className="text-xs text-base-content/70 mb-1">
                      Fill #{index + 1}: {formatAmount(fill.fillAmount, order.fromToken)} at rate {parseFloat(fill.fillRate).toFixed(6)}
                      <div className="text-xs">
                        Resolver: {fill.resolver.slice(0, 8)}...{fill.resolver.slice(-6)} | 
                        {new Date(fill.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Dutch Auction Visualization */}
              {selectedOrder?.id === order.id && order.auctionDetails && (
                <div className="mt-4 border-t pt-4">
                  <DutchAuctionVisualizer
                    auctionDetails={order.auctionDetails}
                    order={order}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Statistics */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title">📊 Order Summary</h3>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="stat">
              <div className="stat-title">Total Orders</div>
              <div className="stat-value text-primary">{orders.length}</div>
              <div className="stat-desc">All time</div>
            </div>
            <div className="stat">
              <div className="stat-title">Dutch Auctions</div>
              <div className="stat-value text-accent">
                {orders.filter(o => o.enableAuction).length}
              </div>
              <div className="stat-desc">With price decay</div>
            </div>
            <div className="stat">
              <div className="stat-title">Filled Orders</div>
              <div className="stat-value text-success">
                {orders.filter(o => o.status === 'filled').length}
              </div>
              <div className="stat-desc">Successfully executed</div>
            </div>
            <div className="stat">
              <div className="stat-title">Active Orders</div>
              <div className="stat-value text-warning">
                {orders.filter(o => o.status === 'pending').length}
              </div>
              <div className="stat-desc">Waiting for fill</div>
            </div>
            <div className="stat">
              <div className="stat-title">Partial Fills</div>
              <div className="stat-value text-info">
                {orders.filter(o => o.fillHistory && o.fillHistory.length > 1).length}
              </div>
              <div className="stat-desc">Multiple resolvers</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FusionOrderDisplay;