# API Reference

This document provides comprehensive API documentation for the MCP Azure Deployment Service.

## Table of Contents

- [MCP Protocol Overview](#mcp-protocol-overview)
- [JSON-RPC Specification](#json-rpc-specification)
- [Tool Registration](#tool-registration)
- [Azure Operations](#azure-operations)
- [Error Handling](#error-handling)
- [Response Formats](#response-formats)

## MCP Protocol Overview

The MCP Azure Deployment Service implements the Model Context Protocol (MCP) specification for standardized tool communication. The service operates as a JSON-RPC 2.0 server over stdin/stdout.

### Initialization Sequence

1. **Initialize Request**: Client requests server capabilities
2. **Initialize Response**: Server responds with available tools
3. **Initialized Notification**: Client confirms initialization
4. **Tool Discovery**: Client lists available tools
5. **Tool Execution**: Client calls tools with parameters

### Example Initialization

```json
// 1. Initialize Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "clientInfo": {
      "name": "mcp-client",
      "version": "1.0.0"
    }
  }
}

// 2. Initialize Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {
        "listChanged": false
      }
    },
    "serverInfo": {
      "name": "mcp-azure-deployment-service",
      "version": "1.0.0"
    }
  }
}

// 3. Initialized Notification
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized"
}
```

## JSON-RPC Specification

All communication follows JSON-RPC 2.0 specification.

### Request Format

```typescript
interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: object;
}
```

### Response Format

```typescript
interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}
```

### Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32700 | Parse Error | Invalid JSON |
| -32600 | Invalid Request | Invalid JSON-RPC |
| -32601 | Method Not Found | Unknown method |
| -32602 | Invalid Params | Invalid parameters |
| -32603 | Internal Error | Server error |
| -32000 | Tool Error | Tool execution error |

## Tool Registration

### List Tools Request

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

### List Tools Response

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "azure.getExistingServers",
        "description": "List and filter existing Azure compute resources",
        "inputSchema": {
          "type": "object",
          "properties": {
            "resourceGroup": {
              "type": "string",
              "description": "Filter by resource group name"
            },
            "serverType": {
              "type": "string",
              "enum": ["vm", "webapp", "container"],
              "description": "Filter by server type"
            },
            "region": {
              "type": "string",
              "description": "Filter by Azure region"
            }
          }
        }
      },
      // ... other tools
    ]
  }
}
```

## Azure Operations

### 1. Get Existing Servers

**Tool Name**: `azure.getExistingServers`

Lists existing Azure compute resources with optional filtering.

#### Request Parameters

```typescript
interface GetExistingServersParams {
  resourceGroup?: string;    // Optional: Filter by resource group
  serverType?: 'vm' | 'webapp' | 'container';  // Optional: Filter by type
  region?: string;          // Optional: Filter by region
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "azure.getExistingServers",
    "arguments": {
      "resourceGroup": "production-rg",
      "serverType": "vm",
      "region": "eastus"
    }
  }
}
```

#### Example Response

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Found 3 servers:\\n\\n**Virtual Machines**\\n- web-server-01 (Standard_B2s) - Running - eastus\\n- api-server-01 (Standard_B1ms) - Running - eastus\\n- db-server-01 (Standard_D2s_v3) - Stopped - eastus"
      }
    ]
  }
}
```

#### Response Schema

```typescript
interface ServerInfo {
  id: string;
  name: string;
  type: 'vm' | 'webapp' | 'container';
  status: 'Running' | 'Stopped' | 'Deallocated' | 'Starting';
  region: string;
  resourceGroup: string;
  size?: string;
  osType?: string;
  publicIpAddress?: string;
  privateIpAddress?: string;
  tags: Record<string, string>;
  createdTime: string;
}
```

### 2. Deploy Minimal Instance

**Tool Name**: `azure.deployMinimalInstance`

Deploys a lightweight virtual machine for development or testing.

#### Request Parameters

```typescript
interface DeployMinimalInstanceParams {
  name: string;              // Required: Instance name
  resourceGroup: string;     // Required: Target resource group
  region?: string;          // Optional: Deployment region
  vmSize?: string;          // Optional: VM size (default: Standard_B1ms)
  osType?: 'Ubuntu' | 'Windows';  // Optional: OS type
  publicKeyPath?: string;   // Optional: SSH public key path
  tags?: Record<string, string>;  // Optional: Resource tags
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "azure.deployMinimalInstance",
    "arguments": {
      "name": "dev-server-01",
      "resourceGroup": "development-rg",
      "region": "eastus",
      "vmSize": "Standard_B1s",
      "osType": "Ubuntu",
      "tags": {
        "Environment": "Development",
        "Owner": "DevTeam"
      }
    }
  }
}
```

#### Example Response

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "✅ **Minimal Instance Deployed Successfully**\\n\\n**Instance Details:**\\n- Name: dev-server-01\\n- Resource Group: development-rg\\n- Region: eastus\\n- Size: Standard_B1s\\n- OS: Ubuntu 20.04 LTS\\n- Status: Running\\n\\n**Network:**\\n- Public IP: 20.42.73.123\\n- Private IP: 10.0.0.4\\n- SSH: ssh azureuser@20.42.73.123\\n\\n**Deployment Time:** 4.2 minutes"
      }
    ]
  }
}
```

### 3. Deploy Backend

**Tool Name**: `azure.deployBackend`

Deploys backend services with database and networking components.

#### Request Parameters

```typescript
interface DeployBackendParams {
  name: string;              // Required: Backend service name
  resourceGroup: string;     // Required: Target resource group
  region?: string;          // Optional: Deployment region
  serviceType: 'webapp' | 'container' | 'vm';  // Required: Service type
  databaseType?: 'postgresql' | 'mysql' | 'cosmosdb';  // Optional: Database
  scalingConfig?: {         // Optional: Auto-scaling configuration
    minInstances: number;
    maxInstances: number;
    targetCpuPercentage?: number;
  };
  networkConfig?: {         // Optional: Network configuration
    subnetId?: string;
    allowPublicAccess?: boolean;
    enablePrivateEndpoint?: boolean;
  };
  tags?: Record<string, string>;  // Optional: Resource tags
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": 5,
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
        "maxInstances": 10,
        "targetCpuPercentage": 70
      },
      "networkConfig": {
        "allowPublicAccess": true,
        "enablePrivateEndpoint": true
      },
      "tags": {
        "Environment": "Production",
        "Application": "API"
      }
    }
  }
}
```

#### Example Response

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "✅ **Backend Service Deployed Successfully**\\n\\n**Service Details:**\\n- Name: api-backend\\n- Type: Azure Web App\\n- Region: eastus\\n- Status: Running\\n\\n**Database:**\\n- Type: Azure Database for PostgreSQL\\n- Server: api-backend-db.postgres.database.azure.com\\n- Status: Ready\\n\\n**Scaling:**\\n- Min Instances: 2\\n- Max Instances: 10\\n- Current Instances: 2\\n\\n**Endpoints:**\\n- Public: https://api-backend.azurewebsites.net\\n- Health Check: https://api-backend.azurewebsites.net/health\\n\\n**Deployment Time:** 8.7 minutes"
      }
    ]
  }
}
```

