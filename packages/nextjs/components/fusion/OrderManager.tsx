"use client";

import React, { useState, useEffect } from "react";
import { useFusion } from "~~/hooks/fusion/useFusion";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";

interface Order {
  orderHash: string;
  status: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromTokenAmount: string;
  toTokenAmount: string;
  maker: string;
  createdAt: string;
}

export const OrderManager: React.FC = () => {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<'my-orders' | 'all-orders'>('my-orders');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const fusion = useFusion({
    network: "ethereum",
    rpcUrl: "https://eth.llamarpc.com",
    authKey: process.env.NEXT_PUBLIC_1INCH_AUTH_KEY,
  });

  const loadMyOrders = async () => {
    if (address) {
      await fusion.getOrdersByMaker(address, page, limit);
    }
  };

  const loadAllOrders = async () => {
    await fusion.getActiveOrders(page, limit);
  };

  useEffect(() => {
    if (activeTab === 'my-orders' && address) {
      loadMyOrders();
    } else if (activeTab === 'all-orders') {
      loadAllOrders();
    }
  }, [activeTab, address, page]);

  const formatTokenAmount = (amount: string, decimals: number = 18) => {
    const value = parseFloat(amount) / Math.pow(10, decimals);
    return value.toFixed(6);
  };

  const getTokenSymbol = (address: string) => {
    const tokenMap: { [key: string]: string } = {
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "ETH",
      "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH",
      "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
      "0x111111111117dC0aa78b770fA6A738034120C302": "1INCH",
    };
    return tokenMap[address.toLowerCase()] || address.slice(0, 6) + "...";
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: string } = {
      "pending": "badge-warning",
      "filled": "badge-success",
      "cancelled": "badge-error",
      "expired": "badge-neutral",
    };
    return statusMap[status.toLowerCase()] || "badge-info";
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Order Management</h2>
        <p className="text-base-content/70">View and manage your Fusion orders</p>
      </div>

      {/* Wallet Status */}
      <div className="bg-base-200 p-4 rounded-lg mb-6">
        <div className="text-sm font-medium mb-2">Connected Wallet:</div>
        {address ? (
          <Address address={address} />
        ) : (
          <div className="text-warning">Please connect your wallet to view your orders</div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab ${activeTab === 'my-orders' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('my-orders')}
          disabled={!address}
        >
          My Orders
        </button>
        <button
          className={`tab ${activeTab === 'all-orders' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('all-orders')}
        >
          All Active Orders
        </button>
      </div>

      {/* Loading State */}
      {fusion.isLoading && (
        <div className="flex justify-center items-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}

      {/* Error State */}
      {fusion.error && (
        <div className="alert alert-error mb-6">
          <span>{fusion.error}</span>
          <button
            className="btn btn-xs btn-ghost"
            onClick={fusion.clearError}
          >
            ✕
          </button>
        </div>
      )}

      {/* Orders Table */}
      {!fusion.isLoading && (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Order Hash</th>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Maker</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {fusion.orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-base-content/50">
                    {activeTab === 'my-orders' && !address
                      ? "Connect your wallet to view your orders"
                      : "No orders found"}
                  </td>
                </tr>
              ) : (
                fusion.orders.map((order: any, index: number) => (
                  <tr key={order.orderHash || index}>
                    <td>
                      <div className="font-mono text-xs">
                        {order.orderHash ? (
                          <>
                            {order.orderHash.slice(0, 8)}...
                            {order.orderHash.slice(-6)}
                          </>
                        ) : (
                          'N/A'
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {getTokenSymbol(order.fromTokenAddress || '')}
                        </span>
                        <span className="text-xs text-base-content/50">
                          {formatTokenAmount(order.fromTokenAmount || '0')}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {getTokenSymbol(order.toTokenAddress || '')}
                        </span>
                        <span className="text-xs text-base-content/50">
                          {formatTokenAmount(order.toTokenAmount || '0')}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">
                        {formatTokenAmount(order.fromTokenAmount || '0')}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(order.status || 'unknown')}`}>
                        {order.status || 'Unknown'}
                      </span>
                    </td>
                    <td>
                      {order.maker ? (
                        <Address address={order.maker} size="sm" />
                      ) : (
                        <span className="text-base-content/50">N/A</span>
                      )}
                    </td>
                    <td>
                      <div className="text-xs text-base-content/50">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {fusion.orders.length > 0 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1 || fusion.isLoading}
          >
            Previous
          </button>
          <span className="text-sm">
            Page {page}
          </span>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setPage(page + 1)}
            disabled={fusion.orders.length < limit || fusion.isLoading}
          >
            Next
          </button>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center mt-6">
        <button
          className="btn btn-outline"
          onClick={() => {
            if (activeTab === 'my-orders') {
              loadMyOrders();
            } else {
              loadAllOrders();
            }
          }}
          disabled={fusion.isLoading}
        >
          {fusion.isLoading ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Loading...
            </>
          ) : (
            'Refresh Orders'
          )}
        </button>
      </div>
    </div>
  );
};