import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromHEX } from "@mysten/sui/utils";
import { suiFusionConfig, SuiNetwork } from "./suiConfig";

/**
 * Factory class for creating Sui network configurations and clients
 */
export class SuiNetworkFactory {
  private static instances: Map<SuiNetwork, SuiNetworkFactory> = new Map();
  
  private constructor(
    private network: SuiNetwork,
    private client: SuiClient,
    private config: typeof suiFusionConfig.networks[SuiNetwork]
  ) {}

  /**
   * Get or create a SuiNetworkFactory instance for the specified network
   */
  static getInstance(network: SuiNetwork): SuiNetworkFactory {
    if (!this.instances.has(network)) {
      const client = new SuiClient({ url: getFullnodeUrl(network) });
      const config = suiFusionConfig.networks[network];
      this.instances.set(network, new SuiNetworkFactory(network, client, config));
    }
    return this.instances.get(network)!;
  }

  /**
   * Create a new SuiClient for the network
   */
  createClient(): SuiClient {
    return new SuiClient({ url: getFullnodeUrl(this.network) });
  }

  /**
   * Create a keypair from a private key
   */
  createKeypair(privateKey: string): Ed25519Keypair {
    // Remove '0x' prefix if present
    const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    
    // Validate private key length (64 hex characters = 32 bytes)
    if (cleanPrivateKey.length !== 64) {
      throw new Error('Invalid private key length. Expected 64 hex characters.');
    }
    
    try {
      const privateKeyBytes = fromHEX(cleanPrivateKey);
      return Ed25519Keypair.fromSecretKey(privateKeyBytes);
    } catch (error) {
      throw new Error(`Failed to create keypair: ${error}`);
    }
  }

  /**
   * Generate a new random keypair
   */
  generateKeypair(): Ed25519Keypair {
    return new Ed25519Keypair();
  }

  /**
   * Get the network configuration
   */
  getNetworkConfig() {
    return this.config;
  }

  /**
   * Get the SuiClient instance
   */
  getClient(): SuiClient {
    return this.client;
  }

  /**
   * Get the network name
   */
  getNetwork(): SuiNetwork {
    return this.network;
  }

  /**
   * Get the RPC URL for the network
   */
  getRpcUrl(): string {
    return getFullnodeUrl(this.network);
  }

  /**
   * Get the explorer URL for the network
   */
  getExplorerUrl(): string {
    return this.config.explorerUrl;
  }

  /**
   * Get the package ID for the network
   */
  getPackageId(): string {
    return this.config.packageId;
  }

  /**
   * Validate if an address is valid for Sui
   */
  isValidAddress(address: string): boolean {
    try {
      // Sui addresses are 32 bytes (64 hex characters) with 0x prefix
      const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
      return cleanAddress.length === 64 && /^[0-9a-fA-F]+$/.test(cleanAddress);
    } catch {
      return false;
    }
  }

  /**
   * Validate if a transaction digest is valid
   */
  isValidTransactionDigest(digest: string): boolean {
    try {
      // Transaction digests are typically 32 bytes (64 hex characters)
      const cleanDigest = digest.startsWith('0x') ? digest.slice(2) : digest;
      return cleanDigest.length === 64 && /^[0-9a-fA-F]+$/.test(cleanDigest);
    } catch {
      return false;
    }
  }

  /**
   * Format an address for display (truncated)
   */
  formatAddress(address: string, startChars: number = 8, endChars: number = 6): string {
    if (!this.isValidAddress(address)) {
      return 'Invalid Address';
    }
    
    if (address.length <= startChars + endChars + 3) {
      return address;
    }
    
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  }

  /**
   * Get the explorer URL for a specific transaction
   */
  getTransactionUrl(txDigest: string): string {
    return `${this.config.explorerUrl}/txblock/${txDigest}`;
  }

  /**
   * Get the explorer URL for a specific object
   */
  getObjectUrl(objectId: string): string {
    return `${this.config.explorerUrl}/object/${objectId}`;
  }

  /**
   * Get the explorer URL for a specific address
   */
  getAddressUrl(address: string): string {
    return `${this.config.explorerUrl}/address/${address}`;
  }

  /**
   * Check if the network is a testnet
   */
  isTestnet(): boolean {
    return this.network === 'testnet' || this.network === 'devnet' || this.network === 'localnet';
  }

  /**
   * Check if the network is mainnet
   */
  isMainnet(): boolean {
    return this.network === 'mainnet';
  }

