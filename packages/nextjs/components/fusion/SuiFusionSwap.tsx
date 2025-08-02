"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSuiFusion } from "~~/hooks/fusion/useSuiFusion";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { notification } from "~~/utils/scaffold-eth";
import { suiFusionConfig } from "~~/services/fusion/suiConfig";

// Common Sui tokens
const SUI_COMMON_TOKENS = [
  {
    symbol: "SUI",
    name: "Sui",
    type: "0x2::sui::SUI",
    decimals: 9,
    logoUrl: "/tokens/sui.svg",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    type: "0x2::coin::COIN<0x123::usdc::USDC>",
    decimals: 6,
    logoUrl: "/tokens/usdc.svg",
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    type: "0x2::coin::COIN<0x123::usdt::USDT>",
    decimals: 6,
    logoUrl: "/tokens/usdt.svg",
  },
  {
    symbol: "WETH",
    name: "Wrapped Ethereum",
    type: "0x2::coin::COIN<0x123::weth::WETH>",
    decimals: 18,
    logoUrl: "/tokens/weth.svg",
  },
  {
    symbol: "CETUS",
    name: "Cetus Protocol",
    type: "0x2::coin::COIN<0x123::cetus::CETUS>",
    decimals: 9,
    logoUrl: "/tokens/cetus.svg",
  },
];

export const SuiFusionSwap: React.FC = () => {
  const currentAccount = useCurrentAccount();
  const [privateKey, setPrivateKey] = useState("");
  const [fromToken, setFromToken] = useState(SUI_COMMON_TOKENS[0]); // SUI
  const [toToken, setToToken] = useState(SUI_COMMON_TOKENS[1]); // USDC
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [showPrivateKeyInput, setShowPrivateKeyInput] = useState(false);

  const suiFusion = useSuiFusion({
    network: "testnet",
    packageId: suiFusionConfig.defaultPackageId,
  });

  const handleInitialize = async () => {
    if (!privateKey) {
      notification.error("Please enter your private key");
      return;
    }
    await suiFusion.initializeWithPrivateKey(privateKey);
  };

  const handleGetQuote = async () => {
    if (!amount || !fromToken || !toToken) {
      notification.error("Please fill in all required fields");
      return;
    }

    const amountInSmallestUnit = (parseFloat(amount) * Math.pow(10, fromToken.decimals)).toString();
    await suiFusion.getQuote({
      fromTokenType: fromToken.type,
      toTokenType: toToken.type,
      amount: amountInSmallestUnit,
    });
  };

  const handleCreateOrder = async () => {
    if (!currentAccount?.address || !amount || !fromToken || !toToken) {
      notification.error("Please connect wallet and fill in all fields");
      return;
    }

    const amountInSmallestUnit = (parseFloat(amount) * Math.pow(10, fromToken.decimals)).toString();
    await suiFusion.createOrder({
      fromTokenType: fromToken.type,
      toTokenType: toToken.type,
      amount: amountInSmallestUnit,
      walletAddress: currentAccount.address,
      slippage,
    });
  };

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  const isFormValid = amount && fromToken && toToken;
  const isInitialized = suiFusion.isServiceInitialized();

  return (
    <div className="card bg-base-100 shadow-xl max-w-md mx-auto">
      <div className="card-body">
        <h2 className="card-title justify-center mb-6">
          <span className="text-2xl">🔄</span>
          Sui Fusion Swap
        </h2>

        {/* Network Badge */}
        <div className="badge badge-primary badge-lg mb-4">
          Sui {suiFusion.getNetwork()}
        </div>

        {/* Private Key Input (for demo purposes) */}
        {!isInitialized && (
          <div className="form-control mb-4">
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
        )}

        {/* From Token */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">From</span>
          </label>
          <div className="join">
            <select
              className="select select-bordered join-item flex-1"
              value={fromToken.symbol}
              onChange={(e) => {
                const token = SUI_COMMON_TOKENS.find(t => t.symbol === e.target.value);
                if (token) setFromToken(token);
              }}
            >
              {SUI_COMMON_TOKENS.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="0.0"
              className="input input-bordered join-item w-32"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center mb-4">
          <button
            className="btn btn-circle btn-outline"
            onClick={handleSwapTokens}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </button>
        </div>

        {/* To Token */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">To</span>
          </label>
          <div className="join">
            <select
              className="select select-bordered join-item flex-1"
              value={toToken.symbol}
              onChange={(e) => {
                const token = SUI_COMMON_TOKENS.find(t => t.symbol === e.target.value);
                if (token) setToToken(token);
              }}
            >
              {SUI_COMMON_TOKENS.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
            <div className="input input-bordered join-item w-32 flex items-center">
              {suiFusion.quote ? (
                <span className="text-sm">
                  {(parseFloat(suiFusion.quote.toAmount) / Math.pow(10, toToken.decimals)).toFixed(6)}
                </span>
              ) : (
                <span className="text-base-content/50">0.0</span>
              )}
            </div>
          </div>
        </div>

        {/* Slippage */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Slippage Tolerance</span>
          </label>
          <div className="join">
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="10"
              className="input input-bordered join-item flex-1"
              value={slippage}
              onChange={(e) => setSlippage(parseFloat(e.target.value))}
            />
            <span className="btn btn-outline join-item">%</span>
          </div>
        </div>

        {/* Quote Display */}
        {suiFusion.quote && (
          <div className="alert alert-info mb-4">
            <div className="text-sm">
              <div>Rate: 1 {fromToken.symbol} = {suiFusion.quote.rate} {toToken.symbol}</div>
              <div>Price Impact: {suiFusion.quote.priceImpact}</div>
              <div>Estimated Gas: {suiFusion.quote.estimatedGas} SUI</div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {suiFusion.error && (
          <div className="alert alert-error mb-4">
            <span className="text-sm">{suiFusion.error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            className="btn btn-primary w-full"
            onClick={handleGetQuote}
            disabled={suiFusion.isLoading || !isFormValid}
          >
            {suiFusion.isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              "Get Quote"
            )}
          </button>

          <button
            className="btn btn-success w-full"
            onClick={handleCreateOrder}
            disabled={suiFusion.isLoading || !isFormValid || !isInitialized}
          >
            {suiFusion.isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              "Create Sui Fusion Order"
            )}
          </button>
        </div>

        {/* Quick Links */}
        <div className="divider">Quick Actions</div>
        <div className="flex flex-wrap gap-2 justify-center">
          <Link href="/fusion/orders" className="btn btn-sm btn-outline">
            View Orders
          </Link>
          <Link href="/fusion/history" className="btn btn-sm btn-outline">
            History
          </Link>
          <Link href="/fusion/settings" className="btn btn-sm btn-outline">
            Settings
          </Link>
        </div>

        {/* Wallet Info */}
        {currentAccount && (
          <div className="mt-4 p-3 bg-base-200 rounded-lg">
            <div className="text-xs text-base-content/70">Connected Wallet:</div>
            <div className="text-sm font-mono">
              {currentAccount.address.slice(0, 8)}...{currentAccount.address.slice(-6)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};