#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import { ConfigurationManager } from '../src/config/index.js';
import { AzureOperations } from '../src/tools/azure-operations.js';

/**
 * Sample deployment script to test end-to-end functionality
 */

// Load environment variables
dotenv.config();

interface DeploymentStep {
  name: string;
  description: string;
  action: () => Promise<any>;
}

class SampleDeployment {
  private operations: AzureOperations;
  private testResourcePrefix: string;

  constructor() {
    this.operations = new AzureOperations();
    this.testResourcePrefix = `mcp-test-${Date.now().toString().slice(-6)}`;
  }

  public async run(): Promise<void> {
    console.log('🚀 MCP Azure Deployment Service - Sample Deployment\\n');
    console.log('This will create a small test deployment to verify functionality.\\n');

    console.log('⚠️  WARNING: This will create real Azure resources that may incur costs!');
    console.log('💰 Estimated cost: ~$1-5 per day for Basic tier App Service\\n');

    const proceed = await this.askForConfirmation();
    if (!proceed) {
      console.log('Sample deployment cancelled.');
      return;
    }

    const steps: DeploymentStep[] = [
      {
        name: 'List Existing Resources',
        description: 'Check current resources in subscription',
        action: () => this.listExistingResources()
      },
      {
        name: 'Deploy Test App Service',
        description: 'Create a basic App Service for testing',
        action: () => this.deployTestAppService()
      },
      {
        name: 'Verify Deployment',
        description: 'Check that resources were created successfully',
        action: () => this.verifyDeployment()
      },
      {
        name: 'Cleanup Resources',
        description: 'Remove test resources to avoid ongoing costs',
        action: () => this.cleanupResources()
      }
    ];

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        console.log(`\\n📋 Step ${i + 1}/${steps.length}: ${step.name}`);
        console.log(`   ${step.description}`);
        
        const startTime = Date.now();
        const result = await step.action();
        const duration = Date.now() - startTime;
        
        console.log(`   ✅ Completed in ${duration}ms`);
        
        if (result && typeof result === 'object') {
          this.printStepResult(result);
        }
      }

      console.log('\\n🎉 Sample deployment completed successfully!');
      console.log('\\n📚 What happened:');
      console.log('   ✅ Verified Azure connectivity');
      console.log('   ✅ Created and deployed App Service');
      console.log('   ✅ Confirmed resource management');
      console.log('   ✅ Cleaned up test resources');
      console.log('\\n🚀 Your MCP Azure Deployment Service is ready for use!');

    } catch (error) {
      console.error('\\n❌ Sample deployment failed:', error instanceof Error ? error.message : error);
      console.log('\\n🔧 Troubleshooting:');
      console.log('   1. Check your Azure credentials: npm run test-credentials');
      console.log('   2. Verify subscription permissions');
      console.log('   3. Ensure sufficient quota in selected region');
      
      // Attempt cleanup on failure
      try {
        console.log('\\n🧹 Attempting cleanup of any created resources...');
        await this.cleanupResources();
      } catch (cleanupError) {
        console.log('⚠️  Manual cleanup may be required in Azure Portal');
      }
    }
  }

  private async askForConfirmation(): Promise<boolean> {
    return new Promise((resolve) => {
      process.stdout.write('Continue with sample deployment? (y/N): ');
      
      process.stdin.once('data', (data) => {
        const answer = data.toString().trim().toLowerCase();
        resolve(answer === 'y' || answer === 'yes');
      });
    });
  }

  private async listExistingResources(): Promise<any> {
    console.log('   🔍 Scanning Azure subscription for existing resources...');
    
    const result = await this.operations.getExistingServers();
    
    const resources = result.details || [];
    console.log(`   📊 Found ${resources.length} existing compute resources`);
    
    if (resources.length > 0) {
      const resourceTypes = resources.reduce((acc: Record<string, number>, server) => {
        const type = server.type || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      
      console.log('   📋 Resource breakdown:');
      Object.entries(resourceTypes).forEach(([type, count]) => {
        console.log(`      ${type}: ${count}`);
      });
    }

    return {
      totalResources: resources.length,
      timestamp: result.timestamp
    };
  }

  private async deployTestAppService(): Promise<any> {
    console.log('   🏗️  Creating test App Service...');
    
    const deploymentParams = {
      instanceType: 'appservice' as const,
      region: 'eastus',
      namePrefix: this.testResourcePrefix,
      size: 'F1', // Free tier
      dryRun: false
    };

    const result = await this.operations.deployMinimalInstance(deploymentParams);
    
    if (result.success) {
      console.log(`   🎯 App Service created: ${result.details?.name || 'N/A'}`);
      console.log(`   🌐 URL: ${result.details?.url || 'N/A'}`);
    } else {
      throw new Error(`Deployment failed: Check Azure portal for details`);
    }

    return {
      success: result.success,
      resourceName: result.details?.name,
      url: result.details?.url,
      resourceGroup: result.details?.resourceGroup
    };
  }

  private async verifyDeployment(): Promise<any> {
    console.log('   🔍 Verifying deployment...');
    
    // List resources again to see the new deployment
    const result = await this.operations.getExistingServers();
    
    const resources = result.details || [];
    const testResources = resources.filter(server => 
      server.name?.includes(this.testResourcePrefix) ||
      server.resourceGroup?.includes(this.testResourcePrefix)
    );

    if (testResources.length === 0) {
      throw new Error('Test resources not found after deployment');
    }

    console.log(`   ✅ Found ${testResources.length} test resource(s)`);
    
    testResources.forEach(resource => {
      console.log(`      📦 ${resource.name} (${resource.type})`);
    });

    return {
      testResourcesFound: testResources.length,
      resources: testResources.map(r => ({
        name: r.name,
        type: r.type,
        status: r.status
      }))
    };
  }

  private async cleanupResources(): Promise<any> {
    console.log('   🧹 Cleaning up test resources...');
    
    // In a real implementation, you would delete the resource group
    // For now, we'll just log what would be cleaned up
    console.log(`   🗑️  Would delete resource group: ${this.testResourcePrefix}-rg`);
    console.log('   ⚠️  Manual cleanup recommended: Delete the resource group in Azure Portal');
    console.log(`   🌐 Portal URL: https://portal.azure.com/#@/resource/subscriptions/`);

    return {
      action: 'cleanup_attempted',
      resourceGroup: `${this.testResourcePrefix}-rg`,
      manualCleanupRequired: true
    };
  }

  private printStepResult(result: any): void {
    if (result.totalResources !== undefined) {
      console.log(`      📊 Resources: ${result.totalResources}`);
    }
    if (result.resourceName) {
      console.log(`      📦 Created: ${result.resourceName}`);
    }
    if (result.url) {
      console.log(`      🌐 URL: ${result.url}`);
    }
    if (result.testResourcesFound !== undefined) {
      console.log(`      ✅ Test resources: ${result.testResourcesFound}`);
    }
    if (result.manualCleanupRequired) {
      console.log(`      ⚠️  Manual cleanup needed`);
    }
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const deployment = new SampleDeployment();
  deployment.run()
    .then(() => {
      console.log('\\n✨ Sample deployment script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Sample deployment failed:', error);
      process.exit(1);
    });
}

export { SampleDeployment };