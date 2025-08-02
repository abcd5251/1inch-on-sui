/**
 * SUI Move Cross-Chain Auction TypeScript SDK Example
 * 
 * This file demonstrates how to interact with the SUI Move cross-chain auction
 * and escrow system using the @mysten/sui.js library.
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from '@mysten/sui.js/utils';
import * as crypto from 'crypto';

// Configuration interface
interface AuctionConfig {
  packageId: string;
  registryId: string;
  adminCapId?: string;
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
}

// Auction data structures
interface Escrow {
  id: string;
  secretHash: number[];
  amount: string;
  makerAddress: string;
  timelock: string;
  metadata: string;
  isRevealed: boolean;
  isReleased: boolean;
  isRefunded: boolean;
  beneficiary?: string;
}

interface Auction {
  id: string;
  escrowId: string;
  seller: string;
  startPrice: string;
  endPrice: string;
  startTime: string;
  duration: string;
  secretHash: number[];
  isActive: boolean;
  isEnded: boolean;
  winner?: string;
  finalPrice?: string;
  metadata: string;
}

/**
 * Main SDK class for interacting with SUI Move cross-chain auction system
 */
export class CrossChainAuctionSDK {
  private client: SuiClient;
  private config: AuctionConfig;
  private keypair?: Ed25519Keypair;

  constructor(config: AuctionConfig) {
    this.config = config;
    this.client = new SuiClient({ url: getFullnodeUrl(config.network) });
  }

  /**
   * Set the keypair for signing transactions
   */
  setKeypair(keypair: Ed25519Keypair) {
    this.keypair = keypair;
  }

  /**
   * Generate a secret and its SHA3-256 hash
   */
  static generateSecret(): { secret: string; hash: number[] } {
    const secret = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha3-256').update(secret).digest();
    return {
      secret,
      hash: Array.from(hash)
    };
  }

  /**
   * Create a new escrow
   */
  async createEscrow(
    coinId: string,
    secretHash: number[],
    timelock: number,
    metadata: string
  ): Promise<string> {
    if (!this.keypair) throw new Error('Keypair not set');

    const tx = new TransactionBlock();
    
    tx.moveCall({
      target: `${this.config.packageId}::cross_chain_auction::create_escrow`,
      arguments: [
        tx.object(this.config.registryId),
        tx.object(coinId),
        tx.pure(secretHash),
        tx.pure(timelock.toString()),
        tx.pure(metadata),
        tx.object('0x6') // Clock object
      ]
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      signer: this.keypair,
      options: {
        showEffects: true,
        showEvents: true
      }
    });

    // Extract escrow ID from events
    const escrowEvent = result.events?.find(e => 
      e.type.includes('EscrowCreated')
    );
    
    if (!escrowEvent) throw new Error('Escrow creation failed');
    
    return (escrowEvent.parsedJson as any).escrow_id;
  }

  /**
   * Create a new Dutch auction
   */
  async createAuction(
    escrowId: number,
    startPrice: string,
    endPrice: string,
    duration: number,
    secretHash: number[],
    metadata: string
  ): Promise<string> {
    if (!this.keypair) throw new Error('Keypair not set');

    const tx = new TransactionBlock();
    
    tx.moveCall({
      target: `${this.config.packageId}::cross_chain_auction::create_auction`,
      arguments: [
        tx.object(this.config.registryId),
        tx.pure(escrowId.toString()),
        tx.pure(startPrice),
        tx.pure(endPrice),
        tx.pure(duration.toString()),
        tx.pure(secretHash),
        tx.pure(metadata),
        tx.object('0x6') // Clock object
      ]
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      signer: this.keypair,
      options: {
        showEffects: true,
        showEvents: true
      }
    });

    // Extract auction ID from events
    const auctionEvent = result.events?.find(e => 
      e.type.includes('AuctionCreated')
    );
    
    if (!auctionEvent) throw new Error('Auction creation failed');
    
    return (auctionEvent.parsedJson as any).auction_id;
  }

