/**
 * Full End-to-End Cross-Chain Workflow Integration Tests
 * Tests complete atomic swap flows from Ethereum to Sui and from Sui to Ethereum
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ethers } from 'ethers';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { fromB64, toB64 } from '@mysten/sui/utils';
import { SwapStatus } from '../../src/schema/index.js';
import { EventMonitor } from '../../src/services/monitoring/eventMonitor.js';
import { SwapCoordinator } from '../../src/services/coordination/swapCoordinator.js';
import { TestDataGenerator, ApiTestClient, testEnv, TestAssertions } from './setup.js';

// Test configuration
const TEST_CONFIG = {
  ethereum: {
    rpcUrl: 'http://localhost:8545',
    chainId: 31337,
    htlcAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
  },
  sui: {
    rpcUrl: getFullnodeUrl('localnet'),
    packageId: '0x1', // Update after deployment
    chainId: 'sui:localnet'
  },
  timeouts: {
    lockDuration: 3600000, // 1 hour
    confirmationWait: 30000, // 30 seconds
    testTimeout: 120000 // 2 minutes
  }
};

// Test keys and addresses
const TEST_ACCOUNTS = {
  ethereum: {
    user: {
      privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
    },
    relayer: {
      privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
      address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
    }
  },
  sui: {
    user: Ed25519Keypair.generate(),
    relayer: Ed25519Keypair.generate()
  }
};

// Cross-chain swap test suite
describe('Full E2E Cross-Chain Workflow Tests', () => {
  let apiClient: ApiTestClient;
  let eventMonitor: EventMonitor;
  let swapCoordinator: SwapCoordinator;
  let ethProvider: ethers.JsonRpcProvider;
  let suiClient: SuiClient;
  let htlcContract: ethers.Contract;

  beforeEach(async () => {
    // Initialize API client
    apiClient = new ApiTestClient();

    // Get component instances
    const dbManager = testEnv.getDatabaseManager();
    const redisService = testEnv.getRedisService();

    // Initialize coordinator
    swapCoordinator = new SwapCoordinator(dbManager, redisService);
    await swapCoordinator.start();

    // Initialize Ethereum connection
    ethProvider = new ethers.JsonRpcProvider(TEST_CONFIG.ethereum.rpcUrl);
    
    // Initialize Sui connection
    suiClient = new SuiClient({ url: TEST_CONFIG.sui.rpcUrl });

    // Initialize HTLC contract
    const htlcAbi = [
      'function createSwap(tuple(address,address,address,uint256,uint256,uint256,uint256,bytes), bytes32, uint256, tuple(uint256,uint256,uint256,uint256)) returns (bytes32)',
      'function lockFunds(bytes32) payable',
      'function revealSecret(bytes32, bytes32)',
      'function completeSwap(bytes32, address)',
      'function refund(bytes32)',
      'function getSwap(bytes32) view returns (tuple(bytes32,tuple(address,address,address,uint256,uint256,uint256,uint256,bytes),address,bytes32,uint256,uint256,uint256,uint256,uint8,bytes32,tuple(uint256,uint256,uint256,uint256)))',
      'event SwapCreated(bytes32 indexed, address indexed, address indexed, bytes32, uint256, uint256)',
      'event FundsLocked(bytes32 indexed, address indexed, uint256, uint256)',
      'event SecretRevealed(bytes32 indexed, bytes32 indexed, bytes32, address indexed)',
      'event SwapCompleted(bytes32 indexed, address indexed, uint256)'
    ];

    htlcContract = new ethers.Contract(
      TEST_CONFIG.ethereum.htlcAddress,
      htlcAbi,
      ethProvider
    );

    // Configure event monitoring
    const monitorConfig = {
      ethereum: {
        rpcUrl: TEST_CONFIG.ethereum.rpcUrl,
        contractAddresses: [TEST_CONFIG.ethereum.htlcAddress],
        startBlock: 0,
        confirmations: 1,
        batchSize: 10,
      },
      sui: {
        rpcUrl: TEST_CONFIG.sui.rpcUrl,
        packageIds: [TEST_CONFIG.sui.packageId],
        startCheckpoint: 0,
        batchSize: 10,
      },
    };

    eventMonitor = new EventMonitor(monitorConfig, dbManager, redisService);
  });

  afterEach(async () => {
    if (swapCoordinator) {
      await swapCoordinator.stop();
    }
  });

  describe('Ethereum to Sui Cross-Chain Swap', () => {
    it('should complete full ETH->SUI atomic swap workflow', async () => {
      // Generate test keys
      const secret = ethers.randomBytes(32);
      const secretHash = ethers.keccak256(secret);

      // 1. Create cross-chain swap request
      const swapParams = {
        ...TestDataGenerator.generateSwapParams(),
        sourceChain: 'ethereum',
        targetChain: 'sui',
        makingAmount: ethers.parseEther('1').toString(), // 1 ETH
        takingAmount: '962890625000', // ~963 SUI (9 decimals) - $3466 worth at $3.6/SUI
        secretHash: secretHash,
        lockDuration: TEST_CONFIG.timeouts.lockDuration,
        resolverAddress: TEST_ACCOUNTS.ethereum.relayer.address
      };

      const createResponse = await apiClient.post('/api/swaps', swapParams);
      expect(createResponse.status).toBe(201);

      const createData = await createResponse.json();
      const swap = createData.data;
      expect(swap.status).toBe(SwapStatus.PENDING);

      // 2. Create HTLC lock on Ethereum
      const ethUserWallet = new ethers.Wallet(
        TEST_ACCOUNTS.ethereum.user.privateKey,
        ethProvider
      );

      const swapOrder = {
        maker: TEST_ACCOUNTS.ethereum.user.address,
        makerAsset: ethers.ZeroAddress, // ETH
        takerAsset: ethers.ZeroAddress, // Will be handled on Sui side
        makerAmount: ethers.parseEther('1'),
        takerAmount: ethers.parseUnits('2000', 9), // SUI precision
        salt: ethers.randomBytes(32),
        deadline: Math.floor(Date.now() / 1000) + 86400, // 24 hours
        makerSignature: '0x'
      };

      // Sign order
      const orderHash = ethers.solidityPackedKeccak256(
        ['address', 'address', 'address', 'uint256', 'uint256', 'bytes32', 'uint256', 'uint256'],
        [
          swapOrder.maker,
          swapOrder.makerAsset,
          swapOrder.takerAsset,
          swapOrder.makerAmount,
          swapOrder.takerAmount,
          swapOrder.salt,
          swapOrder.deadline,
          0 // nonce
        ]
      );

      const messageHash = ethers.hashMessage(ethers.getBytes(orderHash));
      swapOrder.makerSignature = await ethUserWallet.signMessage(ethers.getBytes(orderHash));

      // Dutch auction parameters
      const auctionParams = {
        startPrice: ethers.parseUnits('1010', 9), // 1010 SUI (5% above fair value)
        endPrice: ethers.parseUnits('963', 9),   // 963 SUI (fair value)
        startTime: Math.floor(Date.now() / 1000),
        duration: 180 // 3 minutes
      };

      // Create HTLC
      const resolverWallet = new ethers.Wallet(
        TEST_ACCOUNTS.ethereum.relayer.privateKey,
        ethProvider
      );
      const htlcWithResolver = htlcContract.connect(resolverWallet);

      const createTx = await htlcWithResolver.createSwap(
        swapOrder,
        secretHash,
        TEST_CONFIG.sui.chainId,
        auctionParams
      );
      const createReceipt = await createTx.wait();

      // Extract order ID
      const swapCreatedEvent = createReceipt.logs.find(
        log => log.fragment?.name === 'SwapCreated'
      );
      const orderId = swapCreatedEvent.args[0];

      // Lock funds
      const htlcWithUser = htlcContract.connect(ethUserWallet);
      const lockTx = await htlcWithUser.lockFunds(orderId, {
        value: ethers.parseEther('1')
      });
      await lockTx.wait();

      // 3. Create corresponding atomic lock on Sui side
      const suiUserKeypair = TEST_ACCOUNTS.sui.user;
      
      // Build Sui transaction
      const tx = new Transaction();
      
      // Create atomic swap lock
      tx.moveCall({
        target: `${TEST_CONFIG.sui.packageId}::atomic_swap_lock::create_atomic_lock`,
        arguments: [
          tx.object(TEST_CONFIG.sui.packageId), // protocol
          tx.pure.string(orderId), // swap_id
          tx.splitCoins(tx.gas, [tx.pure.u64('962890625000')]), // sui_coin (~963 SUI)
          tx.pure.vector('u8', ethers.getBytes(secretHash)), // secret_hash
          tx.pure.u64(Date.now() + TEST_CONFIG.timeouts.lockDuration), // timeout
          tx.pure.address(TEST_ACCOUNTS.ethereum.user.address), // counterparty
        ],
      });

      // Execute Sui transaction (simulated)
      // In actual testing, this requires real Sui network interaction
      const suiTxResult = {
        digest: 'mock_sui_tx_digest',
        objectChanges: [
          {
            type: 'created',
            objectId: 'mock_atomic_lock_id'
          }
        ]
      };

      // 4. Wait for cross-chain confirmation
      await TestAssertions.waitFor(async () => {
        const response = await apiClient.get(`/api/swaps/${swap.orderId}`);
        const data = await response.json();
        return data.data.status === SwapStatus.ACTIVE;
      }, TEST_CONFIG.timeouts.confirmationWait);

      // 5. Simulate Sui side lock confirmation
      await TestAssertions.waitFor(async () => {
        const response = await apiClient.get(`/api/swaps/${swap.orderId}`);
        const data = await response.json();
        return data.data.substatus === 'cross-chain-confirmed';
      }, TEST_CONFIG.timeouts.confirmationWait);

      // 6. Reveal secret on Ethereum side
      const revealTx = await htlcWithUser.revealSecret(orderId, secret);
      await revealTx.wait();

      // 7. Use secret to unlock funds on Sui side
      // Simulate Sui side unlock transaction
      const unlockTx = new Transaction();
      unlockTx.moveCall({
        target: `${TEST_CONFIG.sui.packageId}::atomic_swap_lock::unlock_with_secret`,
        arguments: [
          tx.object(TEST_CONFIG.sui.packageId), // protocol
          tx.pure.string('mock_atomic_lock_id'), // lock_id
          tx.pure.vector('u8', ethers.getBytes(secret)), // secret
        ],
      });

      // 8. Verify swap completion
      await TestAssertions.waitFor(async () => {
        const response = await apiClient.get(`/api/swaps/${swap.orderId}`);
        const data = await response.json();
        return data.data.status === SwapStatus.COMPLETED;
      }, TEST_CONFIG.timeouts.confirmationWait);

      const finalResponse = await apiClient.get(`/api/swaps/${swap.orderId}`);
      const finalData = await finalResponse.json();
      const finalSwap = finalData.data;

      expect(finalSwap.status).toBe(SwapStatus.COMPLETED);
      expect(finalSwap.secret).toBe(ethers.hexlify(secret));

      // Verify Ethereum contract state
      const contractSwap = await htlcContract.getSwap(orderId);
      expect(contractSwap.status).toBe(2); // COMPLETED status

    }, TEST_CONFIG.timeouts.testTimeout);
  });

  describe('Sui to Ethereum Cross-Chain Swap', () => {
    it('should complete full SUI->ETH atomic swap workflow', async () => {
      // Generate test secret
      const secret = ethers.randomBytes(32);
      const secretHash = ethers.keccak256(secret);

      // 1. Create reverse cross-chain swap request
      const swapParams = {
        ...TestDataGenerator.generateSwapParams(),
        sourceChain: 'sui',
        targetChain: 'ethereum',
        makingAmount: '1000000000000', // 1000 SUI ($3600 worth)
        takingAmount: ethers.parseEther('1.039').toString(), // ~1.039 ETH ($3600 worth)
        secretHash: secretHash,
        lockDuration: TEST_CONFIG.timeouts.lockDuration
      };

      const createResponse = await apiClient.post('/api/swaps', swapParams);
      expect(createResponse.status).toBe(201);

      const createData = await createResponse.json();
      const swap = createData.data;

      // 2. Create cross-chain swap on Sui side
      const suiUserKeypair = TEST_ACCOUNTS.sui.user;
      
      const tx = new Transaction();
      tx.moveCall({
        target: `${TEST_CONFIG.sui.packageId}::cross_chain_swap::create_cross_chain_swap`,
        arguments: [
          tx.object(TEST_CONFIG.sui.packageId), // protocol
          tx.pure.string(swap.orderId), // order_id
          tx.pure.u64(TEST_CONFIG.sui.chainId), // source_chain_id
          tx.pure.u64(TEST_CONFIG.ethereum.chainId), // target_chain_id
          tx.splitCoins(tx.gas, [tx.pure.u64('1000000000000')]), // sui_coin (1000 SUI)
          tx.pure.u64(ethers.parseEther('1.039').toString()), // target_amount (~1.039 ETH)
          tx.pure.vector('u8', ethers.getBytes(secretHash)), // secret_hash
          tx.pure.u64(Date.now() + TEST_CONFIG.timeouts.lockDuration), // timeout
        ],
      });

      // Simulate Sui transaction execution
      const suiTxResult = {
        digest: 'mock_sui_create_tx',
        objectChanges: [
          {
            type: 'created',
            objectId: 'mock_cross_chain_swap_id'
          }
        ]
      };

      // 3. Create corresponding lock on Ethereum side
      const ethUserWallet = new ethers.Wallet(
        TEST_ACCOUNTS.ethereum.user.privateKey,
        ethProvider
      );

      const swapOrder = {
        maker: TEST_ACCOUNTS.ethereum.user.address,
        makerAsset: ethers.ZeroAddress, // ETH
        takerAsset: ethers.ZeroAddress,
        makerAmount: ethers.parseEther('1'),
        takerAmount: ethers.parseUnits('2000', 9),
        salt: ethers.randomBytes(32),
        deadline: Math.floor(Date.now() / 1000) + 86400,
        makerSignature: '0x'
      };

      // Sign and create HTLC (similar process as before)
      const orderHash = ethers.solidityPackedKeccak256(
        ['address', 'address', 'address', 'uint256', 'uint256', 'bytes32', 'uint256', 'uint256'],
        [
          swapOrder.maker,
          swapOrder.makerAsset,
          swapOrder.takerAsset,
          swapOrder.makerAmount,
          swapOrder.takerAmount,
          swapOrder.salt,
          swapOrder.deadline,
          0
        ]
      );

      swapOrder.makerSignature = await ethUserWallet.signMessage(ethers.getBytes(orderHash));

      const resolverWallet = new ethers.Wallet(
        TEST_ACCOUNTS.ethereum.relayer.privateKey,
        ethProvider
      );
      const htlcWithResolver = htlcContract.connect(resolverWallet);

      const auctionParams = {
        startPrice: ethers.parseEther('1.1'),
        endPrice: ethers.parseEther('1'),
        startTime: Math.floor(Date.now() / 1000),
        duration: 180
      };

      const createTx = await htlcWithResolver.createSwap(
        swapOrder,
        secretHash,
        TEST_CONFIG.ethereum.chainId,
        auctionParams
      );
      const createReceipt = await createTx.wait();

      const swapCreatedEvent = createReceipt.logs.find(
        log => log.fragment?.name === 'SwapCreated'
      );
      const orderId = swapCreatedEvent.args[0];

      // Lock Ethereum funds
      const htlcWithUser = htlcContract.connect(ethUserWallet);
      const lockTx = await htlcWithUser.lockFunds(orderId, {
        value: ethers.parseEther('1')
      });
      await lockTx.wait();

      // 4. Reveal secret on Sui side
      const suiRevealTx = new Transaction();
      suiRevealTx.moveCall({
        target: `${TEST_CONFIG.sui.packageId}::cross_chain_swap::reveal_secret`,
        arguments: [
          tx.object(TEST_CONFIG.sui.packageId), // protocol
          tx.pure.string('mock_cross_chain_swap_id'), // swap_id
          tx.pure.vector('u8', ethers.getBytes(secret)), // secret
        ],
      });

      // 5. Complete swap on Ethereum side using revealed secret
      const revealTx = await htlcWithUser.revealSecret(orderId, secret);
      await revealTx.wait();

      const completeTx = await htlcWithResolver.completeSwap(
        orderId,
        TEST_ACCOUNTS.sui.user.toSuiAddress() // Sui user address
      );
      await completeTx.wait();

      // 6. Verify swap completion
      await TestAssertions.waitFor(async () => {
        const response = await apiClient.get(`/api/swaps/${swap.orderId}`);
        const data = await response.json();
        return data.data.status === SwapStatus.COMPLETED;
      }, TEST_CONFIG.timeouts.confirmationWait);

      const finalResponse = await apiClient.get(`/api/swaps/${swap.orderId}`);
      const finalData = await finalResponse.json();
      const finalSwap = finalData.data;

      expect(finalSwap.status).toBe(SwapStatus.COMPLETED);
      expect(finalSwap.secret).toBe(ethers.hexlify(secret));

    }, TEST_CONFIG.timeouts.testTimeout);
  });

  describe('Cross-Chain Error Scenarios', () => {
    it('should handle timeout and execute proper refunds', async () => {
      const secret = ethers.randomBytes(32);
      const secretHash = ethers.keccak256(secret);

      // Create swap with short timeout
      const swapParams = {
        ...TestDataGenerator.generateSwapParams(),
        sourceChain: 'ethereum',
        targetChain: 'sui',
        makingAmount: ethers.parseEther('0.5').toString(),
        takingAmount: '481445312500', // ~481 SUI ($1733 worth at $3.6/SUI)
        secretHash: secretHash,
        lockDuration: 60000, // 1 minute timeout
      };

      const createResponse = await apiClient.post('/api/swaps', swapParams);
      const swap = (await createResponse.json()).data;

      // Create Ethereum side lock
      const ethUserWallet = new ethers.Wallet(
        TEST_ACCOUNTS.ethereum.user.privateKey,
        ethProvider
      );

      // Simplified HTLC creation process
      const swapOrder = {
        maker: TEST_ACCOUNTS.ethereum.user.address,
        makerAsset: ethers.ZeroAddress,
        takerAsset: ethers.ZeroAddress,
        makerAmount: ethers.parseEther('0.5'),
        takerAmount: ethers.parseUnits('1000', 9),
        salt: ethers.randomBytes(32),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        makerSignature: '0x'
      };

      const orderHash = ethers.solidityPackedKeccak256(
        ['address', 'address', 'address', 'uint256', 'uint256', 'bytes32', 'uint256', 'uint256'],
        [
          swapOrder.maker,
          swapOrder.makerAsset,
          swapOrder.takerAsset,
          swapOrder.makerAmount,
          swapOrder.takerAmount,
          swapOrder.salt,
          swapOrder.deadline,
          0
        ]
      );

      swapOrder.makerSignature = await ethUserWallet.signMessage(ethers.getBytes(orderHash));

      const resolverWallet = new ethers.Wallet(
        TEST_ACCOUNTS.ethereum.relayer.privateKey,
        ethProvider
      );
      const htlcWithResolver = htlcContract.connect(resolverWallet);

      const createTx = await htlcWithResolver.createSwap(
        swapOrder,
        secretHash,
        TEST_CONFIG.sui.chainId,
        {
          startPrice: ethers.parseUnits('1000', 9),
          endPrice: ethers.parseUnits('1000', 9),
          startTime: Math.floor(Date.now() / 1000),
          duration: 180
        }
      );
      const createReceipt = await createTx.wait();

      const swapCreatedEvent = createReceipt.logs.find(
        log => log.fragment?.name === 'SwapCreated'
      );
      const orderId = swapCreatedEvent.args[0];

      // Lock funds
      const htlcWithUser = htlcContract.connect(ethUserWallet);
      const lockTx = await htlcWithUser.lockFunds(orderId, {
        value: ethers.parseEther('0.5')
      });
      await lockTx.wait();

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 65000)); // Wait beyond timeout period

      // Execute refund
      const initialBalance = await ethProvider.getBalance(TEST_ACCOUNTS.ethereum.user.address);
      
      const refundTx = await htlcWithUser.refund(orderId);
      const refundReceipt = await refundTx.wait();

      const finalBalance = await ethProvider.getBalance(TEST_ACCOUNTS.ethereum.user.address);
      
      // Verify successful refund (considering gas fees)
      expect(finalBalance > initialBalance + ethers.parseEther('0.4')).toBe(true);

      // Verify contract state
      const contractSwap = await htlcContract.getSwap(orderId);
      expect(contractSwap.status).toBe(5); // REFUNDED status

    }, TEST_CONFIG.timeouts.testTimeout * 2); // Extended timeout for refund testing
  });

  describe('Multi-Chain Coordination', () => {
    it('should coordinate swaps across multiple supported chains', async () => {
      const secret = ethers.randomBytes(32);
      const secretHash = ethers.keccak256(secret);

      // Create multiple concurrent cross-chain swaps
      const swapConfigs = [
        {
          sourceChain: 'ethereum',
          targetChain: 'sui',
          makingAmount: ethers.parseEther('0.3').toString(),
          takingAmount: '288867187500' // ~289 SUI ($1040 worth at $3.6/SUI)
        },
        {
          sourceChain: 'sui',
          targetChain: 'ethereum',
          makingAmount: '800000000000', // 800 SUI ($2880 worth)
          takingAmount: ethers.parseEther('0.831').toString() // ~0.831 ETH ($2880 worth)
        }
      ];

      const swaps = [];
      
      for (const config of swapConfigs) {
        const swapParams = {
          ...TestDataGenerator.generateSwapParams(),
          ...config,
          secretHash: ethers.keccak256(ethers.randomBytes(32)), // Each swap uses different secret
          lockDuration: TEST_CONFIG.timeouts.lockDuration
        };

        const createResponse = await apiClient.post('/api/swaps', swapParams);
        const swap = (await createResponse.json()).data;
        swaps.push(swap);
      }

      // Verify all swaps created successfully
      expect(swaps).toHaveLength(2);
      swaps.forEach(swap => {
        expect(swap.status).toBe(SwapStatus.PENDING);
      });

      // Verify cross-chain coordination status
      const statsResponse = await apiClient.get('/api/swaps/stats');
      const stats = (await statsResponse.json()).data;
      
      expect(stats.totalSwaps).toBeGreaterThanOrEqual(2);
      expect(stats.pendingSwaps).toBeGreaterThanOrEqual(2);

    }, TEST_CONFIG.timeouts.testTimeout);
  });
});