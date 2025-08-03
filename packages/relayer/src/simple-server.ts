/**
 * Simple Elysia Server for testing
 */

import { Elysia } from 'elysia';

const app = new Elysia()
  .get('/', () => 'Enhanced Cross-Chain Relayer is running!')
  .get('/health', () => ({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Relayer service is healthy'
  }))
  .get('/api/health', () => ({ 
    status: 'ok', 
    message: 'API is running',
    version: '2.0.0'
  }))
  .listen(3001);

console.log('🦊 Elysia is running at http://localhost:3001');
console.log('📊 Health endpoint: http://localhost:3001/health');
console.log('🔄 API health: http://localhost:3001/api/health');