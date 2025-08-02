// 1inch Fusion+ Resolver Integration for SUI to EVM Dutch Auctions

const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config();

class FusionResolverManager {
    constructor(config) {
        this.config = config;
        this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
        this.wallet = new ethers.Wallet(config.privateKey, this.provider);
        
        // Load contract artifacts
        this.resolverArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/SUIDutchAuctionResolver.sol/SUIDutchAuctionResolver.json', 'utf8'));
        this.escrowArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/SUIEscrow.sol/SUIEscrow.json', 'utf8'));
        
        this.resolverContract = null;
        this.activeOrders = new Map();
    }

    /**
     * Deploy the custom 1inch Fusion+ resolver
     */
    async deployResolver() {
        console.log('🏗️  Deploying Custom Fusion+ Resolver...');
        
        const contractFactory = new ethers.ContractFactory(
            this.resolverArtifact.abi,
            this.resolverArtifact.bytecode,
            this.wallet
        );

        // Deploy with 1inch Settlement address only
        const contract = await contractFactory.deploy(
            this.config.settlementAddress // 1inch Settlement contract
        );

        await contract.waitForDeployment();
        this.resolverContract = contract;
        
        const address = await contract.getAddress();
        console.log(`✅ Resolver deployed at: ${address}`);
        
        return address;
    }

    /**
     * Initialize resolver with existing deployment
     */
    async initializeResolver(resolverAddress) {
        this.resolverContract = new ethers.Contract(
            resolverAddress,
            this.resolverArtifact.abi,
            this.wallet
        );
        
        console.log(`🔌 Connected to resolver at: ${resolverAddress}`);
    }

    /**
     * Handle SUI auction parameters and create Fusion+ order
     */
    async handleSUIAuctionParameters(params) {
        console.log('📨 Processing SUI auction parameters:', params);
        
        try {
            // 1. Deploy escrow contract first
            const escrowDeployment = await this.deployEscrowContract(params);
            
            // 2. Create 1inch Fusion+ order hash (simplified for hackathon)
            const orderHash = this.generateFusionOrderHash(params);
            
            // 3. Create auction order in resolver
            const auctionTx = await this.resolverContract.createAuctionOrder(
                orderHash,
                params.seller,
                ethers.parseUnits(params.startPrice.toString(), 6),
                ethers.parseUnits(params.endPrice.toString(), 6),
                params.duration,
                escrowDeployment.contractAddress,
                params.secretHash
            );
            
            await auctionTx.wait();
            console.log('✅ Auction order created in resolver');
            
            // 4. Store order for monitoring
            this.activeOrders.set(orderHash, {
                orderHash,
                escrow: escrowDeployment.contractAddress,
                params,
                createdAt: Date.now()
            });
            
            // 5. Start monitoring this order
            this.startOrderMonitoring(orderHash);
            
            return {
                orderHash,
                resolverContract: await this.resolverContract.getAddress(),
                escrowContract: escrowDeployment.contractAddress,
                auctionTx: auctionTx.hash
            };
            
        } catch (error) {
            console.error('❌ Failed to handle SUI auction parameters:', error);
            throw error;
        }
    }

    /**
     * Deploy escrow contract for the auction
     */
    async deployEscrowContract(params) {
        const contractFactory = new ethers.ContractFactory(
            this.escrowArtifact.abi,
            this.escrowArtifact.bytecode,
            this.wallet
        );

        const escrowContract = await contractFactory.deploy(
            this.config.usdcAddress,
            params.secretHash,
            ethers.parseUnits(params.amount.toString(), 6),
            params.seller,
            Math.floor(Date.now() / 1000) + params.duration + 3600, // 1 hour buffer
            JSON.stringify(params.metadata || {})
        );

        await escrowContract.waitForDeployment();
        const contractAddress = await escrowContract.getAddress();
        
        console.log(`📍 Escrow deployed: ${contractAddress}`);
        
        return {
            contractAddress,
            deploymentTx: escrowContract.deploymentTransaction().hash
        };
    }

    /**
     * Generate 1inch Fusion+ order hash (simplified for hackathon)
     */
    generateFusionOrderHash(params) {
        // In production, this would be the actual 1inch Fusion+ order hash
        // For hackathon, we'll generate a deterministic hash
        const orderData = ethers.solidityPacked(
            ['address', 'uint256', 'uint256', 'bytes32', 'uint256'],
            [
                params.seller,
                ethers.parseUnits(params.startPrice.toString(), 6),
                ethers.parseUnits(params.endPrice.toString(), 6),
                params.secretHash,
                Math.floor(Date.now() / 1000)
            ]
        );
        
        return ethers.keccak256(orderData);
    }

