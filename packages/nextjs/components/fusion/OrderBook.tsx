"use client";

import { useEffect, useState } from "react";
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BookOpenIcon,
  ClockIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  count: number;
}

interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  lastPrice: number;
  priceChange24h: number;
}

interface RecentTrade {
  id: string;
  price: number;
  amount: number;
  side: "buy" | "sell";
  timestamp: number;
}

export const OrderBook = () => {
  const [orderBookData, setOrderBookData] = useState<OrderBookData | null>(null);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [selectedPair, setSelectedPair] = useState("SUI/USDC");
  const [viewMode, setViewMode] = useState<"combined" | "bids" | "asks">("combined");
  const [isLoading, setIsLoading] = useState(true);

  // Mock data generation
  useEffect(() => {
    const generateOrderBook = (): OrderBookData => {
      const basePrice = 2.15;
      const spread = 0.002;

      const bids: OrderBookEntry[] = [];
      const asks: OrderBookEntry[] = [];

      let totalBid = 0;
      let totalAsk = 0;

      // Generate bids (buy orders) - prices below market
      for (let i = 0; i < 15; i++) {
        const price = basePrice - spread / 2 - i * 0.001;
        const amount = Math.random() * 100 + 10;
        totalBid += amount;

        bids.push({
          price,
          amount,
          total: totalBid,
          count: Math.floor(Math.random() * 5) + 1,
        });
      }

      // Generate asks (sell orders) - prices above market
      for (let i = 0; i < 15; i++) {
        const price = basePrice + spread / 2 + i * 0.001;
        const amount = Math.random() * 100 + 10;
        totalAsk += amount;

        asks.push({
          price,
          amount,
          total: totalAsk,
          count: Math.floor(Math.random() * 5) + 1,
        });
      }

      return {
        bids,
        asks,
        spread: spread,
        lastPrice: basePrice,
        priceChange24h: (Math.random() - 0.5) * 0.1, // -5% to +5%
      };
    };

    const generateRecentTrades = (): RecentTrade[] => {
      const trades: RecentTrade[] = [];
      const now = Date.now();

      for (let i = 0; i < 20; i++) {
        trades.push({
          id: `trade_${i}`,
          price: 2.15 + (Math.random() - 0.5) * 0.01,
          amount: Math.random() * 50 + 5,
          side: Math.random() > 0.5 ? "buy" : "sell",
          timestamp: now - i * 30000, // 30 seconds apart
        });
      }

      return trades.sort((a, b) => b.timestamp - a.timestamp);
    };

    setIsLoading(true);
    setTimeout(() => {
      setOrderBookData(generateOrderBook());
      setRecentTrades(generateRecentTrades());
      setIsLoading(false);
    }, 1000);

    // Update data periodically
    const interval = setInterval(() => {
      if (!isLoading) {
        setOrderBookData(generateOrderBook());
        // Add new trade occasionally
        if (Math.random() < 0.3) {
          setRecentTrades(prev => {
            const newTrade: RecentTrade = {
              id: `trade_${Date.now()}`,
              price: 2.15 + (Math.random() - 0.5) * 0.01,
              amount: Math.random() * 50 + 5,
              side: Math.random() > 0.5 ? "buy" : "sell",
              timestamp: Date.now(),
            };
            return [newTrade, ...prev.slice(0, 19)];
          });
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isLoading]);

  const formatPrice = (price: number) => price.toFixed(4);
  const formatAmount = (amount: number) => amount.toFixed(2);
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (isLoading || !orderBookData) {
    return (
      <div className="bg-base-200 rounded-lg p-6">
        <div className="flex items-center justify-center h-96">
          <div className="loading loading-spinner loading-lg"></div>
          <span className="ml-4 text-lg">Loading order book...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <BookOpenIcon className="h-6 w-6 text-primary" />
          Order Book
        </h2>

        <div className="flex items-center gap-4">
          {/* Pair selector */}
          <select
            value={selectedPair}
            onChange={e => setSelectedPair(e.target.value)}
            className="select select-bordered select-sm"
          >
            <option value="SUI/USDC">SUI/USDC</option>
            <option value="SUI/ETH">SUI/ETH</option>
            <option value="SUI/USDT">SUI/USDT</option>
          </select>

          {/* View mode */}
          <div className="join">
            <button
              onClick={() => setViewMode("bids")}
              className={`join-item btn btn-sm ${viewMode === "bids" ? "btn-active" : ""}`}
            >
              Bids
            </button>
            <button
              onClick={() => setViewMode("combined")}
              className={`join-item btn btn-sm ${viewMode === "combined" ? "btn-active" : ""}`}
            >
              Both
            </button>
            <button
              onClick={() => setViewMode("asks")}
              className={`join-item btn btn-sm ${viewMode === "asks" ? "btn-active" : ""}`}
            >
              Asks
            </button>
          </div>
        </div>
      </div>

      {/* Price Info */}
      <div className="bg-base-100 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Last Price</div>
            <div className="text-xl font-bold">${formatPrice(orderBookData.lastPrice)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">24h Change</div>
            <div
              className={`text-xl font-bold flex items-center gap-1 ${
                orderBookData.priceChange24h >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {orderBookData.priceChange24h >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4" />
              )}
              {(orderBookData.priceChange24h * 100).toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Spread</div>
            <div className="text-xl font-bold">{(orderBookData.spread * 100).toFixed(3)}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Volume 24h</div>
            <div className="text-xl font-bold">$1.2M</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Book */}
        <div className="lg:col-span-2 bg-base-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Order Book</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400">Price / Amount / Total</div>
          </div>

          <div className="h-96 overflow-y-auto">
            {/* Asks (Sell Orders) */}
            {(viewMode === "combined" || viewMode === "asks") && (
              <div className="mb-4">
                <div className="text-sm font-medium text-red-600 mb-2">ASKS (SELL)</div>
                {orderBookData.asks
                  .slice()
                  .reverse()
                  .map((ask, index) => (
                    <div
                      key={`ask-${index}`}
                      className="relative flex justify-between items-center py-1 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      {/* Background bar showing amount */}
                      <div
                        className="absolute right-0 top-0 h-full bg-red-100 dark:bg-red-900/30"
                        style={{ width: `${(ask.amount / Math.max(...orderBookData.asks.map(a => a.amount))) * 30}%` }}
                      />

                      <div className="relative z-10 flex justify-between w-full text-sm">
                        <span className="text-red-600 font-mono">{formatPrice(ask.price)}</span>
                        <span className="font-mono">{formatAmount(ask.amount)}</span>
                        <span className="text-gray-600 dark:text-gray-400 font-mono">{formatAmount(ask.total)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Spread */}
            {viewMode === "combined" && (
              <div className="border-t border-b border-gray-300 dark:border-gray-600 py-2 my-2 text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Spread: ${formatPrice(orderBookData.spread)}
                </div>
              </div>
            )}

            {/* Bids (Buy Orders) */}
            {(viewMode === "combined" || viewMode === "bids") && (
              <div>
                <div className="text-sm font-medium text-green-600 mb-2">BIDS (BUY)</div>
                {orderBookData.bids.map((bid, index) => (
                  <div
                    key={`bid-${index}`}
                    className="relative flex justify-between items-center py-1 hover:bg-green-50 dark:hover:bg-green-900/20"
                  >
                    {/* Background bar showing amount */}
                    <div
                      className="absolute right-0 top-0 h-full bg-green-100 dark:bg-green-900/30"
                      style={{ width: `${(bid.amount / Math.max(...orderBookData.bids.map(b => b.amount))) * 30}%` }}
                    />

                    <div className="relative z-10 flex justify-between w-full text-sm">
                      <span className="text-green-600 font-mono">{formatPrice(bid.price)}</span>
                      <span className="font-mono">{formatAmount(bid.amount)}</span>
                      <span className="text-gray-600 dark:text-gray-400 font-mono">{formatAmount(bid.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="bg-base-100 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ClockIcon className="h-5 w-5" />
            Recent Trades
          </h3>

          <div className="text-sm mb-2 flex justify-between text-gray-600 dark:text-gray-400">
            <span>Price</span>
            <span>Amount</span>
            <span>Time</span>
          </div>

          <div className="h-80 overflow-y-auto space-y-1">
            {recentTrades.map(trade => (
              <div key={trade.id} className="flex justify-between items-center py-1 text-sm">
                <span className={`font-mono font-medium ${trade.side === "buy" ? "text-green-600" : "text-red-600"}`}>
                  {formatPrice(trade.price)}
                </span>
                <span className="font-mono">{formatAmount(trade.amount)}</span>
                <span className="text-gray-600 dark:text-gray-400">{formatTime(trade.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
