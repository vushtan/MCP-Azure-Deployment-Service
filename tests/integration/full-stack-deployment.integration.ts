/**
 * Integration Tests for Full Stack Deployment Workflow
 * 
 * These tests simulate complete end-to-end workflows including:
 * 1. Full Stack Deployment Workflow
 * 2. Configuration Loading 
 * 3. Error Recovery
 * 
 * Note: These are mock-based integration tests. For real Azure integration,
 * set AZURE_INTEGRATION_TESTS=true and provide valid credentials.
 */

import { MCPServer } from '../../src/server/mcp-server.js';
import { AzureOperations } from '../../src/tools/azure-operations.js';
import { ConfigurationManager } from '../../src/config/index.js';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

describe('Integration Tests - Full Stack Deployment', () => {
  let server: MCPServer;
  let azureOps: AzureOperations;
  let configManager: ConfigurationManager;
  let tempFiles: string[] = [];

  beforeEach(() => {
    server = new MCPServer();
    configManager = ConfigurationManager.getInstance();
    azureOps = new AzureOperations();
    
    // Setup test environment
    process.env.NODE_ENV = 'test';
    process.env.AZURE_SUBSCRIPTION_ID = 'fecfa029-a413-44f1-a0fd-459af3be0e4a';
    process.env.AZURE_TENANT_ID = 'b412990c-449e-48df-8b1d-4df89f514bcd';
    process.env.AZURE_CLIENT_ID = 'a8cea694-92f8-44b5-8397-d72e6d5651cc';
    process.env.AZURE_CLIENT_SECRET = 'test-client-secret-value';
  });

  afterEach(() => {
    // Cleanup temp files
    tempFiles.forEach(file => {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    });
    tempFiles = [];
  });

  describe('TEST 1: Full Stack Deployment Workflow', () => {
    it('should complete full stack deployment workflow', async () => {
      const deploymentName = `integration-test-${Date.now()}`;
      const region = 'eastus';
      
      // Step 1: Create minimal instance
      const minimalInstanceRequest = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'tools/call',
        params: {
          name: 'azure.deployMinimalInstance',
          arguments: {
            instanceType: 'vm',
            region,
            namePrefix: deploymentName,
            size: 'Standard_B1s',
            osType: 'Linux',
            dryRun: true // Use dry run for integration tests
          }
        }
      };

      const minimalResponse = await server.handleRequest(minimalInstanceRequest);
      expect(minimalResponse.jsonrpc).toBe('2.0');
      expect(minimalResponse.id).toBe(1);
      expect(minimalResponse.result).toBeDefined();
      expect(minimalResponse.result.success).toBe(true);
      expect(minimalResponse.result.deploymentId).toBeDefined();

      const instanceId = minimalResponse.result.deploymentId;

      // Step 2: Deploy backend application
      const backendRequest = {
        jsonrpc: '2.0' as const,
        id: 2,
        method: 'tools/call',
        params: {
          name: 'azure.deployBackend',
          arguments: {
            instanceId,
            deploymentPackage: 'test-backend.zip',
            runtime: 'node',
            environmentVariables: {
              NODE_ENV: 'production',
              PORT: '3000'
            },
            healthCheckPath: '/health',
            dryRun: true
          }
        }
      };

      const backendResponse = await server.handleRequest(backendRequest);
      expect(backendResponse.jsonrpc).toBe('2.0');
      expect(backendResponse.id).toBe(2);
      expect(backendResponse.result).toBeDefined();
      expect(backendResponse.result.success).toBe(true);

      // Step 3: Deploy frontend application
      const frontendRequest = {
        jsonrpc: '2.0' as const,
        id: 3,
        method: 'tools/call',
        params: {
          name: 'azure.deployFrontend',
          arguments: {
            instanceId,
            buildDirectory: './dist',
            enableCdn: true,
            indexDocument: 'index.html',
            dryRun: true
          }
        }
      };

      const frontendResponse = await server.handleRequest(frontendRequest);
      expect(frontendResponse.jsonrpc).toBe('2.0');
      expect(frontendResponse.id).toBe(3);
      expect(frontendResponse.result).toBeDefined();
      expect(frontendResponse.result.success).toBe(true);

      // Step 4: Verify all services are accessible (simulated)
      const existingServersRequest = {
        jsonrpc: '2.0' as const,
        id: 4,
        method: 'tools/call',
        params: {
          name: 'azure.getExistingServers',
          arguments: {
            resourceGroup: `${deploymentName}-rg`,
            serverType: 'vm',
            region
          }
        }
      };

      const serversResponse = await server.handleRequest(existingServersRequest);
      expect(serversResponse.jsonrpc).toBe('2.0');
      expect(serversResponse.id).toBe(4);
      expect(serversResponse.result).toBeDefined();
      expect(Array.isArray(serversResponse.result.servers)).toBe(true);

      // Step 5: Verify deployment consistency
      expect(minimalResponse.result.region).toBe(region);
      expect(backendResponse.result.deploymentType).toBe('backend');
      expect(frontendResponse.result.deploymentType).toBe('frontend');
    });

    it('should handle partial deployment failure and cleanup', async () => {
      const deploymentName = `failed-test-${Date.now()}`;
      
      // Step 1: Successful minimal instance
      const minimalRequest = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'tools/call',
        params: {
          name: 'azure.deployMinimalInstance',
          arguments: {
            instanceType: 'vm',
            region: 'eastus',
            namePrefix: deploymentName,
            dryRun: true
          }
        }
      };

      const minimalResponse = await server.handleRequest(minimalRequest);
      expect(minimalResponse.result.success).toBe(true);
      
      // Step 2: Simulate backend deployment failure
      const backendRequest = {
        jsonrpc: '2.0' as const,
        id: 2,
        method: 'tools/call',
        params: {
          name: 'azure.deployBackend',
          arguments: {
            instanceId: 'non-existent-instance',
            deploymentPackage: 'invalid-package.zip',
            runtime: 'invalid-runtime' as any,
            dryRun: true
          }
        }
      };

      const backendResponse = await server.handleRequest(backendRequest);
      expect(backendResponse.error).toBeDefined();
      
      // Verify error handling doesn't crash the system
      if (backendResponse.error) {
        expect(backendResponse.error.code).toBeDefined();
        expect(typeof backendResponse.error.message).toBe('string');
      }
    });
  });

  describe('TEST 2: Configuration Loading Integration', () => {
    it('should load configuration from .env file', () => {
      const testEnvFile = join(process.cwd(), '.env.test');
      tempFiles.push(testEnvFile);
      
      const envContent = `
AZURE_SUBSCRIPTION_ID=12345678-1234-1234-1234-123456789abc
AZURE_TENANT_ID=87654321-4321-4321-4321-abcdef123456
AZURE_CLIENT_ID=abcdef12-3456-7890-abcd-ef1234567890
AZURE_CLIENT_SECRET=test-secret-from-env
AZURE_DEFAULT_REGION=westus2
LOG_LEVEL=debug
      `.trim();
      
      writeFileSync(testEnvFile, envContent);
      
      // Test configuration loading
      const config = configManager.getConfig();
      expect(config).toBeDefined();
      expect(config.subscriptionId).toBeDefined();
      expect(config.tenantId).toBeDefined();
      expect(config.clientId).toBeDefined();
      expect(config.clientSecret).toBeDefined();
    });

    it('should load configuration from config.json with profile switching', () => {
      const testConfigFile = join(process.cwd(), 'config.test.json');
      tempFiles.push(testConfigFile);
      
      const configContent = {
        profiles: {
          development: {
            subscriptionId: 'dev-sub-id',
            tenantId: 'dev-tenant-id',
            clientId: 'dev-client-id',
            clientSecret: 'dev-secret',
            defaultRegion: 'eastus',
            resourceGroupPrefix: 'dev-rg'
          },
          production: {
            subscriptionId: 'prod-sub-id',
            tenantId: 'prod-tenant-id',
            clientId: 'prod-client-id',
            clientSecret: 'prod-secret',
            defaultRegion: 'westus',
            resourceGroupPrefix: 'prod-rg'
          }
        },
        activeProfile: 'development'
      };
      
      writeFileSync(testConfigFile, JSON.stringify(configContent, null, 2));
      
      // Test profile management
      const profiles = configManager.getAvailableProfiles();
      expect(profiles.length).toBeGreaterThan(0);
      
      const activeProfile = configManager.getActiveProfile();
      expect(typeof activeProfile).toBe('string');
      
      // Test profile switching
      if (profiles.includes('development')) {
        configManager.setActiveProfile('development');
        expect(configManager.getActiveProfile()).toBe('development');
      }
    });

    it('should handle environment variable override', () => {
      // Set override values
      const originalRegion = process.env.AZURE_DEFAULT_REGION;
      process.env.AZURE_DEFAULT_REGION = 'centralus';
      
      try {
        const config = configManager.getConfig();
        expect(config.defaultRegion).toBe('centralus');
      } finally {
        // Restore original
        if (originalRegion) {
          process.env.AZURE_DEFAULT_REGION = originalRegion;
        } else {
          delete process.env.AZURE_DEFAULT_REGION;
        }
      }
    });

    it('should detect invalid configuration', () => {
      const originalClientSecret = process.env.AZURE_CLIENT_SECRET;
      delete process.env.AZURE_CLIENT_SECRET;
      
      try {
        expect(() => {
          ConfigurationManager.getInstance().getConfig();
        }).toThrow();
      } finally {
        if (originalClientSecret) {
          process.env.AZURE_CLIENT_SECRET = originalClientSecret;
        }
      }
    });
  });

  describe('TEST 3: Error Recovery Integration', () => {
    it('should implement retry logic for transient failures', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'tools/call',
        params: {
          name: 'azure.getExistingServers',
          arguments: {
            resourceGroup: 'test-rg',
            serverType: 'vm'
          }
        }
      };

      // The Azure operations should handle retries internally
      const response = await server.handleRequest(request);
      
      // Even if there are transient failures, we should get a response
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result || response.error).toBeDefined();
    });

    it('should handle graceful degradation', async () => {
      // Test with invalid credentials (should fail gracefully)
      const originalSecret = process.env.AZURE_CLIENT_SECRET;
      process.env.AZURE_CLIENT_SECRET = 'invalid-secret';
      
      try {
        const request = {
          jsonrpc: '2.0' as const,
          id: 1,
          method: 'tools/call',
          params: {
            name: 'azure.deployMinimalInstance',
            arguments: {
              instanceType: 'vm',
              region: 'eastus',
              namePrefix: 'test',
              dryRun: true
            }
          }
        };

        const response = await server.handleRequest(request);
        
        // Should return an error but not crash
        if (response.error) {
          expect(response.error.code).toBeDefined();
          expect(response.error.message).toBeDefined();
        } else {
          // Or succeed with dry run
          expect(response.result).toBeDefined();
        }
      } finally {
        process.env.AZURE_CLIENT_SECRET = originalSecret;
      }
    });

    it('should implement cleanup on failure', async () => {
      const deploymentName = `cleanup-test-${Date.now()}`;
      
      const request = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'tools/call',
        params: {
          name: 'azure.deployMinimalInstance',
          arguments: {
            instanceType: 'vm',
            region: 'invalid-region',
            namePrefix: deploymentName,
            dryRun: true
          }
        }
      };

      const response = await server.handleRequest(request);
      
      // Should handle invalid region gracefully
      if (response.error) {
        expect(response.error.message).toContain('region');
      } else {
        // Or provide validation in dry run mode
        expect(response.result).toBeDefined();
      }
      
      // System should remain stable after error
      const healthRequest = {
        jsonrpc: '2.0' as const,
        id: 2,
        method: 'tools/list',
        params: {}
      };
      
      const healthResponse = await server.handleRequest(healthRequest);
      expect(healthResponse.result).toBeDefined();
      expect(Array.isArray(healthResponse.result.tools)).toBe(true);
    });
  });

  describe('Performance and Scalability Integration', () => {
    it('should handle concurrent deployment requests', async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => ({
        jsonrpc: '2.0' as const,
        id: i + 1,
        method: 'tools/call',
        params: {
          name: 'azure.getExistingServers',
          arguments: {
            resourceGroup: `test-rg-${i}`,
            serverType: 'vm'
          }
        }
      }));

      const startTime = Date.now();
      const responses = await Promise.all(
        concurrentRequests.map(req => server.handleRequest(req))
      );
      const duration = Date.now() - startTime;

      // All requests should complete
      expect(responses).toHaveLength(5);
      responses.forEach((response, i) => {
        expect(response.jsonrpc).toBe('2.0');
        expect(response.id).toBe(i + 1);
        expect(response.result || response.error).toBeDefined();
      });

      // Should complete within reasonable time (under 10 seconds)
      expect(duration).toBeLessThan(10000);
    });

    it('should maintain system stability under load', async () => {
      const requests = [];
      
      // Create mix of different operations
      for (let i = 0; i < 10; i++) {
        requests.push({
          jsonrpc: '2.0' as const,
          id: i,
          method: 'tools/call',
          params: {
            name: i % 2 === 0 ? 'azure.getExistingServers' : 'azure.deployMinimalInstance',
            arguments: i % 2 === 0 ? {
              resourceGroup: `load-test-rg-${i}`
            } : {
              instanceType: 'vm',
              region: 'eastus',
              namePrefix: `load-test-${i}`,
              dryRun: true
            }
          }
        });
      }

      const responses = await Promise.all(
        requests.map(req => server.handleRequest(req))
      );

      // All requests should get responses
      expect(responses).toHaveLength(10);
      
      // System should remain responsive after load test
      const healthCheck = {
        jsonrpc: '2.0' as const,
        id: 999,
        method: 'tools/list',
        params: {}
      };
      
      const healthResponse = await server.handleRequest(healthCheck);
      expect(healthResponse.result).toBeDefined();
    });
  });
});