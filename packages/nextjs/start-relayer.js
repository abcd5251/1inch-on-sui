#!/usr/bin/env bun

/**
 * Simple script to start the relayer service
 * This helps debug startup issues
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const relayerPath = join(__dirname, '..', 'relayer');

console.log('🚀 Starting 1inch Fusion Cross-Chain Relayer...');
console.log('📁 Relayer directory:', relayerPath);

const relayerProcess = spawn('bun', ['run', 'dev'], {
  cwd: relayerPath,
  stdio: 'inherit',
  env: { ...process.env }
});

relayerProcess.on('error', (error) => {
  console.error('❌ Failed to start relayer:', error);
  process.exit(1);
});

relayerProcess.on('close', (code) => {
  console.log(`📊 Relayer process exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down relayer...');
  relayerProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down relayer...');
  relayerProcess.kill('SIGTERM');
});