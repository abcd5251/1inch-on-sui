import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { logger } from '../utils/logger';
import { RelayerService } from '../services/relayer';
import { HTLCEvent, HTLCEventType, SuiHTLCEvent } from '../types/events';

export class SuiMonitor {
  private client: SuiClient;
  private relayerService: RelayerService;
  private config: any;
  private isRunning = false;
  private latestCheckpoint = 0;
  private keypair?: Ed25519Keypair;

  constructor(config: any, relayerService: RelayerService) {
    this.config = config;
    this.relayerService = relayerService;
    this.client = new SuiClient({ url: config.rpcUrl });
    
    if (config.privateKey) {
      this.keypair = Ed25519Keypair.fromSecretKey(Buffer.from(config.privateKey, 'hex'));
    }
  }

  async initialize(): Promise<void> {
    try {
      // Test connection
      const chainId = await this.client.getChainIdentifier();
      logger.info(`Connected to Sui network: ${this.config.network} (${chainId})`);

      // Verify package exists
      const packageObject = await this.client.getObject({
        id: this.config.packageId,
        options: { showContent: true }
      });

      if (!packageObject.data) {
        throw new Error(`No package found at ID ${this.config.packageId}`);
      }

      // Get latest checkpoint
      const latestCheckpoint = await this.client.getLatestCheckpointSequenceNumber();
      this.latestCheckpoint = parseInt(latestCheckpoint);
      logger.info(`Sui monitor initialized, starting from checkpoint ${this.latestCheckpoint}`);

    } catch (error) {
      logger.error('Failed to initialize Sui monitor:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Sui monitor is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting Sui HTLC monitoring...');

    // Start polling for events
    this.startEventPolling();

    // Start historical event sync in background
    this.syncHistoricalEvents().catch(error => {
      logger.error('Historical event sync failed:', error);
    });
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    logger.info('Stopping Sui monitor...');
  }

  private startEventPolling(): void {
    const pollEvents = async () => {
      if (!this.isRunning) return;

      try {
        const currentCheckpoint = await this.client.getLatestCheckpointSequenceNumber();
        const currentCheckpointNum = parseInt(currentCheckpoint);
        
        if (currentCheckpointNum > this.latestCheckpoint) {
          await this.queryEvents(this.latestCheckpoint + 1, currentCheckpointNum);
          this.latestCheckpoint = currentCheckpointNum;
        }

      } catch (error) {
        logger.error('Error polling Sui events:', error);
      }

      // Schedule next poll
      setTimeout(pollEvents, this.config.pollInterval || 5000);
    };

    pollEvents();
    logger.info('Polling monitoring started for Sui HTLC events');
  }

  private async queryEvents(fromCheckpoint: number, toCheckpoint: number): Promise<void> {
    try {
      // Query HTLC created events
      const createdEvents = await this.client.queryEvents({
        query: {
          MoveEventType: `${this.config.packageId}::htlc::HTLCCreated`
        },
        cursor: null,
        limit: 100,
        order: 'ascending'
      });

      for (const event of createdEvents.data) {
        if (event.parsedJson) {
          const htlcEvent: SuiHTLCEvent = {
            type: HTLCEventType.HTLC_CREATED,
            chain: 'sui',
            contractId: event.parsedJson.contract_id as string,
            sender: event.parsedJson.sender as string,
            receiver: event.parsedJson.receiver as string,
            amount: event.parsedJson.amount as string,
            hashlock: event.parsedJson.hashlock as string,
            timelock: event.parsedJson.timelock as string,
            sourceChainId: event.parsedJson.source_chain_id as string,
            blockNumber: parseInt(event.checkpoint || '0'),
            txHash: event.id.txDigest,
            timestamp: parseInt(event.timestampMs || '0'),
          };

          await this.processHTLCEvent(htlcEvent);
        }
      }

      // Query HTLC withdrawn events
      const withdrawnEvents = await this.client.queryEvents({
        query: {
          MoveEventType: `${this.config.packageId}::htlc::HTLCWithdrawn`
        },
        cursor: null,
        limit: 100,
        order: 'ascending'
      });

      for (const event of withdrawnEvents.data) {
        if (event.parsedJson) {
          const htlcEvent: SuiHTLCEvent = {
            type: HTLCEventType.HTLC_WITHDRAWN,
            chain: 'sui',
            contractId: event.parsedJson.contract_id as string,
            preimage: event.parsedJson.preimage as string,
            blockNumber: parseInt(event.checkpoint || '0'),
            txHash: event.id.txDigest,
            timestamp: parseInt(event.timestampMs || '0'),
          };

          await this.processHTLCEvent(htlcEvent);
        }
      }

      // Query HTLC refunded events
      const refundedEvents = await this.client.queryEvents({
        query: {
          MoveEventType: `${this.config.packageId}::htlc::HTLCRefunded`
        },
        cursor: null,
        limit: 100,
        order: 'ascending'
      });

      for (const event of refundedEvents.data) {
        if (event.parsedJson) {
          const htlcEvent: SuiHTLCEvent = {
            type: HTLCEventType.HTLC_REFUNDED,
            chain: 'sui',
            contractId: event.parsedJson.contract_id as string,
            blockNumber: parseInt(event.checkpoint || '0'),
            txHash: event.id.txDigest,
            timestamp: parseInt(event.timestampMs || '0'),
          };

          await this.processHTLCEvent(htlcEvent);
        }
      }

    } catch (error) {
      logger.error(`Error querying events from checkpoints ${fromCheckpoint}-${toCheckpoint}:`, error);
    }
  }

  private async syncHistoricalEvents(): Promise<void> {
    logger.info('Starting historical Sui event sync...');
    
    try {
      const currentCheckpoint = await this.client.getLatestCheckpointSequenceNumber();
      const currentCheckpointNum = parseInt(currentCheckpoint);
      const startCheckpoint = Math.max(0, currentCheckpointNum - 1000); // Last ~1000 checkpoints
      
      const batchSize = 100;
      
      for (let fromCheckpoint = startCheckpoint; fromCheckpoint < currentCheckpointNum; fromCheckpoint += batchSize) {
        const toCheckpoint = Math.min(fromCheckpoint + batchSize - 1, currentCheckpointNum);
        await this.queryEvents(fromCheckpoint, toCheckpoint);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      logger.info('Historical Sui event sync completed');
      
    } catch (error) {
      logger.error('Historical event sync failed:', error);
    }
  }

  private async processHTLCEvent(event: SuiHTLCEvent): Promise<void> {
    try {
      logger.info(`Processing Sui HTLC event: ${event.type}`, {
        contractId: event.contractId,
        blockNumber: event.blockNumber,
        txHash: event.txHash,
      });

      // Store event and trigger cross-chain relay logic
      await this.relayerService.processHTLCEvent(event);

    } catch (error) {
      logger.error('Error processing Sui HTLC event:', error);
    }
  }

  // Public methods for external queries and operations
  async getHTLCContract(contractId: string): Promise<any> {
    try {
      // Query the HTLC registry for contract details
      const txb = new TransactionBlock();
      txb.moveCall({
        target: `${this.config.packageId}::htlc::get_htlc`,
        arguments: [
          txb.object(this.config.registryId || this.config.packageId),
          txb.pure(contractId)
        ],
      });

      const result = await this.client.devInspectTransactionBlock({
        transactionBlock: txb,
        sender: this.keypair?.getPublicKey().toSuiAddress() || '0x1',
      });

      return result;
    } catch (error) {
      logger.error(`Error getting HTLC contract details for ${contractId}:`, error);
      throw error;
    }
  }

  async withdrawHTLC(contractId: string, preimage: string): Promise<string> {
    if (!this.keypair) {
      throw new Error('No private key configured for Sui operations');
    }

    try {
      const txb = new TransactionBlock();
      txb.moveCall({
        target: `${this.config.packageId}::htlc::withdraw`,
        arguments: [
          txb.object(this.config.registryId || this.config.packageId),
          txb.pure(contractId),
          txb.pure(Array.from(Buffer.from(preimage, 'hex'))),
        ],
      });

      const result = await this.client.signAndExecuteTransactionBlock({
        signer: this.keypair,
        transactionBlock: txb,
        options: {
          showEffects: true,
        },
      });

      logger.info(`HTLC withdrawal executed: ${result.digest}`);
      return result.digest;

    } catch (error) {
      logger.error(`Error withdrawing HTLC ${contractId}:`, error);
      throw error;
    }
  }

  async refundHTLC(contractId: string): Promise<string> {
    if (!this.keypair) {
      throw new Error('No private key configured for Sui operations');
    }

    try {
      const txb = new TransactionBlock();
      txb.moveCall({
        target: `${this.config.packageId}::htlc::refund`,
        arguments: [
          txb.object(this.config.registryId || this.config.packageId),
          txb.pure(contractId),
        ],
      });

      const result = await this.client.signAndExecuteTransactionBlock({
        signer: this.keypair,
        transactionBlock: txb,
        options: {
          showEffects: true,
        },
      });

      logger.info(`HTLC refund executed: ${result.digest}`);
      return result.digest;

    } catch (error) {
      logger.error(`Error refunding HTLC ${contractId}:`, error);
      throw error;
    }
  }

  async canWithdraw(contractId: string): Promise<boolean> {
    try {
      const contractDetails = await this.getHTLCContract(contractId);
      // Parse result to check if withdrawal is possible
      return contractDetails && !contractDetails.withdrawn && !contractDetails.refunded;
    } catch (error) {
      logger.error(`Error checking withdraw status for ${contractId}:`, error);
      return false;
    }
  }

  async canRefund(contractId: string): Promise<boolean> {
    try {
      const contractDetails = await this.getHTLCContract(contractId);
      // Parse result to check if refund is possible (timelock expired)
      const currentTime = Math.floor(Date.now() / 1000);
      return contractDetails && 
             !contractDetails.withdrawn && 
             !contractDetails.refunded && 
             contractDetails.timelock < currentTime;
    } catch (error) {
      logger.error(`Error checking refund status for ${contractId}:`, error);
      return false;
    }
  }
}