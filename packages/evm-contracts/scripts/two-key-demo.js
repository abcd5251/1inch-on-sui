// Two-Key Demo: Maker and Resolver roles
const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config();

class TwoKeyFusionDemo {
    constructor() {
        this.config = {
            rpcUrl: process.env.SEPOLIA_RPC_URL,
            usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
            settlementAddress: '0xa88800cd213da5ae406ce248380802bd53b47647'
        };
        
        // Create two separate providers and wallets
        this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
        
        // MAKER: Creates auctions, owns assets
        this.makerWallet = new ethers.Wallet(process.env.MAKER_PRIVATE_KEY, this.provider);
        
        // RESOLVER: Bridge operator, settles transactions
        this.resolverWallet = new ethers.Wallet(process.env.RESOLVER_PRIVATE_KEY, this.provider);
        
        // Load contract artifacts
        this.resolverArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/SUIDutchAuctionResolver.sol/SUIDutchAuctionResolver.json', 'utf8'));
        this.escrowArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/SUIEscrow.sol/SUIEscrow.json', 'utf8'));
        
        this.resolverContract = null;
    }

    async runTwoKeyDemo() {
        console.log('🎭 TWO-KEY CROSS-CHAIN DEMO');
        console.log('============================');
        console.log(`👤 Maker Address:    ${this.makerWallet.address}`);
        console.log(`🔧 Resolver Address: ${this.resolverWallet.address}`);
        console.log('');

        try {
            // Step 1: Resolver deploys the bridge infrastructure
            console.log('🔧 [RESOLVER] Deploying bridge infrastructure...');
            await this.deployResolverInfrastructure();
            
            // Step 2: Maker creates an auction
            console.log('\\n👤 [MAKER] Creating cross-chain auction...');
            const auctionParams = await this.makerCreatesAuction();
            
            // Step 3: Show the auction running
            console.log('\\n🎯 [SYSTEM] Auction is live...');
            await this.showAuctionProgress(auctionParams);
            
            // Step 4: Resolver processes the auction
            console.log('\\n🔧 [RESOLVER] Processing auction settlement...');
            await this.resolverSettlesAuction(auctionParams);
            
            console.log('\\n🎉 TWO-KEY DEMO COMPLETE!');
            this.showRoleSeparation();
            
        } catch (error) {
            console.error('❌ Demo failed:', error.message);
        }
    }

    async deployResolverInfrastructure() {
        // Resolver deploys the bridge contract
        const contractFactory = new ethers.ContractFactory(
            this.resolverArtifact.abi,
            this.resolverArtifact.bytecode,
            this.resolverWallet  // 🔧 Resolver pays for deployment
        );

        const contract = await contractFactory.deploy(this.config.settlementAddress);
        await contract.waitForDeployment();
        
        this.resolverContract = contract;
        const address = await contract.getAddress();
        
        console.log(`✅ Bridge deployed at: ${address}`);
        console.log(`💰 Gas paid by: ${this.resolverWallet.address}`);
        
        // Check resolver balance
        const balance = await this.provider.getBalance(this.resolverWallet.address);
        console.log(`🔧 Resolver balance: ${ethers.formatEther(balance)} ETH`);
    }

    async makerCreatesAuction() {
        // Maker creates auction parameters
        const secret = "maker_auction_secret_456";
        const secretHash = ethers.keccak256(ethers.toUtf8Bytes(secret));
        
        const params = {
            secretHash,
            amount: "5", // 5 USDC
            seller: this.makerWallet.address,  // 👤 Maker is the seller
            startPrice: "5",
            endPrice: "3",
            duration: 60,
            secret,
            metadata: {
                itemName: "Cross-Chain NFT #789",
                creator: "Alice",
                crossChain: true
            }
        };

        // Maker deploys their own escrow
        const escrowFactory = new ethers.ContractFactory(
            this.escrowArtifact.abi,
            this.escrowArtifact.bytecode,
            this.makerWallet  // 👤 Maker pays for their escrow
        );

        const escrowContract = await escrowFactory.deploy(
            this.config.usdcAddress,
            params.secretHash,
            ethers.parseUnits(params.amount, 6),
            params.seller,
            Math.floor(Date.now() / 1000) + params.duration + 3600,
            JSON.stringify(params.metadata)
        );

        await escrowContract.waitForDeployment();
        const escrowAddress = await escrowContract.getAddress();
        
        console.log(`✅ Escrow deployed: ${escrowAddress}`);
        console.log(`💰 Gas paid by: ${this.makerWallet.address}`);
        
        // Check maker balance
        const balance = await this.provider.getBalance(this.makerWallet.address);
        console.log(`👤 Maker balance: ${ethers.formatEther(balance)} ETH`);
        
        params.escrowContract = escrowAddress;
        return params;
    }

