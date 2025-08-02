/**
 * Unified Logging System
 * Uses Winston to provide structured logging
 */

import winston from 'winston';

// Log level configuration
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Custom log format
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

/**
 * Console log format (development-friendly)
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss.SSS'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let logMessage = `${timestamp} [${level}] ${message}`;
    
    // Add metadata
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

/**
 * Create Winston logger instance
 */
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: logFormat,
  defaultMeta: {
    service: '1inch-fusion-relayer',
    version: '2.0.0',
  },
  transports: [
    // Console output
    new winston.transports.Console({
      format: NODE_ENV === 'development' ? consoleFormat : logFormat,
    }),
  ],
  
  // Exception handling
  handleExceptions: true,
  handleRejections: true,
});

// Add file transport (if directory exists)
try {
  // Ensure log directory exists
  const fs = require('fs');
  if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs', { recursive: true });
  }

  // File output - all logs
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    tailable: true,
  }));
  
  // File output - error logs
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    tailable: true,
  }));
} catch (error) {
  // If file transport setup fails, continue with console
  logger.warn('Could not setup file logging:', error);
}

/**
 * Production environment optimization
 */
if (NODE_ENV === 'production') {
  // Remove console color format, use JSON format
  logger.transports.forEach(transport => {
    if (transport instanceof winston.transports.Console) {
      transport.format = logFormat;
    }
  });
}

/**
 * Extended logging methods - Performance logging
 */
export const performanceLogger = {
  /**
   * Record function execution time
   */
  timeFunction: <T extends (...args: any[]) => any>(
    fn: T,
    functionName: string
  ): T => {
    return ((...args: Parameters<T>) => {
      const startTime = Date.now();
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = Date.now() - startTime;
          logger.debug(`Function ${functionName} took ${duration}ms`);
        });
      } else {
        const duration = Date.now() - startTime;
        logger.debug(`Function ${functionName} took ${duration}ms`);
        return result;
      }
    }) as T;
  },

  /**
   * Record operation start
   */
  start: (operation: string, metadata?: Record<string, any>) => {
    const startTime = Date.now();
    logger.info(`Starting ${operation}`, { ...metadata, startTime });
    return {
      end: (additionalMetadata?: Record<string, any>) => {
        const duration = Date.now() - startTime;
        logger.info(`Completed ${operation}`, {
          ...metadata,
          ...additionalMetadata,
          duration,
        });
      },
      fail: (error: Error, additionalMetadata?: Record<string, any>) => {
        const duration = Date.now() - startTime;
        logger.error(`Failed ${operation}`, {
          ...metadata,
          ...additionalMetadata,
          duration,
          error: error.message,
          stack: error.stack,
        });
      },
    };
  },
};

/**
 * Structured logging helper functions
 */
export const structuredLogger = {
  /**
   * Record event processing
   */
  event: (eventType: string, data: Record<string, any>) => {
    logger.info('Event processed', {
      eventType,
      ...data,
      category: 'event',
    });
  },

  /**
   * Record API requests
   */
  api: (method: string, path: string, statusCode: number, duration: number, metadata?: Record<string, any>) => {
    logger.info('API request', {
      method,
      path,
      statusCode,
      duration,
      ...metadata,
      category: 'api',
    });
  },

  /**
   * Record database operations
   */
  database: (operation: string, table: string, duration: number, metadata?: Record<string, any>) => {
    logger.debug('Database operation', {
      operation,
      table,
      duration,
      ...metadata,
      category: 'database',
    });
  },

  /**
   * Record business logic
   */
  business: (action: string, data: Record<string, any>) => {
    logger.info('Business action', {
      action,
      ...data,
      category: 'business',
    });
  },

  /**
   * Record security events
   */
  security: (event: string, data: Record<string, any>) => {
    logger.warn('Security event', {
      event,
      ...data,
      category: 'security',
    });
  },
};

/**
 * Log level check
 */
export const isLogLevel = (level: string): boolean => {
  const levels = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
  const currentLevelIndex = levels.indexOf(LOG_LEVEL);
  const checkLevelIndex = levels.indexOf(level);
  
  return checkLevelIndex <= currentLevelIndex;
};

// Export default logger
export default logger;