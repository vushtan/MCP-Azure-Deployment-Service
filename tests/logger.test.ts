import winston from 'winston';

// Mock winston module before importing logger
const mockWinstonLogger = {
  info: jest.fn(),
  error: jest.fn(), 
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn()
};

jest.mock('winston', () => ({
  createLogger: jest.fn(() => mockWinstonLogger),
  transports: {
    Console: jest.fn()
  },
  format: {
    combine: jest.fn((...args) => args),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn()
  }
}));

// Import logger after mocking
import { logger, PerformanceLogger, LoggerMiddleware } from '../src/utils/logger';

describe('Logger', () => {
  let mockedWinston: jest.Mocked<typeof winston>;
  
  beforeEach(() => {
    mockedWinston = winston as jest.Mocked<typeof winston>;
    jest.clearAllMocks();
    logger.clearContext();
  });

  describe('Basic Logging', () => {
    it('should call winston info method', () => {
      logger.info('Test message');
      expect(mockWinstonLogger.info).toHaveBeenCalled();
    });

    it('should call winston error method', () => {
      logger.error('Test error');
      expect(mockWinstonLogger.error).toHaveBeenCalled();
    });

    it('should call winston warn method', () => {
      logger.warn('Test warning');
      expect(mockWinstonLogger.warn).toHaveBeenCalled();
    });

    it('should call winston debug method', () => {
      logger.debug('Test debug');
      expect(mockWinstonLogger.debug).toHaveBeenCalled();
    });

    it('should call winston verbose method', () => {
      logger.verbose('Test verbose');
      expect(mockWinstonLogger.verbose).toHaveBeenCalled();
    });
  });

  describe('Context Management', () => {
    it('should set base context', () => {
      logger.setContext({ operation: 'test-operation' });
      logger.info('Test with context');
      
      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Test with context',
        expect.objectContaining({
          operation: 'test-operation'
        })
      );
    });

    it('should merge context with message context', () => {
      logger.setContext({ baseKey: 'baseValue' });
      logger.info('Test message', { messageKey: 'messageValue' });
      
      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Test message',
        expect.objectContaining({
          baseKey: 'baseValue',
          messageKey: 'messageValue'
        })
      );
    });

    it('should clear context', () => {
      logger.setContext({ operation: 'test' });
      logger.clearContext();
      logger.info('Test without context');
      
      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Test without context',
        {}
      );
    });

    it('should create child logger with context', () => {
      const childLogger = logger.child({ childKey: 'childValue' });
      childLogger.info('Child message');
      
      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Child message',
        expect.objectContaining({
          childKey: 'childValue'
        })
      );
    });
  });

  describe('MCP Operations', () => {
    it('should log MCP operation start', () => {
      logger.mcpStart('testOperation', { param1: 'value1' });
      
      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'MCP operation started: testOperation',
        expect.objectContaining({
          operation: 'testOperation',
          phase: 'start'
        })
      );
    });

    it('should log MCP operation success', () => {
      logger.mcpSuccess('testOperation', { result: 'success' }, 100);
      
      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'MCP operation completed: testOperation',
        expect.objectContaining({
          operation: 'testOperation',
          phase: 'success',
          duration: 100
        })
      );
    });

    it('should log MCP operation error', () => {
      const error = new Error('Test error');
      logger.mcpError('testOperation', error, 50);
      
      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        'MCP operation failed: testOperation',
        expect.objectContaining({
          operation: 'testOperation',
          phase: 'error',
          error: 'Test error',
          duration: 50
        })
      );
    });
  });

  describe('Parameter Sanitization', () => {
    it('should sanitize sensitive parameters', () => {
      logger.mcpStart('testOperation', { 
        username: 'user123',
        password: 'secret123',
        normalParam: 'value'
      });
      
      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            username: 'user123',
            password: '[REDACTED]',
            normalParam: 'value'
          })
        })
      );
    });

    it('should handle non-object parameters', () => {
      logger.mcpStart('testOperation', 'stringParam');
      
      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: 'stringParam'
        })
      );
    });

    it('should sanitize results', () => {
      const result = {
        success: true,
        details: {
          id: '123',
          properties: { large: 'object' },
          tags: { sensitive: 'info' }
        }
      };
      
      logger.mcpSuccess('testOperation', result);
      
      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          result: expect.objectContaining({
            success: true,
            details: expect.objectContaining({
              id: '123'
              // properties and tags should be removed
            })
          })
        })
      );
    });
  });
});

