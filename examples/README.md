# Usage Examples

This directory contains practical examples of using the MCP Azure Deployment Service.

## Example Files

- [`basic-deployment.json`](./basic-deployment.json) - Simple VM deployment
- [`full-stack-deployment.json`](./full-stack-deployment.json) - Complete application stack
- [`frontend-deployment.json`](./frontend-deployment.json) - Static website deployment
- [`development-workflow.js`](./development-workflow.js) - Development environment setup
- [`production-workflow.js`](./production-workflow.js) - Production deployment pipeline
- [`client-integration.js`](./client-integration.js) - MCP client integration example

## Quick Start Examples

### 1. Deploy a Development VM

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "azure.deployMinimalInstance",
    "arguments": {
      "name": "dev-vm-001",
      "resourceGroup": "development-rg",
      "region": "eastus",
      "vmSize": "Standard_B1s",
      "osType": "Ubuntu"
    }
  }
}
```

### 2. List Existing Resources

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "azure.getExistingServers",
    "arguments": {
      "resourceGroup": "production-rg",
      "serverType": "webapp"
    }
  }
}
```

### 3. Deploy Backend API

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "azure.deployBackend",
    "arguments": {
      "name": "api-backend",
      "resourceGroup": "api-rg",
      "serviceType": "webapp",
      "databaseType": "postgresql",
      "scalingConfig": {
        "minInstances": 1,
        "maxInstances": 5
      }
    }
  }
}
```

### 4. Deploy Frontend Application

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "azure.deployFrontend",
    "arguments": {
      "name": "company-website",
      "resourceGroup": "web-rg",
      "frontendType": "spa",
      "cdnEnabled": true
    }
  }
}
```

## Integration Examples

### Node.js Client Integration

See [`client-integration.js`](./client-integration.js) for a complete example of integrating with the MCP server from a Node.js application.

### Python Client Integration

See [`python-client.py`](./python-client.py) for Python integration using the `subprocess` module.

### Shell Script Automation

See [`deploy-script.sh`](./deploy-script.sh) for automated deployment scripts.

## Workflow Examples

### Development Environment Setup

See [`development-workflow.js`](./development-workflow.js) for setting up a complete development environment with:
- Development VMs
- Database instances  
- Storage accounts
- Networking configuration

### Production Deployment Pipeline

See [`production-workflow.js`](./production-workflow.js) for production deployment including:
- Blue/green deployments
- Auto-scaling configuration
- Monitoring setup
- Backup configuration

## Testing Examples

### Unit Testing with Mocks

See [`test-examples/`](./test-examples/) directory for examples of:
- Mocking Azure operations
- Testing MCP protocol interactions
- Integration testing strategies

---

For more detailed documentation, see the [`docs/`](../docs/) directory.