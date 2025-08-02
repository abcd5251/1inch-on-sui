import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHEX } from '@mysten/sui/utils';
import { SuiNetwork, NetworkConfig, SuiFusionConfig, NetworkInfo } from '../types';
import { getNetworkConfig, isValidNetwork } from '../config/networks';
import { NetworkError, InvalidAddressError, ValidationError, ErrorCode } from '../utils/errors';
import { AddressValidator, NetworkValidator } from '../utils/validators';

/**
 * Factory class for creating and managing Sui network connections
 */
export class NetworkFactory {
  private client: SuiClient | null = null;
  private keypair: Ed25519Keypair | null = null;
  private config: NetworkConfig;
  private network: SuiNetwork;

  constructor(fusionConfig: SuiFusionConfig) {
    this.validateConfig(fusionConfig);
    this.network = fusionConfig.network;
    this.config = this.getNetworkConfigFromFusion(fusionConfig);
    this.initializeClient();
    
    if (fusionConfig.privateKey) {
      this.initializeKeypair(fusionConfig.privateKey);
    }
  }

  /**
   * Validate fusion configuration
   */
  private validateConfig(config: SuiFusionConfig): void {
    if (!config.network) {
      throw new ValidationError(ErrorCode.INVALID_NETWORK, 'Network is required');
    }

    if (!isValidNetwork(config.network)) {
      throw new ValidationError(ErrorCode.UNSUPPORTED_NETWORK, `Unsupported network: ${config.network}`);
    }

    if (config.rpcUrl && !NetworkValidator.isValidRpcUrl(config.rpcUrl)) {
      throw new ValidationError(ErrorCode.INVALID_CONFIG, `Invalid RPC URL: ${config.rpcUrl}`);
    }

    if (config.packageId && !AddressValidator.isValidPackageId(config.packageId)) {
      throw new ValidationError(ErrorCode.MISSING_PACKAGE_ID, `Invalid package ID: ${config.packageId}`);
    }
  }

  /**
   * Get network configuration from fusion config
   */
  private getNetworkConfigFromFusion(fusionConfig: SuiFusionConfig): NetworkConfig {
    const baseConfig = getNetworkConfig(fusionConfig.network);
    
    return {
      ...baseConfig,
      rpcUrl: fusionConfig.rpcUrl || baseConfig.rpcUrl,
      packageId: fusionConfig.packageId || baseConfig.packageId
    };
  }

  /**
   * Initialize Sui client
   */
  private initializeClient(): void {
    try {
      this.client = new SuiClient({
        url: this.config.rpcUrl
      });
    } catch (error) {
      throw new NetworkError(
        `Failed to initialize Sui client: ${error instanceof Error ? error.message : String(error)}`,
        { rpcUrl: this.config.rpcUrl, error }
      );
    }
  }

  /**
   * Initialize keypair from private key
   */
  private initializeKeypair(privateKey: string): void {
    try {
      // Remove 0x prefix if present
      const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
      
      // Validate private key format
      if (!/^[0-9a-fA-F]{64}$/.test(cleanPrivateKey)) {
        throw new ValidationError(ErrorCode.INVALID_PRIVATE_KEY, 'Invalid private key format');
      }

      const privateKeyBytes = fromHEX(cleanPrivateKey);
      this.keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
    } catch (error) {
      throw new ValidationError(
        ErrorCode.INVALID_PRIVATE_KEY,
        `Failed to initialize keypair: ${error instanceof Error ? error.message : String(error)}`,
        { error }
      );
    }
  }

  /**
   * Get Sui client instance
   */
  getClient(): SuiClient {
    if (!this.client) {
      throw new NetworkError('Sui client not initialized');
    }
    return this.client;
  }

  /**
   * Get keypair instance
   */
  getKeypair(): Ed25519Keypair {
    if (!this.keypair) {
      throw new ValidationError(ErrorCode.INVALID_PRIVATE_KEY, 'Keypair not initialized. Private key is required.');
    }
    return this.keypair;
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    return this.getKeypair().getPublicKey().toSuiAddress();
  }

  /**
   * Get network configuration
   */
  public getNetworkConfig(): NetworkConfig {
    return { ...this.config };
  }

  /**
   * Get current network
   */
  getNetwork(): SuiNetwork {
    return this.network;
  }

  /**
   * Get network information
   */
  getNetworkInfo(): NetworkInfo {
    return {
      network: this.network,
      rpcUrl: this.config.rpcUrl,
      explorerUrl: this.config.explorerUrl,
      packageId: this.config.packageId,
      chainId: this.config.chainId,
      isTestnet: this.network !== 'mainnet'
    };
  }

  /**
   * Check if wallet is connected (has keypair)
   */
  isWalletConnected(): boolean {
    return this.keypair !== null;
  }

  /**
   * Validate address format
   */
  validateAddress(address: string): boolean {
    return AddressValidator.isValidAddress(address);
  }

  /**
   * Normalize address format
   */
  normalizeAddress(address: string): string {
    return AddressValidator.normalizeAddress(address);
  }

  /**
   * Create a new keypair
   */
  static createKeypair(): Ed25519Keypair {
    return new Ed25519Keypair();
  }

  /**
   * Create keypair from private key
   */
  static createKeypairFromPrivateKey(privateKey: string): Ed25519Keypair {
    const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    
    if (!/^[0-9a-fA-F]{64}$/.test(cleanPrivateKey)) {
      throw new ValidationError(ErrorCode.INVALID_PRIVATE_KEY, 'Invalid private key format');
    }

    const privateKeyBytes = fromHEX(cleanPrivateKey);
    return Ed25519Keypair.fromSecretKey(privateKeyBytes);
  }

  /**
   * Test network connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = this.getClient();
      await client.getLatestSuiSystemState();
      return true;
    } catch (error) {
      throw new NetworkError(
        `Network connection test failed: ${error instanceof Error ? error.message : String(error)}`,
        { error }
      );
    }
  }

  /**
   * Get chain identifier
   */
  async getChainIdentifier(): Promise<string> {
    try {
      const client = this.getClient();
      const chainId = await client.getChainIdentifier();
      return chainId;
    } catch (error) {
      throw new NetworkError(
        `Failed to get chain identifier: ${error instanceof Error ? error.message : String(error)}`,
        { error }
      );
    }
  }

  /**
   * Get gas price
   */
  async getGasPrice(): Promise<string> {
    try {
      const client = this.getClient();
      const gasPrice = await client.getReferenceGasPrice();
      return gasPrice.toString();
    } catch (error) {
      throw new NetworkError(
        `Failed to get gas price: ${error instanceof Error ? error.message : String(error)}`,
        { error }
      );
    }
  }

  /**
   * Switch to different network
   */
  switchNetwork(newConfig: SuiFusionConfig): void {
    this.validateConfig(newConfig);
    this.network = newConfig.network;
    this.config = this.getNetworkConfigFromFusion(newConfig);
    this.initializeClient();
    
    if (newConfig.privateKey) {
      this.initializeKeypair(newConfig.privateKey);
    } else {
      this.keypair = null;
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.client = null;
    this.keypair = null;
  }
}