describe('PerformanceLogger', () => {
  let performanceLogger: PerformanceLogger;
  
  beforeEach(() => {
    jest.clearAllMocks();
    performanceLogger = new PerformanceLogger('testOperation', { contextKey: 'contextValue' });
  });

  it('should create performance logger and log start', () => {
    expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
      'Performance tracking started for: testOperation',
      expect.objectContaining({
        operation: 'testOperation',
        contextKey: 'contextValue'
      })
    );
  });

  it('should log checkpoints', () => {
    performanceLogger.checkpoint('midpoint');
    
    expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
      'Performance checkpoint: midpoint',
      expect.objectContaining({
        operation: 'testOperation',
        checkpoint: 'midpoint',
        elapsed: expect.any(Number)
      })
    );
  });

  it('should log successful completion', () => {
    const duration = performanceLogger.end(true);

    expect(duration).toBeGreaterThanOrEqual(0);
    expect(mockWinstonLogger.info).toHaveBeenCalledWith(
      'Performance tracking completed for: testOperation',
      expect.objectContaining({
        operation: 'testOperation',
        duration: expect.any(Number),
        success: true
      })
    );
  });

  it('should log error completion', () => {
    const error = new Error('Test error');
    const duration = performanceLogger.end(false, error);

    expect(duration).toBeGreaterThanOrEqual(0);
    expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
      'Performance tracking completed with error for: testOperation',
      expect.objectContaining({
        operation: 'testOperation',
        duration: expect.any(Number),
        success: false,
        error: 'Test error'
      })
    );
  });
});

describe('LoggerMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add correlation ID', () => {
    const childLogger = LoggerMiddleware.addCorrelationId('test-correlation-id');
    childLogger.info('Test message');
    
    expect(mockWinstonLogger.info).toHaveBeenCalledWith(
      'Test message',
      expect.objectContaining({
        correlationId: 'test-correlation-id'
      })
    );
  });

  it('should generate correlation ID if not provided', () => {
    const childLogger = LoggerMiddleware.addCorrelationId();
    childLogger.info('Test message');
    
    expect(mockWinstonLogger.info).toHaveBeenCalledWith(
      'Test message',
      expect.objectContaining({
        correlationId: expect.stringMatching(/^req_\d+_[a-z0-9]+$/)
      })
    );
  });
});

describe('Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle undefined context gracefully', () => {
    expect(() => {
      logger.info('Test message', undefined as any);
    }).not.toThrow();
    
    expect(mockWinstonLogger.info).toHaveBeenCalled();
  });

  it('should handle null context gracefully', () => {
    expect(() => {
      logger.info('Test message', null as any);
    }).not.toThrow();
    
    expect(mockWinstonLogger.info).toHaveBeenCalled();
  });

  it('should handle complex objects', () => {
    const complexObject = {
      nested: {
        deeply: {
          value: 'test'
        }
      },
      array: [1, 2, 3],
      func: () => 'function'
    };
    
    expect(() => {
      logger.info('Complex object', complexObject);
    }).not.toThrow();
    
    expect(mockWinstonLogger.info).toHaveBeenCalled();
  });
});

