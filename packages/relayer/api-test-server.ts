/**
 * Simple HTTP API test server for relayer endpoints testing
 */

import { getDatabaseManager } from './src/config/database.js';
import { logger } from './src/utils/logger.js';

// Simple HTTP server for testing API endpoints
async function startApiTestServer() {
  try {
    logger.info('🚀 Starting API Test Server...');
    
    // Initialize database
    const dbManager = getDatabaseManager();
    await dbManager.initialize();
    const db = dbManager.getDatabase();
    const { swaps } = await import('./src/schema/index.js');
    
    // Create HTTP server
    const server = Bun.serve({
      port: 3001,
      async fetch(req: Request) {
        const url = new URL(req.url);
        const method = req.method;
        
        logger.info(`${method} ${url.pathname}`);
        
        try {
          // Health check endpoint
          if (url.pathname === '/health') {
            const isHealthy = await dbManager.healthCheck();
            return Response.json({
              success: true,
              status: isHealthy ? 'healthy' : 'unhealthy',
              timestamp: new Date().toISOString(),
              database: isHealthy ? 'connected' : 'disconnected'
            });
          }
          
          // Basic API info
          if (url.pathname === '/api' || url.pathname === '/') {
            return Response.json({
              success: true,
              message: 'Relayer API Test Server Running',
              version: '2.0.0',
              endpoints: [
                'GET /health - Health check',
                'GET /api/swaps - List swaps',
                'POST /api/swaps - Create swap',
                'GET /api/swaps/stats - Get swap statistics'
              ]
            });
          }
          
          // Swaps API endpoints
          if (url.pathname === '/api/swaps') {
            if (method === 'GET') {
              // Get all swaps
              const allSwaps = await db.select().from(swaps).limit(10);
              return Response.json({
                success: true,
                swaps: allSwaps,
                total: allSwaps.length,
                page: 1,
                limit: 10
              });
            }
            
            if (method === 'POST') {
              // Create new swap
              const body = await req.json();
              const newSwap = {
                id: `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                orderId: body.orderId || `order_${Date.now()}`,
                maker: body.maker || '0x1234567890123456789012345678901234567890',
                makingAmount: body.makingAmount || '1000000',
                takingAmount: body.takingAmount || '2000000',
                makingToken: body.makingToken || '0xtoken1',
                takingToken: body.takingToken || '0xtoken2',
                sourceChain: body.sourceChain || 'ethereum',
                targetChain: body.targetChain || 'sui',
                secretHash: body.secretHash || `0x${Math.random().toString(16).substr(2, 64)}`,
                timeLock: body.timeLock || 3600,
                sourceContract: body.sourceContract || '0xcontract1',
                targetContract: body.targetContract || '0xcontract2',
                status: 'pending' as const,
                createdAt: Math.floor(Date.now() / 1000),
                updatedAt: Math.floor(Date.now() / 1000),
                expiresAt: Math.floor(Date.now() / 1000) + (body.timeLock || 3600),
              };
              
              const result = await db.insert(swaps).values(newSwap).returning();
              return Response.json({
                success: true,
                data: result[0]
              });
            }
          }
          
          // Swap statistics
          if (url.pathname === '/api/swaps/stats') {
            const stats = await dbManager.getStats();
            return Response.json({
              success: true,
              data: stats
            });
          }
          
          // 404 for unknown endpoints
          return Response.json({
            success: false,
            error: 'Not Found',
            message: `Endpoint ${url.pathname} not found`
          }, { status: 404 });
          
        } catch (error) {
          logger.error('API Error:', error);
          return Response.json({
            success: false,
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }
      },
    });

    logger.info(`🌐 API Test Server listening on http://localhost:${server.port}`);
    logger.info(`📊 Health endpoint: http://localhost:${server.port}/health`);
    logger.info(`🔄 Swaps API: http://localhost:${server.port}/api/swaps`);
    
    return server;
    
  } catch (error) {
    logger.error('❌ Failed to start API Test Server:', error);
    process.exit(1);
  }
}

// Start the server
startApiTestServer();