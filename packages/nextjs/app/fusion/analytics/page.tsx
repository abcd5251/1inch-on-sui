"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAccount } from "wagmi";
import { useFusion } from "~~/hooks/fusion/useFusion";

interface AnalyticsData {
  totalOrders: number;
  totalVolume: string;
  averageExecutionTime: number;
  successRate: number;
  topTokenPairs: Array<{
    fromToken: string;
    toToken: string;
    volume: string;
    count: number;
  }>;
  volumeData: Array<{ date: string; volume: number; orders: number }>;
  statusData: Array<{ name: string; value: number; color: string }>;
  executionTimeData: Array<{ time: string; avgTime: number }>;
}

const FusionAnalyticsPage: NextPage = () => {
  // const { address } = useAccount();
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // const fusion = useFusion({
  //   network: "ethereum",
  //   rpcUrl: "https://eth.llamarpc.com",
  //   authKey: process.env.NEXT_PUBLIC_1INCH_AUTH_KEY,
  // });

  // Mock analytics data - in real implementation, this would come from API
  const loadAnalyticsData = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const volumeData = [
      { date: "Jan 1", volume: 125000, orders: 45 },
      { date: "Jan 2", volume: 189000, orders: 67 },
      { date: "Jan 3", volume: 234000, orders: 89 },
      { date: "Jan 4", volume: 198000, orders: 72 },
      { date: "Jan 5", volume: 267000, orders: 95 },
      { date: "Jan 6", volume: 312000, orders: 108 },
      { date: "Jan 7", volume: 284000, orders: 98 },
    ];

    const statusData = [
      { name: "Filled", value: 1230, color: "#10b981" },
      { name: "Pending", value: 12, color: "#f59e0b" },
      { name: "Cancelled", value: 3, color: "#ef4444" },
      { name: "Expired", value: 2, color: "#6b7280" },
    ];

    const executionTimeData = [
      { time: "00:00", avgTime: 8.5 },
      { time: "04:00", avgTime: 7.2 },
      { time: "08:00", avgTime: 15.8 },
      { time: "12:00", avgTime: 18.3 },
      { time: "16:00", avgTime: 22.1 },
      { time: "20:00", avgTime: 12.7 },
    ];

    const mockData: AnalyticsData = {
      totalOrders: 1247,
      totalVolume: "$2,456,789",
      averageExecutionTime: 45,
      successRate: 98.5,
      topTokenPairs: [
        { fromToken: "USDC", toToken: "ETH", volume: "$456,789", count: 234 },
        { fromToken: "ETH", toToken: "WETH", volume: "$345,678", count: 189 },
        { fromToken: "1INCH", toToken: "USDC", volume: "$234,567", count: 156 },
        { fromToken: "WETH", toToken: "USDC", volume: "$198,765", count: 123 },
        { fromToken: "DAI", toToken: "ETH", volume: "$167,890", count: 98 },
      ],
      volumeData,
      statusData,
      executionTimeData,
    };

    setAnalyticsData(mockData);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

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
            <li>Analytics</li>
          </ul>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Fusion Analytics
            </span>
          </h1>
          <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
            Comprehensive analytics and insights for 1inch Fusion trading activity.
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex justify-center mb-8">
          <div className="btn-group">
            {(["24h", "7d", "30d"] as const).map(range => (
              <button
                key={range}
                className={`btn ${timeRange === range ? "btn-active" : "btn-outline"}`}
                onClick={() => setTimeRange(range)}
              >
                {range === "24h" ? "24 Hours" : range === "7d" ? "7 Days" : "30 Days"}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : analyticsData ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="stat bg-base-200 rounded-2xl">
                <div className="stat-figure text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="inline-block w-8 h-8 stroke-current"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                </div>
                <div className="stat-title">Total Orders</div>
                <div className="stat-value text-primary">{analyticsData.totalOrders.toLocaleString()}</div>
                <div className="stat-desc">Last {timeRange}</div>
              </div>

              <div className="stat bg-base-200 rounded-2xl">
                <div className="stat-figure text-secondary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="inline-block w-8 h-8 stroke-current"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                    ></path>
                  </svg>
                </div>
                <div className="stat-title">Total Volume</div>
                <div className="stat-value text-secondary">{analyticsData.totalVolume}</div>
                <div className="stat-desc">Last {timeRange}</div>
              </div>

              <div className="stat bg-base-200 rounded-2xl">
                <div className="stat-figure text-accent">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="inline-block w-8 h-8 stroke-current"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    ></path>
                  </svg>
                </div>
                <div className="stat-title">Avg Execution</div>
                <div className="stat-value text-accent">{analyticsData.averageExecutionTime}s</div>
                <div className="stat-desc">Average time</div>
              </div>

              <div className="stat bg-base-200 rounded-2xl">
                <div className="stat-figure text-success">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="inline-block w-8 h-8 stroke-current"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                </div>
                <div className="stat-title">Success Rate</div>
                <div className="stat-value text-success">{analyticsData.successRate}%</div>
                <div className="stat-desc">Order completion</div>
              </div>
            </div>

            {/* Top Token Pairs */}
            <div className="bg-base-200 p-6 rounded-2xl mb-8">
              <h2 className="text-xl font-bold mb-4">Top Trading Pairs</h2>
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Trading Pair</th>
                      <th>Volume</th>
                      <th>Orders</th>
                      <th>Avg Order Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.topTokenPairs.map((pair, index) => (
                      <tr key={index}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="badge badge-primary">#{index + 1}</span>
                          </div>
                        </td>
                        <td>
                          <div className="font-medium">
                            {pair.fromToken} → {pair.toToken}
                          </div>
                        </td>
                        <td className="font-mono">{pair.volume}</td>
                        <td>{pair.count}</td>
                        <td className="font-mono">
                          ${(parseFloat(pair.volume.replace(/[$,]/g, "")) / pair.count).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-base-200 p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-4">Volume Over Time</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData.volumeData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
                      <YAxis
                        className="text-xs"
                        tick={{ fontSize: 12 }}
                        tickFormatter={value => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value: number) => [`$${value.toLocaleString()}`, "Volume"]}
                        labelFormatter={label => `Date: ${label}`}
                        contentStyle={{
                          backgroundColor: "hsl(var(--b1))",
                          border: "1px solid hsl(var(--b3))",
                          borderRadius: "0.5rem",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="volume"
                        stroke="hsl(var(--p))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--p))", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: "hsl(var(--p))", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-base-200 p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-4">Order Status Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {analyticsData.statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [value, "Orders"]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--b1))",
                          border: "1px solid hsl(var(--b3))",
                          borderRadius: "0.5rem",
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value, entry) => <span style={{ color: entry.color }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Execution Time Chart */}
            <div className="bg-base-200 p-6 rounded-2xl mb-8">
              <h3 className="text-lg font-bold mb-4">Average Execution Time by Hour</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.executionTimeData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="time" className="text-xs" tick={{ fontSize: 12 }} />
                    <YAxis className="text-xs" tick={{ fontSize: 12 }} tickFormatter={value => `${value}s`} />
                    <Tooltip
                      formatter={(value: number) => [`${value}s`, "Avg Time"]}
                      labelFormatter={label => `Time: ${label}`}
                      contentStyle={{
                        backgroundColor: "hsl(var(--b1))",
                        border: "1px solid hsl(var(--b3))",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <Bar dataKey="avgTime" fill="hsl(var(--s))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/fusion" className="btn btn-primary">
                Create New Order
              </Link>
              <Link href="/fusion/orders" className="btn btn-outline">
                View All Orders
              </Link>
              <button className="btn btn-outline" onClick={loadAnalyticsData} disabled={isLoading}>
                {isLoading ? "Refreshing..." : "Refresh Data"}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-base-content/70">No analytics data available</p>
          </div>
        )}

        {/* Info */}
        <div className="mt-12 alert alert-info">
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
            <h3 className="font-bold">Analytics Information</h3>
            <div className="text-sm">
              Analytics data is aggregated from 1inch Fusion protocol activity. Data may have a slight delay and is for
              informational purposes only.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FusionAnalyticsPage;
