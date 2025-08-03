// Quick demo with 2-minute timelock
const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config();

async function quickDemo() {
    console.log('⚡ QUICK DEMO - 2 minute timelock');
    console.log('================================');
    
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // Deploy new escrow with short timelock
    const secret = "quick_test_" + Date.now();
    const secretHash = ethers.keccak256(ethers.toUtf8Bytes(secret));
    
    const escrowArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/SUIEscrow.sol/SUIEscrow.json', 'utf8'));
    const escrowFactory = new ethers.ContractFactory(escrowArtifact.abi, escrowArtifact.bytecode, wallet);
    
    console.log('🏗️  Deploying quick-test escrow...');
    const escrowContract = await escrowFactory.deploy(
        '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC
        secretHash,
        ethers.parseUnits('1', 6), // 1 USDC
        wallet.address,
        Math.floor(Date.now() / 1000) + 120, // 2 minutes from now
        JSON.stringify({test: true, quickDemo: true})
    );
    
    await escrowContract.waitForDeployment();
    const escrowAddr = await escrowContract.getAddress();
    console.log('✅ Quick escrow deployed:', escrowAddr);
    
    // Fund it
    const usdcAbi = ['function transfer(address to, uint256 amount) returns (bool)', 'function balanceOf(address) view returns (uint256)'];
    const usdc = new ethers.Contract('0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', usdcAbi, wallet);
    
    console.log('💰 Sending 1 USDC to quick escrow...');
    const tx = await usdc.transfer(escrowAddr, ethers.parseUnits('1', 6));
    await tx.wait();
    console.log('✅ Funded! Transaction:', tx.hash);
    
    console.log('\\n⏳ Waiting 2 minutes for timelock...');
    console.log('Secret to reveal:', secret);
    console.log('Escrow address:', escrowAddr);
    
    // Wait 2 minutes
    await new Promise(resolve => setTimeout(resolve, 125000)); // 2 minutes + 5 seconds buffer
    
    console.log('\\n🔐 Revealing secret and releasing funds...');
    try {
        const releaseTx = await escrowContract.revealAndRelease(secret, wallet.address);
        await releaseTx.wait();
        console.log('🎉 SUCCESS! Funds released!');
        console.log('Transaction:', releaseTx.hash);
        
        // Check final balance
        const finalBalance = await usdc.balanceOf(wallet.address);
        console.log('Your USDC balance:', ethers.formatUnits(finalBalance, 6));
        
    } catch (error) {
        console.error('❌ Reveal failed:', error.message);
    }
}

quickDemo().catch(console.error);