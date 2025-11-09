#!/usr/bin/env tsx

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { ConfigurationManager } from '../src/config/index.js';

/**
 * Validation script to check Azure configuration setup
 */

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

class ConfigValidator {
  private results: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  public async validate(): Promise<ValidationResult> {
    console.log('🔍 Validating Azure configuration...\n');

    this.checkEnvironmentFile();
    this.checkRequiredVariables();
    this.checkAzureCredentials();
    await this.testConfiguration();
    
    this.printResults();
    return this.results;
  }

  private checkEnvironmentFile(): void {
    const envPath = join(process.cwd(), '.env');
    const envExamplePath = join(process.cwd(), '.env.example');

    if (!existsSync(envPath)) {
      if (existsSync(envExamplePath)) {
        this.results.errors.push('.env file not found. Please copy .env.example to .env and configure it.');
      } else {
        this.results.errors.push('.env file not found and .env.example is missing.');
      }
      return;
    }

    // Load environment variables
    dotenv.config();
    console.log('✅ .env file found');
  }

  private checkRequiredVariables(): void {
    const requiredVars = [
      'AZURE_SUBSCRIPTION_ID',
      'AZURE_TENANT_ID', 
      'AZURE_CLIENT_ID',
      'AZURE_CLIENT_SECRET',
      'AZURE_DEFAULT_REGION'
    ];

    const missingVars = requiredVars.filter(varName => {
      const value = process.env[varName];
      return !value || value === `your-${varName.toLowerCase().replace('azure_', '').replace(/_/g, '-')}-here`;
    });

    if (missingVars.length > 0) {
      this.results.errors.push(`Missing or placeholder values for: ${missingVars.join(', ')}`);
    } else {
      console.log('✅ All required environment variables are set');
    }

    // Check optional variables
    const optionalVars = [
      'AZURE_RESOURCE_GROUP_PREFIX',
      'LOG_LEVEL',
      'NODE_ENV'
    ];

    const missingOptional = optionalVars.filter(varName => !process.env[varName]);
    if (missingOptional.length > 0) {
      this.results.warnings.push(`Optional variables not set: ${missingOptional.join(', ')}`);
    }
  }

  private checkAzureCredentials(): void {
    const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;

    // Basic format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (subscriptionId && !uuidRegex.test(subscriptionId)) {
      this.results.errors.push('AZURE_SUBSCRIPTION_ID is not a valid UUID format');
    }

    if (tenantId && !uuidRegex.test(tenantId)) {
      this.results.errors.push('AZURE_TENANT_ID is not a valid UUID format');
    }

    if (clientId && !uuidRegex.test(clientId)) {
      this.results.errors.push('AZURE_CLIENT_ID is not a valid UUID format');
    }

    const region = process.env.AZURE_DEFAULT_REGION;
    const validRegions = [
      'eastus', 'eastus2', 'westus', 'westus2', 'westus3', 'centralus', 'northcentralus', 'southcentralus',
      'westcentralus', 'canadacentral', 'canadaeast', 'brazilsouth', 'northeurope', 'westeurope',
      'uksouth', 'ukwest', 'francecentral', 'francesouth', 'germanynorth', 'germanywestcentral',
      'norwayeast', 'norwaywest', 'switzerlandnorth', 'switzerlandwest', 'swedencentral', 'swedensouth'
    ];

    if (region && !validRegions.includes(region)) {
      this.results.warnings.push(`AZURE_DEFAULT_REGION '${region}' may not be a valid Azure region`);
    }
  }

  private async testConfiguration(): Promise<void> {
    try {
      console.log('🔧 Testing configuration with Azure SDK...');
      
      const config = ConfigurationManager.getInstance();
      const azureConfig = config.getConfig();
      
      if (azureConfig) {
        console.log('✅ Configuration loaded successfully');
      } else {
        this.results.errors.push('Failed to load Azure configuration');
      }
    } catch (error) {
      this.results.errors.push(`Configuration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private printResults(): void {
    console.log('\\n' + '='.repeat(50));
    console.log('📋 VALIDATION RESULTS');
    console.log('='.repeat(50));

    if (this.results.errors.length === 0 && this.results.warnings.length === 0) {
      console.log('🎉 Configuration validation passed! All settings are correct.');
      this.results.isValid = true;
    } else {
      this.results.isValid = this.results.errors.length === 0;
      
      if (this.results.errors.length > 0) {
        console.log('\\n❌ ERRORS (must be fixed):');
        this.results.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }

      if (this.results.warnings.length > 0) {
        console.log('\\n⚠️  WARNINGS (recommended to fix):');
        this.results.warnings.forEach((warning, index) => {
          console.log(`   ${index + 1}. ${warning}`);
        });
      }

      if (this.results.isValid) {
        console.log('\\n✅ Configuration is valid with warnings');
      } else {
        console.log('\\n❌ Configuration validation failed');
      }
    }

    console.log('\\n📚 Next steps:');
    if (this.results.errors.length > 0) {
      console.log('   1. Fix the errors listed above');
      console.log('   2. Run: npm run validate-config');
      console.log('   3. Test credentials: npm run test-credentials');
    } else {
      console.log('   1. Test Azure credentials: npm run test-credentials');
      console.log('   2. Run health check: npm run health-check');
      console.log('   3. Try sample deployment: npm run sample-deploy');
    }
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ConfigValidator();
  validator.validate()
    .then(result => {
      process.exit(result.isValid ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

export { ConfigValidator };