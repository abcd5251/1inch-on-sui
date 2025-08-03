// Real auction with actual USDC movement
const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config();

class RealUSDCAuction {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        
        this.usdcAddress = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
        this.escrowAddress = '0x932f2a75125BD57db2BCf3Bf1101aC550FFF5C13';
        
        // Load contracts
        this.escrowArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/SUIEscrow.sol/SUIEscrow.json', 'utf8'));
        
        // USDC contract
        this.usdcAbi = [
            'function transfer(address to, uint256 amount) returns (bool)',
            'function balanceOf(address) view returns (uint256)',
            'function approve(address spender, uint256 amount) returns (bool)'
        ];
        
        this.usdc = new ethers.Contract(this.usdcAddress, this.usdcAbi, this.wallet);
        this.escrow = new ethers.Contract(this.escrowAddress, this.escrowArtifact.abi, this.wallet);
    }

    async runRealAuction() {
        console.log('💰 REAL USDC AUCTION TEST');
        console.log('=========================');
        
        try {
            // Step 1: Check initial balances
            await this.checkBalances('Initial');
            
            // Step 2: Fund the escrow (simulate auction deposit)
            await this.fundEscrow();
            
            // Step 3: Check escrow state
            await this.checkEscrowState();
            
            // Step 4: Simulate auction completion (reveal secret)
            await this.completeAuction();
            
            // Step 5: Check final balances
            await this.checkBalances('Final');
            
        } catch (error) {
            console.error('❌ Real auction failed:', error.message);
        }
    }

    async checkBalances(stage) {
        const walletBalance = await this.usdc.balanceOf(this.wallet.address);
        const escrowBalance = await this.usdc.balanceOf(this.escrowAddress);
        
        console.log(`\\n💰 ${stage} Balances:`);
        console.log(`   Your wallet: ${ethers.formatUnits(walletBalance, 6)} USDC`);
        console.log(`   Escrow:      ${ethers.formatUnits(escrowBalance, 6)} USDC`);
    }

    async fundEscrow() {
        console.log('\\n🏗️  Funding escrow with 2 USDC...');
        
        // Transfer 2 USDC to escrow (matching the demo auction amount)
        const amount = ethers.parseUnits('2', 6);
        const tx = await this.usdc.transfer(this.escrowAddress, amount);
        await tx.wait();
        
        console.log(`✅ Sent 2 USDC to escrow`);
        console.log(`📄 Transaction: ${tx.hash}`);
        console.log(`🔗 View: https://sepolia.etherscan.io/tx/${tx.hash}`);
    }

    async checkEscrowState() {
        console.log('\\n🔍 Checking escrow state...');
        
        try {
            const info = await this.escrow.getInfo();
            const status = await this.escrow.getStatus();
            
            console.log('📋 Escrow Info:');
            console.log(`   Amount: ${ethers.formatUnits(info[1], 6)} USDC`);
            console.log(`   Maker: ${info[2]}`);
            console.log(`   Secret Hash: ${info[0]}`);
            
            console.log('📊 Escrow Status:');
            console.log(`   Revealed: ${status[0]}`);
            console.log(`   Released: ${status[1]}`);
            console.log(`   Refunded: ${status[2]}`);
            
        } catch (error) {
            console.log('⚠️  Could not read escrow state:', error.message);
        }
    }

    async completeAuction() {
        console.log('\\n🎯 Completing auction (reveal secret)...');
        
        // Use the secret from the demo
        const secret = 'auction_secret_123';
        const winner = this.wallet.address; // You win your own auction for demo
        
        try {
            console.log(`🔐 Revealing secret: "${secret}"`);
            console.log(`🏆 Winner: ${winner.slice(0,10)}...`);
            
            const tx = await this.escrow.revealAndRelease(secret, winner);
            await tx.wait();
            
            console.log('✅ Secret revealed and escrow released!');
            console.log(`📄 Transaction: ${tx.hash}`);
            console.log(`🔗 View: https://sepolia.etherscan.io/tx/${tx.hash}`);
            
        } catch (error) {
            console.log('❌ Auction completion failed:', error.message);
            console.log('💡 This might be due to timelock or secret mismatch');
        }
    }
}

// CLI
async function main() {
    const auction = new RealUSDCAuction();
    await auction.runRealAuction();
    
    console.log('\\n🎉 Real USDC auction test complete!');
    console.log('💡 Check your wallet - USDC should have moved');
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { RealUSDCAuction };