  /**
   * Place a bid on an auction
   */
  async placeBid(
    auctionId: number,
    coinId: string
  ): Promise<{ winner: string; finalPrice: string }> {
    if (!this.keypair) throw new Error('Keypair not set');

    const tx = new TransactionBlock();
    
    tx.moveCall({
      target: `${this.config.packageId}::cross_chain_auction::place_bid`,
      arguments: [
        tx.object(this.config.registryId),
        tx.pure(auctionId.toString()),
        tx.object(coinId),
        tx.object('0x6') // Clock object
      ]
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      signer: this.keypair,
      options: {
        showEffects: true,
        showEvents: true
      }
    });

    // Extract bid result from events
    const bidEvent = result.events?.find(e => 
      e.type.includes('BidPlaced')
    );
    
    if (!bidEvent) throw new Error('Bid placement failed');
    
    const eventData = bidEvent.parsedJson as any;
    return {
      winner: eventData.bidder,
      finalPrice: eventData.final_price
    };
  }

  /**
   * Reveal secret and release escrow funds
   */
  async revealAndRelease(
    escrowId: number,
    secret: string,
    beneficiary: string
  ): Promise<void> {
    if (!this.keypair) throw new Error('Keypair not set');

    const tx = new TransactionBlock();
    
    tx.moveCall({
      target: `${this.config.packageId}::cross_chain_auction::reveal_and_release`,
      arguments: [
        tx.object(this.config.registryId),
        tx.pure(escrowId.toString()),
        tx.pure(secret),
        tx.pure(beneficiary),
        tx.object('0x6') // Clock object
      ]
    });

    await this.client.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      signer: this.keypair
    });
  }

  /**
   * Get current auction price
   */
  async getCurrentPrice(auctionId: number): Promise<string> {
    const tx = new TransactionBlock();
    
    tx.moveCall({
      target: `${this.config.packageId}::cross_chain_auction::get_current_price`,
      arguments: [
        tx.object(this.config.registryId),
        tx.pure(auctionId.toString()),
        tx.object('0x6') // Clock object
      ]
    });

    const result = await this.client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: this.keypair?.toSuiAddress() || '0x0'
    });

    // Parse the result to extract price
    const returnValue = result.results?.[0]?.returnValues?.[0];
    if (!returnValue) throw new Error('Failed to get current price');
    
    const price = new TextDecoder().decode(fromB64(returnValue[1]));
    return price;
  }

  /**
   * Check if auction is active
   */
  async isAuctionActive(auctionId: number): Promise<boolean> {
    const tx = new TransactionBlock();
    
    tx.moveCall({
      target: `${this.config.packageId}::cross_chain_auction::is_auction_active`,
      arguments: [
        tx.object(this.config.registryId),
        tx.pure(auctionId.toString()),
        tx.object('0x6') // Clock object
      ]
    });

    const result = await this.client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: this.keypair?.toSuiAddress() || '0x0'
    });

    const returnValue = result.results?.[0]?.returnValues?.[0];
    if (!returnValue) throw new Error('Failed to check auction status');
    
    return returnValue[1] === 'AQ=='; // Base64 for true
  }

  /**
   * Get time remaining for auction
   */
  async getTimeRemaining(auctionId: number): Promise<number> {
    const tx = new TransactionBlock();
    
    tx.moveCall({
      target: `${this.config.packageId}::cross_chain_auction::get_time_remaining`,
      arguments: [
        tx.object(this.config.registryId),
        tx.pure(auctionId.toString()),
        tx.object('0x6') // Clock object
      ]
    });

    const result = await this.client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: this.keypair?.toSuiAddress() || '0x0'
    });

    const returnValue = result.results?.[0]?.returnValues?.[0];
    if (!returnValue) throw new Error('Failed to get time remaining');
    
    const timeRemaining = new TextDecoder().decode(fromB64(returnValue[1]));
    return parseInt(timeRemaining);
  }

  /**
   * Get suitable coin for payment
   */
  async getSuitableCoin(amount: string): Promise<string> {
    if (!this.keypair) throw new Error('Keypair not set');

    const address = this.keypair.toSuiAddress();
    const coins = await this.client.getCoins({
      owner: address,
      coinType: '0x2::sui::SUI'
    });

    const suitableCoin = coins.data.find(coin => 
      BigInt(coin.balance) >= BigInt(amount)
    );

    if (!suitableCoin) {
      throw new Error(`No suitable coin found for amount ${amount}`);
    }

    return suitableCoin.coinObjectId;
  }

  /**
   * Monitor auction price changes
   */
  async *monitorAuctionPrice(
    auctionId: number,
    intervalMs: number = 30000
  ): AsyncGenerator<{ timestamp: number; price: string }> {
    while (true) {
      try {
        const isActive = await this.isAuctionActive(auctionId);
        if (!isActive) break;

        const price = await this.getCurrentPrice(auctionId);
        yield {
          timestamp: Date.now(),
          price
        };

        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } catch (error) {
        console.error('Error monitoring auction price:', error);
        break;
      }
    }
  }
}

