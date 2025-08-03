#!/usr/bin/env bun

/**
 * Shape Sepolia 网络使用示例
 * 基于你提供的 ethers.js 代码
 */

import { JsonRpcProvider } from 'ethers';

async function runShapeSepoliaExample() {
  console.log('🔗 Shape Sepolia Network Example');
  console.log('🔑 Using your provided Alchemy API key\n');

  // Connect to the Ethereum network (Shape Sepolia)
  const provider = new JsonRpcProvider("https://shape-sepolia.g.alchemy.com/v2/Z58lRRk-gDFV440CQdMgKOJgPd5MFMLb");

  try {
    // Get block by number
    const blockNumber = "latest";
    const block = await provider.getBlock(blockNumber);

    console.log('📦 Latest Block Information:');
    console.log(block);
    
    console.log('\n📊 Block Summary:');
    console.log(`🆔 Block Number: ${block.number}`);
    console.log(`#️⃣  Block Hash: ${block.hash}`);
    console.log(`⏰ Timestamp: ${new Date(block.timestamp * 1000).toLocaleString()}`);
    console.log(`⛽ Gas Limit: ${block.gasLimit.toLocaleString()}`);
    console.log(`🔥 Gas Used: ${block.gasUsed.toLocaleString()}`);
    console.log(`📈 Gas Used %: ${((Number(block.gasUsed) / Number(block.gasLimit)) * 100).toFixed(2)}%`);
    console.log(`🔄 Transactions: ${block.transactions.length}`);
    
    // Additional network information
    console.log('\n🌐 Network Information:');
    const network = await provider.getNetwork();
    console.log(`📡 Network Name: ${network.name || 'Shape Sepolia'}`);
    console.log(`🆔 Chain ID: ${network.chainId}`);
    console.log(`💰 Native Currency: ETH`);
    
    // Gas price information
    console.log('\n⛽ Gas Price Information:');
    const feeData = await provider.getFeeData();
    console.log(`💸 Gas Price: ${feeData.gasPrice?.toString()} wei`);
    if (feeData.maxFeePerGas) {
      console.log(`📊 Max Fee Per Gas: ${feeData.maxFeePerGas.toString()} wei`);
    }
    if (feeData.maxPriorityFeePerGas) {
      console.log(`⚡ Max Priority Fee Per Gas: ${feeData.maxPriorityFeePerGas.toString()} wei`);
    }
    
    // Test account balance (zero address)
    console.log('\n💰 Balance Test:');
    const zeroBalance = await provider.getBalance('0x0000000000000000000000000000000000000000');
    console.log(`🏦 Zero Address Balance: ${zeroBalance.toString()} wei`);
    
    console.log('\n✅ Shape Sepolia connection successful!');
    
    return {
      success: true,
      chainId: network.chainId.toString(),
      latestBlock: block.number,
      gasPrice: feeData.gasPrice?.toString(),
      networkName: network.name || 'Shape Sepolia'
    };
    
  } catch (error) {
    console.error('❌ Error connecting to Shape Sepolia:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the example
const result = await runShapeSepoliaExample();

if (result.success) {
  console.log('\n🎉 Example completed successfully!');
  console.log('🚀 Your Shape Sepolia connection is working perfectly.');
  console.log('💡 You can now build DApps on Shape Sepolia testnet.');
} else {
  console.log('\n❌ Example failed:', result.error);
}