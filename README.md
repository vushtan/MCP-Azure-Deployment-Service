# MCP Azure Deployment Service

A production-ready Model Context Protocol (MCP) server for Azure cloud deployments. This service provides four core Azure operations through a standardized JSON-RPC interface, enabling seamless integration with MCP-compatible clients.

## 🚀 Features

- **Four Core Azure Operations**:
  - `azure.getExistingServers` - List and filter existing Azure resources
  - `azure.deployMinimalInstance` - Deploy lightweight compute instances
  - `azure.deployBackend` - Deploy backend services with databases
  - `azure.deployFrontend` - Deploy static websites and web applications

- **Production-Ready Architecture**:
  - TypeScript with strict type checking
  - Comprehensive error handling and retry logic
  - Multi-profile configuration management
  - Security-hardened credential handling
  - Structured logging with Winston
  - Input validation with Joi schemas

- **MCP Protocol Compliance**:
  - Full JSON-RPC 2.0 implementation
  - Standard MCP initialization handshake
  - Tool registration and discovery
  - Parameter validation and error reporting

## 📋 Prerequisites

- **Node.js** 18.0 or higher
- **npm** 8.0 or higher
- **Azure Account** with appropriate permissions:
  - Contributor role on target subscription
  - Resource group creation permissions
  - Storage account access (for frontend deployments)

## ⚡ Quick Start (5-Minute Setup)

### 1. Clone and Install

```bash
git clone <repository-url>
cd MCP-Azure-Deployment-Service
npm install
```

### 2. Configure Azure Credentials

Create a `.env` file in the project root:

```env
# Azure Authentication (Required)
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret

# Optional Configuration
AZURE_DEFAULT_REGION=eastus
AZURE_RESOURCE_GROUP_PREFIX=mcp-deployments
AZURE_ENVIRONMENT=production
```

### 3. Verify Setup

```bash
# Test configuration
npm run test:config

# Build the project
npm run build

# Start the MCP server
npm start
```

### 4. Test Connection

The server will start on stdin/stdout for MCP communication. You should see:

```
MCP Azure Deployment Service initialized
Listening for JSON-RPC requests...
```

## 🛠️ Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AZURE_SUBSCRIPTION_ID` | ✅ | - | Azure subscription UUID |
| `AZURE_TENANT_ID` | ✅ | - | Azure tenant UUID |
| `AZURE_CLIENT_ID` | ✅ | - | Service principal client UUID |
| `AZURE_CLIENT_SECRET` | ✅ | - | Service principal secret |
| `AZURE_DEFAULT_REGION` | ❌ | `eastus` | Default Azure region |
| `AZURE_RESOURCE_GROUP_PREFIX` | ❌ | `mcp-rg` | Resource group naming prefix |
| `AZURE_ENVIRONMENT` | ❌ | `development` | Environment identifier |
| `LOG_LEVEL` | ❌ | `info` | Logging level (error, warn, info, debug) |

### Multi-Profile Configuration

The service supports multiple Azure profiles for different environments:

```typescript
// Add a new profile
configManager.addProfile('staging', {
  subscriptionId: 'staging-subscription-id',
  tenantId: 'staging-tenant-id',
  clientId: 'staging-client-id',
  clientSecret: 'staging-client-secret',
  defaultRegion: 'westus2',
  resourceGroupPrefix: 'staging-rg'
});

// Switch active profile
configManager.setActiveProfile('staging');
```

## 🔧 Azure Operations

### 1. Get Existing Servers

Lists and filters existing Azure compute resources.

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "azure.getExistingServers",
    "arguments": {
      "resourceGroup": "my-rg",
      "serverType": "vm",
      "region": "eastus"
    }
  }
}
```

**Parameters:**
- `resourceGroup` (optional): Filter by resource group
- `serverType` (optional): Filter by type (`vm`, `webapp`, `container`)
- `region` (optional): Filter by Azure region

### 2. Deploy Minimal Instance

Creates a lightweight virtual machine for development or testing.

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "azure.deployMinimalInstance",
    "arguments": {
      "name": "dev-server-01",
      "resourceGroup": "development-rg",
      "region": "eastus",
      "vmSize": "Standard_B1s",
      "osType": "Ubuntu"
    }
  }
}
```