/**
 * Utility functions
 */
export class AuctionUtils {
  /**
   * Calculate protocol fee
   */
  static calculateProtocolFee(price: string, feeBps: number = 250): string {
    const priceNum = BigInt(price);
    const fee = (priceNum * BigInt(feeBps)) / BigInt(10000);
    return fee.toString();
  }

  /**
   * Calculate total payment (price + protocol fee)
   */
  static calculateTotalPayment(price: string, feeBps: number = 250): string {
    const priceNum = BigInt(price);
    const fee = AuctionUtils.calculateProtocolFee(price, feeBps);
    return (priceNum + BigInt(fee)).toString();
  }

  /**
   * Format SUI amount for display
   */
  static formatSuiAmount(amount: string): string {
    const amountNum = BigInt(amount);
    const sui = Number(amountNum) / 1_000_000_000;
    return sui.toFixed(9).replace(/\.?0+$/, '') + ' SUI';
  }

  /**
   * Parse SUI amount from string
   */
  static parseSuiAmount(amount: string): string {
    const sui = parseFloat(amount);
    return (sui * 1_000_000_000).toString();
  }

  /**
   * Generate timelock timestamp
   */
  static generateTimelock(offsetMs: number): number {
    return Date.now() + offsetMs;
  }

  /**
   * Check if timelock has expired
   */
  static isTimelockExpired(timelock: number): boolean {
    return Date.now() > timelock;
  }
}

/**
 * Example usage
 */
export async function exampleUsage() {
  // Initialize SDK
  const config: AuctionConfig = {
    packageId: '0x...', // Your deployed package ID
    registryId: '0x...', // Your registry object ID
    network: 'testnet'
  };

  const sdk = new CrossChainAuctionSDK(config);
  
  // Set keypair (in real app, load from secure storage)
  const keypair = Ed25519Keypair.generate();
  sdk.setKeypair(keypair);

  try {
    // Generate secret
    const { secret, hash } = CrossChainAuctionSDK.generateSecret();
    console.log('Generated secret:', secret);
    console.log('Secret hash:', hash);

    // Create escrow
    const coinId = await sdk.getSuitableCoin('1000000000'); // 1 SUI
    const timelock = AuctionUtils.generateTimelock(24 * 60 * 60 * 1000); // 24 hours
    
    const escrowId = await sdk.createEscrow(
      coinId,
      hash,
      timelock,
      'Cross-chain escrow for auction'
    );
    console.log('Created escrow:', escrowId);

    // Create auction
    const auctionId = await sdk.createAuction(
      parseInt(escrowId),
      AuctionUtils.parseSuiAmount('0.5'), // Start price: 0.5 SUI
      AuctionUtils.parseSuiAmount('0.1'), // End price: 0.1 SUI
      60 * 60 * 1000, // Duration: 1 hour
      hash,
      'Dutch auction for cross-chain asset'
    );
    console.log('Created auction:', auctionId);

    // Monitor price changes
    console.log('Monitoring auction price...');
    for await (const priceUpdate of sdk.monitorAuctionPrice(parseInt(auctionId))) {
      console.log(`Price at ${new Date(priceUpdate.timestamp).toISOString()}: ${AuctionUtils.formatSuiAmount(priceUpdate.price)}`);
      
      // Example: place bid when price drops below 0.3 SUI
      if (BigInt(priceUpdate.price) <= BigInt(AuctionUtils.parseSuiAmount('0.3'))) {
        const bidCoinId = await sdk.getSuitableCoin(
          AuctionUtils.calculateTotalPayment(priceUpdate.price)
        );
        
        const bidResult = await sdk.placeBid(parseInt(auctionId), bidCoinId);
        console.log('Bid placed! Winner:', bidResult.winner, 'Final price:', AuctionUtils.formatSuiAmount(bidResult.finalPrice));
        
        // Reveal secret and release funds
        await sdk.revealAndRelease(
          parseInt(escrowId),
          secret,
          bidResult.winner
        );
        console.log('Escrow released to winner');
        break;
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Export types for external use
export type { AuctionConfig, Escrow, Auction };