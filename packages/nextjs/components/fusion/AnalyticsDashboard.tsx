"use client";

import { useEffect, useState } from "react";
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

interface ProtocolMetrics {
  totalVolume: string;
  totalTrades: number;
  activeResolvers: number;
  avgTradingTime: string;
  totalValueLocked: string;
  successRate: number;
}

interface ChartData {
  time: string;
  volume: number;
  trades: number;
  price: number;
}

export const AnalyticsDashboard = () => {
  const [metrics, setMetrics] = useState<ProtocolMetrics>({
    totalVolume: "0",
    totalTrades: 0,
    activeResolvers: 0,
    avgTradingTime: "0s",
    totalValueLocked: "0",
    successRate: 0,
  });

  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d">("24h");
  const [isLoading, setIsLoading] = useState(true);

  // Mock data generation for demo
  useEffect(() => {
    const generateMockData = () => {
      const now = Date.now();
      const data = [];
      const dataPoints = timeframe === "24h" ? 24 : timeframe === "7d" ? 7 : 30;

      for (let i = dataPoints - 1; i >= 0; i--) {
        const time = new Date(now - i * (timeframe === "24h" ? 3600000 : timeframe === "7d" ? 86400000 : 86400000));
        data.push({
          time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          volume: Math.random() * 100000 + 50000,
          trades: Math.floor(Math.random() * 100) + 20,
          price: 2000 + Math.random() * 200 - 100,
        });
      }
      return data;
    };

    const generateMockMetrics = (): ProtocolMetrics => ({
      totalVolume: (Math.random() * 10000000 + 1000000).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
      totalTrades: Math.floor(Math.random() * 10000) + 5000,
      activeResolvers: Math.floor(Math.random() * 50) + 25,
      avgTradingTime: `${Math.floor(Math.random() * 30) + 15}s`,
      totalValueLocked: (Math.random() * 50000000 + 10000000).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
      successRate: Math.floor(Math.random() * 10) + 90,
    });

    setIsLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      setChartData(generateMockData());
      setMetrics(generateMockMetrics());
      setIsLoading(false);
    }, 1500);
  }, [timeframe]);

  const MetricCard = ({
    title,
    value,
    change,
    icon: Icon,
    trend,
  }: {
    title: string;
    value: string | number;
    change?: string;
    icon: any;
    trend?: "up" | "down" | "neutral";
  }) => (
    <div className="bg-base-100 rounded-lg p-6 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-8 w-8 text-primary" />
        {change && (
          <div
            className={`flex items-center text-sm ${
              trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-600"
            }`}
          >
            {trend === "up" && <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />}
            {trend === "down" && <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />}
            {change}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">{value}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{title}</div>
    </div>
  );

  const SimpleChart = ({ data }: { data: ChartData[] }) => {
    const maxVolume = Math.max(...data.map(d => d.volume));
    const minVolume = Math.min(...data.map(d => d.volume));

    return (
      <div className="h-64 bg-base-100 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Trading Volume</h3>
        <div className="relative h-48">
          <svg width="100%" height="100%" className="overflow-visible">
            <defs>
              <linearGradient id="volumeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
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

            {/* Volume bars */}
            {data.map((point, index) => {
              const height = ((point.volume - minVolume) / (maxVolume - minVolume)) * 180;
              const x = (index / (data.length - 1)) * 100;

              return (
                <rect
                  key={index}
                  x={`${x - 1}%`}
                  y={`${90 - height / 2}%`}
                  width="2%"
                  height={`${height}%`}
                  fill="url(#volumeGradient)"
                  stroke="hsl(var(--p))"
                  strokeWidth="1"
                />
              );
            })}
          </svg>
        </div>

        {/* Time labels */}
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-2">
          <span>{data[0]?.time}</span>
          <span>{data[Math.floor(data.length / 2)]?.time}</span>
          <span>{data[data.length - 1]?.time}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-base-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Analytics Dashboard</h2>

        {/* Timeframe selector */}
        <div className="join">
          {["24h", "7d", "30d"].map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf as any)}
              className={`join-item btn btn-sm ${timeframe === tf ? "btn-active" : ""}`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="loading loading-spinner loading-lg"></div>
          <span className="ml-4 text-lg">Loading analytics...</span>
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <MetricCard
              title="Total Volume"
              value={metrics.totalVolume}
              change="+12.5%"
              trend="up"
              icon={CurrencyDollarIcon}
            />
            <MetricCard
              title="Total Trades"
              value={metrics.totalTrades.toLocaleString()}
              change="+8.3%"
              trend="up"
              icon={ChartBarIcon}
            />
            <MetricCard
              title="Active Resolvers"
              value={metrics.activeResolvers}
              change="+2"
              trend="up"
              icon={UserGroupIcon}
            />
            <MetricCard
              title="Avg Trade Time"
              value={metrics.avgTradingTime}
              change="-5s"
              trend="up"
              icon={ClockIcon}
            />
            <MetricCard
              title="Total Value Locked"
              value={metrics.totalValueLocked}
              change="+15.2%"
              trend="up"
              icon={CurrencyDollarIcon}
            />
            <MetricCard
              title="Success Rate"
              value={`${metrics.successRate}%`}
              change="+0.5%"
              trend="up"
              icon={ArrowTrendingUpIcon}
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SimpleChart data={chartData} />

            {/* Recent Trades */}
            <div className="bg-base-100 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Recent Trades</h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <div className="text-sm font-medium">
                          {(Math.random() * 10 + 1).toFixed(2)} SUI → {(Math.random() * 20 + 5).toFixed(2)} USDC
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {Math.floor(Math.random() * 60)} min ago
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">${(Math.random() * 1000 + 100).toFixed(0)}</div>
                      <div className="text-xs text-green-600">+{(Math.random() * 5 + 1).toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 bg-base-100 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Protocol Health</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">Excellent</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Network Status</div>
                <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: "95%" }}></div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">Optimal</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Liquidity</div>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: "88%" }}></div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">Active</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Resolver Network</div>
                <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: "92%" }}></div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
