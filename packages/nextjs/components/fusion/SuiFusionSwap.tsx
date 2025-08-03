"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSuiFusion } from "~~/hooks/fusion/useSuiFusion";
import { suiFusionConfig } from "~~/services/fusion/suiConfig";
import { notification } from "~~/utils/scaffold-eth";

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
  const [enableAuction, setEnableAuction] = useState(false);
  const [auctionDuration, setAuctionDuration] = useState(180); // 3 minutes default

  const suiFusion = useSuiFusion({
    network: "testnet",
    packageId: suiFusionConfig.defaultPackageId,
    useMockService: true, // Enable mock service for demo
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
    
    if (enableAuction) {
      await suiFusion.getAuctionQuote({
        fromToken: fromToken.type,
        toToken: toToken.type,
        amount: amountInSmallestUnit,
        slippage,
      }, {
        duration: auctionDuration,
        startRateMultiplier: 1.05, // 5% above market
        endRateMultiplier: 0.95, // 5% below market
        priceDecayFunction: "linear",
        partialFillAllowed: true,
      });
    } else {
      await suiFusion.getQuote({
        fromToken: fromToken.type,
        toToken: toToken.type,
        amount: amountInSmallestUnit,
        slippage,
      });
    }
  };

  const handleCreateOrder = async () => {
    if (!currentAccount?.address || !amount || !fromToken || !toToken) {
      notification.error("Please connect wallet and fill in all fields");
      return;
    }

    const amountInSmallestUnit = (parseFloat(amount) * Math.pow(10, fromToken.decimals)).toString();
    
    if (enableAuction) {
      await suiFusion.createFusionOrder({
        fromToken: fromToken.type,
        toToken: toToken.type,
        amount: amountInSmallestUnit,
        slippage,
        orderType: "market",
        expirationTime: Date.now() + 3600000, // 1 hour
        enableAuction: true,
        auctionDetails: suiFusion.auctionQuote?.auctionDetails,
        partialFillAllowed: true,
        minFillAmount: (parseFloat(amountInSmallestUnit) * 0.1).toString(), // Min 10%
        maxFillAmount: amountInSmallestUnit,
      });
    } else {
      await suiFusion.createOrder({
        fromToken: fromToken.type,
        toToken: toToken.type,
        amount: amountInSmallestUnit,
        slippage,
        orderType: "market",
        expirationTime: Date.now() + 3600000, // 1 hour
      });
    }
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
        <div className="badge badge-primary badge-lg mb-4">Sui {suiFusion.getNetworkInfo().network}</div>

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
                  onChange={e => setPrivateKey(e.target.value)}
                />
                <button
                  className="btn btn-primary join-item"
                  onClick={handleInitialize}
                  disabled={suiFusion.isLoading || !privateKey}
                >
                  {suiFusion.isLoading ? <span className="loading loading-spinner loading-sm"></span> : "Initialize"}
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
              onChange={e => {
                const token = SUI_COMMON_TOKENS.find(t => t.symbol === e.target.value);
                if (token) setFromToken(token);
              }}
            >
              {SUI_COMMON_TOKENS.map(token => (
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
              onChange={e => setAmount(e.target.value)}
            />
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center mb-4">
          <button className="btn btn-circle btn-outline" onClick={handleSwapTokens}>
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
              onChange={e => {
                const token = SUI_COMMON_TOKENS.find(t => t.symbol === e.target.value);
                if (token) setToToken(token);
              }}
            >
              {SUI_COMMON_TOKENS.map(token => (
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
              onChange={e => setSlippage(parseFloat(e.target.value))}
            />
            <span className="btn btn-outline join-item">%</span>
          </div>
        </div>

        {/* Dutch Auction Options */}
        <div className="form-control mb-4">
          <label className="label cursor-pointer">
            <span className="label-text">
              <span className="mr-2">🎯</span>
              Enable Dutch Auction (Fusion Mode)
            </span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={enableAuction}
              onChange={e => setEnableAuction(e.target.checked)}
            />
          </label>
          {enableAuction && (
            <div className="mt-2">
              <label className="label">
                <span className="label-text">Auction Duration</span>
              </label>
              <div className="join">
                <input
                  type="number"
                  min="30"
                  max="600"
                  step="30"
                  className="input input-bordered join-item flex-1"
                  value={auctionDuration}
                  onChange={e => setAuctionDuration(parseInt(e.target.value))}
                />
                <span className="btn btn-outline join-item">seconds</span>
              </div>
              <div className="text-xs text-base-content/70 mt-1">
                Price starts 5% above market, decays to 5% below over {auctionDuration}s
              </div>
            </div>
          )}
        </div>

        {/* Quote Display */}
        {(suiFusion.quote || suiFusion.auctionQuote) && (
          <div className="alert alert-info mb-4">
            <div className="text-sm">
              {suiFusion.auctionQuote ? (
                <>
                  <div className="font-semibold text-primary mb-2">🎯 Dutch Auction Quote</div>
                  <div>
                    Rate: 1 {fromToken.symbol} = {suiFusion.auctionQuote.rate} {toToken.symbol}
                  </div>
                  <div>Start Rate: {suiFusion.auctionQuote.auctionDetails.startRate} (5% above market)</div>
                  <div>End Rate: {suiFusion.auctionQuote.auctionDetails.endRate} (5% below market)</div>
                  <div>Duration: {suiFusion.auctionQuote.auctionDetails.duration}s</div>
                  <div>Est. Fill Time: {suiFusion.auctionQuote.estimatedFillTime}s</div>
                  <div>Available Resolvers: {suiFusion.auctionQuote.resolvers.length}</div>
                  <div>MEV Protection: {suiFusion.auctionQuote.mevProtection ? '✅' : '❌'}</div>
                  <div>Estimated Gas: {suiFusion.auctionQuote.estimatedGas} SUI</div>
                </>
              ) : suiFusion.quote ? (
                <>
                  <div>
                    Rate: 1 {fromToken.symbol} = {suiFusion.quote.rate} {toToken.symbol}
                  </div>
                  <div>Price Impact: {suiFusion.quote.priceImpact}%</div>
                  <div>Estimated Gas: {suiFusion.quote.estimatedGas} SUI</div>
                  <div>Route: {suiFusion.quote.route.map(r => r.name).join(" → ")}</div>
                </>
              ) : null}
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
            ) : enableAuction ? (
              "Get Auction Quote 🎯"
            ) : (
              "Get Quote"
            )}
          </button>

          <button
            className={`btn ${enableAuction ? 'btn-accent' : 'btn-success'} w-full`}
            onClick={handleCreateOrder}
            disabled={suiFusion.isLoading || !isFormValid || !isInitialized}
          >
            {suiFusion.isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : enableAuction ? (
              "🎯 Create Dutch Auction Order"
            ) : (
              "Create Standard Order"
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
