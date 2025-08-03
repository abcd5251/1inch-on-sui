"use client";

import { ReactNode } from "react";
import { SuiClientProvider, WalletProvider, createNetworkConfig } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";

// Define network configuration
const { networkConfig } = createNetworkConfig({
  devnet: { url: getFullnodeUrl("devnet") },
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
  localnet: { url: "http://127.0.0.1:9000" },
});

interface SuiProvidersProps {
  children: ReactNode;
}

/**
 * Sui ecosystem provider component
 * Integrates Mysten dApp Kit with proper provider hierarchy
 */
export function SuiProviders({ children }: SuiProvidersProps) {
  return (
    <SuiClientProvider networks={networkConfig} defaultNetwork="devnet">
      <WalletProvider enableUnsafeBurner>{children}</WalletProvider>
    </SuiClientProvider>
  );
}

// Export network configuration for use by other components
export { networkConfig };