### 4. Deploy Frontend

**Tool Name**: `azure.deployFrontend`

Deploys static websites and web applications with CDN support.

#### Request Parameters

```typescript
interface DeployFrontendParams {
  name: string;              // Required: Frontend application name
  resourceGroup: string;     // Required: Target resource group
  region?: string;          // Optional: Deployment region
  frontendType: 'spa' | 'static' | 'blazor';  // Required: Frontend type
  cdnEnabled?: boolean;     // Optional: Enable Azure CDN
  customDomain?: string;    // Optional: Custom domain name
  sslCertificate?: {        // Optional: SSL configuration
    certificateSource?: 'managed' | 'custom';
    certificatePath?: string;
  };
  buildConfig?: {           // Optional: Build configuration
    buildCommand?: string;
    outputDirectory?: string;
    nodeVersion?: string;
  };
  tags?: Record<string, string>;  // Optional: Resource tags
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "azure.deployFrontend",
    "arguments": {
      "name": "corporate-website",
      "resourceGroup": "web-rg",
      "region": "eastus",
      "frontendType": "spa",
      "cdnEnabled": true,
      "customDomain": "www.example.com",
      "sslCertificate": {
        "certificateSource": "managed"
      },
      "buildConfig": {
        "buildCommand": "npm run build",
        "outputDirectory": "dist",
        "nodeVersion": "18.x"
      },
      "tags": {
        "Environment": "Production",
        "Application": "Website"
      }
    }
  }
}
```

