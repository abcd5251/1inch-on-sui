"use client";

import { ReactNode, useEffect, useState } from "react";
import { WalletProvider as DappKitWalletProvider, SuiClientProvider, createNetworkConfig } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { WalletProvider as SuietWalletProvider } from "@suiet/wallet-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Define network configuration
const { networkConfig } = createNetworkConfig({
  devnet: { url: getFullnodeUrl("devnet") },
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
  localnet: { url: "http://127.0.0.1:9000" },
});

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

interface SuiProvidersProps {
  children: ReactNode;
}

/**
 * Client-side wallet component wrapper
 * Solves the issue of indexedDB being unavailable in SSR
 */
function ClientOnlyWalletProviders({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>{children}</div>;
  }

  return (
    <DappKitWalletProvider>
      <SuietWalletProvider>{children}</SuietWalletProvider>
    </DappKitWalletProvider>
  );
}

/**
 * Sui ecosystem provider component
 * Integrates Suiet Wallet Kit and Mysten dApp Kit
 */
export function SuiProviders({ children }: SuiProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="devnet">
        <ClientOnlyWalletProviders>{children}</ClientOnlyWalletProviders>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

// Export network configuration for use by other components
export { networkConfig };

// Export QueryClient for use elsewhere
export { queryClient };
