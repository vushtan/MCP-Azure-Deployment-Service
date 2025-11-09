/**
 * Logging utility using Winston for structured logging
 * Provides consistent logging across the application with proper formatting and context
 */
import winston from 'winston';
import type { LogContext } from '../types/index.js';
/**
 * Create Winston logger instance
 */
declare const winstonLogger: winston.Logger;
/**
 * Enhanced logger with context support
 */
declare class ContextLogger {
    private baseContext;
    /**
     * Set base context for all log messages
     */
    setContext(context: LogContext): void;
    /**
     * Clear base context
     */
    clearContext(): void;
    /**
     * Create child logger with additional context
     */
    child(context: LogContext): ContextLogger;
    /**
     * Log error message with context
     */
    error(message: string, context?: LogContext): void;
    /**
     * Log warning message with context
     */
    warn(message: string, context?: LogContext): void;
    /**
     * Log info message with context
     */
    info(message: string, context?: LogContext): void;
    /**
     * Log debug message with context
     */
    debug(message: string, context?: LogContext): void;
    /**
     * Log verbose message with context
     */
    verbose(message: string, context?: LogContext): void;
    /**
     * Log MCP operation start
     */
    mcpStart(operation: string, params?: any): void;
    /**
     * Log MCP operation success
     */
    mcpSuccess(operation: string, result?: any, duration?: number): void;
    /**
     * Log MCP operation error
     */
    mcpError(operation: string, error: Error, duration?: number): void;
    /**
     * Sanitize parameters for logging (remove sensitive data)
     */
    private sanitizeParams;
    /**
     * Sanitize result for logging (remove sensitive data)
     */
    private sanitizeResult;
}
/**
 * Export singleton logger instance
 */
export declare const logger: ContextLogger;
/**
 * Export winston logger for advanced use cases
 */
export { winston, winstonLogger };
/**
 * Logger middleware for adding correlation IDs
 */
export declare class LoggerMiddleware {
    static addCorrelationId(correlationId?: string): ContextLogger;
}
/**
 * Performance logger for timing operations
 */
export declare class PerformanceLogger {
    private startTime;
    private operation;
    private contextLogger;
    constructor(operation: string, context?: LogContext);
    /**
     * Mark a checkpoint in the operation
     */
    checkpoint(checkpointName: string): void;
    /**
     * End performance tracking and log results
     */
    end(success?: boolean, error?: Error): number;
}
//# sourceMappingURL=logger.d.ts.map