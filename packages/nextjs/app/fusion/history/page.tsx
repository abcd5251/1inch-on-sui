"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useFusion } from "~~/hooks/fusion/useFusion";

interface HistoryFilter {
  status: "all" | "filled" | "cancelled" | "expired" | "pending";
  timeRange: "24h" | "7d" | "30d" | "90d" | "all";
  tokenPair: string;
}

interface OrderHistory {
  id: string;
  timestamp: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  status: "filled" | "cancelled" | "expired" | "pending";
  txHash?: string;
  gasUsed?: string;
  executionTime?: number;
}

const FusionHistoryPage: NextPage = () => {
  const { address } = useAccount();
  const [filter, setFilter] = useState<HistoryFilter>({
    status: "all",
    timeRange: "30d",
    tokenPair: "all",
  });
  const [orders, setOrders] = useState<OrderHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fusion hook available for future API integration
  // const fusion = useFusion({
  //   network: "ethereum",
  //   rpcUrl: "https://eth.llamarpc.com",
  //   authKey: process.env.NEXT_PUBLIC_1INCH_AUTH_KEY,
  // });

  // Mock order history data
  const mockOrders: OrderHistory[] = [
    {
      id: "0x1234...5678",
      timestamp: Date.now() - 3600000,
      fromToken: "USDC",
      toToken: "ETH",
      fromAmount: "1000",
      toAmount: "0.45",
      status: "filled",
      txHash: "0xabcd...efgh",
      gasUsed: "0.002",
      executionTime: 45,
    },
    {
      id: "0x2345...6789",
      timestamp: Date.now() - 7200000,
      fromToken: "ETH",
      toToken: "WETH",
      fromAmount: "1.0",
      toAmount: "1.0",
      status: "filled",
      txHash: "0xbcde...fghi",
      gasUsed: "0.001",
      executionTime: 30,
    },
    {
      id: "0x3456...7890",
      timestamp: Date.now() - 10800000,
      fromToken: "1INCH",
      toToken: "USDC",
      fromAmount: "500",
      toAmount: "150",
      status: "cancelled",
    },
    {
      id: "0x4567...8901",
      timestamp: Date.now() - 14400000,
      fromToken: "DAI",
      toToken: "ETH",
      fromAmount: "800",
      toAmount: "0.35",
      status: "expired",
    },
    {
      id: "0x5678...9012",
      timestamp: Date.now() - 18000000,
      fromToken: "WETH",
      toToken: "USDC",
      fromAmount: "0.5",
      toAmount: "1100",
      status: "filled",
      txHash: "0xcdef...ghij",
      gasUsed: "0.0015",
      executionTime: 60,
    },
  ];

  const loadOrderHistory = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    let filteredOrders = [...mockOrders];

    // Apply status filter
    if (filter.status !== "all") {
      filteredOrders = filteredOrders.filter(order => order.status === filter.status);
    }

    // Apply time range filter
    const now = Date.now();
    const timeRanges = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
      all: Infinity,
    };

    if (filter.timeRange !== "all") {
      const cutoff = now - timeRanges[filter.timeRange];
      filteredOrders = filteredOrders.filter(order => order.timestamp >= cutoff);
    }

    // Apply token pair filter
    if (filter.tokenPair !== "all") {
      const [from, to] = filter.tokenPair.split("/");
      filteredOrders = filteredOrders.filter(
        order =>
          (order.fromToken === from && order.toToken === to) || (order.fromToken === to && order.toToken === from),
      );
    }

    setOrders(filteredOrders);
    setTotalPages(Math.ceil(filteredOrders.length / 10));
    setIsLoading(false);
  };

  useEffect(() => {
    loadOrderHistory();
  }, [filter, page]);

  const getStatusBadge = (status: string) => {
    const badges = {
      filled: "badge-success",
      cancelled: "badge-error",
      expired: "badge-neutral",
      pending: "badge-warning",
    };
    return badges[status as keyof typeof badges] || "badge-neutral";
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const exportHistory = () => {
    const csv = [
      [
        "Order ID",
        "Timestamp",
        "From Token",
        "To Token",
        "From Amount",
        "To Amount",
        "Status",
        "TX Hash",
        "Gas Used",
        "Execution Time",
      ].join(","),
      ...orders.map(order =>
        [
          order.id,
          formatTimestamp(order.timestamp),
          order.fromToken,
          order.toToken,
          order.fromAmount,
          order.toAmount,
          order.status,
          order.txHash || "",
          order.gasUsed || "",
          order.executionTime ? formatDuration(order.executionTime) : "",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fusion-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
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
            <li>History</li>
          </ul>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Order History
            </span>
          </h1>
          <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
            View your complete 1inch Fusion trading history with detailed order information.
          </p>
        </div>

        {/* Wallet Status */}
        <div className="bg-base-200 p-4 rounded-lg mb-6">
          <div className="text-sm font-medium mb-2">Connected Wallet:</div>
          {address ? <Address address={address} /> : <div className="text-warning">Please connect your wallet</div>}
        </div>

        {/* Filters */}
        <div className="bg-base-200 p-6 rounded-2xl mb-6">
          <h2 className="text-lg font-bold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Status</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={filter.status}
                onChange={e => setFilter(prev => ({ ...prev, status: e.target.value as HistoryFilter["status"] }))}
              >
                <option value="all">All Status</option>
                <option value="filled">Filled</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* Time Range Filter */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Time Range</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={filter.timeRange}
                onChange={e =>
                  setFilter(prev => ({ ...prev, timeRange: e.target.value as HistoryFilter["timeRange"] }))
                }
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>

            {/* Token Pair Filter */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Token Pair</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={filter.tokenPair}
                onChange={e => setFilter(prev => ({ ...prev, tokenPair: e.target.value }))}
              >
                <option value="all">All Pairs</option>
                <option value="ETH/USDC">ETH/USDC</option>
                <option value="ETH/WETH">ETH/WETH</option>
                <option value="1INCH/USDC">1INCH/USDC</option>
                <option value="DAI/ETH">DAI/ETH</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button className="btn btn-outline btn-sm" onClick={loadOrderHistory} disabled={isLoading}>
              {isLoading ? "Loading..." : "Refresh"}
            </button>
            <button className="btn btn-outline btn-sm" onClick={exportHistory} disabled={orders.length === 0}>
              Export CSV
            </button>
          </div>
        </div>

        {/* Orders Table */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : orders.length > 0 ? (
          <div className="bg-base-200 p-6 rounded-2xl mb-6">
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Time</th>
                    <th>Trading Pair</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Execution</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td>
                        <div className="font-mono text-sm">
                          {order.id.slice(0, 6)}...{order.id.slice(-4)}
                        </div>
                      </td>
                      <td>
                        <div className="text-sm">{formatTimestamp(order.timestamp)}</div>
                      </td>
                      <td>
                        <div className="font-medium">
                          {order.fromToken} → {order.toToken}
                        </div>
                        <div className="text-sm text-base-content/70">
                          {order.fromAmount} → {order.toAmount}
                        </div>
                      </td>
                      <td>
                        <div className="text-sm">
                          <div>
                            {order.fromAmount} {order.fromToken}
                          </div>
                          <div className="text-base-content/70">
                            → {order.toAmount} {order.toToken}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        {order.status === "filled" && (
                          <div className="text-sm">
                            <div>⏱️ {order.executionTime ? formatDuration(order.executionTime) : "N/A"}</div>
                            <div>⛽ {order.gasUsed || "N/A"} ETH</div>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="flex gap-1">
                          {order.txHash && (
                            <a
                              href={`https://etherscan.io/tx/${order.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-xs btn-outline"
                            >
                              View TX
                            </a>
                          )}
                          <button className="btn btn-xs btn-ghost">Details</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-6">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">No Order History</h3>
            <p className="text-base-content/70 mb-4">
              You haven&apos;t made any orders yet or no orders match your current filters.
            </p>
            <Link href="/fusion" className="btn btn-primary">
              Create Your First Order
            </Link>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/fusion" className="btn btn-primary">
            Create New Order
          </Link>
          <Link href="/fusion/orders" className="btn btn-outline">
            Active Orders
          </Link>
          <Link href="/fusion/analytics" className="btn btn-outline">
            View Analytics
          </Link>
        </div>

        {/* Info */}
        <div className="mt-8 alert alert-info">
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
            <h3 className="font-bold">History Information</h3>
            <div className="text-sm">
              Order history shows all your past 1inch Fusion transactions. Data is fetched from the blockchain and may
              have slight delays.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FusionHistoryPage;
