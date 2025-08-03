/**
 * Simplified test server for PostgreSQL API testing
 */

import { getDatabaseManager } from './src/config/database.js';
import { logger } from './src/utils/logger.js';

async function testPostgreSQLIntegration() {
  try {
    logger.info('🚀 Starting PostgreSQL Integration Test...');
    
    // Test database connection
    const dbManager = getDatabaseManager();
    await dbManager.initialize();
    
    // Test health check
    const isHealthy = await dbManager.healthCheck();
    logger.info(`Database Health: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    
    // Test database stats
    const stats = await dbManager.getStats();
    logger.info('Database Stats:', stats);
    
    // Test basic CRUD operations
    const db = dbManager.getDatabase();
    const { swaps } = await import('./src/schema/index.js');
    
    // Create a test swap
    const testSwap = {
      id: `test_${Date.now()}`,
      orderId: `order_${Date.now()}`,
      maker: '0x1234567890123456789012345678901234567890',
      makingAmount: '1000000',
      takingAmount: '2000000',
      makingToken: '0xtoken1',
      takingToken: '0xtoken2',
      sourceChain: 'ethereum',
      targetChain: 'sui',
      secretHash: '0xsecret123',
      timeLock: 3600,
      sourceContract: '0xcontract1',
      targetContract: '0xcontract2',
      status: 'pending' as const,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };
    
    // Insert test data
    logger.info('Creating test swap...');
    const insertResult = await db.insert(swaps).values(testSwap).returning();
    logger.info('Test swap created:', insertResult[0]);
    
    // Query test data
    logger.info('Querying test swap...');
    const queryResult = await db.select().from(swaps).where({ id: testSwap.id } as any);
    logger.info('Test swap queried:', queryResult[0]);
    
    // Update test data
    logger.info('Updating test swap...');
    const updateResult = await db
      .update(swaps)
      .set({ status: 'active' })
      .where({ id: testSwap.id } as any)
      .returning();
    logger.info('Test swap updated:', updateResult[0]);
    
    // Delete test data
    logger.info('Deleting test swap...');
    const deleteResult = await db
      .delete(swaps)
      .where({ id: testSwap.id } as any)
      .returning();
    logger.info('Test swap deleted:', deleteResult[0]);
    
    logger.info('✅ PostgreSQL Integration Test PASSED!');
    
    // Close database connection
    await dbManager.close();
    
  } catch (error) {
    logger.error('❌ PostgreSQL Integration Test FAILED:', error);
    process.exit(1);
  }
}

// Run test
testPostgreSQLIntegration();