    async showAuctionProgress(params) {
        console.log(`🎯 Auction Details:`);
        console.log(`   Item: ${params.metadata.itemName}`);
        console.log(`   Seller: ${params.seller.slice(0,10)}...`);
        console.log(`   Price: $${params.startPrice} → $${params.endPrice}`);
        console.log(`   Duration: ${params.duration} seconds`);
        
        // Simulate price decay
        console.log('\\n💰 Price decay simulation:');
        for (let i = 0; i <= 3; i++) {
            const progress = i / 3;
            const currentPrice = parseFloat(params.startPrice) - 
                (parseFloat(params.startPrice) - parseFloat(params.endPrice)) * progress;
            console.log(`   [${i*10}s] $${currentPrice.toFixed(2)}`);
            
            if (i < 3) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    async resolverSettlesAuction(params) {
        console.log('🔧 Resolver creating settlement transaction...');
        
        // Generate order hash
        const orderData = ethers.solidityPacked(
            ['address', 'uint256', 'uint256', 'bytes32', 'uint256'],
            [
                params.seller,
                ethers.parseUnits(params.startPrice, 6),
                ethers.parseUnits(params.endPrice, 6),
                params.secretHash,
                Math.floor(Date.now() / 1000)
            ]
        );
        const orderHash = ethers.keccak256(orderData);
        
        // Resolver creates auction order (using resolver key)
        const auctionTx = await this.resolverContract.connect(this.resolverWallet).createAuctionOrder(
            orderHash,
            params.seller,
            ethers.parseUnits(params.startPrice, 6),
            ethers.parseUnits(params.endPrice, 6),
            params.duration,
            params.escrowContract,
            params.secretHash
        );
        
        await auctionTx.wait();
        console.log(`✅ Order created by resolver`);
        console.log(`💰 Gas paid by: ${this.resolverWallet.address}`);
        
        // Simulate winner and settlement
        const winner = ethers.Wallet.createRandom().address;
        const finalPrice = ethers.parseUnits("4", 6);
        
        console.log(`🏆 Winner: ${winner.slice(0,10)}...`);
        console.log(`💵 Final price: $4.00`);
        console.log(`🔐 Secret: ${params.secret}`);
        
        // In real scenario, resolver would call resolveOrder here
        console.log('🔧 Resolver would now call settlement...');
        console.log('⚠️  (Skipped due to testnet limitations)');
    }

    showRoleSeparation() {
        console.log('\\n📋 ROLE SEPARATION DEMONSTRATED:');
        console.log('=====================================');
        console.log('👤 MAKER ROLE:');
        console.log('   • Creates auction parameters');
        console.log('   • Deploys own escrow contract');
        console.log('   • Owns the asset being sold');
        console.log('   • Receives payment when sold');
        console.log('');
        console.log('🔧 RESOLVER ROLE:');
        console.log('   • Deploys bridge infrastructure'); 
        console.log('   • Processes cross-chain orders');
        console.log('   • Settles transactions');
        console.log('   • Operates the bridge service');
        console.log('');
        console.log('✅ BENEFITS:');
        console.log('   • Clear responsibility separation');
        console.log('   • Independent gas payment');
        console.log('   • Scalable to multiple makers');
        console.log('   • Professional bridge operation');
    }

    async checkBalances() {
        const makerBalance = await this.provider.getBalance(this.makerWallet.address);
        const resolverBalance = await this.provider.getBalance(this.resolverWallet.address);
        
        console.log('\\n💰 Final Balances:');
        console.log(`👤 Maker:    ${ethers.formatEther(makerBalance)} ETH`);
        console.log(`🔧 Resolver: ${ethers.formatEther(resolverBalance)} ETH`);
    }
}

// CLI
async function main() {
    // Check if both keys are set
    if (!process.env.MAKER_PRIVATE_KEY || !process.env.RESOLVER_PRIVATE_KEY) {
        console.error('❌ Please set both MAKER_PRIVATE_KEY and RESOLVER_PRIVATE_KEY in .env');
        console.log('');
        console.log('Add to .env:');
        console.log('MAKER_PRIVATE_KEY=0x...');
        console.log('RESOLVER_PRIVATE_KEY=0x...');
        return;
    }

    if (process.env.MAKER_PRIVATE_KEY === process.env.RESOLVER_PRIVATE_KEY) {
        console.warn('⚠️  Using same key for both roles - consider using different keys');
        console.log('');
    }

    const demo = new TwoKeyFusionDemo();
    await demo.runTwoKeyDemo();
    await demo.checkBalances();
}

// Export for use as module
module.exports = { TwoKeyFusionDemo };

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}