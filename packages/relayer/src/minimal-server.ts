/**
 * Minimal working Elysia server for 1inch Fusion Cross-Chain Relayer
 * Focuses on core functionality without complex database/service initialization
 */

import { Elysia } from 'elysia';

const PORT = parseInt(process.env.PORT || '3001');
const HOSTNAME = process.env.HOST || '0.0.0.0';

console.log('🚀 Starting Minimal 1inch Fusion Cross-Chain Relayer...');

const app = new Elysia({ name: 'minimal-relayer' })
  // Basic routes
  .get('/', () => ({
    message: 'Enhanced Cross-Chain Relayer is running!',
    version: '2.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString()
  }))
  
  .get('/health', () => ({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Relayer service is healthy',
    uptime: process.uptime()
  }))
  
  .get('/api/health', () => ({ 
    status: 'ok', 
    message: 'API is running',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  }))
  
  .get('/api/status', () => ({ 
    status: 'running', 
    version: '2.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  }))
  
  .get('/test', () => ({ 
    status: 'ok', 
    message: 'Test endpoint working',
    relayer: 'minimal-mode'
  }))
  
  // CORS handling
  .options('*', ({ set }) => {
    set.headers['Access-Control-Allow-Origin'] = '*';
    set.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    set.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    return new Response(null, { status: 200 });
  })
  
  // Error handling
  .onError(({ code, error, set }) => {
    console.error(`Error [${code}]:`, error);
    
    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        success: false,
        error: 'Validation failed',
        details: error instanceof Error ? error.message : 'Unknown validation error',
        timestamp: Date.now(),
      };
    }
    
    set.status = 500;
    return {
      success: false,
      error: 'Internal server error',
      code,
      timestamp: Date.now(),
    };
  })
  
  // Request logging
  .onBeforeHandle(({ request }) => {
    console.log(`📨 ${request.method} ${request.url}`);
  })
  
  .listen(PORT);

console.log(`🦊 Minimal Relayer running at http://${HOSTNAME}:${PORT}`);
console.log(`📊 Health endpoint: http://${HOSTNAME}:${PORT}/health`);
console.log(`🔄 API health: http://${HOSTNAME}:${PORT}/api/health`);
console.log(`📈 Status endpoint: http://${HOSTNAME}:${PORT}/api/status`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down minimal relayer...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down minimal relayer...');
  process.exit(0);
});