#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import { ConfigurationManager } from '../src/config/index.js';
import { AzureClientManager } from '../src/services/azure-client.js';

/**
 * Script to test Azure credentials and connectivity
 */

// Load environment variables
dotenv.config();

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  duration: number;
  details?: any;
}

class CredentialTester {
  private results: TestResult[] = [];

  public async runAll(): Promise<boolean> {
    console.log('🔐 Testing Azure Credentials and Connectivity\\n');

    await this.testConfiguration();
    await this.testAuthentication();
    await this.testSubscriptionAccess();
    await this.testResourceListing();
    await this.testRegionValidation();
    
    this.printResults();
    return this.allTestsPassed();
  }

  private async runTest<T>(
    name: string, 
    testFn: () => Promise<T>
  ): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      console.log(`⏳ ${name}...`);
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        name,
        success: true,
        message: 'Success',
        duration,
        details: result
      });
      
      console.log(`✅ ${name} (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      this.results.push({
        name,
        success: false,
        message,
        duration
      });
      
      console.log(`❌ ${name} (${duration}ms): ${message}`);
      return null;
    }
  }

  private async testConfiguration(): Promise<void> {
    await this.runTest('Configuration Loading', async () => {
      const config = ConfigurationManager.getInstance();
      const azureConfig = config.getConfig();
      
      // Validate required fields
      if (!azureConfig.subscriptionId) throw new Error('Missing AZURE_SUBSCRIPTION_ID');
      if (!azureConfig.tenantId) throw new Error('Missing AZURE_TENANT_ID');
      if (!azureConfig.clientId) throw new Error('Missing AZURE_CLIENT_ID');
      if (!azureConfig.clientSecret) throw new Error('Missing AZURE_CLIENT_SECRET');
      
      return {
        subscriptionId: azureConfig.subscriptionId.substring(0, 8) + '...',
        tenantId: azureConfig.tenantId.substring(0, 8) + '...',
        clientId: azureConfig.clientId.substring(0, 8) + '...',
        region: azureConfig.defaultRegion
      };
    });
  }

  private async testAuthentication(): Promise<void> {
    await this.runTest('Azure Authentication', async () => {
      const config = ConfigurationManager.getInstance();
      const azureConfig = config.getConfig();
      
      const client = new AzureClientManager(azureConfig);
      
      // Test connection - this will verify authentication
      const connectionResult = await client.testConnection();
      
      if (!connectionResult.success) {
        throw new Error(`Authentication failed: ${connectionResult.error}`);
      }
      
      return {
        authenticated: true,
        timestamp: new Date().toISOString()
      };
    });
  }

  private async testSubscriptionAccess(): Promise<void> {
    await this.runTest('Subscription Access', async () => {
      const config = ConfigurationManager.getInstance();
      const azureConfig = config.getConfig();
      const client = new AzureClientManager(azureConfig);
      
      // Try to list resources to verify subscription access
      const resources = await client.getAllComputeResources();
      
      return {
        subscriptionAccessible: true,
        resourceCount: resources.length,
        subscriptionId: azureConfig.subscriptionId.substring(0, 8) + '...'
      };
    });
  }

  private async testResourceListing(): Promise<void> {
    await this.runTest('Resource Discovery', async () => {
      const config = ConfigurationManager.getInstance();
      const azureConfig = config.getConfig();
      const client = new AzureClientManager(azureConfig);
      
      const resources = await client.getAllComputeResources();
      
      // Group resources by type
      const resourceTypes: Record<string, number> = {};
      resources.forEach(resource => {
        const type = resource.type || 'Unknown';
        resourceTypes[type] = (resourceTypes[type] || 0) + 1;
      });
      
      return {
        totalResources: resources.length,
        resourceTypes,
        regions: [...new Set(resources.map(r => r.location).filter(Boolean))]
      };
    });
  }

  private async testRegionValidation(): Promise<void> {
    await this.runTest('Region Validation', async () => {
      const config = ConfigurationManager.getInstance();
      const azureConfig = config.getConfig();
      
      const validRegions = [
        'eastus', 'eastus2', 'westus', 'westus2', 'centralus',
        'northeurope', 'westeurope', 'uksouth', 'australiaeast'
      ];
      
      const defaultRegion = azureConfig.defaultRegion;
      const isValidRegion = validRegions.includes(defaultRegion);
      
      if (!isValidRegion) {
        throw new Error(`Region '${defaultRegion}' may not be valid. Common regions: ${validRegions.slice(0, 3).join(', ')}`);
      }
      
      return {
        defaultRegion,
        isValid: isValidRegion,
        commonRegions: validRegions.slice(0, 5)
      };
    });
  }

  private allTestsPassed(): boolean {
    return this.results.every(result => result.success);
  }

  private printResults(): void {
    console.log('\\n' + '='.repeat(70));
    console.log('🔐 CREDENTIAL TEST RESULTS');
    console.log('='.repeat(70));

    this.results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      const status = result.success ? 'PASS' : 'FAIL';
      
      console.log(`${icon} ${result.name.padEnd(25)} ${status.padEnd(8)} (${result.duration}ms)`);
      
      if (!result.success) {
        console.log(`   └─ Error: ${result.message}`);
      } else if (result.details && typeof result.details === 'object') {
        // Show some key details
        if (result.details.subscriptionId) {
          console.log(`   └─ Subscription: ${result.details.subscriptionId}`);
        }
        if (result.details.region) {
          console.log(`   └─ Region: ${result.details.region}`);
        }
        if (result.details.resourceCount !== undefined) {
          console.log(`   └─ Resources found: ${result.details.resourceCount}`);
        }
        if (result.details.defaultRegion) {
          console.log(`   └─ Default region: ${result.details.defaultRegion}`);
        }
      }
    });

    const passCount = this.results.filter(r => r.success).length;
    const failCount = this.results.filter(r => r.success === false).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log('\\n' + '='.repeat(70));
    console.log(`📊 Summary: ${passCount} passed, ${failCount} failed (total: ${totalDuration}ms)`);

    if (this.allTestsPassed()) {
      console.log('\\n🎉 All credential tests PASSED! Azure connectivity is working.');
      console.log('\\n📚 Next steps:');
      console.log('   1. Run health check: npm run health-check');
      console.log('   2. Try sample deployment: npm run sample-deploy');
      console.log('   3. Start the MCP server: npm start');
    } else {
      console.log('\\n❌ Some credential tests FAILED! Please check your configuration.');
      console.log('\\n🔧 Troubleshooting:');
      console.log('   1. Verify credentials in .env file');
      console.log('   2. Check Azure subscription permissions');
      console.log('   3. Validate configuration: npm run validate-config');
      console.log('   4. Visit: https://portal.azure.com to check your account');
    }

    console.log('\\n💡 Tips:');
    console.log('   • Ensure your Azure account has Contributor access');
    console.log('   • Check that your subscription is active');
    console.log('   • Verify the service principal has proper permissions');
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new CredentialTester();
  tester.runAll()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Credential test failed:', error);
      process.exit(1);
    });
}

export { CredentialTester };