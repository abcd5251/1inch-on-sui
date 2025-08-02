// Simple 1inch Fusion+ Integration Demo
// Minimal demo for hackathon presentation

const { FusionResolverManager } = require('./fusion-resolver-integration.js');
const { ethers } = require('ethers');

class SimpleFusionDemo {
    constructor() {
        this.config = {
            rpcUrl: process.env.SEPOLIA_RPC_URL || process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
            privateKey: process.env.PRIVATE_KEY,
            usdcAddress: process.env.TARGET_CHAIN === 'baseSepolia' ? '0x036CbD53842c5426634e7929541eC2318f3dCF7e' : '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
            settlementAddress: '0x1111111254eeb25477b68fb85ed929f73a960582'
        };
        
        this.resolverManager = new FusionResolverManager(this.config);
    }

    /**
     * Main demo - deploys everything and shows it working
     */
    async runDemo() {
        console.log('🎪 SUI to EVM Fusion+ Demo');
        console.log('===========================');

        try {
            // 1. Deploy resolver
            console.log('\n🏗️  Deploying Fusion+ Resolver...');
            await this.resolverManager.deployResolver();
            console.log('✅ Resolver deployed');
            
            // 2. Create mock SUI auction
            console.log('\n📨 Processing SUI Auction...');
            const params = this.createSUIParams();
            const order = await this.resolverManager.handleSUIAuctionParameters(params);
            console.log(`✅ Order created: ${order.orderHash.slice(0,10)}...`);
            console.log(`✅ Escrow deployed: ${order.escrowContract.slice(0,10)}...`);
            
            // 3. Show price decay
            console.log('\n💰 Monitoring Price Decay...');
            await this.showPriceDecay(order.orderHash);
            
            // 4. Resolve order
            console.log('\n🎯 Resolving Order...');
            const winner = "0x600Df9a4548A568ea746BFC20B2b203367733D58"; // 'for demo' // ethers.Wallet.createRandom().address;
            const finalPrice = ethers.parseUnits("800", 6);
            
            await this.resolverManager.resolveOrder(
                order.orderHash,
                winner,
                finalPrice,
                params.secret
            );
            
            console.log('\n🎉 DEMO COMPLETE!');
            console.log(`✅ Winner: ${winner.slice(0,10)}...`);
            console.log(`✅ Price: $800 USDC`);
            console.log(`✅ Single transaction resolved everything!`);
            
        } catch (error) {
            console.error('❌ Demo failed:', error.message);
        }
    }

    /**
     * Hackathon presentation - 3 minute version
     */
    async hackathonDemo() {
        console.log('🎤 HACKATHON DEMO (3 minutes)');
        console.log('==============================');

        console.log('\n🚀 [0:00] Problem: Cross-chain auctions are broken');
        console.log('❌ Bridges are slow and risky');
        console.log('❌ MEV attacks steal value');
        console.log('❌ No unified auction system');

        console.log('\n✅ [0:30] Solution: 1inch Fusion+ Integration');
        console.log('• Atomic cross-chain swaps');
        console.log('• Built-in MEV protection');
        console.log('• Single transaction control');

        try {
            console.log('\n🏗️  [1:00] Live Demo...');
            await this.resolverManager.deployResolver();
            console.log('✅ Deployed resolver');
            
            const params = this.createSUIParams();
            const order = await this.resolverManager.handleSUIAuctionParameters(params);
            console.log('✅ Created auction order');
            
            console.log('\n💰 [1:30] Price decreasing...');
            const status = await this.resolverManager.getOrderStatus(order.orderHash);
            console.log(`Current price: $${status.currentPrice}`);
            
            console.log('\n🎯 [2:00] Resolving with single transaction...');
            await this.resolverManager.resolveOrder(
                order.orderHash,
                "0x600Df9a4548A568ea746BFC20B2b203367733D58", // 'for demo' // ethers.Wallet.createRandom().address;
                ethers.parseUnits("750", 6),
                params.secret
            );
            
            console.log('\n🏆 [2:30] SUCCESS!');
            console.log('✅ Cross-chain auction completed');
            console.log('✅ Funds released atomically');
            console.log('✅ No MEV, no bridge risk');
            
        } catch (error) {
            console.log('Demo error (expected without funding):', error.message);
            console.log('💡 In production, this works with real USDC');
        }
    }

    /**
     * Create simple SUI auction parameters
     */
    createSUIParams() {
        const secret = "auction_secret_123";
        const secretHash = ethers.keccak256(ethers.toUtf8Bytes(secret));
        
        return {
            secretHash: secretHash,
            amount: "2",
            seller: "0x600Df9a4548A568ea746BFC20B2b203367733D58",
            startPrice: "2",
            endPrice: "1", 
            duration: 20,
            secret: secret,
            metadata: {
                itemName: "SUI NFT #123",
                crossChain: true
            }
        };
    }

    /**
     * Show price decay for 15 seconds
     */
    async showPriceDecay(orderHash) {
        for (let i = 0; i < 5; i++) {
            try {
                const status = await this.resolverManager.getOrderStatus(orderHash);
                console.log(`[${i*3}s] Price: $${status.currentPrice}`);
                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (error) {
                console.log('Price check failed:', error.message);
                break;
            }
        }
    }
}

// CLI
async function main() {
    const demo = new SimpleFusionDemo();
    const command = process.argv[2];

    switch (command) {
        case 'hackathon':
            await demo.hackathonDemo();
            break;
        case 'demo':
        default:
            await demo.runDemo();
            break;
    }
}

// Export for use as module
module.exports = { SimpleFusionDemo };

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}