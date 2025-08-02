import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { RelayerService } from '../services/relayer';
import { HTLCEvent, HTLCEventType, EthereumHTLCEvent } from '../types/events';

export class EthereumMonitor {
  private provider: ethers.JsonRpcProvider;
  private wsProvider?: ethers.WebSocketProvider;
  private contract: ethers.Contract;
  private relayerService: RelayerService;
  private config: any;
  private isRunning = false;
  private latestBlock = 0;

  // HTLC Contract ABI (essential events and functions)
  private readonly HTLC_ABI = [
    'event HTLCDeposit(bytes32 indexed contractId, address indexed sender, address indexed receiver, address tokenContract, uint256 amount, bytes32 hashlock, uint256 timelock, uint256 chainId)',
    'event HTLCWithdraw(bytes32 indexed contractId, bytes32 preimage)',
    'event HTLCRefund(bytes32 indexed contractId)',
    'function getContract(bytes32 contractId) view returns (tuple(address sender, address receiver, address tokenContract, uint256 amount, bytes32 hashlock, uint256 timelock, bool withdrawn, bool refunded, bytes32 preimage, uint256 targetChainId))',
    'function haveContract(bytes32 contractId) view returns (bool)',
    'function canWithdraw(bytes32 contractId) view returns (bool)',
    'function canRefund(bytes32 contractId) view returns (bool)',
  ];

  constructor(config: any, relayerService: RelayerService) {
    this.config = config;
    this.relayerService = relayerService;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    
    if (config.wsUrl) {
      this.wsProvider = new ethers.WebSocketProvider(config.wsUrl);
    }

    this.contract = new ethers.Contract(
      config.htlcContractAddress,
      this.HTLC_ABI,
      this.provider
    );
  }

