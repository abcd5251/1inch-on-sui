#!/usr/bin/env bun

/**
 * 完整的 Shape Sepolia 集成测试
 * 测试前端配置和 relayer 配置
 */

import { JsonRpcProvider } from 'ethers';
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const relayerPath = join(__dirname, '..', 'relayer');

async function testShapeSepoliaIntegration() {
  console.log('🚀 Testing Shape Sepolia Integration...');
  
  // Test 1: Ethers.js Connection
  console.log('\n1️⃣ Testing Ethers.js Connection');
  try {
    const provider = new JsonRpcProvider("https://shape-sepolia.g.alchemy.com/v2/Z58lRRk-gDFV440CQdMgKOJgPd5MFMLb");
    
    const network = await provider.getNetwork();
    const block = await provider.getBlock("latest");
    
    console.log('✅ Network Info:', {
      chainId: network.chainId.toString(),
      name: network.name || 'Shape Sepolia',
      latestBlock: block.number
    });
  } catch (error) {
    console.error('❌ Ethers.js test failed:', error.message);
    return false;
  }

  // Test 2: Start Relayer with Shape Sepolia Config
  console.log('\n2️⃣ Testing Relayer with Shape Sepolia');
  const relayerProcess = spawn('bun', ['src/minimal-server.ts'], {
    cwd: relayerPath,
    detached: true,
    stdio: 'pipe',
    env: { 
      ...process.env, 
      PORT: '3002',
      ETHEREUM_CHAIN_ID: '11011',
      ETHEREUM_RPC_URL: 'https://shape-sepolia.g.alchemy.com/v2/Z58lRRk-gDFV440CQdMgKOJgPd5MFMLb'
    }
  });

  let relayerOutput = '';
  relayerProcess.stdout.on('data', (data) => {
    relayerOutput += data.toString();
  });

  // Test relayer after startup
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    const healthResponse = await fetch('http://localhost:3002/health');
    const healthData = await healthResponse.json();
    console.log('✅ Relayer Health:', healthData.status);
  } catch (error) {
    console.error('❌ Relayer test failed:', error.message);
    relayerProcess.kill();
    return false;
  }

  relayerProcess.kill();

  // Test 3: Frontend Configuration Check
  console.log('\n3️⃣ Checking Frontend Configuration');
  try {
    // Check if shapeSepolia chain file exists and is valid
    const shapeSepolia = await import('./lib/chains/shapeSepolia.js');
    console.log('✅ Shape Sepolia Chain:', {
      id: shapeSepolia.shapeSepolia.id,
      name: shapeSepolia.shapeSepolia.name,
      testnet: shapeSepolia.shapeSepolia.testnet
    });
  } catch (error) {
    console.error('❌ Frontend config test failed:', error.message);
    return false;
  }

  console.log('\n🎉 All Shape Sepolia Integration Tests Passed!');
  
  console.log('\n📋 Shape Sepolia Network Summary:');
  console.log('🆔 Chain ID: 11011');
  console.log('🌐 Network: Shape Sepolia Testnet');
  console.log('🔗 RPC: https://shape-sepolia.g.alchemy.com/v2/Z58lRRk-gDFV440CQdMgKOJgPd5MFMLb');
  console.log('🔍 Explorer: https://explorer-sepolia.shape.network');
  console.log('💰 Native Token: ETH');
  console.log('🧪 Type: Testnet');
  
  console.log('\n🚀 Ready to use Shape Sepolia with 1inch-on-Sui!');
  
  return true;
}

// Run the integration test
const success = await testShapeSepoliaIntegration();
process.exit(success ? 0 : 1);