// Complete workflow example for SUI to EVM Dutch Auction system

const { ethers } = require('ethers');

class DutchAuctionWorkflow {
    constructor(config) {
        this.config = config;
        this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
        this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    }

    /**
     * STEP 1: Deploy complete system (Escrow + Auction)
     */
    async deployCompleteSystem(params) {
        console.log('🚀 Step 1: Deploying complete auction system...');
        
        const response = await fetch('http://localhost:3000/deploy-full-system', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // Escrow parameters
                secretHash: params.secretHash,
                amount: params.amount,
                destinationChain: process.env.TARGET_CHAIN || "sepolia",
                makerAddress: params.seller,
                timelock: Math.floor(Date.now() / 1000) + 7200, // 2 hours
                
                // Auction parameters
                auctionStartPrice: params.startPrice,
                auctionEndPrice: params.endPrice,
                auctionDuration: params.duration,
                
                metadata: {
                    itemName: params.itemName,
                    description: params.description,
                    suiOrigin: true
                }
            })
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(`Deployment failed: ${result.error}`);
        }

        console.log('✅ System deployed successfully!');
        console.log('📍 Escrow Contract:', result.escrow.contractAddress);
        console.log('📍 Auction ID:', result.auction.auctionId);
        
        return result;
    }

    /**
     * STEP 2: Monitor auction for bids
     */
    async monitorAuction(auctionContract, auctionId) {
        console.log('👀 Step 2: Monitoring auction for bids...');
        
        const contract = new ethers.Contract(
            auctionContract,
            [
                "function getCurrentPrice(uint256 auctionId) view returns (uint256)",
                "function getAuction(uint256 auctionId) view returns (address,address,uint256,uint256,uint256,uint256,bool,bool,address,uint256)",
                "function isAuctionActive(uint256 auctionId) view returns (bool)",
                "event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 price, uint256 timestamp)",
                "event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 finalPrice)"
            ],
            this.wallet
        );

        return new Promise((resolve) => {
            // Monitor price changes
            const priceMonitor = setInterval(async () => {
                try {
                    const isActive = await contract.isAuctionActive(auctionId);
                    if (!isActive) {
                        clearInterval(priceMonitor);
                        return;
                    }

                    const currentPrice = await contract.getCurrentPrice(auctionId);
                    const priceInUSDC = ethers.formatUnits(currentPrice, 6);
                    console.log(`💰 Current price: $${priceInUSDC}`);
                } catch (error) {
                    console.error('Price monitor error:', error);
                }
            }, 10000); // Check every 10 seconds

            // Listen for auction end
            contract.once('AuctionEnded', (auctionIdEvent, winner, finalPrice) => {
                clearInterval(priceMonitor);
                console.log('🎯 Auction ended!');
                console.log('🏆 Winner:', winner);
                console.log('💵 Final price:', ethers.formatUnits(finalPrice, 6), 'USDC');
                
                resolve({
                    winner,
                    finalPrice,
                    auctionId: auctionIdEvent
                });
            });
        });
    }

    /**
     * STEP 3: Release escrow to winner
     */
    async releaseEscrowToWinner(auctionContract, auctionId, secret) {
        console.log('🔓 Step 3: Releasing escrow to auction winner...');
        
        const contract = new ethers.Contract(
            auctionContract,
            [
                "function releaseEscrow(uint256 auctionId, string calldata secret) external"
            ],
            this.wallet
        );

        const tx = await contract.releaseEscrow(auctionId, secret);
        console.log('⏳ Releasing escrow, tx:', tx.hash);
        
        const receipt = await tx.wait();
        console.log('✅ Escrow released successfully!');
        
        return receipt;
    }

    /**
     * STEP 4: Simulate a bidder placing a bid
     */
    async simulateBid(auctionContract, auctionId) {
        console.log('🎲 Step 4: Simulating a bid...');
        
        // Create a bidder wallet (for demo)
        const bidderWallet = ethers.Wallet.createRandom().connect(this.provider);
        
        // You'd need to fund this wallet with USDC for real demo
        console.log('👤 Bidder address:', bidderWallet.address);
        
        const contract = new ethers.Contract(
            auctionContract,
            [
                "function placeBid(uint256 auctionId) external",
                "function getCurrentPrice(uint256 auctionId) view returns (uint256)"
            ],
            bidderWallet
        );

        const currentPrice = await contract.getCurrentPrice(auctionId);
        console.log('💰 Bidding at price:', ethers.formatUnits(currentPrice, 6), 'USDC');
        
        // Note: This will fail without USDC funding - just for demo structure
        try {
            const tx = await contract.placeBid(auctionId);
            console.log('🎯 Bid placed, tx:', tx.hash);
            
            const receipt = await tx.wait();
            console.log('✅ Bid successful!');
            
            return { bidder: bidderWallet.address, tx: receipt };
        } catch (error) {
            console.log('❌ Bid failed (expected without funding):', error.message);
            return null;
        }
    }

    /**
     * Complete workflow demo
     */
    async runCompleteDemo() {
        console.log('🎪 Starting Complete Dutch Auction Demo');
        console.log('=====================================');

        try {
            // Demo parameters
            const auctionParams = {
                secretHash: "0x" + "1".repeat(64), // Demo hash
                amount: "2", // 2 USDC escrow
                startPrice: "2", // Start at $2
                endPrice: "1",   // End at $1
                duration: 20,     // 20 sec
                seller: this.wallet.address,
                itemName: "Rare NFT #123",
                description: "Ultra rare digital collectible from SUI"
            };

            // Step 1: Deploy system
            const deployment = await this.deployCompleteSystem(auctionParams);
            
            // Wait a bit for deployment to settle
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Step 2: Start monitoring (this runs in background)
            const auctionResult = this.monitorAuction(
                deployment.auction.auctionContract, 
                deployment.auction.auctionId
            );
            
            // Step 3: Simulate some bid activity (optional)
            setTimeout(() => {
                this.simulateBid(
                    deployment.auction.auctionContract, 
                    deployment.auction.auctionId
                ).catch(console.error);
            }, 30000); // Try to bid after 30 seconds
            
            // Step 4: Wait for auction to end
            const finalResult = await auctionResult;
            
            // Step 5: Release escrow (you'd get this secret from your SUI auction)
            const secret = "my_secret_key_123"; // This should match your secretHash
            await this.releaseEscrowToWinner(
                deployment.auction.auctionContract,
                finalResult.auctionId,
                secret
            );
            
            console.log('🎉 Demo completed successfully!');
            
        } catch (error) {
            console.error('❌ Demo failed:', error);
        }
    }

    /**
     * Monitor specific contract for events
     */
    async monitorContract(contractAddress, contractABI) {
        const contract = new ethers.Contract(contractAddress, contractABI, this.wallet);
        
        console.log(`👀 Monitoring contract: ${contractAddress}`);
        
        // Listen for all events
        contract.on('*', (event) => {
            console.log('📡 Event detected:', {
                event: event.event,
                args: event.args,
                txHash: event.transactionHash
            });
        });
        
        return contract;
    }

    /**
     * Check contract deployment status
     */
    async checkDeploymentStatus() {
        try {
            const response = await fetch('http://localhost:3000/health');
            const status = await response.json();
            
            console.log('📊 Deployment Service Status:');
            console.log(`• Status: ${status.status}`);
            console.log(`• Chain: ${status.chain}`);
            console.log(`• Deployer: ${status.deployer}`);
            console.log(`• Deployed Contracts: ${status.deployedContracts}`);
            console.log(`• Auction Contract: ${status.auctionContract}`);
            
            return status;
        } catch (error) {
            console.error('❌ Failed to check deployment status:', error);
            return null;
        }
    }

    /**
     * Test end-to-end workflow with mock data
     */
    async testEndToEndWorkflow() {
        console.log('🧪 Testing End-to-End Workflow');
        console.log('==============================');

        try {
            // 1. Check service status
            console.log('\n1. Checking deployment service...');
            const status = await this.checkDeploymentStatus();
            if (!status || status.status !== 'healthy') {
                throw new Error('Deployment service not healthy');
            }

            // 2. Create mock SUI parameters
            console.log('\n2. Creating mock SUI auction parameters...');
            const mockParams = {
                secretHash: ethers.keccak256(ethers.toUtf8Bytes("test_secret_123")),
                amount: "2",
                destinationChain: process.env.TARGET_CHAIN || "sepolia",
                makerAddress: this.wallet.address,
                timelock: Math.floor(Date.now() / 1000) + 3600,
                auctionStartPrice: "2",
                auctionEndPrice: "1",
                auctionDuration: 20, // 20 seconds
                metadata: {
                    test: true,
                    itemName: "Test NFT",
                    description: "End-to-end test item"
                }
            };

            // 3. Deploy system
            console.log('\n3. Deploying complete system...');
            const deployment = await this.deployCompleteSystem(mockParams);

            // 4. Monitor for a short time
            console.log('\n4. Monitoring system for 30 seconds...');
            await new Promise(resolve => {
                const monitor = setInterval(async () => {
                    try {
                        const response = await fetch(`http://localhost:3000/health`);
                        const health = await response.json();
                        console.log(`• Active contracts: ${health.deployedContracts}`);
                    } catch (error) {
                        console.log('• Monitoring error:', error.message);
                    }
                }, 5000);

                setTimeout(() => {
                    clearInterval(monitor);
                    resolve();
                }, 30000);
            });

            console.log('\n✅ End-to-end test completed successfully!');
            return deployment;

        } catch (error) {
            console.error('❌ End-to-end test failed:', error);
            throw error;
        }
    }

    /**
     * Simulate SUI auction completion and trigger EVM resolution
     */
    async simulateSUIAuctionCompletion(params) {
        console.log('🌐 Simulating SUI auction completion...');
        
        // This simulates what would happen when SUI auction completes
        const suiAuctionResult = {
            winner: ethers.Wallet.createRandom().address,
            finalPrice: "1.5", // $1.5 USDC
            secret: "auction_secret_456",
            txHash: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890", // Mock SUI tx hash
            timestamp: Math.floor(Date.now() / 1000)
        };

        console.log('🎯 SUI Auction Result:', suiAuctionResult);
        
        // Now trigger the EVM resolution
        try {
            const response = await fetch('http://localhost:3001/resolve-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderHash: params.orderHash,
                    winner: suiAuctionResult.winner,
                    finalPrice: suiAuctionResult.finalPrice,
                    secret: suiAuctionResult.secret
                })
            });

            const result = await response.json();
            
            if (result.success) {
                console.log('✅ EVM resolution successful!');
                return { suiResult: suiAuctionResult, evmResult: result };
            } else {
                throw new Error(`EVM resolution failed: ${result.error}`);
            }
        } catch (error) {
            console.error('❌ Failed to resolve on EVM:', error);
            throw error;
        }
    }
}