    /**
     * Monitor order for Dutch auction price changes and potential fills
     */
    async startOrderMonitoring(orderHash) {
        console.log(`👀 Starting monitoring for order: ${orderHash.slice(0, 10)}...`);
        
        const monitorInterval = setInterval(async () => {
            try {
                const canResolve = await this.resolverContract.canResolveOrder(orderHash);
                
                if (!canResolve) {
                    console.log(`⏹️  Order ${orderHash.slice(0, 10)}... can no longer be resolved`);
                    clearInterval(monitorInterval);
                    this.activeOrders.delete(orderHash);
                    return;
                }
                
                const currentPrice = await this.resolverContract.getCurrentPrice(orderHash);
                const priceInUSDC = ethers.formatUnits(currentPrice, 6);
                
                console.log(`💰 Order ${orderHash.slice(0, 10)}... current price: $${priceInUSDC}`);
                
                // Check if we should resolve (in production, this would be based on actual bids)
                // For hackathon demo, we'll auto-resolve after a certain time or price
                await this.checkAutoResolve(orderHash, currentPrice);
                
            } catch (error) {
                console.error(`❌ Monitoring error for ${orderHash}:`, error);
            }
        }, 10000); // Check every 10 seconds
    }

    /**
     * Check if order should be auto-resolved (demo logic)
     */
    async checkAutoResolve(orderHash, currentPrice) {
        const orderInfo = this.activeOrders.get(orderHash);
        if (!orderInfo) return;
        
        const elapsedTime = Date.now() - orderInfo.createdAt;
        const priceInUSDC = parseFloat(ethers.formatUnits(currentPrice, 6));
        
        // Demo logic: auto-resolve if price drops to 70% of start price or after 2 minutes
        const startPrice = parseFloat(orderInfo.params.startPrice);
        const shouldResolve = priceInUSDC <= (startPrice * 0.7) || elapsedTime > 120000;
        
        if (shouldResolve) {
            console.log(`🎯 Auto-resolving order ${orderHash.slice(0, 10)}... at price $${priceInUSDC}`);
            
            // Create a demo winner (in production, this would be the actual bidder)
            const demoWinner = "0x600Df9a4548A568ea746BFC20B2b203367733D58"; // 'for demo' // ethers.Wallet.createRandom().address;
            
            await this.resolveOrder(orderHash, demoWinner, currentPrice, orderInfo.params.secret || "demo_secret");
        }
    }

    /**
     * Resolve order - your single controlled transaction
     */
    async resolveOrder(orderHash, winner, finalPrice, secret) {
        console.log(`🔓 Resolving order ${orderHash.slice(0, 10)}...`);
        
        try {
            // Create a mock 1inch Fusion+ order structure
            const mockOrder = {
                salt: 0,
                makerAsset: this.config.usdcAddress,
                takerAsset: this.config.usdcAddress,
                maker: winner,
                receiver: winner,
                allowedSender: "0x0000000000000000000000000000000000000000",
                makingAmount: finalPrice,
                takingAmount: finalPrice,
                offsets: 0,
                interactions: "0x"
            };
            
            // Create auction result structure
            const auctionResult = {
                winner: winner,
                finalPrice: finalPrice,
                secretHash: secret,
                escrowContract: this.activeOrders.get(orderHash)?.escrow || "0x0000000000000000000000000000000000000000",
                orderData: "0x"
            };
            
            // Call the correct resolveOrder function
            const tx = await this.resolverContract.resolveOrder(
                mockOrder,
                "0x", // signature (empty for demo)
                auctionResult
            );
            
            console.log(`⏳ Resolution transaction: ${tx.hash}`);
            const receipt = await tx.wait();
            
            console.log(`✅ Order resolved successfully!`);
            console.log(`🏆 Winner: ${winner}`);
            console.log(`💵 Final price: ${ethers.formatUnits(finalPrice, 6)} USDC`);
            
            // Remove from active monitoring
            this.activeOrders.delete(orderHash);
            
            return receipt;
            
        } catch (error) {
            console.error(`❌ Failed to resolve order ${orderHash}:`, error);
            // For demo purposes, just log the error but don't throw
            console.log(`💡 Demo note: Resolution failed (expected without funding)`);
        }
    }

    /**
     * Batch resolve multiple orders (gas optimization)
     */
    async batchResolveOrders(orders) {
        console.log(`🔄 Batch resolving ${orders.length} orders...`);
        
        const orderHashes = orders.map(o => o.orderHash);
        const winners = orders.map(o => o.winner);
        const finalPrices = orders.map(o => o.finalPrice);
        const secrets = orders.map(o => o.secret);
        const fusionOrderData = orders.map(() => "0x"); // Empty for demo
        
        const tx = await this.resolverContract.batchResolveOrders(
            orderHashes,
            winners,
            finalPrices,
            secrets,
            fusionOrderData
        );
        
        const receipt = await tx.wait();
        console.log(`✅ Batch resolution completed: ${tx.hash}`);
        
        // Remove from active monitoring
        orderHashes.forEach(hash => this.activeOrders.delete(hash));
        
        return receipt;
    }