**Parameters:**
- `name` (required): Instance name
- `resourceGroup` (required): Target resource group
- `region` (optional): Deployment region
- `vmSize` (optional): VM size (default: `Standard_B1ms`)
- `osType` (optional): Operating system (`Ubuntu`, `Windows`)

### 3. Deploy Backend

Deploys backend services with database and networking components.

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "azure.deployBackend",
    "arguments": {
      "name": "api-backend",
      "resourceGroup": "production-rg",
      "region": "eastus",
      "serviceType": "webapp",
      "databaseType": "postgresql",
      "scalingConfig": {
        "minInstances": 2,
        "maxInstances": 10
      }
    }
  }
}
```

**Parameters:**
- `name` (required): Backend service name
- `resourceGroup` (required): Target resource group
- `region` (optional): Deployment region
- `serviceType` (required): Service type (`webapp`, `container`, `vm`)
- `databaseType` (optional): Database type (`postgresql`, `mysql`, `cosmosdb`)
- `scalingConfig` (optional): Auto-scaling configuration

### 4. Deploy Frontend

Deploys static websites and web applications with CDN support.

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "azure.deployFrontend",
    "arguments": {
      "name": "corporate-website",
      "resourceGroup": "web-rg",
      "region": "eastus",
      "frontendType": "spa",
      "cdnEnabled": true,
      "customDomain": "www.example.com"
    }
  }
}
```

**Parameters:**
- `name` (required): Frontend application name
- `resourceGroup` (required): Target resource group
- `region` (optional): Deployment region
- `frontendType` (required): Type (`spa`, `static`, `blazor`)
- `cdnEnabled` (optional): Enable Azure CDN
- `customDomain` (optional): Custom domain name

## 🔒 Security Features

### Credential Management
- Secure environment variable handling
- No credentials in logs or error messages
- Automatic credential rotation support
- Multi-profile isolation

### Network Security
- Virtual network isolation for deployments
- Network security groups with minimal permissions
- Private endpoint support for databases
- TLS encryption for all communications

### Access Control
- Role-based access control (RBAC) integration
- Service principal authentication
- Resource-level permissions
- Audit logging for all operations

## 🧪 Testing

The project includes comprehensive test suites:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- --testNamePattern="ConfigurationManager"

# Watch mode for development
npm run test:watch
```

### Test Coverage
- Configuration management: 100%
- MCP server protocol: 100%
- Error handling: 95%
- Azure operations: Integration tests available

## 🔧 Development

### Project Structure

```
MCP-Azure-Deployment-Service/
├── src/
│   ├── config/           # Configuration management
│   ├── services/         # Azure SDK wrappers
│   ├── tools/           # Azure operation implementations
│   ├── server/          # MCP JSON-RPC server
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Logging and utilities
│   └── index.ts         # Main entry point
├── tests/               # Test suites
├── docs/                # Additional documentation
└── examples/            # Usage examples
```

### Build Process

```bash
# Development build with watch
npm run dev

# Production build
npm run build

# Type checking only
npm run type-check

# Linting and formatting
npm run lint
npm run format
```

### Code Quality Tools

- **TypeScript**: Strict type checking with ES2022 target
- **ESLint**: Code linting with TypeScript rules
- **Prettier**: Code formatting with consistent style
- **Husky**: Git hooks for pre-commit validation
- **Jest**: Testing framework with coverage reporting

## 📚 API Reference

For detailed API documentation, see:
- [API Documentation](./docs/API.md)
- [Azure Operations Guide](./docs/AZURE_OPERATIONS.md)
- [Configuration Reference](./docs/CONFIGURATION.md)
- [Troubleshooting Guide](./docs/TROUBLESHOOTING.md)

## 🔧 Troubleshooting

### Common Issues

#### Authentication Errors
```
Error: Authentication failed - invalid credentials
```
**Solution**: Verify your Azure service principal credentials and permissions.

#### Resource Group Not Found
```
Error: Resource group 'my-rg' not found
```
**Solution**: Ensure the resource group exists or enable auto-creation in configuration.

#### Insufficient Permissions
```
Error: Insufficient permissions for operation
```
**Solution**: Verify your service principal has Contributor role on the target subscription.

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
LOG_LEVEL=debug npm start
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Install dependencies: `npm install`
4. Run tests: `npm test`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/your-org/mcp-azure-deployment/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/mcp-azure-deployment/discussions)

---

**Made with ❤️ by the MCP Azure Team**