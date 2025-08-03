const { ethers } = require('ethers');
require('dotenv').config();

async function verifySetup() {
    console.log('🔍 Verifying SUI-EVM Cross-Chain Auction Setup...');
    console.log('=================================================');
    
    let hasIssues = false;
    
    // Check environment variables
    console.log('\n1. Checking environment variables...');
    if (!process.env.PRIVATE_KEY) {
        console.error('❌ PRIVATE_KEY not set in .env');
        hasIssues = true;
    } else if (process.env.PRIVATE_KEY === '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef') {
        console.error('❌ PRIVATE_KEY is still the example value - please update with your real key');
        hasIssues = true;
    } else {
        console.log('✅ PRIVATE_KEY is set');
    }
    
    // Check RPC connection
    console.log('\n2. Checking network connection...');
    const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    try {
        const network = await provider.getNetwork();
        console.log(`✅ Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
        
        // Check latest block to ensure network is responsive
        const blockNumber = await provider.getBlockNumber();
        console.log(`✅ Latest block: ${blockNumber}`);
    } catch (error) {
        console.error('❌ Failed to connect to network:', error.message);
        hasIssues = true;
    }
    
    // Check if settlement contract exists
    console.log('\n3. Checking 1inch Settlement contract...');
    const settlementAddress = '0xa88800cd213da5ae406ce248380802bd53b47647';
    try {
        const code = await provider.getCode(settlementAddress);
        if (code === '0x') {
            console.error('❌ 1inch Settlement contract not found on this network');
            console.log('💡 This might be expected on testnets - 1inch may only be on mainnet');
            console.log('💡 Consider using Ethereum mainnet for actual demo');
            hasIssues = true;
        } else {
            console.log('✅ 1inch Settlement contract found');
            console.log(`   Contract size: ${(code.length - 2) / 2} bytes`);
        }
    } catch (error) {
        console.error('❌ Error checking settlement contract:', error.message);
        hasIssues = true;
    }
    
    // Check wallet balance
    console.log('\n4. Checking wallet setup...');
    if (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef') {
        try {
            const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
            console.log(`✅ Wallet address: ${wallet.address}`);
            
            const balance = await provider.getBalance(wallet.address);
            const balanceEth = ethers.formatEther(balance);
            console.log(`✅ Wallet balance: ${balanceEth} ETH`);
            
            if (balance === 0n) {
                console.warn('⚠️  Wallet has no ETH - get testnet funds from faucet');
                console.log('   Sepolia faucet: https://faucets.chain.link/sepolia');
                hasIssues = true;
            }
        } catch (error) {
            console.error('❌ Error checking wallet:', error.message);
            hasIssues = true;
        }
    }
    
    // Check USDC contract (for testing)
    console.log('\n5. Checking USDC contract...');
    const usdcAddress = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Sepolia USDC
    try {
        const code = await provider.getCode(usdcAddress);
        if (code === '0x') {
            console.error('❌ USDC contract not found on this network');
            hasIssues = true;
        } else {
            console.log('✅ USDC contract found');
        }
    } catch (error) {
        console.error('❌ Error checking USDC contract:', error.message);
        hasIssues = true;
    }
    
    // Check if contracts can be compiled
    console.log('\n6. Checking contract compilation...');
    const fs = require('fs');
    const artifactsExist = fs.existsSync('./artifacts/contracts/SUIDutchAuctionResolver.sol/SUIDutchAuctionResolver.json');
    if (artifactsExist) {
        console.log('✅ Contract artifacts found');
    } else {
        console.error('❌ Contract artifacts missing - run "npm run compile"');
        hasIssues = true;
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (hasIssues) {
        console.log('❌ Setup has issues that need to be resolved');
        console.log('\n📋 Next steps:');
        console.log('1. Update PRIVATE_KEY in .env with your actual key');
        console.log('2. Get testnet ETH from faucets');
        console.log('3. Run "npm run compile" if artifacts are missing');
        console.log('4. Consider using mainnet if 1inch contracts are not on testnet');
        return false;
    } else {
        console.log('🎉 Setup verification successful!');
        console.log('\n🚀 Ready to run demo:');
        console.log('   npm run hackathon');
        return true;
    }
}

if (require.main === module) {
    verifySetup().catch(console.error);
}

module.exports = { verifySetup };