"use client";

import { useEffect, useState } from "react";
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";

interface TokenData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  logo?: string;
}

interface GlobalMarketData {
  totalMarketCap: number;
  total24hVolume: number;
  marketCapChange24h: number;
  activeCryptocurrencies: number;
}

export const MarketData = () => {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [globalData, setGlobalData] = useState<GlobalMarketData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<"top" | "defi" | "sui">("top");
  const [isLoading, setIsLoading] = useState(true);

  // Mock market data generation
  useEffect(() => {
    const generateTokenData = (category: string): TokenData[] => {
      const baseTokens = {
        top: [
          { symbol: "BTC", name: "Bitcoin", basePrice: 43000 },
          { symbol: "ETH", name: "Ethereum", basePrice: 3466 },
          { symbol: "BNB", name: "BNB", basePrice: 310 },
          { symbol: "XRP", name: "XRP", basePrice: 0.62 },
          { symbol: "SOL", name: "Solana", basePrice: 98 },
          { symbol: "ADA", name: "Cardano", basePrice: 0.48 },
          { symbol: "AVAX", name: "Avalanche", basePrice: 36 },
          { symbol: "DOT", name: "Polkadot", basePrice: 7.2 },
        ],
        defi: [
          { symbol: "UNI", name: "Uniswap", basePrice: 6.8 },
          { symbol: "AAVE", name: "Aave", basePrice: 95 },
          { symbol: "COMP", name: "Compound", basePrice: 45 },
          { symbol: "SUSHI", name: "SushiSwap", basePrice: 1.2 },
          { symbol: "CRV", name: "Curve DAO", basePrice: 0.85 },
          { symbol: "YFI", name: "yearn.finance", basePrice: 8500 },
          { symbol: "1INCH", name: "1inch", basePrice: 0.42 },
          { symbol: "SNX", name: "Synthetix", basePrice: 2.8 },
        ],
        sui: [
          { symbol: "SUI", name: "Sui", basePrice: 3.6 },
          { symbol: "MOVE", name: "Move Dollar", basePrice: 1.0 },
          { symbol: "CETUS", name: "Cetus Protocol", basePrice: 0.15 },
          { symbol: "NAVI", name: "Navi Protocol", basePrice: 0.85 },
          { symbol: "BUCKET", name: "Bucket Protocol", basePrice: 0.12 },
          { symbol: "TYPUS", name: "Typus", basePrice: 0.08 },
          { symbol: "DEEP", name: "DeepBook", basePrice: 0.045 },
          { symbol: "ALPHA", name: "Alpha Fi", basePrice: 0.032 },
        ],
      };

      return baseTokens[category as keyof typeof baseTokens].map(token => ({
        ...token,
        price: token.basePrice * (1 + (Math.random() - 0.5) * 0.02), // ±1% variation
        change24h: (Math.random() - 0.5) * 0.2, // ±10% change
        volume24h: Math.random() * 100000000 + 10000000, // $10M - $110M
        marketCap: token.basePrice * (Math.random() * 1000000000 + 100000000), // $100M - $1.1B
      }));
    };

    const generateGlobalData = (): GlobalMarketData => ({
      totalMarketCap: 1.7e12 + Math.random() * 3e11, // $1.7T - $2T
      total24hVolume: 8e10 + Math.random() * 4e10, // $80B - $120B
      marketCapChange24h: (Math.random() - 0.5) * 0.1, // ±5%
      activeCryptocurrencies: 12500 + Math.floor(Math.random() * 500), // 12,500 - 13,000
    });

    setIsLoading(true);
    setTimeout(() => {
      setTokens(generateTokenData(selectedCategory));
      setGlobalData(generateGlobalData());
      setIsLoading(false);
    }, 800);
  }, [selectedCategory]);

  // Auto-refresh data
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        const generateTokenData = (category: string): TokenData[] => {
          const baseTokens = {
            top: [
              { symbol: "BTC", name: "Bitcoin", basePrice: 43000 },
              { symbol: "ETH", name: "Ethereum", basePrice: 3466 },
              { symbol: "BNB", name: "BNB", basePrice: 310 },
              { symbol: "XRP", name: "XRP", basePrice: 0.62 },
              { symbol: "SOL", name: "Solana", basePrice: 98 },
              { symbol: "ADA", name: "Cardano", basePrice: 0.48 },
              { symbol: "AVAX", name: "Avalanche", basePrice: 36 },
              { symbol: "DOT", name: "Polkadot", basePrice: 7.2 },
            ],
            defi: [
              { symbol: "UNI", name: "Uniswap", basePrice: 6.8 },
              { symbol: "AAVE", name: "Aave", basePrice: 95 },
              { symbol: "COMP", name: "Compound", basePrice: 45 },
              { symbol: "SUSHI", name: "SushiSwap", basePrice: 1.2 },
              { symbol: "CRV", name: "Curve DAO", basePrice: 0.85 },
              { symbol: "YFI", name: "yearn.finance", basePrice: 8500 },
              { symbol: "1INCH", name: "1inch", basePrice: 0.42 },
              { symbol: "SNX", name: "Synthetix", basePrice: 2.8 },
            ],
            sui: [
              { symbol: "SUI", name: "Sui", basePrice: 3.6 },
              { symbol: "MOVE", name: "Move Dollar", basePrice: 1.0 },
              { symbol: "CETUS", name: "Cetus Protocol", basePrice: 0.15 },
              { symbol: "NAVI", name: "Navi Protocol", basePrice: 0.85 },
              { symbol: "BUCKET", name: "Bucket Protocol", basePrice: 0.12 },
              { symbol: "TYPUS", name: "Typus", basePrice: 0.08 },
              { symbol: "DEEP", name: "DeepBook", basePrice: 0.045 },
              { symbol: "ALPHA", name: "Alpha Fi", basePrice: 0.032 },
            ],
          };

          return baseTokens[category as keyof typeof baseTokens].map(token => ({
            ...token,
            price: token.basePrice * (1 + (Math.random() - 0.5) * 0.02),
            change24h: (Math.random() - 0.5) * 0.2,
            volume24h: Math.random() * 100000000 + 10000000,
            marketCap: token.basePrice * (Math.random() * 1000000000 + 100000000),
          }));
        };

        setTokens(generateTokenData(selectedCategory));
      }
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [isLoading, selectedCategory]);

  const formatPrice = (price: number): string => {
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    if (price < 100) return `$${price.toFixed(2)}`;
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatLargeNumber = (num: number): string => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatPercentage = (percent: number): string => {
    const formatted = (percent * 100).toFixed(2);
    return `${percent >= 0 ? "+" : ""}${formatted}%`;
  };

  return (
    <div className="bg-base-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <ChartBarIcon className="h-6 w-6 text-primary" />
          Market Data
        </h2>

        {/* Category selector */}
        <div className="join">
          <button
            onClick={() => setSelectedCategory("top")}
            className={`join-item btn btn-sm ${selectedCategory === "top" ? "btn-active" : ""}`}
          >
            Top Coins
          </button>
          <button
            onClick={() => setSelectedCategory("defi")}
            className={`join-item btn btn-sm ${selectedCategory === "defi" ? "btn-active" : ""}`}
          >
            DeFi
          </button>
          <button
            onClick={() => setSelectedCategory("sui")}
            className={`join-item btn btn-sm ${selectedCategory === "sui" ? "btn-active" : ""}`}
          >
            Sui Ecosystem
          </button>
        </div>
      </div>

      {/* Global Market Stats */}
      {globalData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-base-100 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <GlobeAltIcon className="h-5 w-5 text-primary mr-2" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Market Cap</span>
            </div>
            <div className="text-xl font-bold">{formatLargeNumber(globalData.totalMarketCap)}</div>
            <div
              className={`text-sm flex items-center justify-center ${
                globalData.marketCapChange24h >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {globalData.marketCapChange24h >= 0 ? (
                <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-3 w-3 mr-1" />
              )}
              {formatPercentage(globalData.marketCapChange24h)}
            </div>
          </div>

          <div className="bg-base-100 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <CurrencyDollarIcon className="h-5 w-5 text-secondary mr-2" />
              <span className="text-sm text-gray-600 dark:text-gray-400">24h Volume</span>
            </div>
            <div className="text-xl font-bold">{formatLargeNumber(globalData.total24hVolume)}</div>
          </div>

          <div className="bg-base-100 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <ChartBarIcon className="h-5 w-5 text-accent mr-2" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Active Cryptos</span>
            </div>
            <div className="text-xl font-bold">{globalData.activeCryptocurrencies.toLocaleString()}</div>
          </div>

          <div className="bg-base-100 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Market Status</span>
            </div>
            <div className="text-xl font-bold text-green-600">Live</div>
            <div className="text-xs text-gray-500">Real-time updates</div>
          </div>
        </div>
      )}

      {/* Token List */}
      <div className="bg-base-100 rounded-lg p-4">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="loading loading-spinner loading-lg"></div>
              <span className="ml-4 text-lg">Loading market data...</span>
            </div>
          ) : (
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Price</th>
                  <th>24h Change</th>
                  <th>24h Volume</th>
                  <th>Market Cap</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token, index) => (
                  <tr key={token.symbol} className="hover">
                    <td className="font-medium">{index + 1}</td>
                    <td>
                      <div className="flex items-center space-x-3">
                        <div className="avatar placeholder">
                          <div className="bg-primary text-primary-content rounded-full w-8 h-8">
                            <span className="text-xs font-bold">{token.symbol.slice(0, 2)}</span>
                          </div>
                        </div>
                        <div>
                          <div className="font-bold">{token.symbol}</div>
                          <div className="text-sm opacity-50">{token.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono font-semibold">{formatPrice(token.price)}</td>
                    <td>
                      <div
                        className={`flex items-center font-semibold ${
                          token.change24h >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {token.change24h >= 0 ? (
                          <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                        ) : (
                          <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                        )}
                        {formatPercentage(token.change24h)}
                      </div>
                    </td>
                    <td className="font-mono">{formatLargeNumber(token.volume24h)}</td>
                    <td className="font-mono">{formatLargeNumber(token.marketCap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center mt-4 text-sm text-gray-600 dark:text-gray-400">
        Last updated: {new Date().toLocaleTimeString()} • Auto-refresh every 10 seconds
      </div>
    </div>
  );
};
