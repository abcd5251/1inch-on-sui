"use client";

import { ReactNode } from "react";
import { SuiClientProvider, WalletProvider, createNetworkConfig } from "@mysten/dapp-kit";
import { WalletProvider as SuietWalletProvider } from "@suiet/wallet-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import "@suiet/wallet-kit/style.css";

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
 * Integrates both Mysten dApp Kit and Suiet Wallet Kit with proper provider hierarchy
 */
export function SuiProviders({ children }: SuiProvidersProps) {
  return (
    <SuietWalletProvider>
      <SuiClientProvider networks={networkConfig} defaultNetwork="devnet">
        <WalletProvider enableUnsafeBurner>{children}</WalletProvider>
      </SuiClientProvider>
    </SuietWalletProvider>
  );
}

// Export network configuration for use by other components
export { networkConfig };
