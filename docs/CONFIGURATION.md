# Configuration Reference

This document provides detailed information about configuring the MCP Azure Deployment Service.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Configuration Profiles](#configuration-profiles)
- [Azure Service Principal Setup](#azure-service-principal-setup)
- [Regional Configuration](#regional-configuration)
- [Security Settings](#security-settings)
- [Logging Configuration](#logging-configuration)
- [Validation Rules](#validation-rules)

## Environment Variables

### Required Variables

#### AZURE_SUBSCRIPTION_ID
- **Type**: UUID (v4 format)
- **Description**: Azure subscription identifier
- **Example**: `a1b2c3d4-e5f6-7890-abcd-123456789012`
- **Validation**: Must be a valid UUID v4 format

#### AZURE_TENANT_ID
- **Type**: UUID (v4 format)
- **Description**: Azure Active Directory tenant identifier
- **Example**: `f1e2d3c4-b5a6-7890-cdef-234567890123`
- **Validation**: Must be a valid UUID v4 format

#### AZURE_CLIENT_ID
- **Type**: UUID (v4 format)
- **Description**: Service principal application (client) ID
- **Example**: `9f8e7d6c-5b4a-3210-fedc-345678901234`
- **Validation**: Must be a valid UUID v4 format

#### AZURE_CLIENT_SECRET
- **Type**: String
- **Description**: Service principal client secret
- **Example**: `MySecretValue123!`
- **Validation**: Must be non-empty string
- **Security**: Stored securely, never logged

### Optional Variables

#### AZURE_DEFAULT_REGION
- **Type**: String
- **Default**: `eastus`
- **Description**: Default Azure region for deployments
- **Example**: `westus2`, `centralus`, `northeurope`
- **Validation**: Must be a valid Azure region name

#### AZURE_RESOURCE_GROUP_PREFIX
- **Type**: String
- **Default**: `mcp-rg`
- **Description**: Prefix for auto-created resource groups
- **Example**: `production-rg`, `dev-resources`
- **Validation**: Must follow Azure resource naming conventions

#### AZURE_ENVIRONMENT
- **Type**: String
- **Default**: `development`
- **Options**: `development`, `staging`, `production`
- **Description**: Environment identifier for resource tagging

#### LOG_LEVEL
- **Type**: String
- **Default**: `info`
- **Options**: `error`, `warn`, `info`, `debug`
- **Description**: Logging verbosity level

## Configuration Profiles

The service supports multiple configuration profiles for different environments and scenarios.

### Profile Structure

```typescript
interface AzureConfiguration {
  subscriptionId: string;     // Azure subscription UUID
  tenantId: string;          // Azure tenant UUID
  clientId: string;          // Service principal client UUID
  clientSecret: string;      // Service principal secret
  defaultRegion: string;     // Default deployment region
  resourceGroupPrefix: string; // Resource group naming prefix
  environment?: string;      // Environment identifier
  tags?: Record<string, string>; // Default resource tags
}
```

### Managing Profiles

#### Add New Profile

```typescript
import { ConfigurationManager } from './src/config';

const configManager = ConfigurationManager.getInstance();

configManager.addProfile('production', {
  subscriptionId: 'prod-subscription-id',
  tenantId: 'prod-tenant-id',
  clientId: 'prod-client-id',
  clientSecret: 'prod-client-secret',
  defaultRegion: 'eastus',
  resourceGroupPrefix: 'prod-rg',
  environment: 'production',
  tags: {
    Environment: 'Production',
    ManagedBy: 'MCP-Azure-Service'
  }
});
```

#### Switch Active Profile

```typescript
// List available profiles
const profiles = configManager.getAvailableProfiles();
console.log('Available profiles:', profiles);

// Switch to production profile
configManager.setActiveProfile('production');

// Verify active profile
const activeProfile = configManager.getActiveProfile();
console.log('Active profile:', activeProfile);
```

#### Remove Profile

```typescript
// Remove staging profile (cannot remove 'default' profile)
configManager.removeProfile('staging');
```

### Profile-Based Environment Files

You can create separate environment files for different profiles:

#### .env.development
```env
AZURE_SUBSCRIPTION_ID=dev-subscription-id
AZURE_TENANT_ID=dev-tenant-id
AZURE_CLIENT_ID=dev-client-id
AZURE_CLIENT_SECRET=dev-client-secret
AZURE_DEFAULT_REGION=westus2
AZURE_RESOURCE_GROUP_PREFIX=dev-rg
AZURE_ENVIRONMENT=development
LOG_LEVEL=debug
```

#### .env.production
```env
AZURE_SUBSCRIPTION_ID=prod-subscription-id
AZURE_TENANT_ID=prod-tenant-id
AZURE_CLIENT_ID=prod-client-id
AZURE_CLIENT_SECRET=prod-client-secret
AZURE_DEFAULT_REGION=eastus
AZURE_RESOURCE_GROUP_PREFIX=prod-rg
AZURE_ENVIRONMENT=production
LOG_LEVEL=info
```

## Azure Service Principal Setup

### Creating a Service Principal

#### Using Azure CLI

```bash
# Create service principal with Contributor role
az ad sp create-for-rbac --name "mcp-azure-deployment-sp" \\
  --role "Contributor" \\
  --scopes "/subscriptions/{subscription-id}"

# Output:
# {
#   "appId": "12345678-1234-1234-1234-123456789012",
#   "displayName": "mcp-azure-deployment-sp",
#   "name": "http://mcp-azure-deployment-sp",
#   "password": "your-client-secret",
#   "tenant": "87654321-4321-4321-4321-210987654321"
# }
```

#### Using Azure PowerShell

```powershell
# Create service principal
$sp = New-AzADServicePrincipal -DisplayName "mcp-azure-deployment-sp"

# Assign Contributor role
New-AzRoleAssignment -ObjectId $sp.Id \\
  -RoleDefinitionName "Contributor" \\
  -Scope "/subscriptions/{subscription-id}"

# Display credentials
$sp | Select-Object DisplayName, Id, AppId
```

### Required Permissions

The service principal needs the following permissions:

#### Subscription Level
- **Contributor**: For creating and managing resources
- **Storage Blob Data Contributor**: For frontend deployments
- **Key Vault Contributor**: For certificate management

#### Resource Group Level
- **Owner**: If creating resource groups dynamically
- **Contributor**: For resource management within existing RGs

#### Specific Resources
- **Virtual Machine Contributor**: For VM deployments
- **Website Contributor**: For web app deployments
- **SQL DB Contributor**: For database deployments

### Permission Verification

```typescript
import { AzureClientManager } from './src/services/azure-client';

const azureClient = AzureClientManager.getInstance();

// Check subscription access
try {
  const subscription = await azureClient.resourceClient.subscriptions.get(
    process.env.AZURE_SUBSCRIPTION_ID!
  );
  console.log('Subscription access: OK');
} catch (error) {
  console.error('Subscription access: FAILED', error.message);
}

// Check resource group access
try {
  const resourceGroups = await azureClient.resourceClient.resourceGroups.list();
  console.log('Resource group access: OK');
} catch (error) {
  console.error('Resource group access: FAILED', error.message);
}
```

## Regional Configuration

### Supported Azure Regions

The service supports all Azure public cloud regions. Common regions include:

#### Americas
- `eastus` - East US
- `eastus2` - East US 2
- `centralus` - Central US
- `westus` - West US
- `westus2` - West US 2
- `canadacentral` - Canada Central
- `brazilsouth` - Brazil South

#### Europe
- `northeurope` - North Europe
- `westeurope` - West Europe
- `uksouth` - UK South
- `francecentral` - France Central
- `germanywestcentral` - Germany West Central

#### Asia Pacific
- `eastasia` - East Asia
- `southeastasia` - Southeast Asia
- `japaneast` - Japan East
- `australiaeast` - Australia East
- `centralindia` - Central India

### Region Selection Strategy

```typescript
interface RegionConfig {
  primary: string;      // Primary deployment region
  secondary?: string;   // Failover region
  dataResidency?: {     // Data residency requirements
    allowedRegions: string[];
    restrictedRegions: string[];
  };
  performanceZones?: {  // Performance optimization
    region: string;
    latencyTarget: number; // ms
  }[];
}
```

### Availability Zone Support

```typescript
interface AvailabilityZoneConfig {
  enabled: boolean;
  zones: number[];      // [1, 2, 3] for 3-zone deployment
  crossZoneLoadBalancing: boolean;
  zoneRedundantStorage: boolean;
}
```

## Security Settings

### Credential Security

#### Environment Variable Encryption
```bash
# Using Azure Key Vault for credential storage
export AZURE_CLIENT_SECRET="@Microsoft.KeyVault(SecretUri=https://vault.vault.azure.net/secrets/client-secret/)"
```

#### Managed Identity Support
```typescript
interface ManagedIdentityConfig {
  enabled: boolean;
  clientId?: string;    // User-assigned identity client ID
  resourceId?: string;  // User-assigned identity resource ID
}
```

### Network Security

#### Virtual Network Integration
```typescript
interface NetworkSecurityConfig {
  virtualNetworkIntegration: {
    enabled: boolean;
    vnetId: string;
    subnetId: string;
  };
  privateEndpoints: {
    enabled: boolean;
    allowedServices: string[];
  };
  publicAccess: {
    enabled: boolean;
    allowedIpRanges: string[];
  };
}
```

#### Firewall Configuration
```typescript
interface FirewallConfig {
  enableApplicationGateway: boolean;
  enableWebApplicationFirewall: boolean;
  ddosProtection: boolean;
  customRules: {
    name: string;
    priority: number;
    action: 'Allow' | 'Deny' | 'Block';
    conditions: {
      matchVariable: string;
      operator: string;
      value: string;
    }[];
  }[];
}
```

## Logging Configuration

### Log Levels

#### ERROR
- Authentication failures
- Deployment failures
- Critical system errors

#### WARN
- Deprecated feature usage
- Performance degradation
- Resource quota warnings

#### INFO
- Deployment start/completion
- Configuration changes
- Profile switches

#### DEBUG
- Request/response details
- Azure SDK interactions
- Performance metrics

### Log Format Configuration

```typescript
interface LogConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'simple' | 'structured';
  outputs: {
    console: boolean;
    file?: {
      enabled: boolean;
      path: string;
      maxSize: string;      // '10MB'
      maxFiles: number;
    };
    azureMonitor?: {
      enabled: boolean;
      workspaceId: string;
      connectionString: string;
    };
  };
  sensitiveDataMasking: {
    enabled: boolean;
    patterns: string[];     // RegExp patterns to mask
  };
}
```

### Structured Logging Example

```typescript
import { logger } from './src/utils/logger';

// INFO level logging
logger.info('Deployment started', {
  operation: 'azure.deployBackend',
  resourceGroup: 'production-rg',
  region: 'eastus',
  requestId: 'req-12345',
  userId: 'user-67890'
});

// ERROR level logging
logger.error('Deployment failed', {
  operation: 'azure.deployBackend',
  error: 'Authentication failed',
  errorCode: 'AUTH_001',
  requestId: 'req-12345',
  duration: 1234
});
```

## Validation Rules

### Configuration Validation Schema

The service uses Joi schema validation for all configuration parameters:

```typescript
import Joi from 'joi';

const configSchema = Joi.object({
  subscriptionId: Joi.string().guid({ version: 'uuidv4' }).required(),
  tenantId: Joi.string().guid({ version: 'uuidv4' }).required(),
  clientId: Joi.string().guid({ version: 'uuidv4' }).required(),
  clientSecret: Joi.string().min(1).required(),
  defaultRegion: Joi.string().min(3).max(50).default('eastus'),
  resourceGroupPrefix: Joi.string().pattern(/^[a-zA-Z0-9-_]+$/).max(50).default('mcp-rg'),
  environment: Joi.string().valid('development', 'staging', 'production').default('development'),
  tags: Joi.object().pattern(Joi.string(), Joi.string()).optional()
});
```

### Parameter Validation Rules

#### Resource Names
- Must contain only alphanumeric characters, hyphens, and underscores
- Length: 1-64 characters
- Cannot start or end with hyphen
- Must be unique within resource group

#### Region Names
- Must be a valid Azure region identifier
- Case-insensitive matching
- Support for region display names and identifiers

#### Resource Group Names
- Must contain only alphanumeric characters, periods, underscores, hyphens, and parentheses
- Length: 1-90 characters
- Cannot end with period

### Custom Validation Functions

```typescript
import { validateAzureResourceName, validateRegion } from './src/utils/validation';

// Validate resource name
const isValidName = validateAzureResourceName('my-web-app-01');
// Returns: { valid: true, errors: [] }

// Validate region
const isValidRegion = validateRegion('eastus');
// Returns: { valid: true, region: 'eastus', displayName: 'East US' }

// Validate with custom rules
const customValidation = validateAzureResourceName('my_resource', {
  allowUnderscore: true,
  maxLength: 20,
  pattern: /^[a-z][a-z0-9_-]*$/
});
```

## Configuration Testing

### Validation Testing

```bash
# Test current configuration
npm run test:config

# Test specific profile
AZURE_PROFILE=production npm run test:config

# Validate all profiles
npm run validate:profiles
```

### Configuration Dry Run

```typescript
import { ConfigurationManager } from './src/config';
import { AzureOperations } from './src/tools/azure-operations';

const configManager = ConfigurationManager.getInstance();
const azureOps = new AzureOperations();

// Test configuration without making actual deployments
async function testConfiguration() {
  try {
    // Validate configuration
    const config = configManager.getConfig();
    console.log('✅ Configuration valid');
    
    // Test Azure connectivity
    await azureOps.testConnectivity();
    console.log('✅ Azure connectivity OK');
    
    // Test permissions
    await azureOps.testPermissions();
    console.log('✅ Azure permissions OK');
    
  } catch (error) {
    console.error('❌ Configuration test failed:', error.message);
  }
}

testConfiguration();
```

---

For troubleshooting configuration issues, see the [Troubleshooting Guide](./TROUBLESHOOTING.md).