// Development Workflow Example
// This script demonstrates a complete development environment setup

const { spawn } = require('child_process');
const readline = require('readline');

class MCPAzureClient {
  constructor() {
    this.requestId = 1;
    this.serverProcess = null;
  }

  async startServer() {
    console.log('🚀 Starting MCP Azure Deployment Service...');
    
    this.serverProcess = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'inherit'],
      cwd: process.cwd()
    });

    this.rl = readline.createInterface({
      input: this.serverProcess.stdout,
      output: process.stdout,
      terminal: false
    });

    // Initialize the MCP connection
    await this.initialize();
  }

  async initialize() {
    const initRequest = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        clientInfo: {
          name: 'development-workflow',
          version: '1.0.0'
        }
      }
    };

    await this.sendRequest(initRequest);
    
    // Send initialized notification
    await this.sendNotification({
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    });

    console.log('✅ MCP Server initialized successfully');
  }

  async sendRequest(request) {
    return new Promise((resolve, reject) => {
      const requestStr = JSON.stringify(request) + '\n';
      
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 30000);

      this.rl.once('line', (line) => {
        clearTimeout(timeout);
        try {
          const response = JSON.parse(line);
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response);
          }
        } catch (error) {
          reject(error);
        }
      });

      this.serverProcess.stdin.write(requestStr);
    });
  }

  async sendNotification(notification) {
    const notificationStr = JSON.stringify(notification) + '\n';
    this.serverProcess.stdin.write(notificationStr);
  }

  async callTool(toolName, args = {}) {
    const request = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    console.log(`📡 Calling tool: ${toolName}`);
    const response = await this.sendRequest(request);
    console.log(`✅ Tool ${toolName} completed`);
    
    return response.result;
  }

  async shutdown() {
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
  }
}

// Development Environment Configuration
const DEV_CONFIG = {
  resourceGroup: 'mcp-dev-rg',
  region: 'eastus',
  environment: 'development',
  tags: {
    Environment: 'Development',
    Project: 'MCP-Azure-Demo',
    Owner: 'DevTeam'
  }
};

async function setupDevelopmentEnvironment() {
  const client = new MCPAzureClient();
  
  try {
    await client.startServer();
    
    console.log('🔍 Checking existing resources...');
    
    // 1. Check existing servers in the development resource group
    const existingServers = await client.callTool('azure.getExistingServers', {
      resourceGroup: DEV_CONFIG.resourceGroup
    });
    
    console.log('Current infrastructure:', existingServers);

    // 2. Deploy development VM if not exists
    console.log('🖥️  Deploying development virtual machine...');
    const devVM = await client.callTool('azure.deployMinimalInstance', {
      name: 'dev-vm-main',
      resourceGroup: DEV_CONFIG.resourceGroup,
      region: DEV_CONFIG.region,
      vmSize: 'Standard_B2s',
      osType: 'Ubuntu',
      tags: {
        ...DEV_CONFIG.tags,
        Role: 'Development-VM'
      }
    });
    
    console.log('Development VM deployment result:', devVM);

    // 3. Deploy backend services for API development
    console.log('🔧 Deploying backend development services...');
    const backendServices = await client.callTool('azure.deployBackend', {
      name: 'dev-api-backend',
      resourceGroup: DEV_CONFIG.resourceGroup,
      region: DEV_CONFIG.region,
      serviceType: 'webapp',
      databaseType: 'postgresql',
      scalingConfig: {
        minInstances: 1,
        maxInstances: 2
      },
      tags: {
        ...DEV_CONFIG.tags,
        Role: 'API-Backend'
      }
    });
    
    console.log('Backend services deployment result:', backendServices);

    // 4. Deploy frontend development environment
    console.log('🌐 Deploying frontend development site...');
    const frontendSite = await client.callTool('azure.deployFrontend', {
      name: 'dev-frontend-app',
      resourceGroup: DEV_CONFIG.resourceGroup,
      region: DEV_CONFIG.region,
      frontendType: 'spa',
      cdnEnabled: false, // No CDN needed for dev
      tags: {
        ...DEV_CONFIG.tags,
        Role: 'Frontend-App'
      }
    });
    
    console.log('Frontend deployment result:', frontendSite);

    // 5. Final infrastructure check
    console.log('📋 Final infrastructure overview...');
    const finalInfrastructure = await client.callTool('azure.getExistingServers', {
      resourceGroup: DEV_CONFIG.resourceGroup
    });
    
    console.log('✅ Development environment setup complete!');
    console.log('Infrastructure overview:', finalInfrastructure);

    // Generate development summary
    console.log(`
🎉 Development Environment Ready!

Resource Group: ${DEV_CONFIG.resourceGroup}
Region: ${DEV_CONFIG.region}

Services Deployed:
- Development VM (Ubuntu)
- Backend API (Web App + PostgreSQL)  
- Frontend SPA (Static Website)

Next Steps:
1. SSH into the development VM
2. Configure your development tools
3. Connect to the API backend
4. Deploy your application code

Happy coding! 🚀
    `);

  } catch (error) {
    console.error('❌ Development setup failed:', error.message);
    process.exit(1);
  } finally {
    await client.shutdown();
  }
}

// Advanced Development Workflows
async function tearDownDevelopment() {
  console.log('🧹 Tearing down development environment...');
  // Implementation for cleaning up development resources
  // This would typically involve calling Azure CLI or REST API directly
  // since the MCP server focuses on deployment, not cleanup
}

async function scaleDevelopmentEnvironment() {
  const client = new MCPAzureClient();
  
  try {
    await client.startServer();
    
    console.log('📈 Scaling development environment...');
    
    // Scale backend to handle more load during testing
    const scaledBackend = await client.callTool('azure.deployBackend', {
      name: 'dev-api-backend-scaled',
      resourceGroup: DEV_CONFIG.resourceGroup,
      serviceType: 'webapp',
      scalingConfig: {
        minInstances: 2,
        maxInstances: 5,
        targetCpuPercentage: 60
      }
    });
    
    console.log('✅ Environment scaled successfully:', scaledBackend);
    
  } finally {
    await client.shutdown();
  }
}

// Export functions for use in other scripts
module.exports = {
  MCPAzureClient,
  setupDevelopmentEnvironment,
  tearDownDevelopment,
  scaleDevelopmentEnvironment,
  DEV_CONFIG
};

// Run if called directly
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'setup':
      setupDevelopmentEnvironment();
      break;
    case 'teardown':
      tearDownDevelopment();
      break;
    case 'scale':
      scaleDevelopmentEnvironment();
      break;
    default:
      console.log(`
Usage: node development-workflow.js <command>

Commands:
  setup     - Setup complete development environment
  teardown  - Remove development resources
  scale     - Scale development environment for testing

Example:
  node development-workflow.js setup
      `);
  }
}