/**
 * Webhook Management Routes
 * Handle webhook registration, sending and management
 */

import { Elysia, t } from 'elysia';
import { eq, desc, and } from 'drizzle-orm';
import { notifications, NotificationType } from '../schema/index.js';
import { logger } from '../utils/logger.js';
import { createPaginationResponse } from '../utils/pagination.js';

/**
 * Webhook registration schema
 */
const WebhookRegistrationSchema = t.Object({
  url: t.String({ format: 'uri' }),
  events: t.Array(t.String()),
  headers: t.Optional(t.Record(t.String(), t.String())),
  secret: t.Optional(t.String()),
  active: t.Optional(t.Boolean()),
});

/**
 * Webhook test schema
 */
const WebhookTestSchema = t.Object({
  url: t.String({ format: 'uri' }),
  headers: t.Optional(t.Record(t.String(), t.String())),
  data: t.Optional(t.Record(t.String(), t.Any())),
});

/**
 * Webhook routes
 */
export const webhookRoutes = new Elysia({ prefix: '/webhooks' })
  // GET /webhooks - Get webhook history
  .get('/', async ({ query }) => {
    try {
      const {
        page = 1,
        limit = 50,
        status,
        type = 'webhook',
        swapId,
      } = query;

      // Return mock webhook history data
      return {
        success: true,
        data: {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      };
    } catch (error) {
      logger.error('Failed to fetch webhooks:', error);
      return {
        success: false,
        error: 'Failed to fetch webhook history',
      };
    }
  }, {
    query: t.Object({
      page: t.Optional(t.Number({ minimum: 1 })),
      limit: t.Optional(t.Number({ minimum: 1, maximum: 200 })),
      status: t.Optional(t.Union([
        t.Literal('pending'),
        t.Literal('sent'),
        t.Literal('failed'),
      ])),
      type: t.Optional(t.String()),
      swapId: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Webhooks'],
      summary: 'Get webhook history',
      description: 'Returns webhook sending history and status',
    }
  })

  // POST /webhooks/test - Test webhook
  .post('/test', async ({ body }) => {
    try {
      const { url, headers = {}, data = {} } = body;
      
      // Prepare test data
      const testPayload = {
        event: 'webhook_test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook from 1inch Fusion Relayer',
          ...data,
        },
      };

      // Send test request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': '1inch-fusion-relayer/2.0.0',
          ...headers,
        },
        body: JSON.stringify(testPayload),
      });

      const responseText = await response.text();
      
      return {
        success: true,
        result: {
          url,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText,
          timing: {
            sent: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      logger.error('Webhook test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook test failed',
      };
    }
  }, {
    body: WebhookTestSchema,
    detail: {
      tags: ['Webhooks'],
      summary: 'Test webhook',
      description: 'Send test request to specified webhook URL',
    }
  })

  // POST /webhooks/send - Manually send webhook
  .post('/send', async ({ body }) => {
    try {
      const {
        url,
        event,
        data = {},
        headers = {},
        swapId,
      } = body;

      // Return mock webhook sending result
      return {
        success: true,
        webhook: {
          id: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url,
          event,
          status: 'sent',
          httpStatus: 200,
          response: 'Webhook sent successfully (database disabled)',
        },
      };
    } catch (error) {
      logger.error('Failed to send webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send webhook',
      };
    }
  }, {
    body: t.Object({
      url: t.String({ format: 'uri' }),
      event: t.String(),
      data: t.Optional(t.Record(t.String(), t.Any())),
      headers: t.Optional(t.Record(t.String(), t.String())),
      swapId: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Webhooks'],
      summary: 'Manually send webhook',
      description: 'Immediately send webhook notification to specified URL',
    }
  })

  // GET /webhooks/:id - Get specific webhook record
  .get('/:id', async ({ params }) => {
    try {
      // Return mock webhook record
      return {
        success: false,
        error: 'Webhook not found (database disabled)',
      };
    } catch (error) {
      logger.error('Failed to fetch webhook:', error);
      return {
        success: false,
        error: 'Failed to fetch webhook',
      };
    }
  }, {
    params: t.Object({
      id: t.String(),
    }),
    detail: {
      tags: ['Webhooks'],
      summary: 'Get webhook record',
      description: 'Returns detailed information of the specified ID webhook',
    }
  })

  // POST /webhooks/:id/retry - Retry failed webhook
  .post('/:id/retry', async ({ params }) => {
    try {
      // Return mock retry result
      return {
        success: false,
        error: 'Webhook not found (database disabled)',
      };
    } catch (error) {
      logger.error('Failed to retry webhook:', error);
      return {
        success: false,
        error: 'Failed to retry webhook',
      };
    }
  }, {
    params: t.Object({
      id: t.String(),
    }),
    detail: {
      tags: ['Webhooks'],
      summary: 'Retry webhook',
      description: 'Resend failed webhook notification',
    }
  });