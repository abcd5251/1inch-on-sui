import { useCallback, useMemo } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useSuiWallet } from "~~/hooks/sui/useSuiWallet";

export interface CrossChainWalletState {
  ethereum: {
    isConnected: boolean;
    address: string | undefined;
    chainId: number | undefined;
  };

  // Sui connection status
  sui: {
    isConnected: boolean;
    address: string | null;
  };

  // Overall connection status
  isFullyConnected: boolean;
  isBothConnected: boolean;
  isEitherConnected: boolean;
}

/**
 * Cross-chain wallet management hook
 * Unified management of Ethereum and Sui wallet connection states
 */
export function useCrossChainWallet() {
  // Ethereum wallet status
  const { address: ethAddress, isConnected: ethConnected, chainId } = useAccount();
  const { connect: ethConnect, connectors } = useConnect();
  const { disconnect: ethDisconnect } = useDisconnect();

  // Sui wallet status
  const {
    isConnected: suiConnected,
    address: suiAddress,
    connect: suiConnect,
    disconnect: suiDisconnect,
    signAndExecuteTransactionBlock,
    getBalance: getSuiBalance,
    getOwnedObjects,
  } = useSuiWallet();

  // Cross-chain status summary
  const state: CrossChainWalletState = useMemo(
    () => ({
      ethereum: {
        isConnected: ethConnected,
        address: ethAddress,
        chainId,
      },
      sui: {
        isConnected: suiConnected,
        address: suiAddress,
      },
      isFullyConnected: ethConnected && suiConnected,
      isBothConnected: ethConnected && suiConnected,
      isEitherConnected: ethConnected || suiConnected,
    }),
    [ethConnected, ethAddress, chainId, suiConnected, suiAddress],
  );

  // Connect Ethereum wallet
  const connectEthereum = useCallback(
    async (connectorId?: string) => {
      try {
        const connector = connectorId ? connectors.find(c => c.id === connectorId) : connectors[0]; // Default to first connector

        if (connector) {
          await ethConnect({ connector });
        }
      } catch (error) {
        console.error("Failed to connect Ethereum wallet:", error);
        throw error;
      }
    },
    [ethConnect, connectors],
  );

  // Connect Sui wallet
  const connectSui = useCallback(async () => {
    try {
      await suiConnect();
    } catch (error) {
      console.error("Failed to connect Sui wallet:", error);
      throw error;
    }
  }, [suiConnect]);

  // Connect both wallets
  const connectBoth = useCallback(
    async (ethConnectorId?: string) => {
      try {
        await Promise.all([connectEthereum(ethConnectorId), connectSui()]);
      } catch (error) {
        console.error("Failed to connect both wallets:", error);
        throw error;
      }
    },
    [connectEthereum, connectSui],
  );

  // Disconnect Ethereum wallet
  const disconnectEthereum = useCallback(async () => {
    try {
      await ethDisconnect();
    } catch (error) {
      console.error("Failed to disconnect Ethereum wallet:", error);
      throw error;
    }
  }, [ethDisconnect]);

  // Disconnect both wallets
  const disconnectBoth = useCallback(async () => {
    try {
      await Promise.all([ethDisconnect(), suiDisconnect()]);
    } catch (error) {
      console.error("Failed to disconnect both wallets:", error);
      throw error;
    }
  }, [ethDisconnect, suiDisconnect]);

  // Get cross-chain operation readiness status
  const getCrossChainReadiness = useCallback(() => {
    return {
      canInitiateCrossChain: state.isBothConnected,
      missingConnections: {
        ethereum: !state.ethereum.isConnected,
        sui: !state.sui.isConnected,
      },
      readinessScore: (state.ethereum.isConnected ? 0.5 : 0) + (state.sui.isConnected ? 0.5 : 0),
    };
  }, [state]);

  return {
    // State
    state,

    // Connection operations
    connectEthereum,
    connectSui,
    connectBoth,

    // Disconnect operations
    disconnectEthereum,
    disconnectSui: suiDisconnect,
    disconnectBoth,

    // Sui specific operations
    signAndExecuteTransactionBlock,
    getSuiBalance,
    getOwnedObjects,

    // Cross-chain readiness status
    getCrossChainReadiness,

    // Convenience properties
    isFullyConnected: state.isFullyConnected,
    isBothConnected: state.isBothConnected,
    isEitherConnected: state.isEitherConnected,
  };
}