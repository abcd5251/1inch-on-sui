#!/usr/bin/env bun

/**
 * Test Shape Sepolia network connection
 */

import { JsonRpcProvider } from 'ethers';

async function testShapeSepoliaConnection() {
  try {
    console.log('🔍 Testing Shape Sepolia network connection...');
    
    // Connect to the Shape Sepolia network
    const provider = new JsonRpcProvider("https://shape-sepolia.g.alchemy.com/v2/Z58lRRk-gDFV440CQdMgKOJgPd5MFMLb");

    // Get network information
    console.log('📡 Getting network information...');
    const network = await provider.getNetwork();
    console.log('🌐 Network:', {
      name: network.name,
      chainId: network.chainId.toString(),
      ensAddress: network.ensAddress
    });

    // Get latest block
    console.log('📦 Getting latest block...');
    const blockNumber = "latest";
    const block = await provider.getBlock(blockNumber);
    
    console.log('✅ Latest block info:', {
      number: block.number,
      hash: block.hash,
      timestamp: new Date(block.timestamp * 1000).toISOString(),
      gasLimit: block.gasLimit.toString(),
      gasUsed: block.gasUsed.toString(),
      transactionCount: block.transactions.length
    });

    // Get current gas price
    console.log('⛽ Getting gas price...');
    const gasPrice = await provider.getFeeData();
    console.log('💰 Gas info:', {
      gasPrice: gasPrice.gasPrice?.toString() || 'N/A',
      maxFeePerGas: gasPrice.maxFeePerGas?.toString() || 'N/A',
      maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas?.toString() || 'N/A'
    });

    // Test balance query (using zero address)
    console.log('💸 Testing balance query...');
    const balance = await provider.getBalance('0x0000000000000000000000000000000000000000');
    console.log('🏦 Zero address balance:', balance.toString());

    console.log('\n🎉 Shape Sepolia connection test successful!');
    
    return {
      chainId: network.chainId.toString(),
      networkName: network.name,
      rpcUrl: "https://shape-sepolia.g.alchemy.com/v2/Z58lRRk-gDFV440CQdMgKOJgPd5MFMLb",
      latestBlock: block.number,
      working: true
    };

  } catch (error) {
    console.error('❌ Shape Sepolia connection test failed:', error);
    return {
      working: false,
      error: error.message
    };
  }
}

// Run the test
const result = await testShapeSepoliaConnection();
console.log('\n📋 Test Result:', result);