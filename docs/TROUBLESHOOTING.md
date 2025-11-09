# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the MCP Azure Deployment Service.

## Table of Contents

- [Common Issues](#common-issues)
- [Authentication Problems](#authentication-problems)
- [Permission Issues](#permission-issues)
- [Configuration Errors](#configuration-errors)
- [Network Problems](#network-problems)
- [Deployment Failures](#deployment-failures)
- [Performance Issues](#performance-issues)
- [Debugging Tools](#debugging-tools)
- [Getting Support](#getting-support)

## Common Issues

### Service Won't Start

#### Symptoms
```
Error: Configuration validation failed: AZURE_SUBSCRIPTION_ID must be a valid UUID
```

#### Diagnosis
```bash
# Check environment variables
npm run debug:config

# Verify .env file
cat .env
```

#### Solutions
1. **Verify UUID Format**: Ensure all UUID variables use v4 format (8-4-4-4-12 hex digits)
2. **Check File Permissions**: Ensure `.env` file is readable
3. **Environment Loading**: Verify dotenv is loading the correct file

#### Example Fix
```env
# ❌ Invalid UUID format
AZURE_SUBSCRIPTION_ID=12345678-1234-1234-1234-123456789012345

# ✅ Valid UUID v4 format
AZURE_SUBSCRIPTION_ID=12345678-1234-4567-8901-123456789012
```

### JSON-RPC Communication Errors

#### Symptoms
```
Error: Invalid JSON-RPC request
Error: Method not found
```

#### Diagnosis
```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Test with simple request
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | npm start
```

#### Solutions
1. **Validate JSON Format**: Use proper JSON-RPC 2.0 format
2. **Check Method Names**: Verify tool names match exactly
3. **Parameter Validation**: Ensure required parameters are provided

#### Example Fix
```json
// ❌ Missing jsonrpc version
{
  "id": 1,
  "method": "tools/call",
  "params": {"name": "azure.getExistingServers"}
}

// ✅ Valid JSON-RPC 2.0
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "azure.getExistingServers",
    "arguments": {}
  }
}
```

## Authentication Problems

### Invalid Credentials Error

#### Symptoms
```
Error: Authentication failed - invalid credentials
AADSTS70002: Error validating credentials
```

#### Diagnosis Steps

1. **Verify Service Principal**
   ```bash
   # Test Azure CLI authentication
   az login --service-principal \\
     --username $AZURE_CLIENT_ID \\
     --password $AZURE_CLIENT_SECRET \\
     --tenant $AZURE_TENANT_ID
   ```

2. **Check Credential Format**
   ```bash
   # Validate UUID format
   node -e "
   const { validate: isUUID } = require('uuid');
   console.log('Subscription ID valid:', isUUID(process.env.AZURE_SUBSCRIPTION_ID));
   console.log('Tenant ID valid:', isUUID(process.env.AZURE_TENANT_ID));
   console.log('Client ID valid:', isUUID(process.env.AZURE_CLIENT_ID));
   "
   ```

3. **Test Service Principal**
   ```bash
   # List subscriptions to test access
   az account list --output table
   ```

#### Common Causes & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `AADSTS70002` | Invalid client secret | Regenerate client secret in Azure portal |
| `AADSTS50034` | Service principal not found | Verify client ID is correct |
| `AADSTS90002` | Tenant not found | Verify tenant ID is correct |
| `AADSTS65001` | Consent required | Grant API permissions to service principal |

#### Creating New Service Principal
```bash
# Create service principal with proper permissions
az ad sp create-for-rbac \\
  --name "mcp-azure-deployment-$(date +%s)" \\
  --role "Contributor" \\
  --scopes "/subscriptions/$AZURE_SUBSCRIPTION_ID" \\
  --sdk-auth
```

### Token Expiration Issues

#### Symptoms
```
Error: The access token expiry UTC time is before the current UTC time
```

#### Solutions
1. **Automatic Token Refresh**: The service handles this automatically
2. **Clock Synchronization**: Ensure system clock is accurate
3. **Network Time Protocol**: Enable NTP synchronization

```bash
# Check system time
date
timedatectl status

# Sync with NTP (Linux)
sudo systemctl restart systemd-timesyncd
```

## Permission Issues

### Insufficient Permissions Error

#### Symptoms
```
Error: Insufficient permissions for operation
AuthorizationFailed: The client does not have authorization to perform action
```

#### Required Permissions Check

```bash
# Check current role assignments
az role assignment list \\
  --assignee $AZURE_CLIENT_ID \\
  --output table
```

#### Minimum Required Roles

| Operation | Required Role | Scope |
|-----------|---------------|-------|
| List Resources | Reader | Subscription |
| Deploy VM | Virtual Machine Contributor | Resource Group |
| Deploy Web App | Website Contributor | Resource Group |
| Deploy Database | SQL DB Contributor | Resource Group |
| Create Resource Group | Contributor | Subscription |
| Manage Storage | Storage Blob Data Contributor | Storage Account |

#### Granting Permissions

```bash
# Grant Contributor role at subscription level
az role assignment create \\
  --assignee $AZURE_CLIENT_ID \\
  --role "Contributor" \\
  --scope "/subscriptions/$AZURE_SUBSCRIPTION_ID"

# Grant specific role at resource group level
az role assignment create \\
  --assignee $AZURE_CLIENT_ID \\
  --role "Virtual Machine Contributor" \\
  --scope "/subscriptions/$AZURE_SUBSCRIPTION_ID/resourceGroups/my-rg"
```

### Resource Group Access Issues

#### Symptoms
```
Error: Resource group 'my-rg' not found or access denied
```

#### Diagnosis & Solutions

1. **Check Resource Group Existence**
   ```bash
   az group show --name my-rg --output table
   ```

2. **Verify Access Permissions**
   ```bash
   az group list --output table
   ```

3. **Create Resource Group**
   ```bash
   az group create --name my-rg --location eastus
   ```

## Configuration Errors

### Environment Variable Issues

#### Missing Environment Variables

```bash
# Check all required variables
required_vars=("AZURE_SUBSCRIPTION_ID" "AZURE_TENANT_ID" "AZURE_CLIENT_ID" "AZURE_CLIENT_SECRET")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing: $var"
  else
    echo "✅ Present: $var"
  fi
done
```

#### Invalid UUID Format

```bash
# Validate UUID format with Node.js
node -e "
const { validate, version } = require('uuid');
const vars = ['AZURE_SUBSCRIPTION_ID', 'AZURE_TENANT_ID', 'AZURE_CLIENT_ID'];
vars.forEach(v => {
  const val = process.env[v];
  console.log(\`\${v}: \${validate(val) && version(val) === 4 ? '✅' : '❌'} \${val}\`);
});
"
```

### Profile Configuration Issues

#### Profile Not Found Error

```bash
# List available profiles
npm run debug:profiles

# Create missing profile
node -e "
const { ConfigurationManager } = require('./dist/config');
const config = ConfigurationManager.getInstance();
config.addProfile('production', {
  subscriptionId: 'your-prod-sub-id',
  tenantId: 'your-prod-tenant-id',
  clientId: 'your-prod-client-id',
  clientSecret: 'your-prod-secret'
});
"
```

## Network Problems

### Connection Timeout Issues

#### Symptoms
```
Error: Connection timeout after 30000ms
ECONNRESET: Connection was reset
```

#### Diagnosis Steps

1. **Test Internet Connectivity**
   ```bash
   # Test Azure endpoints
   curl -I https://management.azure.com/
   nslookup management.azure.com
   ```

2. **Check Firewall Rules**
   ```bash
   # Test HTTPS connectivity
   telnet management.azure.com 443
   ```

3. **Verify Proxy Settings**
   ```bash
   # Check proxy environment variables
   echo $HTTP_PROXY
   echo $HTTPS_PROXY
   echo $NO_PROXY
   ```

#### Solutions

1. **Configure Proxy**
   ```env
   HTTP_PROXY=http://proxy.company.com:8080
   HTTPS_PROXY=http://proxy.company.com:8080
   NO_PROXY=localhost,127.0.0.1,.local
   ```

2. **Increase Timeout Values**
   ```typescript
   // In azure-client.ts
   const clientOptions = {
     requestPolicyFactories: [
       requestPolicyFactoryFunction({
         timeout: 60000  // Increase to 60 seconds
       })
     ]
   };
   ```

### DNS Resolution Issues

#### Symptoms
```
Error: getaddrinfo ENOTFOUND management.azure.com
```

#### Solutions

1. **Check DNS Configuration**
   ```bash
   # Test DNS resolution
   nslookup management.azure.com
   dig management.azure.com
   ```

2. **Use Alternative DNS**
   ```bash
   # Configure alternative DNS (Linux)
   echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
   ```

## Deployment Failures

### Resource Creation Failures

#### VM Deployment Issues

```json
{
  "error": {
    "code": "SkuNotAvailable",
    "message": "The requested VM size is not available in the selected region"
  }
}
```

**Solutions:**
1. **Check VM Size Availability**
   ```bash
   az vm list-skus --location eastus --size Standard_B1ms --output table
   ```

2. **Use Alternative Sizes**
   ```bash
   # List available sizes
   az vm list-skus --location eastus --query "[?resourceType=='virtualMachines']" --output table
   ```

#### Storage Account Issues

```json
{
  "error": {
    "code": "StorageAccountAlreadyTaken",
    "message": "The storage account name is already taken"
  }
}
```

**Solutions:**
1. **Generate Unique Names**
   ```typescript
   const uniqueName = `storage${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
   ```

2. **Check Name Availability**
   ```bash
   az storage account check-name --name mystorageaccount
   ```

### Quota and Limits Issues

#### Regional Quota Exceeded

```json
{
  "error": {
    "code": "QuotaExceeded",
    "message": "Regional quota for VM cores has been exceeded"
  }
}
```

**Solutions:**
1. **Check Current Usage**
   ```bash
   az vm list-usage --location eastus --output table
   ```

2. **Request Quota Increase**
   ```bash
   # Submit support request for quota increase
   az support tickets create \\
     --ticket-name "VM Core Quota Increase" \\
     --description "Need to increase VM core quota for production deployment"
   ```

3. **Use Alternative Regions**
   ```bash
   # Check quota in other regions
   regions=("westus" "centralus" "northeurope")
   for region in "${regions[@]}"; do
     echo "=== $region ==="
     az vm list-usage --location $region --query "[?name.value=='cores']" --output table
   done
   ```

## Performance Issues

### Slow Deployment Times

#### Diagnosis

1. **Enable Performance Monitoring**
   ```bash
   LOG_LEVEL=debug npm start
   ```

2. **Monitor Azure Operations**
   ```typescript
   import { performance } from 'perf_hooks';
   
   const start = performance.now();
   await azureOperation();
   const duration = performance.now() - start;
   logger.info(`Operation completed in ${duration.toFixed(2)}ms`);
   ```

#### Optimization Strategies

1. **Parallel Operations**
   ```typescript
   // Deploy multiple resources in parallel
   const deployments = await Promise.all([
     deployVM(),
     deployStorage(),
     deployDatabase()
   ]);
   ```

2. **Regional Selection**
   ```typescript
   // Choose regions with better performance
   const fastRegions = ['eastus', 'westus2', 'northeurope'];
   ```

3. **Resource Pre-allocation**
   ```typescript
   // Pre-create resource groups and networks
   await Promise.all([
     createResourceGroup(),
     createVirtualNetwork(),
     createStorageAccount()
   ]);
   ```

### Memory and CPU Usage

#### Monitor Resource Usage

```bash
# Monitor Node.js process
top -p $(pgrep -f "node.*mcp-azure")

# Detailed memory analysis
node --inspect --max-old-space-size=4096 src/index.js
```

#### Optimization

1. **Increase Memory Limit**
   ```bash
   node --max-old-space-size=4096 src/index.js
   ```

2. **Stream Large Responses**
   ```typescript
   // Use streaming for large datasets
   const stream = azureClient.listResources();
   stream.on('data', chunk => processChunk(chunk));
   ```

## Debugging Tools

### Enable Debug Mode

```bash
# Enable all debug output
DEBUG=* LOG_LEVEL=debug npm start

# Enable Azure SDK debug output
DEBUG=azure* npm start

# Enable MCP protocol debug
DEBUG=mcp* npm start
```

### Configuration Testing

```bash
# Test configuration without starting server
npm run test:config

# Validate Azure connectivity
npm run test:azure

# Test specific operations
npm run test:deploy -- --dry-run
```

### Network Debugging

```bash
# Capture network traffic
sudo tcpdump -i any -w azure-traffic.pcap host management.azure.com

# Monitor DNS queries
sudo tcpdump -i any -s 0 port 53

# Test SSL/TLS connection
openssl s_client -connect management.azure.com:443 -servername management.azure.com
```

### Log Analysis

```bash
# Real-time log monitoring
tail -f logs/mcp-azure.log | jq .

# Filter error logs
grep "ERROR" logs/mcp-azure.log | jq .

# Analyze performance metrics
grep "duration" logs/mcp-azure.log | jq '.duration' | sort -n
```

## Error Code Reference

### Azure SDK Errors

| Code | Description | Solution |
|------|-------------|----------|
| `AuthenticationFailed` | Invalid credentials | Check service principal |
| `AuthorizationFailed` | Insufficient permissions | Grant required roles |
| `ResourceNotFound` | Resource doesn't exist | Verify resource names |
| `ResourceGroupNotFound` | Resource group missing | Create or verify RG |
| `SubscriptionNotFound` | Invalid subscription | Check subscription ID |
| `QuotaExceeded` | Resource quota exceeded | Request quota increase |
| `ConflictError` | Resource name conflict | Use unique names |
| `BadRequest` | Invalid parameters | Validate input parameters |

### MCP Protocol Errors

| Code | Description | Solution |
|------|-------------|----------|
| `-32700` | Parse Error | Fix JSON syntax |
| `-32600` | Invalid Request | Use proper JSON-RPC format |
| `-32601` | Method Not Found | Check method names |
| `-32602` | Invalid Params | Validate parameters |
| `-32603` | Internal Error | Check server logs |

## Getting Support

### Self-Diagnosis Checklist

- [ ] Environment variables are properly set
- [ ] Service principal has required permissions  
- [ ] Azure connectivity is working
- [ ] Resource quotas are not exceeded
- [ ] JSON-RPC requests are properly formatted
- [ ] Logs show specific error messages

### Log Collection

```bash
# Collect comprehensive logs
mkdir support-logs
cp logs/* support-logs/
npm run debug:config > support-logs/config-debug.txt
npm test > support-logs/test-results.txt 2>&1
az account show > support-logs/azure-context.txt
```

### Support Channels

1. **GitHub Issues**: Report bugs and feature requests
2. **Discussions**: Community support and questions  
3. **Documentation**: Check docs/ directory for guides
4. **Azure Support**: For Azure-specific issues

### Creating Support Requests

Include the following information:

1. **Environment Details**
   - Node.js version: `node --version`
   - npm version: `npm --version`
   - Operating system: `uname -a`

2. **Configuration** (sanitized, no secrets)
   ```bash
   npm run debug:config | sed 's/[0-9a-f-]\{36\}/UUID-REDACTED/g'
   ```

3. **Error Messages**
   - Full error stack traces
   - Request/response examples
   - Relevant log entries

4. **Steps to Reproduce**
   - Exact commands used
   - Input parameters
   - Expected vs actual behavior

---

If you can't find a solution in this guide, please create an issue with detailed information about your problem.