#### Example Response

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "✅ **Frontend Application Deployed Successfully**\\n\\n**Application Details:**\\n- Name: corporate-website\\n- Type: Single Page Application (SPA)\\n- Region: eastus\\n- Status: Live\\n\\n**Storage:**\\n- Storage Account: corporatewebsitestorage\\n- Static Website: Enabled\\n- Index Document: index.html\\n\\n**CDN:**\\n- Profile: corporate-website-cdn\\n- Endpoint: corporate-website.azureedge.net\\n- Status: Running\\n\\n**Domain & SSL:**\\n- Primary URL: https://www.example.com\\n- SSL Certificate: Managed (Valid)\\n- DNS Status: Configured\\n\\n**Build Information:**\\n- Node Version: 18.x\\n- Build Command: npm run build\\n- Output Directory: dist\\n\\n**Deployment Time:** 6.3 minutes"
      }
    ]
  }
}
```

## Error Handling

### Standard Error Response

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "error": {
    "code": -32000,
    "message": "Tool execution failed",
    "data": {
      "tool": "azure.deployBackend",
      "error": "Authentication failed: Invalid credentials",
      "details": {
        "errorCode": "AUTHENTICATION_FAILED",
        "timestamp": "2024-01-15T10:30:00Z",
        "requestId": "req-12345"
      }
    }
  }
}
```

### Error Categories

#### Authentication Errors
- **Code**: `AUTHENTICATION_FAILED`
- **Description**: Invalid Azure credentials or expired tokens
- **Resolution**: Verify service principal credentials

#### Permission Errors
- **Code**: `INSUFFICIENT_PERMISSIONS`
- **Description**: Service principal lacks required permissions
- **Resolution**: Grant appropriate RBAC roles

#### Resource Errors
- **Code**: `RESOURCE_NOT_FOUND`
- **Description**: Target resource or resource group doesn't exist
- **Resolution**: Verify resource names and availability

#### Validation Errors
- **Code**: `INVALID_PARAMETERS`
- **Description**: Invalid or missing required parameters
- **Resolution**: Check parameter format and requirements

#### Quota Errors
- **Code**: `QUOTA_EXCEEDED`
- **Description**: Azure subscription quota limits reached
- **Resolution**: Request quota increase or use different region

## Response Formats

### Success Response Structure

```typescript
interface SuccessResponse {
  jsonrpc: "2.0";
  id: string | number;
  result: {
    content: Array<{
      type: "text";
      text: string;
    }>;
    isError?: false;
  };
}
```

### Error Response Structure

```typescript
interface ErrorResponse {
  jsonrpc: "2.0";
  id: string | number;
  error: {
    code: number;
    message: string;
    data?: {
      tool?: string;
      error?: string;
      details?: Record<string, any>;
    };
  };
}
```

### Content Types

The service returns content in structured text format with Markdown formatting for better readability:

- **Headers**: Use `**bold**` for section titles
- **Lists**: Use `-` for bullet points and `1.` for numbered lists
- **Code**: Use backticks for inline code and triple backticks for code blocks
- **Status**: Use ✅ for success, ❌ for errors, ⚠️ for warnings
- **Links**: Use standard Markdown link format `[text](url)`

## Rate Limiting and Throttling

The service implements automatic retry logic with exponential backoff:

- **Initial Delay**: 1 second
- **Maximum Delay**: 30 seconds
- **Maximum Retries**: 3 attempts
- **Backoff Factor**: 2.0

Rate limiting is handled at the Azure SDK level based on service-specific limits.

---

For more examples and advanced usage, see the [Examples Directory](../examples/) and [Azure Operations Guide](./AZURE_OPERATIONS.md).