import { useCallback, useMemo } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useWallet } from "@suiet/wallet-kit";


/**
 * Sui wallet operation hook
 * Primarily uses Suiet Wallet Kit, with Mysten dApp Kit as auxiliary
 */
export function useSuiWallet() {
  const wallet = useWallet();

  // Safely get Mysten dApp Kit client and account information
  // Prioritize Suiet, with Mysten dApp Kit as optional enhancement
  let suiClient = null;
  let currentAccount = null;

  try {
    // Try to get Mysten dApp Kit client and account (if available)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    suiClient = useSuiClient();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    currentAccount = useCurrentAccount();
  } catch {
    // When Mysten dApp Kit is not available, rely entirely on Suiet
    // This is normal and no warning is needed
    suiClient = null;
    currentAccount = null;
  }

  // Wallet connection status - primarily relies on Suiet
  const isConnected = useMemo(() => {
    return wallet.connected && wallet.account != null;
  }, [wallet.connected, wallet.account]);

  // Current account address - prioritize Suiet's account information
  const address = useMemo(() => {
    return wallet.account?.address || currentAccount?.address || null;
  }, [wallet.account, currentAccount]);

  // Connect wallet
  const connect = useCallback(async () => {
    try {
      // Check if already connected
      if (wallet.connected) {
        return;
      }

      // Get list of available wallets
      const availableWallets = wallet.configuredWallets;
      console.log(
        "Available wallets:",
        availableWallets.map(w => w.name),
      );

      // Priority order: Suiet, Sui Wallet, first available wallet
      const targetWallet =
        availableWallets.find(w => w.name === "Suiet") ||
        availableWallets.find(w => w.name === "Sui Wallet") ||
        availableWallets[0];

      if (!targetWallet) {
        throw new Error("No Sui wallet available. Please install a Sui wallet extension.");
      }

      console.log("Connecting to wallet:", targetWallet.name);
      await wallet.select(targetWallet.name);
      // Note: Suiet wallet automatically connects after select, no need to call connect separately
    } catch (error) {
      console.error("Failed to connect Sui wallet:", error);
      throw error;
    }
  }, [wallet]);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      await wallet.disconnect();
    } catch (error) {
      console.error("Failed to disconnect Sui wallet:", error);
      throw error;
    }
  }, [wallet]);

  // Sign and execute transaction
  const signAndExecuteTransaction = useCallback(
    async ({
      transactionBlock,
      options,
    }: {
      transactionBlock: any;
      options?: {
        showEffects?: boolean;
        showEvents?: boolean;
        showObjectChanges?: boolean;
        showBalanceChanges?: boolean;
      };
    }): Promise<any> => {
      if (!wallet.connected || !wallet.account) {
        throw new Error("Sui wallet not connected");
      }

      try {
        const result = await wallet.signAndExecuteTransactionBlock({
          transactionBlock,
          options: {
            showEffects: options?.showEffects ?? true,
            showEvents: options?.showEvents ?? true,
            showObjectChanges: options?.showObjectChanges ?? true,
            showBalanceChanges: options?.showBalanceChanges ?? true,
          },
        });

        return result;
      } catch (error) {
        console.error("Failed to execute Sui transaction:", error);
        throw error;
      }
    },
    [wallet],
  );

  // Get account balance
  const getBalance = useCallback(
    async (coinType?: string) => {
      if (!address || !suiClient) {
        return null;
      }

      try {
        const balance = await suiClient.getBalance({
          owner: address,
          coinType: coinType || "0x2::sui::SUI",
        });
        return balance;
      } catch (error) {
        console.error("Failed to get Sui balance:", error);
        return null;
      }
    },
    [address, suiClient],
  );

  // Get owned objects
  const getOwnedObjects = useCallback(
    async (filter?: { StructType: string }) => {
      if (!address || !suiClient) {
        return [];
      }

      try {
        const objects = await suiClient.getOwnedObjects({
          owner: address,
          filter: filter || null,
          options: {
            showContent: true,
            showDisplay: true,
            showType: true,
          },
        });
        return objects.data;
      } catch (error) {
        console.error("Failed to get owned objects:", error);
        return [];
      }
    },
    [address, suiClient],
  );

  return {
    // Connection status
    isConnected,
    address,
    account: wallet.account,

    // Connection operations
    connect,
    disconnect,

    // Transaction operations
    signAndExecuteTransactionBlock: signAndExecuteTransaction,

    // Query operations
    getBalance,
    getOwnedObjects,

    // Raw wallet object (for advanced operations)
    wallet,
    suiClient,
  };
}