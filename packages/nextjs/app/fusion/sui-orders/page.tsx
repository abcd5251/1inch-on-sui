"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { useSuiFusion } from "~~/hooks/fusion/useSuiFusion";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { notification } from "~~/utils/scaffold-eth";
import { suiFusionConfig } from "~~/services/fusion/suiConfig";

interface SuiOrder {
  id: string;
  fromTokenType: string;
  toTokenType: string;
  amount: string;
  status: "pending" | "filled" | "cancelled" | "expired";
  createdAt: number;
  expiresAt: number;
  walletAddress: string;
  rate?: string;
  filledAmount?: string;
  txHash?: string;
}

const SuiOrdersPage: NextPage = () => {
  const currentAccount = useCurrentAccount();
  const [orders, setOrders] = useState<SuiOrder[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "filled" | "cancelled">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [showPrivateKeyInput, setShowPrivateKeyInput] = useState(false);

  const suiFusion = useSuiFusion({
    network: "testnet",
    packageId: suiFusionConfig.defaultPackageId,
  });

  // Mock orders data for demonstration
  const mockOrders: SuiOrder[] = [
    {
      id: "0x1234...abcd",
      fromTokenType: "0x2::sui::SUI",
      toTokenType: "0x2::coin::COIN<0x123::usdc::USDC>",
      amount: "1000000000", // 1 SUI
      status: "pending",
      createdAt: Date.now() - 3600000, // 1 hour ago
      expiresAt: Date.now() + 86400000, // 24 hours from now
      walletAddress: currentAccount?.address || "0x...",
      rate: "2.15",
    },
    {
      id: "0x5678...efgh",
      fromTokenType: "0x2::coin::COIN<0x123::usdc::USDC>",
      toTokenType: "0x2::sui::SUI",
      amount: "5000000", // 5 USDC
      status: "filled",
      createdAt: Date.now() - 7200000, // 2 hours ago
      expiresAt: Date.now() + 82800000, // 23 hours from now
      walletAddress: currentAccount?.address || "0x...",
      rate: "0.465",
      filledAmount: "10750000000", // 10.75 SUI
      txHash: "0xabcd1234...",
    },
    {
      id: "0x9abc...ijkl",
      fromTokenType: "0x2::sui::SUI",
      toTokenType: "0x2::coin::COIN<0x123::weth::WETH>",
      amount: "5000000000", // 5 SUI
      status: "cancelled",
      createdAt: Date.now() - 10800000, // 3 hours ago
      expiresAt: Date.now() + 79200000, // 22 hours from now
      walletAddress: currentAccount?.address || "0x...",
      rate: "0.00085",
    },
  ];

  useEffect(() => {
    loadOrders();
  }, [currentAccount]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would fetch from the Sui network
      // For now, we'll use mock data
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setOrders(mockOrders);
    } catch (error) {
      console.error("Failed to load orders:", error);
      notification.error("Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialize = async () => {
    if (!privateKey) {
      notification.error("Please enter your private key");
      return;
    }
    await suiFusion.initializeWithPrivateKey(privateKey);
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      // In a real implementation, this would call the Sui contract
      notification.success(`Order ${orderId.slice(0, 8)}... cancelled`);
      await loadOrders();
    } catch (error) {
      console.error("Failed to cancel order:", error);
      notification.error("Failed to cancel order");
    }
  };

  const getTokenSymbol = (tokenType: string): string => {
    if (tokenType.includes("sui::SUI")) return "SUI";
    if (tokenType.includes("usdc::USDC")) return "USDC";
    if (tokenType.includes("usdt::USDT")) return "USDT";
    if (tokenType.includes("weth::WETH")) return "WETH";
    if (tokenType.includes("cetus::CETUS")) return "CETUS";
    return "Unknown";
  };

  const formatAmount = (amount: string, tokenType: string): string => {
    const decimals = tokenType.includes("sui::SUI") ? 9 : 
                    tokenType.includes("usdc::USDC") || tokenType.includes("usdt::USDT") ? 6 : 
                    tokenType.includes("weth::WETH") ? 18 : 9;
    return (parseFloat(amount) / Math.pow(10, decimals)).toFixed(6);
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: "badge-warning",
      filled: "badge-success",
      cancelled: "badge-error",
      expired: "badge-neutral",
    };
    return `badge ${statusClasses[status as keyof typeof statusClasses] || "badge-neutral"}`;
  };

  const filteredOrders = orders.filter(order => 
    filter === "all" || order.status === filter
  );

  const isInitialized = suiFusion.isServiceInitialized();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
            🌊 Sui Fusion Orders
          </h1>
          <p className="text-lg text-base-content/70">
            Manage your Sui network Fusion orders
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center mb-8">
          <div className="breadcrumbs text-sm">
            <ul>
              <li><Link href="/fusion" className="link link-primary">Fusion</Link></li>
              <li>Sui Orders</li>
            </ul>
          </div>
        </div>

        {/* Private Key Input (for demo purposes) */}
        {!isInitialized && (
          <div className="card bg-base-100 shadow-lg mb-8">
            <div className="card-body">
              <h3 className="card-title">Initialize Sui Service</h3>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Private Key (Demo Only)</span>
                  <button
                    className="label-text-alt link link-primary"
                    onClick={() => setShowPrivateKeyInput(!showPrivateKeyInput)}
                  >
                    {showPrivateKeyInput ? "Hide" : "Show"}
                  </button>
                </label>
                {showPrivateKeyInput && (
                  <div className="join">
                    <input
                      type="password"
                      placeholder="Enter your private key"
                      className="input input-bordered join-item flex-1"
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                    />
                    <button
                      className="btn btn-primary join-item"
                      onClick={handleInitialize}
                      disabled={suiFusion.isLoading || !privateKey}
                    >
                      {suiFusion.isLoading ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        "Initialize"
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters and Actions */}
        <div className="card bg-base-100 shadow-lg mb-8">
          <div className="card-body">
            <div className="flex flex-wrap justify-between items-center gap-4">
              {/* Filter Tabs */}
              <div className="tabs tabs-boxed">
                <button
                  className={`tab ${filter === "all" ? "tab-active" : ""}`}
                  onClick={() => setFilter("all")}
                >
                  All ({orders.length})
                </button>
                <button
                  className={`tab ${filter === "pending" ? "tab-active" : ""}`}
                  onClick={() => setFilter("pending")}
                >
                  Pending ({orders.filter(o => o.status === "pending").length})
                </button>
                <button
                  className={`tab ${filter === "filled" ? "tab-active" : ""}`}
                  onClick={() => setFilter("filled")}
                >
                  Filled ({orders.filter(o => o.status === "filled").length})
                </button>
                <button
                  className={`tab ${filter === "cancelled" ? "tab-active" : ""}`}
                  onClick={() => setFilter("cancelled")}
                >
                  Cancelled ({orders.filter(o => o.status === "cancelled").length})
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={loadOrders}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    "🔄 Refresh"
                  )}
                </button>
                <Link href="/fusion" className="btn btn-primary btn-sm">
                  + New Order
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold mb-2">No orders found</h3>
                <p className="text-base-content/70 mb-4">
                  {filter === "all" 
                    ? "You haven&apos;t created any Sui Fusion orders yet."
                    : `No ${filter} orders found.`
                  }
                </p>
                <Link href="/fusion" className="btn btn-primary">
                  Create Your First Order
                </Link>
              </div>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id} className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
                <div className="card-body">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">
                          {getTokenSymbol(order.fromTokenType)} → {getTokenSymbol(order.toTokenType)}
                        </h3>
                        <div className={getStatusBadge(order.status)}>
                          {order.status}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-base-content/70">Amount:</span>
                          <span className="ml-2 font-mono">
                            {formatAmount(order.amount, order.fromTokenType)} {getTokenSymbol(order.fromTokenType)}
                          </span>
                        </div>
                        
                        {order.rate && (
                          <div>
                            <span className="text-base-content/70">Rate:</span>
                            <span className="ml-2 font-mono">
                              1 {getTokenSymbol(order.fromTokenType)} = {order.rate} {getTokenSymbol(order.toTokenType)}
                            </span>
                          </div>
                        )}
                        
                        <div>
                          <span className="text-base-content/70">Created:</span>
                          <span className="ml-2">
                            {new Date(order.createdAt).toLocaleString()}
                          </span>
                        </div>
                        
                        <div>
                          <span className="text-base-content/70">Expires:</span>
                          <span className="ml-2">
                            {new Date(order.expiresAt).toLocaleString()}
                          </span>
                        </div>
                        
                        {order.filledAmount && (
                          <div>
                            <span className="text-base-content/70">Filled:</span>
                            <span className="ml-2 font-mono">
                              {formatAmount(order.filledAmount, order.toTokenType)} {getTokenSymbol(order.toTokenType)}
                            </span>
                          </div>
                        )}
                        
                        <div>
                          <span className="text-base-content/70">Order ID:</span>
                          <span className="ml-2 font-mono text-xs">
                            {order.id.slice(0, 12)}...{order.id.slice(-8)}
                          </span>
                        </div>
                      </div>
                      
                      {order.txHash && (
                        <div className="mt-2">
                          <a
                            href={`${suiFusionConfig.networks.testnet.explorerUrl}/txblock/${order.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link link-primary text-sm"
                          >
                            View Transaction ↗
                          </a>
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {order.status === "pending" && (
                        <button
                          className="btn btn-error btn-sm"
                          onClick={() => handleCancelOrder(order.id)}
                        >
                          Cancel
                        </button>
                      )}
                      
                      <a
                        href={`${suiFusionConfig.networks.testnet.explorerUrl}/object/${order.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm"
                      >
                        View on Explorer ↗
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 text-center">
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/fusion" className="btn btn-primary">
              🔄 New Swap
            </Link>
            <Link href="/fusion/history" className="btn btn-outline">
              📊 History
            </Link>
            <Link href="/fusion/analytics" className="btn btn-outline">
              📈 Analytics
            </Link>
            <Link href="/fusion/settings" className="btn btn-outline">
              ⚙️ Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuiOrdersPage;