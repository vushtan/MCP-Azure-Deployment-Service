# MCP Azure Deployment Service

A production-ready Model Context Protocol (MCP) server for Azure cloud deployments with comprehensive resource management capabilities.

---

## 🚀 Quick Start

**Get up and running in under 5 minutes!**

### 1. Clone Repository
```bash
git clone https://github.com/vushtan/MCP-Azure-Deployment-Service.git
cd MCP-Azure-Deployment-Service
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Credentials
```bash
# Interactive setup (recommended)
npm run setup-env

# OR copy template manually
cp .env.example .env
# Then edit .env with your Azure credentials
```

### 4. Verify Setup
```bash
# Validate configuration
npm run validate-config

# Test Azure connectivity
npm run test-credentials
```

### 5. Run First Deployment
```bash
# Try a sample deployment
npm run sample-deploy

# OR start the MCP server
npm start
```

**🎉 You're ready to go!** The server will listen for JSON-RPC requests via stdin/stdout.

---

## 🛠️ Automated Setup

For even faster setup, use our automated installation scripts:

**Windows (PowerShell):**
```powershell
.\setup.ps1
```

**macOS/Linux (Bash):**
```bash
chmod +x setup.sh
./setup.sh
```

These scripts will:
- ✅ Check system requirements (Node.js 18+, npm)
- ✅ Install dependencies automatically
- ✅ Set up environment template
- ✅ Run health checks
- ✅ Guide you through credential configuration

---

## 📋 Prerequisites

| Requirement | Version | Notes |
|-------------|---------|--------|
| **Node.js** | 18.0+ | [Download here](https://nodejs.org/) |
| **npm** | 9.0+ | Comes with Node.js |
| **Azure Account** | Active | With Contributor permissions |

### Azure Requirements

You'll need an Azure service principal with these permissions:
- **Subscription**: Contributor role
- **Resource Groups**: Create/manage permissions
- **Compute**: VM and App Service deployment
- **Storage**: Account creation (for frontend deployments)

**Need help creating a service principal?** [Follow this guide](https://docs.microsoft.com/azure/active-directory/develop/howto-create-service-principal-portal)

---

## ⚙️ Configuration

### Required Environment Variables

```env
# Azure Authentication
AZURE_SUBSCRIPTION_ID=12345678-1234-1234-1234-123456789abc
AZURE_TENANT_ID=87654321-4321-4321-4321-abcdef123456
AZURE_CLIENT_ID=abcdef12-3456-7890-abcd-ef1234567890
AZURE_CLIENT_SECRET=your-client-secret-here

# Optional Settings
AZURE_DEFAULT_REGION=eastus                    # Default: eastus
AZURE_RESOURCE_GROUP_PREFIX=mcp-rg            # Default: mcp-rg
LOG_LEVEL=info                                # Default: info
```

### Quick Configuration Commands

```bash
# Interactive credential setup
npm run setup-env

# Validate your configuration
npm run validate-config

# Test Azure connectivity
npm run test-credentials

# Health check (comprehensive system test)
npm run health-check
```

---

## 🚀 Features

### Core Azure Operations
- **`azure.getExistingServers`** - List and manage existing compute resources
- **`azure.deployMinimalInstance`** - Deploy lightweight VMs and App Services  
- **`azure.deployBackend`** - Full backend deployment with databases
- **`azure.deployFrontend`** - Static website deployment with CDN

### Production-Ready Architecture
- ✅ **TypeScript** with strict type checking
- ✅ **Comprehensive Testing** (91%+ coverage)
- ✅ **Error Handling** with retry logic and rate limiting
- ✅ **Security** hardened credential management
- ✅ **Logging** structured logging with Winston
- ✅ **Validation** input validation with Joi schemas

### MCP Protocol Compliance
- ✅ **JSON-RPC 2.0** full implementation
- ✅ **Tool Discovery** automatic registration and schema validation
- ✅ **Error Handling** standard MCP error codes and messages
- ✅ **Streaming** stdin/stdout communication protocol

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

The MCP server provides four powerful deployment tools accessible via JSON-RPC:

### 1. 📋 Get Existing Servers
**Tool**: `azure.getExistingServers`

List and filter your existing Azure compute resources.

```json
{
  "name": "azure.getExistingServers",
  "arguments": {
    "resourceGroup": "my-rg",           // Optional: Filter by resource group
    "serverType": "vm",                 // Optional: "vm", "webapp", "container" 
    "region": "eastus"                  // Optional: Filter by region
  }
}
```

**Returns**: Comprehensive resource list with status, costs, and configuration details.

---

### 2. 🚀 Deploy Minimal Instance  
**Tool**: `azure.deployMinimalInstance`

Perfect for development, testing, or lightweight workloads.

```json
{
  "name": "azure.deployMinimalInstance",
  "arguments": {
    "name": "dev-server-01",           // Required: Unique instance name
    "resourceGroup": "dev-rg",         // Required: Target resource group
    "region": "eastus",                // Optional: Deployment region
    "vmSize": "Standard_B1s",          // Optional: VM size
    "osType": "Ubuntu"                 // Optional: "Ubuntu", "Windows"
  }
}
```

**Includes**: VM, networking, monitoring, and SSH/RDP access setup.

---

### 3. 🏗️ Deploy Backend
**Tool**: `azure.deployBackend`

Full-stack backend deployment with database and auto-scaling.

```json
{
  "name": "azure.deployBackend",
  "arguments": {
    "name": "api-backend",             // Required: Service name
    "resourceGroup": "production-rg",  // Required: Target resource group
    "region": "eastus",                // Optional: Deployment region
    "serviceType": "webapp",           // Required: "webapp", "container", "vm"
    "databaseType": "postgresql",      // Optional: "postgresql", "mysql", "cosmosdb"
    "scalingConfig": {
      "minInstances": 2,
      "maxInstances": 10,
      "targetCpuPercent": 70
    }
  }
}
```

**Includes**: Load balancer, App Service/Container, managed database, VNet, and monitoring.

---

### 4. 🌐 Deploy Frontend
**Tool**: `azure.deployFrontend`

Static websites and SPAs with global CDN and SSL.

```json
{
  "name": "azure.deployFrontend",
  "arguments": {
    "name": "corporate-website",       // Required: Application name
    "resourceGroup": "web-rg",         // Required: Target resource group
    "region": "eastus",                // Optional: Deployment region
    "frontendType": "spa",             // Required: "spa", "static", "blazor"
    "cdnEnabled": true,                // Optional: Enable Azure CDN
    "customDomain": "www.example.com"  // Optional: Custom domain
  }
}
```

**Includes**: Static Web App, Azure CDN, SSL certificate, and custom domain configuration.

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