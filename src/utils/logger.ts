/**
 * Logging utility using Winston for structured logging
 * Provides consistent logging across the application with proper formatting and context
 */

import winston from 'winston';
import type { LogContext } from '../types/index.js';

/**
 * Custom log format for structured logging
 */
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta
    });
  })
);

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

/**
 * Create Winston logger instance
 */
const winstonLogger = winston.createLogger({
  level: process.env['LOG_LEVEL'] || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'mcp-azure-deployment-service'
  },
  transports: [
    // Write to stderr for MCP server compliance
    new winston.transports.Console({
      format: process.env['NODE_ENV'] === 'development' ? consoleFormat : logFormat,
      stderrLevels: ['error', 'warn', 'info', 'debug']
    })
  ]
});

/**
 * Enhanced logger with context support
 */
class ContextLogger {
  private baseContext: LogContext = {};

  /**
   * Set base context for all log messages
   */
  setContext(context: LogContext): void {
    this.baseContext = { ...this.baseContext, ...context };
  }

  /**
   * Clear base context
   */
  clearContext(): void {
    this.baseContext = {};
  }

  /**
   * Create child logger with additional context
   */
  child(context: LogContext): ContextLogger {
    const childLogger = new ContextLogger();
    childLogger.baseContext = { ...this.baseContext, ...context };
    return childLogger;
  }

  /**
   * Log error message with context
   */
  error(message: string, context: LogContext = {}): void {
    winstonLogger.error(message, { ...this.baseContext, ...context });
  }

  /**
   * Log warning message with context
   */
  warn(message: string, context: LogContext = {}): void {
    winstonLogger.warn(message, { ...this.baseContext, ...context });
  }

  /**
   * Log info message with context
   */
  info(message: string, context: LogContext = {}): void {
    winstonLogger.info(message, { ...this.baseContext, ...context });
  }

  /**
   * Log debug message with context
   */
  debug(message: string, context: LogContext = {}): void {
    winstonLogger.debug(message, { ...this.baseContext, ...context });
  }

  /**
   * Log verbose message with context
   */
  verbose(message: string, context: LogContext = {}): void {
    winstonLogger.verbose(message, { ...this.baseContext, ...context });
  }

  /**
   * Log MCP operation start
   */
  mcpStart(operation: string, params: any = {}): void {
    this.info(`MCP operation started: ${operation}`, {
      operation,
      params: this.sanitizeParams(params),
      phase: 'start'
    });
  }

  /**
   * Log MCP operation success
   */
  mcpSuccess(operation: string, result: any = {}, duration?: number): void {
    this.info(`MCP operation completed: ${operation}`, {
      operation,
      result: this.sanitizeResult(result),
      duration,
      phase: 'success'
    });
  }

  /**
   * Log MCP operation error
   */
  mcpError(operation: string, error: Error, duration?: number): void {
    this.error(`MCP operation failed: ${operation}`, {
      operation,
      error: error.message,
      stack: error.stack,
      duration,
      phase: 'error'
    });
  }

  /**
   * Sanitize parameters for logging (remove sensitive data)
   */
  private sanitizeParams(params: any): any {
    if (!params || typeof params !== 'object') {
      return params;
    }

    const sanitized = { ...params };
    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'credential', 'auth'];
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitize result for logging (remove sensitive data)
   */
  private sanitizeResult(result: any): any {
    if (!result || typeof result !== 'object') {
      return result;
    }

    const sanitized = { ...result };
    
    // Remove large objects that shouldn't be logged
    if (sanitized.details && typeof sanitized.details === 'object') {
      const details = { ...sanitized.details };
      delete details.properties; // Azure resource properties can be very large
      delete details.tags; // Tags can contain sensitive information
      sanitized.details = details;
    }
    
    return sanitized;
  }
}

/**
 * Export singleton logger instance
 */
export const logger = new ContextLogger();

/**
 * Export winston logger for advanced use cases
 */
export { winston, winstonLogger };

/**
 * Logger middleware for adding correlation IDs
 */
export class LoggerMiddleware {
  static addCorrelationId(correlationId?: string): ContextLogger {
    const id = correlationId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return logger.child({ correlationId: id });
  }
}

/**
 * Performance logger for timing operations
 */
export class PerformanceLogger {
  private startTime: number;
  private operation: string;
  private contextLogger: ContextLogger;

  constructor(operation: string, context: LogContext = {}) {
    this.operation = operation;
    this.startTime = Date.now();
    this.contextLogger = logger.child(context);
    
    this.contextLogger.debug(`Performance tracking started for: ${operation}`, {
      operation,
      startTime: this.startTime
    });
  }

  /**
   * Mark a checkpoint in the operation
   */
  checkpoint(checkpointName: string): void {
    const elapsed = Date.now() - this.startTime;
    this.contextLogger.debug(`Performance checkpoint: ${checkpointName}`, {
      operation: this.operation,
      checkpoint: checkpointName,
      elapsed
    });
  }

  /**
   * End performance tracking and log results
   */
  end(success: boolean = true, error?: Error): number {
    const duration = Date.now() - this.startTime;
    
    if (success) {
      this.contextLogger.info(`Performance tracking completed for: ${this.operation}`, {
        operation: this.operation,
        duration,
        success: true
      });
    } else {
      this.contextLogger.warn(`Performance tracking completed with error for: ${this.operation}`, {
        operation: this.operation,
        duration,
        success: false,
        error: error?.message
      });
    }
    
    return duration;
  }
}