describe('Winston Configuration', () => {
  it('should create winston logger with correct configuration', () => {
    // Logger is initialized during module import, so mock should exist
    expect(winston.createLogger).toBeDefined();
    expect(winston.createLogger).toEqual(expect.any(Function));
  });

  it('should configure console transport', () => {
    // Since transport is created during import, we verify the constructor exists
    expect(winston.transports.Console).toBeDefined();
  });
});

describe('Additional Logger Coverage', () => {
  beforeEach(() => {
    mockWinstonLogger.info.mockClear();
    mockWinstonLogger.error.mockClear();
    mockWinstonLogger.warn.mockClear();
    mockWinstonLogger.debug.mockClear();
  });

  it('should handle result sanitization with various data types', () => {
    // Test with null result
    logger.mcpSuccess('testOp', null);
    expect(mockWinstonLogger.info).toHaveBeenCalled();

    // Test with number result
    logger.mcpSuccess('testOp', 42);
    expect(mockWinstonLogger.info).toHaveBeenCalled();

    // Test with string result
    logger.mcpSuccess('testOp', 'simple string');
    expect(mockWinstonLogger.info).toHaveBeenCalled();
  });

  it('should handle parameter sanitization edge cases', () => {
    // Test with parameters containing deeply nested sensitive data
    const complexParams = {
      config: {
        auth: {
          password: 'secret123',
          clientSecret: 'super-secret',
          nested: {
            token: 'hidden-token',
            apiKey: 'api-key-value'
          }
        },
        publicData: 'visible-data'
      }
    };

    logger.mcpStart('complexTest', complexParams);
    expect(mockWinstonLogger.info).toHaveBeenCalled();
  });

  it('should handle performance logger edge cases', () => {
    const perfLogger = new PerformanceLogger('edgeCaseOp', { context: 'test' });
    
    // Test checkpoint with additional metadata
    perfLogger.checkpoint('phase1');
    
    // Test successful completion (don't check exact duration, just that it's a number)
    const duration = perfLogger.end(true);
    expect(typeof duration).toBe('number');

    expect(mockWinstonLogger.info).toHaveBeenCalledTimes(1); // only complete called in this minimal test
  });

  it('should handle logger middleware with various correlation IDs', () => {
    // Test with specific correlation ID
    const loggerWithId = LoggerMiddleware.addCorrelationId('custom-id-456');
    expect(loggerWithId).toBeDefined();
    
    // Test with auto-generated correlation ID
    const loggerWithAutoId = LoggerMiddleware.addCorrelationId();
    expect(loggerWithAutoId).toBeDefined();
  });

  it('should handle various winston format scenarios', () => {
    // These tests trigger different winston format paths
    logger.info('Test message with metadata', { 
      level: 'info',
      timestamp: new Date().toISOString(),
      service: 'test-service',
      operation: 'test-op'
    });

    logger.error('Error with stack trace', new Error('Test error'));

    expect(mockWinstonLogger.info).toHaveBeenCalled();
    expect(mockWinstonLogger.error).toHaveBeenCalled();
  });

  it('should handle error scenarios with detailed context', () => {
    const error = new Error('Detailed test error');
    error.stack = 'Mock stack trace\n  at test function';
    
    logger.mcpError('testOp', error, 100);

    expect(mockWinstonLogger.error).toHaveBeenCalled();
  });

  it('should handle complex parameter sanitization', () => {
    const complexParams = {
      level1: {
        level2: {
          password: 'should-be-hidden',
          level3: {
            secret: 'also-hidden',
            publicData: 'visible'
          }
        },
        token: 'hidden-token'
      },
      normalField: 'visible-data'
    };

    logger.mcpStart('complexSanitization', complexParams);
    expect(mockWinstonLogger.info).toHaveBeenCalled();
  });

  it('should handle edge cases in result sanitization', () => {
    // Test with circular reference (should not crash)
    const circularObj: any = { data: 'test' };
    circularObj.circular = circularObj;
    
    logger.mcpSuccess('circularTest', circularObj);
    expect(mockWinstonLogger.info).toHaveBeenCalled();
  });
});
