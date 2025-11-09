/**
 * Test setup and global configurations for Jest
 */

// Mock console.error to avoid noise in test output
const originalConsoleError = console.error;
global.console = {
  ...global.console,
  error: jest.fn()
};

// Restore console.error after tests if needed
afterAll(() => {
  global.console.error = originalConsoleError;
});

// Set test timeout
jest.setTimeout(30000);

// Mock environment variables for testing with valid v4 UUIDs
process.env['AZURE_SUBSCRIPTION_ID'] = 'fecfa029-a413-44f1-a0fd-459af3be0e4a';
process.env['AZURE_TENANT_ID'] = 'b412990c-449e-48df-8b1d-4df89f514bcd';
process.env['AZURE_CLIENT_ID'] = 'a8cea694-92f8-44b5-8397-d72e6d5651cc';
process.env['AZURE_CLIENT_SECRET'] = 'test-client-secret-value';
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'error';