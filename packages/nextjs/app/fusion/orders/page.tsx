"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { OrderManager } from "~~/components/fusion/OrderManager";
import { useFusion } from "~~/hooks/fusion/useFusion";
import { useSuiFusion } from "~~/hooks/fusion/useSuiFusion";
import { notification } from "~~/utils/scaffold-eth";
import { suiFusionConfig } from "~~/services/fusion/suiConfig";

const FusionOrdersPage: NextPage = () => {
  const { address } = useAccount();
  const currentAccount = useCurrentAccount();
  const [activeNetwork, setActiveNetwork] = useState<"ethereum" | "sui">("ethereum");
  
  const suiFusion = useSuiFusion({
    network: "testnet",
    packageId: suiFusionConfig.defaultPackageId,
  });

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
            <li>{activeNetwork === "ethereum" ? "Ethereum" : "Sui"} Orders</li>
          </ul>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Fusion Orders
            </span>
          </h1>
          <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
            Track and manage your 1inch Fusion swap orders across networks. Monitor order status, 
            view execution details, and explore the order book.
          </p>
        </div>

        {/* Network Selector */}
        <div className="flex justify-center mb-8">
          <div className="tabs tabs-boxed">
            <button
              className={`tab ${activeNetwork === "ethereum" ? "tab-active" : ""}`}
              onClick={() => setActiveNetwork("ethereum")}
            >
              <span className="mr-2">⟠</span>
              Ethereum Orders
            </button>
            <button
              className={`tab ${activeNetwork === "sui" ? "tab-active" : ""}`}
              onClick={() => setActiveNetwork("sui")}
            >
              <span className="mr-2">🌊</span>
              Sui Orders
            </button>
          </div>
        </div>

        {/* Network-specific Info */}
        {activeNetwork === "sui" && (
          <div className="mb-8 text-center">
            <div className="alert alert-info">
              <div className="text-sm">
                <div className="font-semibold mb-1">Sui Network Orders</div>
                <div>Connected Account: {currentAccount?.address ? `${currentAccount.address.slice(0, 8)}...${currentAccount.address.slice(-6)}` : "Not connected"}</div>
                <div>Network: {suiFusion.getNetwork()}</div>
              </div>
            </div>
          </div>
        )}

        {activeNetwork === "ethereum" && (
          <div className="mb-8 text-center">
            <div className="alert alert-info">
              <div className="text-sm">
                <div className="font-semibold mb-1">Ethereum Network Orders</div>
                <div>Connected Account: {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : "Not connected"}</div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4 justify-center mb-8">
          <Link href="/fusion" className="btn btn-primary">
            Create New Order
          </Link>
          {activeNetwork === "sui" && (
            <Link href="/fusion/sui-orders" className="btn btn-outline">
              🌊 Dedicated Sui Orders
            </Link>
          )}
          <Link href="/fusion/analytics" className="btn btn-outline">
            View Analytics
          </Link>
        </div>

        {/* Order Manager Component */}
        <OrderManager />

        {/* Help Section */}
        <div className="mt-12 bg-base-200 p-6 rounded-2xl">
          <h2 className="text-xl font-bold mb-4">Order Status Guide</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-base-100 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge badge-warning">Pending</span>
              </div>
              <p className="text-sm text-base-content/70">
                Order has been submitted and is waiting for a resolver to fill it.
              </p>
            </div>
            <div className="bg-base-100 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge badge-success">Filled</span>
              </div>
              <p className="text-sm text-base-content/70">
                Order has been successfully executed and tokens have been swapped.
              </p>
            </div>
            <div className="bg-base-100 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge badge-error">Cancelled</span>
              </div>
              <p className="text-sm text-base-content/70">
                Order was cancelled by the user before execution.
              </p>
            </div>
            <div className="bg-base-100 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge badge-neutral">Expired</span>
              </div>
              <p className="text-sm text-base-content/70">
                Order expired without being filled within the time limit.
              </p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h3 className="font-bold">Pro Tips</h3>
            <div className="text-sm">
              • Orders may take time to fill depending on market conditions<br/>
              • Use faster presets for quicker execution at potentially higher costs<br/>
              • Monitor gas prices to optimize your order timing
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FusionOrdersPage;