#!/usr/bin/env bun

/**
 * Test script to start relayer and verify it's working
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const relayerPath = join(__dirname, '..', 'relayer');

console.log('🚀 Starting minimal relayer for testing...');

const relayerProcess = spawn('bun', ['src/minimal-server.ts'], {
  cwd: relayerPath,
  detached: true,
  stdio: 'pipe'
});

relayerProcess.stdout.on('data', (data) => {
  console.log(data.toString());
});

relayerProcess.stderr.on('data', (data) => {
  console.error(data.toString());
});

// Give it time to start
setTimeout(async () => {
  try {
    console.log('📡 Testing health endpoint...');
    const response = await fetch('http://localhost:3001/health');
    const data = await response.json();
    console.log('✅ Health check response:', data);
    
    console.log('📡 Testing API health endpoint...');
    const apiResponse = await fetch('http://localhost:3001/api/health');
    const apiData = await apiResponse.json();
    console.log('✅ API health check response:', apiData);
    
    console.log('🎉 Relayer service is working correctly!');
  } catch (error) {
    console.error('❌ Health check failed:', error);
  } finally {
    relayerProcess.kill();
    process.exit(0);
  }
}, 3000);