  /**
   * Get gas budget for transactions
   */
  getGasBudget(): number {
    return suiFusionConfig.gasLimits.createOrder;
  }

  /**
   * Get supported token types for the network
   */
  getSupportedTokens() {
    return this.config.tokens;
  }

  /**
   * Get DEX protocols supported on the network
   */
  getSupportedDexProtocols() {
    return suiFusionConfig.supportedDexes;
  }

  /**
   * Create a network factory for all supported networks
   */
  static createAllNetworks(): Map<SuiNetwork, SuiNetworkFactory> {
    const networks: SuiNetwork[] = ['mainnet', 'testnet', 'devnet', 'localnet'];
    const factories = new Map<SuiNetwork, SuiNetworkFactory>();
    
    networks.forEach(network => {
      factories.set(network, this.getInstance(network));
    });
    
    return factories;
  }

  /**
   * Get network status and health
   */
  async getNetworkStatus() {
    try {
      const latestCheckpoint = await this.client.getLatestCheckpointSequenceNumber();
      const chainId = await this.client.getChainIdentifier();
      
      return {
        network: this.network,
        chainId,
        latestCheckpoint,
        rpcUrl: this.getRpcUrl(),
        status: 'healthy',
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        network: this.network,
        chainId: null,
        latestCheckpoint: null,
        rpcUrl: this.config.rpcUrl,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Cleanup resources
   */
  static cleanup(): void {
    this.instances.clear();
  }
}

/**
 * Utility functions for Sui network operations
 */
export class SuiNetworkUtils {
  /**
   * Convert SUI amount from MIST to SUI
   */
  static mistToSui(mist: string | number): number {
    return Number(mist) / 1_000_000_000;
  }

  /**
   * Convert SUI amount from SUI to MIST
   */
  static suiToMist(sui: string | number): string {
    return (Number(sui) * 1_000_000_000).toString();
  }

  /**
   * Format token amount based on decimals
   */
  static formatTokenAmount(amount: string | number, decimals: number): number {
    return Number(amount) / Math.pow(10, decimals);
  }

  /**
   * Convert token amount to smallest unit
   */
  static toSmallestUnit(amount: string | number, decimals: number): string {
    return (Number(amount) * Math.pow(10, decimals)).toString();
  }

  /**
   * Get token decimals by type
   */
  static getTokenDecimals(tokenType: string): number {
    if (tokenType.includes('sui::SUI')) return 9;
    if (tokenType.includes('usdc::USDC') || tokenType.includes('usdt::USDT')) return 6;
    if (tokenType.includes('weth::WETH')) return 18;
    return 9; // Default to SUI decimals
  }

  /**
   * Extract token symbol from type
   */
  static getTokenSymbol(tokenType: string): string {
    if (tokenType.includes('sui::SUI')) return 'SUI';
    if (tokenType.includes('usdc::USDC')) return 'USDC';
    if (tokenType.includes('usdt::USDT')) return 'USDT';
    if (tokenType.includes('weth::WETH')) return 'WETH';
    if (tokenType.includes('cetus::CETUS')) return 'CETUS';
    return 'Unknown';
  }

  /**
   * Validate token type format
   */
  static isValidTokenType(tokenType: string): boolean {
    // Basic validation for Sui token type format
    return tokenType.startsWith('0x') && tokenType.includes('::');
  }

  /**
   * Calculate price impact
   */
  static calculatePriceImpact(inputAmount: number, outputAmount: number, marketRate: number): number {
    const expectedOutput = inputAmount * marketRate;
    const impact = ((expectedOutput - outputAmount) / expectedOutput) * 100;
    return Math.max(0, impact);
  }

  /**
   * Calculate slippage amount
   */
  static calculateSlippageAmount(amount: number, slippagePercent: number): number {
    return amount * (1 - slippagePercent / 100);
  }

  /**
   * Generate a random order ID
   */
  static generateOrderId(): string {
    const timestamp = Date.now().toString(16);
    const random = Math.random().toString(16).slice(2, 10);
    return `0x${timestamp}${random}`.padEnd(66, '0');
  }

  /**
   * Check if order is expired
   */
  static isOrderExpired(expirationTime: number): boolean {
    return Date.now() > expirationTime;
  }

  /**
   * Calculate order expiration time
   */
  static calculateExpirationTime(durationMs: number = 24 * 60 * 60 * 1000): number {
    return Date.now() + durationMs;
  }
}