    /**
     * Get order status
     */
    async getOrderStatus(orderHash) {
        const status = await this.resolverContract.getOrderStatus(orderHash);
        
        return {
            isActive: status[0],
            isResolved: status[1],
            winner: status[2],
            finalPrice: ethers.formatUnits(status[3], 6),
            currentPrice: ethers.formatUnits(status[4], 6),
            timeRemaining: parseInt(status[5])
        };
    }

    /**
     * Start HTTP API for external integration
     */
    async startAPI() {
        const express = require('express');
        const app = express();
        app.use(express.json());

        // Endpoint to handle SUI auction parameters
        app.post('/create-fusion-order', async (req, res) => {
            try {
                const result = await this.handleSUIAuctionParameters(req.body);
                res.json({ success: true, result });
            } catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
        });

        // Endpoint to resolve order manually
        app.post('/resolve-order', async (req, res) => {
            try {
                const { orderHash, winner, finalPrice, secret } = req.body;
                const result = await this.resolveOrder(
                    orderHash,
                    winner,
                    ethers.parseUnits(finalPrice.toString(), 6),
                    secret
                );
                res.json({ success: true, result });
            } catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
        });

        // Endpoint to get order status
        app.get('/order-status/:orderHash', async (req, res) => {
            try {
                const status = await this.getOrderStatus(req.params.orderHash);
                res.json({ success: true, status });
            } catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
        });

        // Health check endpoint
        app.get('/health', async (req, res) => {
            try {
                const resolverAddress = this.resolverContract ? await this.resolverContract.getAddress() : 'Not deployed';
                res.json({ 
                    success: true,
                    status: 'healthy',
                    resolver: resolverAddress,
                    activeOrders: this.activeOrders.size,
                    chain: this.config.chainName || 'Unknown'
                });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        const port = process.env.PORT || 3001;
        app.listen(port, () => {
            console.log(`🌐 Fusion+ Resolver API running on port ${port}`);
        });
    }

    /**
     * Get all active orders
     */
    getActiveOrders() {
        return Array.from(this.activeOrders.values());
    }

    /**
     * Add authorized operator to resolver
     */
    async addOperator(operatorAddress) {
        if (!this.resolverContract) {
            throw new Error('Resolver not deployed');
        }
        
        const tx = await this.resolverContract.addOperator(operatorAddress);
        await tx.wait();
        
        console.log(`✅ Added operator: ${operatorAddress}`);
        return tx.hash;
    }

    /**
     * Remove authorized operator from resolver
     */
    async removeOperator(operatorAddress) {
        if (!this.resolverContract) {
            throw new Error('Resolver not deployed');
        }
        
        const tx = await this.resolverContract.removeOperator(operatorAddress);
        await tx.wait();
        
        console.log(`❌ Removed operator: ${operatorAddress}`);
        return tx.hash;
    }

    /**
     * Emergency withdraw funds from resolver
     */
    async emergencyWithdraw(to, amount) {
        if (!this.resolverContract) {
            throw new Error('Resolver not deployed');
        }
        
        const tx = await this.resolverContract.emergencyWithdraw(
            to,
            ethers.parseUnits(amount.toString(), 6)
        );
        await tx.wait();
        
        console.log(`🚨 Emergency withdrawal: ${amount} USDC to ${to}`);
        return tx.hash;
    }
}

// Configuration
const config = {
    rpcUrl: process.env.SEPOLIA_RPC_URL || process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    privateKey: process.env.PRIVATE_KEY,
    usdcAddress: process.env.TARGET_CHAIN === 'baseSepolia' ? '0x036CbD53842c5426634e7929541eC2318f3dCF7e' : '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    settlementAddress: '0x1111111254eeb25477b68fb85ed929f73a960582', // Real 1inch Fusion+ settlement
    chainName: process.env.TARGET_CHAIN === 'baseSepolia' ? 'Base Sepolia' : 'Ethereum Sepolia'
};

// Main execution
async function main() {
    const manager = new FusionResolverManager(config);
    
    // Deploy or connect to resolver
    const resolverAddress = process.env.RESOLVER_ADDRESS;
    if (resolverAddress) {
        await manager.initializeResolver(resolverAddress);
    } else {
        await manager.deployResolver();
    }
    
    // Start API
    await manager.startAPI();
    
    console.log('🚀 Fusion+ Resolver Manager is ready!');
}

// Export for module use
module.exports = { FusionResolverManager };

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}