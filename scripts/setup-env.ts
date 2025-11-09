#!/usr/bin/env tsx

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';

/**
 * Interactive setup script for environment configuration
 */

interface SetupPrompt {
  key: string;
  name: string;
  description: string;
  required: boolean;
  validator?: (value: string) => boolean | string;
  defaultValue?: string;
}

class EnvironmentSetup {
  private rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  private envValues: Record<string, string> = {};

  private prompts: SetupPrompt[] = [
    {
      key: 'AZURE_SUBSCRIPTION_ID',
      name: 'Azure Subscription ID',
      description: 'Your Azure subscription UUID (found in Azure Portal)',
      required: true,
      validator: (value) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(value) || 'Must be a valid UUID format';
      }
    },
    {
      key: 'AZURE_TENANT_ID',
      name: 'Azure Tenant ID',
      description: 'Your Azure AD tenant UUID (found in Azure Portal > Azure Active Directory)',
      required: true,
      validator: (value) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(value) || 'Must be a valid UUID format';
      }
    },
    {
      key: 'AZURE_CLIENT_ID',
      name: 'Azure Client ID',
      description: 'Service Principal Application (client) ID',
      required: true,
      validator: (value) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(value) || 'Must be a valid UUID format';
      }
    },
    {
      key: 'AZURE_CLIENT_SECRET',
      name: 'Azure Client Secret',
      description: 'Service Principal secret value',
      required: true,
      validator: (value) => value.length > 0 || 'Cannot be empty'
    },
    {
      key: 'AZURE_DEFAULT_REGION',
      name: 'Default Azure Region',
      description: 'Default region for resource deployment',
      required: false,
      defaultValue: 'eastus',
      validator: (value) => {
        const validRegions = ['eastus', 'eastus2', 'westus', 'westus2', 'centralus', 'northeurope', 'westeurope'];
        return validRegions.includes(value) || `Must be one of: ${validRegions.join(', ')}`;
      }
    },
    {
      key: 'AZURE_RESOURCE_GROUP_PREFIX',
      name: 'Resource Group Prefix',
      description: 'Prefix for auto-generated resource group names',
      required: false,
      defaultValue: 'mcp-rg'
    },
    {
      key: 'LOG_LEVEL',
      name: 'Log Level',
      description: 'Logging verbosity level',
      required: false,
      defaultValue: 'info',
      validator: (value) => {
        const levels = ['error', 'warn', 'info', 'debug', 'verbose'];
        return levels.includes(value) || `Must be one of: ${levels.join(', ')}`;
      }
    }
  ];

  public async run(): Promise<void> {
    console.log('🛠️  MCP Azure Deployment Service - Environment Setup\\n');
    console.log('This will help you configure your Azure credentials and settings.\\n');

    await this.checkExistingEnv();
    await this.showCredentialGuidance();
    await this.collectConfiguration();
    await this.writeEnvFile();
    await this.showNextSteps();

    this.rl.close();
  }

  private async checkExistingEnv(): Promise<void> {
    const envPath = join(process.cwd(), '.env');
    const envExamplePath = join(process.cwd(), '.env.example');

    if (existsSync(envPath)) {
      console.log('ℹ️  Found existing .env file.');
      const overwrite = await this.askQuestion('Do you want to overwrite it? (y/N): ');
      
      if (!overwrite.toLowerCase().startsWith('y')) {
        console.log('Setup cancelled. Existing .env file preserved.');
        process.exit(0);
      }
    }

    if (existsSync(envExamplePath)) {
      console.log('✅ Found .env.example template\\n');
    } else {
      console.log('⚠️  .env.example template not found\\n');
    }
  }

  private async showCredentialGuidance(): Promise<void> {
    console.log('📋 Before we start, you\'ll need:');
    console.log('');
    console.log('1. 🏢 Azure Subscription:');
    console.log('   • Active Azure subscription');
    console.log('   • Subscription ID (found in Azure Portal)');
    console.log('');
    console.log('2. 🔐 Service Principal:');
    console.log('   • App registration in Azure AD');
    console.log('   • Client ID and Client Secret');
    console.log('   • Contributor permissions on subscription');
    console.log('');
    console.log('3. 🌍 Azure AD Tenant:');
    console.log('   • Tenant ID (directory ID)');
    console.log('');
    console.log('📚 Need help? Visit: https://docs.microsoft.com/azure/active-directory/develop/howto-create-service-principal-portal');
    console.log('');

    const ready = await this.askQuestion('Ready to continue? (Y/n): ');
    if (ready.toLowerCase().startsWith('n')) {
      console.log('Setup cancelled.');
      process.exit(0);
    }
    console.log('');
  }

  private async collectConfiguration(): Promise<void> {
    console.log('🔧 Configuration Setup\\n');

    for (const prompt of this.prompts) {
      await this.handlePrompt(prompt);
    }
  }

  private async handlePrompt(prompt: SetupPrompt): Promise<void> {
    console.log(`${prompt.name}:`);
    console.log(`   ${prompt.description}`);
    
    if (prompt.defaultValue) {
      console.log(`   Default: ${prompt.defaultValue}`);
    }

    let isValid = false;
    let value = '';

    while (!isValid) {
      const required = prompt.required ? ' (required)' : '';
      const defaultHint = prompt.defaultValue ? ` [${prompt.defaultValue}]` : '';
      
      value = await this.askQuestion(`   Enter value${required}${defaultHint}: `);

      // Use default if empty and default exists
      if (!value && prompt.defaultValue) {
        value = prompt.defaultValue;
      }

      // Check if required
      if (prompt.required && !value) {
        console.log('   ❌ This field is required');
        continue;
      }

      // Skip validation if empty and not required
      if (!value && !prompt.required) {
        isValid = true;
        break;
      }

      // Run validator if provided
      if (prompt.validator) {
        const validation = prompt.validator(value);
        if (validation !== true) {
          console.log(`   ❌ ${validation}`);
          continue;
        }
      }

      isValid = true;
    }

    if (value) {
      this.envValues[prompt.key] = value;
    }

    console.log('   ✅ Saved\\n');
  }

  private async askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  private async writeEnvFile(): Promise<void> {
    console.log('📝 Creating .env file...');

    const envPath = join(process.cwd(), '.env');
    const envExamplePath = join(process.cwd(), '.env.example');

    let envContent = '';

    // Start with template if it exists
    if (existsSync(envExamplePath)) {
      envContent = readFileSync(envExamplePath, 'utf8');
      
      // Replace values in template
      for (const [key, value] of Object.entries(this.envValues)) {
        const pattern = new RegExp(`^${key}=.*$`, 'm');
        const replacement = `${key}=${value}`;
        
        if (pattern.test(envContent)) {
          envContent = envContent.replace(pattern, replacement);
        } else {
          envContent += `\\n${replacement}`;
        }
      }
    } else {
      // Create from scratch
      envContent = '# Azure Configuration\\n';
      for (const [key, value] of Object.entries(this.envValues)) {
        envContent += `${key}=${value}\\n`;
      }
    }

    writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully\\n');
  }

  private async showNextSteps(): Promise<void> {
    console.log('🎉 Setup Complete!\\n');
    console.log('📚 Next steps:');
    console.log('   1. Validate configuration:');
    console.log('      npm run validate-config');
    console.log('');
    console.log('   2. Test Azure credentials:');
    console.log('      npm run test-credentials');
    console.log('');
    console.log('   3. Run health check:');
    console.log('      npm run health-check');
    console.log('');
    console.log('   4. Try a sample deployment:');
    console.log('      npm run sample-deploy');
    console.log('');
    console.log('   5. Start the MCP server:');
    console.log('      npm start');
    console.log('');
    console.log('🔒 Security reminder:');
    console.log('   • Never commit .env file to version control');
    console.log('   • Keep your client secret secure');
    console.log('   • Regularly rotate your credentials');
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new EnvironmentSetup();
  setup.run().catch(error => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
}

export { EnvironmentSetup };