/**
 * CLI interface for testing
 */
async function main() {
    const command = process.argv[2];
    
    const config = {
        rpcUrl: process.env.SEPOLIA_RPC_URL || process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
        privateKey: process.env.PRIVATE_KEY,
        deployerUrl: process.env.DEPLOYER_URL || 'http://localhost:3000'
    };

    switch (command) {
        case 'demo':
            const demo = new DutchAuctionWorkflow(config);
            await demo.runCompleteDemo();
            break;
            
        case 'test':
            const test = new DutchAuctionWorkflow(config);
            await test.testEndToEndWorkflow();
            break;
            
        case 'status':
            const status = new DutchAuctionWorkflow(config);
            await status.checkDeploymentStatus();
            break;
            
        default:
            console.log('📋 SUI to EVM Dutch Auction Workflow');
            console.log('====================================');
            console.log('Usage: node workflow.js [command]');
            console.log('');
            console.log('Commands:');
            console.log('  demo       - Run complete workflow demo');
            console.log('  test       - Run end-to-end system test');
            console.log('  status     - Check deployment service status');
            console.log('');
            console.log('Environment variables needed:');
            console.log('  PRIVATE_KEY - Your wallet private key');
            console.log('  SEPOLIA_RPC_URL - Sepolia network RPC URL');
            console.log('  DEPLOYER_URL - Deployment service URL');
    }
}

// Export classes for use as modules
module.exports = {
    DutchAuctionWorkflow
};

// Run CLI if called directly
if (require.main === module) {
    main().catch(console.error);
}