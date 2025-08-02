// SUI to EVM Escrow Deployment Script
const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config();

class SUIToEVMDeployer {
    constructor(config) {
        this.config = config;
        this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
        this.wallet = new ethers.Wallet(config.privateKey, this.provider);
        this.deployedContracts = new Map();
        
        // Load contract artifacts
        this.escrowArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/SUIEscrow.sol/SUIEscrow.json', 'utf8'));
        this.auctionArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/DutchAuctionEVM.sol/DutchAuctionEVM.json', 'utf8'));
        this.auctionContractAddress = null;
    }

    /**
     * Listen for relayer parameters and deploy escrow + auction contracts
     */
    async startListening() {
        console.log(`🚀 Starting SUI to EVM Escrow + Auction Deployer on ${this.config.chainName}`);
        console.log(`📍 Deployer Address: ${this.wallet.address}`);
        
        // Deploy Dutch Auction contract first (if not already deployed)
        await this.ensureAuctionContract();
        
        // In production, this would listen to your relayer service
        // For hackathon, we'll simulate with HTTP endpoint or direct calls
        await this.setupRelayerListener();
    }

    /**
     * Setup listener for relayer parameters
     * Replace this with your actual relayer communication method
     */
    async setupRelayerListener() {
        const express = require('express');
        const app = express();
        app.use(express.json());

        // Endpoint to receive parameters from relayer
        app.post('/deploy-escrow', async (req, res) => {
            try {
                const params = this.validateRelayerParams(req.body);
                console.log('📨 Received relayer parameters:', params);
                
                const deploymentResult = await this.deployEscrowContract(params);
                
                res.json({
                    success: true,
                    deployment: deploymentResult
                });
            } catch (error) {
                console.error('❌ Deployment failed:', error);
                res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Endpoint to create auction after escrow is deployed
        app.post('/create-auction', async (req, res) => {
            try {
                const auctionResult = await this.createDutchAuction(req.body);
                
                res.json({
                    success: true,
                    auction: auctionResult
                });
            } catch (error) {
                console.error('❌ Auction creation failed:', error);
                res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Endpoint for complete escrow + auction deployment
        app.post('/deploy-full-system', async (req, res) => {
            try {
                const params = this.validateRelayerParams(req.body);
                console.log('📨 Received full system parameters:', params);
                
                // Deploy escrow first
                const escrowDeployment = await this.deployEscrowContract(params);
                
                // Create auction linked to escrow
                const auctionParams = {
                    escrowContract: escrowDeployment.contractAddress,
                    startPrice: params.auctionStartPrice || params.amount,
                    endPrice: params.auctionEndPrice || (params.amount / 2n),
                    duration: params.auctionDuration || 3600, // 1 hour default
                    secretHash: params.secretHash,
                    metadata: JSON.stringify(params.metadata || {})
                };
                
                const auctionResult = await this.createDutchAuction(auctionParams);
                
                res.json({
                    success: true,
                    escrow: escrowDeployment,
                    auction: auctionResult
                });
            } catch (error) {
                console.error('❌ Full system deployment failed:', error);
                res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Health check endpoint
        app.get('/health', (req, res) => {
            res.json({ 
                status: 'healthy', 
                chain: this.config.chainName,
                deployer: this.wallet.address,
                deployedContracts: this.deployedContracts.size,
                auctionContract: this.auctionContractAddress
            });
        });

        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`🌐 Relayer listener running on port ${port}`);
        });
    }

    /**
     * Validate parameters from relayer
     */
    validateRelayerParams(params) {
        const required = ['secretHash', 'amount', 'destinationChain', 'makerAddress', 'timelock'];
        
        for (const field of required) {
            if (!params[field]) {
                throw new Error(`Missing required parameter: ${field}`);
            }
        }

        // Validate formats
        if (!ethers.isAddress(params.makerAddress)) {
            throw new Error('Invalid maker address');
        }

        if (!params.secretHash.startsWith('0x') || params.secretHash.length !== 66) {
            throw new Error('Invalid secret hash format');
        }

        if (parseInt(params.amount) <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        if (parseInt(params.timelock) <= Math.floor(Date.now() / 1000)) {
            throw new Error('Timelock must be in the future');
        }

        return {
            secretHash: params.secretHash,
            amount: ethers.parseUnits(params.amount.toString(), 6), // USDC has 6 decimals
            destinationChain: params.destinationChain,
            makerAddress: params.makerAddress,
            timelock: parseInt(params.timelock),
            suiTxHash: params.suiTxHash || null,
            metadata: params.metadata || {},
            // Auction parameters (optional)
            auctionStartPrice: params.auctionStartPrice ? ethers.parseUnits(params.auctionStartPrice.toString(), 6) : null,
            auctionEndPrice: params.auctionEndPrice ? ethers.parseUnits(params.auctionEndPrice.toString(), 6) : null,
            auctionDuration: params.auctionDuration ? parseInt(params.auctionDuration) : null
        };
    }

    /**
     * Deploy escrow contract with relayer parameters
     */
    async deployEscrowContract(params) {
        console.log('🏗️  Deploying escrow contract...');
        
        const contractFactory = new ethers.ContractFactory(
            this.escrowArtifact.abi,
            this.escrowArtifact.bytecode,
            this.wallet
        );

        // Estimate gas
        const estimatedGas = await contractFactory.getDeployTransaction(
            this.config.usdcAddress,
            params.secretHash,
            params.amount,
            params.makerAddress,
            params.timelock,
            JSON.stringify(params.metadata)
        ).estimateGas();

        console.log(`⛽ Estimated gas: ${estimatedGas.toString()}`);

        // Deploy contract
        const contract = await contractFactory.deploy(
            this.config.usdcAddress,
            params.secretHash,
            params.amount,
            params.makerAddress,
            params.timelock,
            JSON.stringify(params.metadata),
            {
                gasLimit: estimatedGas * 120n / 100n, // Add 20% buffer
                gasPrice: await this.provider.getGasPrice()
            }
        );

        console.log('⏳ Waiting for deployment...');
        await contract.waitForDeployment();

        const contractAddress = await contract.getAddress();
        const deploymentTx = contract.deploymentTransaction();

        console.log(`✅ Contract deployed at: ${contractAddress}`);
        console.log(`📄 Deployment TX: ${deploymentTx.hash}`);

        // Store deployment info
        const deploymentInfo = {
            contractAddress,
            deploymentTx: deploymentTx.hash,
            params,
            timestamp: Date.now(),
            blockNumber: deploymentTx.blockNumber,
            chainId: this.config.chainId
        };

        this.deployedContracts.set(contractAddress, deploymentInfo);
        
        // Save to file for persistence
        await this.saveDeploymentRecord(deploymentInfo);

        // Verify the contract was deployed correctly
        await this.verifyDeployment(contractAddress, params);

        return deploymentInfo;
    }

    /**
     * Verify contract deployment
     */
    async verifyDeployment(contractAddress, originalParams) {
        console.log('🔍 Verifying deployment...');
        
        const contract = new ethers.Contract(
            contractAddress,
            this.escrowArtifact.abi,
            this.wallet
        );

        try {
            // Check if contract is deployed and has correct parameters
            const storedSecretHash = await contract.secretHash();
            const storedAmount = await contract.amount();
            const storedMaker = await contract.makerAddress();
            const storedTimelock = await contract.timelock();

            if (storedSecretHash !== originalParams.secretHash) {
                throw new Error('Secret hash mismatch');
            }

            if (storedAmount !== originalParams.amount) {
                throw new Error('Amount mismatch');
            }

            if (storedMaker !== originalParams.makerAddress) {
                throw new Error('Maker address mismatch');
            }

            if (storedTimelock !== BigInt(originalParams.timelock)) {
                throw new Error('Timelock mismatch');
            }

            console.log('✅ Deployment verification successful');
            return true;
        } catch (error) {
            console.error('❌ Deployment verification failed:', error);
            throw error;
        }
    }

    /**
     * Save deployment record to file
     */
    async saveDeploymentRecord(deploymentInfo) {
        const recordsFile = './deployment-records.json';
        let records = {};
        
        try {
            if (fs.existsSync(recordsFile)) {
                records = JSON.parse(fs.readFileSync(recordsFile, 'utf8'));
            }
        } catch (error) {
            console.warn('Could not read existing records:', error.message);
        }

        records[deploymentInfo.contractAddress] = deploymentInfo;
        
        fs.writeFileSync(recordsFile, JSON.stringify(records, null, 2));
        console.log('💾 Deployment record saved');
    }

    /**
     * Get deployment status
     */
    async getDeploymentStatus(contractAddress) {
        return this.deployedContracts.get(contractAddress) || null;
    }

    /**
     * List all deployed contracts
     */
    getAllDeployments() {
        return Array.from(this.deployedContracts.values());
    }

    /**
     * Monitor contract for events
     */
    async monitorContract(contractAddress) {
        const contract = new ethers.Contract(
            contractAddress,
            this.escrowArtifact.abi,
            this.wallet
        );

        console.log(`👀 Monitoring contract: ${contractAddress}`);

        // Listen for secret reveals
        contract.on('SecretRevealed', (revealer, secret, event) => {
            console.log('🔓 Secret revealed:', {
                revealer,
                secret,
                txHash: event.transactionHash
            });
        });

        // Listen for escrow releases
        contract.on('EscrowReleased', (beneficiary, amount, event) => {
            console.log('💰 Escrow released:', {
                beneficiary,
                amount: ethers.formatUnits(amount, 6),
                txHash: event.transactionHash
            });
        });

        // Listen for refunds
        contract.on('EscrowRefunded', (maker, amount, event) => {
            console.log('🔄 Escrow refunded:', {
                maker,
                amount: ethers.formatUnits(amount, 6),
                txHash: event.transactionHash
            });
        });
    }

    /**
     * Ensure Dutch Auction contract is deployed
     */
    async ensureAuctionContract() {
        if (this.auctionContractAddress) {
            console.log(`✅ Using existing auction contract: ${this.auctionContractAddress}`);
            return this.auctionContractAddress;
        }

        console.log('🏗️  Deploying Dutch Auction contract...');
        
        const contractFactory = new ethers.ContractFactory(
            this.auctionArtifact.abi,
            this.auctionArtifact.bytecode,
            this.wallet
        );

        const contract = await contractFactory.deploy(this.config.usdcAddress);
        await contract.waitForDeployment();

        this.auctionContractAddress = await contract.getAddress();
        console.log(`✅ Dutch Auction deployed at: ${this.auctionContractAddress}`);

        return this.auctionContractAddress;
    }

    /**
     * Create Dutch auction for deployed escrow
     */
    async createDutchAuction(params) {
        await this.ensureAuctionContract();
        
        const auctionContract = new ethers.Contract(
            this.auctionContractAddress,
            this.auctionArtifact.abi,
            this.wallet
        );

        console.log('🎯 Creating Dutch auction...');

        const tx = await auctionContract.createAuction(
            params.escrowContract,
            params.startPrice,
            params.endPrice,
            params.duration,
            params.secretHash,
            params.metadata
        );

        const receipt = await tx.wait();
        
        // Get auction ID from event
        const auctionCreatedEvent = receipt.logs.find(
            log => log.topics[0] === ethers.id("AuctionCreated(uint256,address,address,uint256,uint256,uint256)")
        );
        
        const auctionId = parseInt(auctionCreatedEvent.topics[1], 16);

        console.log(`✅ Auction created with ID: ${auctionId}`);

        return {
            auctionId,
            auctionContract: this.auctionContractAddress,
            transactionHash: tx.hash,
            params
        };
    }
}

// Configuration for different chains
const chainConfigs = {
    sepolia: {
        chainId: 11155111,
        chainName: 'Ethereum Sepolia',
        rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
        usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        privateKey: process.env.PRIVATE_KEY
    },
    baseSepolia: {
        chainId: 84532,
        chainName: 'Base Sepolia',
        rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
        usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        privateKey: process.env.PRIVATE_KEY
    }
};

async function estimateDeploymentCost() {
    const provider = new ethers.JsonRpcProvider(chainConfigs.baseSepolia.rpcUrl);
    
    // Get fee data instead of gas price directly
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;
    
    if (!gasPrice) {
        throw new Error('Could not get gas price from provider');
    }
    
    // Approximate gas for deployment (can be tuned based on your contracts)
    const estimatedGas = 1000000n; // 1M gas units
    const estimatedCost = gasPrice * estimatedGas;
    
    return {
        gasPrice,
        estimatedGas,
        estimatedCost: ethers.formatEther(estimatedCost)
    };
}

async function checkBalance(provider, wallet) {
    const balance = await provider.getBalance(wallet);
    console.log(`Wallet balance: ${ethers.formatEther(balance)} BASE`);
    return balance;
}

// Main execution
async function main() {
    const targetChain = process.env.TARGET_CHAIN || 'baseSepolia';
    const config = chainConfigs[targetChain];
    
    if (!config) {
        throw new Error(`Unsupported chain: ${targetChain}`);
    }

    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(config.privateKey, provider);
    
    // Check balance before deployment
    const balance = await checkBalance(provider, wallet.address);
    if (balance === 0n) {
        throw new Error('Please fund your wallet with Base Sepolia testnet tokens first');
    }

    // Get deployment cost estimate
    const { estimatedCost } = await estimateDeploymentCost();
    console.log(`Estimated deployment cost: ${estimatedCost} BASE`);

    const deployer = new SUIToEVMDeployer(config);
    await deployer.startListening();
}

// Export for use as module
module.exports = { SUIToEVMDeployer, chainConfigs };

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}