/**
 * Unit tests for Azure configuration management
 */

import { ConfigurationManager } from '../src/config/index.js';

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;

  beforeEach(() => {
    // Reset the singleton instance for each test
    (ConfigurationManager as any).instance = undefined;
    configManager = ConfigurationManager.getInstance();
  });

  describe('Configuration Loading', () => {
    it('should load configuration from environment variables', () => {
      const config = configManager.getConfig();
      
      expect(config).toBeDefined();
      expect(config.subscriptionId).toBe('fecfa029-a413-44f1-a0fd-459af3be0e4a');
      expect(config.tenantId).toBe('b412990c-449e-48df-8b1d-4df89f514bcd');
      expect(config.clientId).toBe('a8cea694-92f8-44b5-8397-d72e6d5651cc');
      expect(config.clientSecret).toBe('test-client-secret-value');
    });

    it('should use default values for optional fields', () => {
      const config = configManager.getConfig();
      
      expect(config.defaultRegion).toBe('eastus');
      expect(config.resourceGroupPrefix).toBe('mcp-rg');
      expect(config.environment).toBe('AzureCloud');
    });

    it('should validate required fields', () => {
      // Reset environment variables temporarily
      const originalEnv = process.env;
      process.env = { ...originalEnv };
      delete process.env['AZURE_SUBSCRIPTION_ID'];
      
      expect(() => {
        (ConfigurationManager as any).instance = undefined;
        ConfigurationManager.getInstance();
      }).toThrow('Configuration validation failed');
      
      // Restore environment
      process.env = originalEnv;
    });
  });

  describe('Profile Management', () => {
    it('should list available profiles', () => {
      const profiles = configManager.getAvailableProfiles();
      expect(profiles).toContain('default');
    });

    it('should get active profile name', () => {
      const activeProfile = configManager.getActiveProfile();
      expect(activeProfile).toBe('default');
    });

    it('should add new profile', () => {
      const newProfileConfig = {
        subscriptionId: '9ee5afef-3bcf-4916-a3d2-88401ffbf98f',
        tenantId: '35f76813-c8b9-4598-a42d-ca81fa3f9bee',
        clientId: '83fea0a4-4489-4f6e-a612-c977693236f6',
        clientSecret: 'new-test-client-secret',
        defaultRegion: 'westus2',
        resourceGroupPrefix: 'test-rg'
      };

      configManager.addProfile('test', newProfileConfig);
      const profiles = configManager.getAvailableProfiles();
      
      expect(profiles).toContain('test');
    });

    it('should switch between profiles', () => {
      // Add test profile first
      const newProfileConfig = {
        subscriptionId: 'b5c861f3-7b2b-4982-a4d9-c3b9df7f5a52',
        tenantId: '2c44e4a3-9b51-4e7b-b8c7-f6d9e2a8c5b4',
        clientId: 'a8f3d6c2-1e9b-4a7d-9c2f-8e5b7a3d6c19',
        clientSecret: 'new-test-client-secret',
        defaultRegion: 'westus2',
        resourceGroupPrefix: 'test-rg'
      };

      configManager.addProfile('test', newProfileConfig);
      configManager.setActiveProfile('test');
      
      const activeProfile = configManager.getActiveProfile();
      const config = configManager.getConfig();
      
      expect(activeProfile).toBe('test');
      expect(config.subscriptionId).toBe('b5c861f3-7b2b-4982-a4d9-c3b9df7f5a52');
    });

    it('should remove profile', () => {
      const newProfileConfig = {
        subscriptionId: '7d8e9f10-11a2-4b3c-8d4e-5f6a7b8c9d0e',
        tenantId: 'f1e2d3c4-b5a6-4978-9e8d-7c6b5a4f3e2d',
        clientId: '0bb144b2-db64-456b-bd8a-6817f86d47a2',
        clientSecret: 'temp-client-secret'
      };

      configManager.addProfile('temp', newProfileConfig);
      expect(configManager.getAvailableProfiles()).toContain('temp');
      
      configManager.removeProfile('temp');
      expect(configManager.getAvailableProfiles()).not.toContain('temp');
    });

    it('should not allow removing default profile', () => {
      expect(() => {
        configManager.removeProfile('default');
      }).toThrow('Cannot remove default profile');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate configuration format', async () => {
      const result = await configManager.testConfiguration();
      expect(result.valid).toBe(true);
    });

    it('should return config summary without sensitive data', () => {
      const summary = configManager.getConfigSummary();
      
      expect(summary.subscriptionId).toBe('fecfa029-a413-44f1-a0fd-459af3be0e4a');
      expect(summary.tenantId).toBe('b412990c-449e-48df-8b1d-4df89f514bcd');
      expect(summary.clientIdPresent).toBe(true);
      expect(summary.clientSecretPresent).toBe(true);
      expect(summary.activeProfile).toBe('default');
      
      // Sensitive data should not be present
      expect(summary.clientId).toBeUndefined();
      expect(summary.clientSecret).toBeUndefined();
    });
  });

  describe('Configuration File Loading', () => {
    it('should load valid profiles from config.json file', () => {
      const fs = require('fs');
      const originalExistsSync = fs.existsSync;
      const originalReadFileSync = fs.readFileSync;
      
      // Mock file exists with valid profile configuration
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
        profiles: [
          {
            name: 'test-profile',
            config: {
              subscriptionId: 'fecfa029-a413-44f1-a0fd-459af3be0e4a',
              tenantId: 'b412990c-449e-48df-8b1d-4df89f514bcd', 
              clientId: 'a8cea694-92f8-44b5-8397-d72e6d5651cc',
              clientSecret: 'test-client-secret'
            }
          }
        ]
      }));
      
      expect(() => {
        // Reset singleton and create new instance with mocked fs
        (ConfigurationManager as any).instance = undefined;
        const manager = ConfigurationManager.getInstance();
        const profiles = manager.getAvailableProfiles();
        expect(profiles).toContain('test-profile');
      }).not.toThrow();
      
      // Restore mocks
      fs.existsSync = originalExistsSync;
      fs.readFileSync = originalReadFileSync;
    });

    it('should handle malformed config.json file gracefully', () => {
      const fs = require('fs');
      const originalExistsSync = fs.existsSync;
      const originalReadFileSync = fs.readFileSync;
      
      // Mock file exists but has invalid JSON
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue('invalid json content');
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      expect(() => {
        // Reset singleton and create new instance with mocked fs
        (ConfigurationManager as any).instance = undefined;
        ConfigurationManager.getInstance();
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load config.json'));
      
      // Restore mocks
      fs.existsSync = originalExistsSync;
      fs.readFileSync = originalReadFileSync;
      consoleSpy.mockRestore();
    });
  });

  describe('Additional Error Handling', () => {
    it('should handle getProfileConfig with nonexistent profile', () => {
      const configManager = ConfigurationManager.getInstance();
      
      expect(() => configManager.getProfileConfig('nonexistent-profile')).toThrow("Profile 'nonexistent-profile' not found");
    });

    it('should handle setActiveProfile with nonexistent profile', () => {
      const configManager = ConfigurationManager.getInstance();
      
      expect(() => configManager.setActiveProfile('nonexistent-profile')).toThrow("Profile 'nonexistent-profile' not found");
    });

    it('should handle profile operations with various names', () => {
      const configManager = ConfigurationManager.getInstance();
      
      const profileConfig = {
        subscriptionId: 'a1b2c3d4-e5f6-4789-b123-567890abcdef',
        tenantId: 'f1e2d3c4-b5a6-4789-a123-567890abcdef', 
        clientId: '12345678-90ab-4def-9234-567890abcdef',
        clientSecret: 'test-secret',
        defaultRegion: 'westus2',
        resourceGroupPrefix: 'rg-prod'
      };
      
      configManager.addProfile('production-west', profileConfig);
      configManager.setActiveProfile('production-west');
      
      const activeConfig = configManager.getConfig();
      expect(activeConfig.subscriptionId).toBe(profileConfig.subscriptionId);
      expect(configManager.getActiveProfile()).toBe('production-west');
    });

    it('should handle multiple profile switches', () => {
      const configManager = ConfigurationManager.getInstance();
      
      const profile1 = {
        subscriptionId: '11111111-2222-4333-b444-555555555555',
        tenantId: 'aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee', 
        clientId: 'cccccccc-dddd-4eee-afff-000000000000',
        clientSecret: 'secret1',
        defaultRegion: 'eastus',
        resourceGroupPrefix: 'rg-dev'
      };
      
      const profile2 = {
        subscriptionId: '66666666-7777-4888-a999-aaaaaaaaaaaa',
        tenantId: 'ffffffff-0000-4111-a222-333333333333',
        clientId: 'bbbbbbbb-cccc-4ddd-aeee-ffffffffffff',
        clientSecret: 'secret2',
        defaultRegion: 'westus',
        resourceGroupPrefix: 'rg-staging'
      };
      
      configManager.addProfile('dev', profile1);
      configManager.addProfile('staging', profile2);
      
      configManager.setActiveProfile('dev');
      expect(configManager.getConfig().resourceGroupPrefix).toBe('rg-dev');
      
      configManager.setActiveProfile('staging');
      expect(configManager.getConfig().resourceGroupPrefix).toBe('rg-staging');
    });

    it('should handle config summary generation with multiple profiles', () => {
      const configManager = ConfigurationManager.getInstance();
      
      const summary = configManager.getConfigSummary();
      
      expect(typeof summary).toBe('object');
      expect(summary).toHaveProperty('activeProfile');
      expect(summary).toHaveProperty('availableProfiles');
      expect(Array.isArray(summary.availableProfiles)).toBe(true);
    });

    it('should handle testConfiguration method', async () => {
      const configManager = ConfigurationManager.getInstance();
      
      // Test with current config (should have valid format from test setup)
      const currentResult = await configManager.testConfiguration();
      expect(currentResult).toHaveProperty('valid');
      expect(typeof currentResult.valid).toBe('boolean');
      
      // Test with completely invalid profile  
      const invalidProfile = {
        subscriptionId: 'invalid-uuid',
        tenantId: 'invalid-uuid',
        clientId: 'invalid-uuid', 
        clientSecret: 'test-secret',
        defaultRegion: 'eastus',
        resourceGroupPrefix: 'test-rg'
      };
      
      // This should fail validation during addProfile
      expect(() => configManager.addProfile('invalid-test', invalidProfile)).toThrow();
      
      // Test with valid profile
      const validProfile = {
        subscriptionId: '12345678-1234-4234-b234-123456789012',
        tenantId: '87654321-4321-4321-a321-210987654321',
        clientId: '11111111-1111-4111-a111-111111111111',
        clientSecret: 'valid-secret',
        defaultRegion: 'eastus',
        resourceGroupPrefix: 'test-rg'
      };
      
      configManager.addProfile('valid-test', validProfile);
      const validResult = await configManager.testConfiguration('valid-test');
      expect(validResult).toHaveProperty('valid');
      expect(typeof validResult.valid).toBe('boolean');
    });
  });
});