  async initialize(): Promise<void> {
    try {
      // Test connection
      const network = await this.provider.getNetwork();
      logger.info(`Connected to Ethereum network: ${network.name} (${network.chainId})`);

      // Verify contract exists
      const code = await this.provider.getCode(this.config.htlcContractAddress);
      if (code === '0x') {
        throw new Error(`No contract found at address ${this.config.htlcContractAddress}`);
      }

      // Get latest block
      this.latestBlock = this.config.startBlock || await this.provider.getBlockNumber();
      logger.info(`Ethereum monitor initialized, starting from block ${this.latestBlock}`);

    } catch (error) {
      logger.error('Failed to initialize Ethereum monitor:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Ethereum monitor is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting Ethereum HTLC monitoring...');

    // Start real-time monitoring with WebSocket if available
    if (this.wsProvider) {
      await this.startWebSocketMonitoring();
    } else {
      await this.startPollingMonitoring();
    }

    // Start historical event sync in background
    this.syncHistoricalEvents().catch(error => {
      logger.error('Historical event sync failed:', error);
    });
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    logger.info('Stopping Ethereum monitor...');

    if (this.wsProvider) {
      await this.wsProvider.destroy();
    }
  }

  private async startWebSocketMonitoring(): Promise<void> {
    try {
      const wsContract = new ethers.Contract(
        this.config.htlcContractAddress,
        this.HTLC_ABI,
        this.wsProvider!
      );

      // Listen for HTLC deposit events
      wsContract.on('HTLCDeposit', async (contractId, sender, receiver, tokenContract, amount, hashlock, timelock, chainId, event) => {
        const htlcEvent: EthereumHTLCEvent = {
          type: HTLCEventType.HTLC_CREATED,
          chain: 'ethereum',
          contractId: contractId,
          sender,
          receiver,
          tokenContract,
          amount: amount.toString(),
          hashlock,
          timelock: timelock.toString(),
          targetChainId: chainId.toString(),
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: Date.now(),
        };

        await this.processHTLCEvent(htlcEvent);
      });

      // Listen for withdraw events
      wsContract.on('HTLCWithdraw', async (contractId, preimage, event) => {
        const htlcEvent: EthereumHTLCEvent = {
          type: HTLCEventType.HTLC_WITHDRAWN,
          chain: 'ethereum',
          contractId,
          preimage,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: Date.now(),
        };

        await this.processHTLCEvent(htlcEvent);
      });

      // Listen for refund events
      wsContract.on('HTLCRefund', async (contractId, event) => {
        const htlcEvent: EthereumHTLCEvent = {
          type: HTLCEventType.HTLC_REFUNDED,
          chain: 'ethereum',
          contractId,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: Date.now(),
        };

        await this.processHTLCEvent(htlcEvent);
      });

      logger.info('WebSocket monitoring started for Ethereum HTLC events');

    } catch (error) {
      logger.error('WebSocket monitoring failed, falling back to polling:', error);
      await this.startPollingMonitoring();
    }
  }

  private async startPollingMonitoring(): Promise<void> {
    const pollEvents = async () => {
      if (!this.isRunning) return;

      try {
        const currentBlock = await this.provider.getBlockNumber();
        
        if (currentBlock > this.latestBlock) {
          await this.queryEvents(this.latestBlock + 1, currentBlock);
          this.latestBlock = currentBlock;
        }

      } catch (error) {
        logger.error('Error polling Ethereum events:', error);
      }

      // Schedule next poll
      setTimeout(pollEvents, this.config.pollInterval || 5000);
    };

    pollEvents();
    logger.info('Polling monitoring started for Ethereum HTLC events');
  }

  private async queryEvents(fromBlock: number, toBlock: number): Promise<void> {
    try {
      // Query HTLC deposit events
      const depositFilter = this.contract.filters.HTLCDeposit();
      const depositEvents = await this.contract.queryFilter(depositFilter, fromBlock, toBlock);

      for (const event of depositEvents) {
        const htlcEvent: EthereumHTLCEvent = {
          type: HTLCEventType.HTLC_CREATED,
          chain: 'ethereum',
          contractId: event.args![0],
          sender: event.args![1],
          receiver: event.args![2],
          tokenContract: event.args![3],
          amount: event.args![4].toString(),
          hashlock: event.args![5],
          timelock: event.args![6].toString(),
          targetChainId: event.args![7].toString(),
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: Date.now(),
        };

        await this.processHTLCEvent(htlcEvent);
      }

      // Query withdraw events
      const withdrawFilter = this.contract.filters.HTLCWithdraw();
      const withdrawEvents = await this.contract.queryFilter(withdrawFilter, fromBlock, toBlock);

      for (const event of withdrawEvents) {
        const htlcEvent: EthereumHTLCEvent = {
          type: HTLCEventType.HTLC_WITHDRAWN,
          chain: 'ethereum',
          contractId: event.args![0],
          preimage: event.args![1],
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: Date.now(),
        };

        await this.processHTLCEvent(htlcEvent);
      }

      // Query refund events
      const refundFilter = this.contract.filters.HTLCRefund();
      const refundEvents = await this.contract.queryFilter(refundFilter, fromBlock, toBlock);

      for (const event of refundEvents) {
        const htlcEvent: EthereumHTLCEvent = {
          type: HTLCEventType.HTLC_REFUNDED,
          chain: 'ethereum',
          contractId: event.args![0],
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: Date.now(),
        };

        await this.processHTLCEvent(htlcEvent);
      }

    } catch (error) {
      logger.error(`Error querying events from blocks ${fromBlock}-${toBlock}:`, error);
    }
  }

  private async syncHistoricalEvents(): Promise<void> {
    logger.info('Starting historical Ethereum event sync...');
    
    try {
      const currentBlock = await this.provider.getBlockNumber();
      const startBlock = Math.max(0, currentBlock - 10000); // Last ~2 days of blocks
      
      const batchSize = 1000;
      
      for (let fromBlock = startBlock; fromBlock < currentBlock; fromBlock += batchSize) {
        const toBlock = Math.min(fromBlock + batchSize - 1, currentBlock);
        await this.queryEvents(fromBlock, toBlock);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      logger.info('Historical Ethereum event sync completed');
      
    } catch (error) {
      logger.error('Historical event sync failed:', error);
    }
  }

  private async processHTLCEvent(event: EthereumHTLCEvent): Promise<void> {
    try {
      logger.info(`Processing Ethereum HTLC event: ${event.type}`, {
        contractId: event.contractId,
        blockNumber: event.blockNumber,
        txHash: event.txHash,
      });

      // Store event and trigger cross-chain relay logic
      await this.relayerService.processHTLCEvent(event);

    } catch (error) {
      logger.error('Error processing Ethereum HTLC event:', error);
    }
  }

  // Public methods for external queries
  async getContractDetails(contractId: string): Promise<any> {
    try {
      const details = await this.contract.getContract(contractId);
      return {
        sender: details[0],
        receiver: details[1],
        tokenContract: details[2],
        amount: details[3].toString(),
        hashlock: details[4],
        timelock: details[5].toString(),
        withdrawn: details[6],
        refunded: details[7],
        preimage: details[8],
        targetChainId: details[9].toString(),
      };
    } catch (error) {
      logger.error(`Error getting contract details for ${contractId}:`, error);
      throw error;
    }
  }

  async contractExists(contractId: string): Promise<boolean> {
    try {
      return await this.contract.haveContract(contractId);
    } catch (error) {
      logger.error(`Error checking contract existence for ${contractId}:`, error);
      return false;
    }
  }

  async canWithdraw(contractId: string): Promise<boolean> {
    try {
      return await this.contract.canWithdraw(contractId);
    } catch (error) {
      logger.error(`Error checking withdraw status for ${contractId}:`, error);
      return false;
    }
  }

  async canRefund(contractId: string): Promise<boolean> {
    try {
      return await this.contract.canRefund(contractId);
    } catch (error) {
      logger.error(`Error checking refund status for ${contractId}:`, error);
      return false;
    }
  }
}