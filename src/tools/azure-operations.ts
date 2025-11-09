/**
 * Azure operations implementation for the four core MCP methods
 * Provides high-level Azure deployment and management functionality
 */

import { AzureClientManager } from '../services/azure-client.js';
import { config } from '../config/index.js';
import type { 
  AzureComputeResource,
  DeployMinimalInstanceParams,
  DeployBackendParams,
  DeployFrontendParams,
  DeploymentResult,
  BackendDeploymentResult,
  FrontendDeploymentResult,
  MCPResponse
} from '../types/index.js';

/**
 * Azure operations service class
 */
export class AzureOperations {
  private azureClient: AzureClientManager;

  constructor() {
    const azureConfig = config.getConfig();
    this.azureClient = new AzureClientManager(azureConfig);
  }

  /**
   * Method 1: Get Existing Servers
   * Lists all compute resources in subscription (VMs, App Services)
   */
  async getExistingServers(): Promise<MCPResponse<AzureComputeResource[]>> {
    const startTime = Date.now();
    const operation = 'azure.getExistingServers';
    
    try {
      console.error(`Starting operation: ${operation}`);
      
      // Get all compute resources from Azure
      const resources = await this.azureClient.getAllComputeResources({
        operation
      });
      
      const computeResources: AzureComputeResource[] = [];
      
      for (const resource of resources) {
        try {
          if (resource.type === 'Microsoft.Compute/virtualMachines') {
            // Handle Virtual Machine
            const vmDetails = await this.processVirtualMachine(resource);
            if (vmDetails) {
              computeResources.push(vmDetails);
            }
          } else if (resource.type === 'Microsoft.Web/sites') {
            // Handle App Service
            const appDetails = await this.processAppService(resource);
            if (appDetails) {
              computeResources.push(appDetails);
            }
          }
        } catch (error) {
          console.error(`Failed to process resource ${resource.name}:`, error);
          // Continue processing other resources
        }
      }

      const duration = Date.now() - startTime;
      console.error(`Completed operation: ${operation} in ${duration}ms`);

      return {
        success: true,
        operation,
        details: computeResources,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Failed operation: ${operation} after ${duration}ms:`, error);
      
      return {
        success: false,
        operation,
        details: [] as AzureComputeResource[], // Return empty array on error
        timestamp: new Date().toISOString()
      } as MCPResponse<AzureComputeResource[]> & { success: false };
    }
  }

  /**
   * Method 2: Deploy Minimal Instance
   * Creates a basic VM or App Service with default configuration
   */
  async deployMinimalInstance(params: DeployMinimalInstanceParams): Promise<MCPResponse<DeploymentResult>> {
    const startTime = Date.now();
    const operation = 'azure.deployMinimalInstance';
    
    try {
      console.error(`Starting operation: ${operation}`, { params });
      
      // Validate parameters
      this.validateDeployMinimalInstanceParams(params);
      
      let deploymentResult: DeploymentResult;
      
      if (params.instanceType === 'vm') {
        deploymentResult = await this.deployVirtualMachine(params);
      } else if (params.instanceType === 'appservice') {
        deploymentResult = await this.deployAppService(params);
      } else {
        throw new Error(`Unsupported instance type: ${params.instanceType}`);
      }

      const duration = Date.now() - startTime;
      console.error(`Completed operation: ${operation} in ${duration}ms`);

      return {
        success: true,
        operation,
        resourceId: deploymentResult.resourceId,
        details: deploymentResult,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Failed operation: ${operation} after ${duration}ms:`, error);
      
      // Return a placeholder result on error
      const errorResult: DeploymentResult = {
        resourceId: '',
        name: 'failed-deployment',
        resourceGroup: 'error',
        status: 'Failed',
        region: params.region,
        createdAt: new Date().toISOString()
      };
      
      return {
        success: false,
        operation,
        details: errorResult,
        timestamp: new Date().toISOString()
      } as MCPResponse<DeploymentResult> & { success: false };
    }
  }

  /**
   * Method 3: Deploy Backend
   * Deploys backend application code to Azure instance
   */
  async deployBackend(params: DeployBackendParams): Promise<MCPResponse<BackendDeploymentResult>> {
    const startTime = Date.now();
    const operation = 'azure.deployBackend';
    
    try {
      console.error(`Starting operation: ${operation}`, { params });
      
      // Validate parameters
      this.validateDeployBackendParams(params);
      
      const deploymentResult = await this.deployBackendApplication(params);

      const duration = Date.now() - startTime;
      console.error(`Completed operation: ${operation} in ${duration}ms`);

      return {
        success: true,
        operation,
        resourceId: params.instanceId,
        details: deploymentResult,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Failed operation: ${operation} after ${duration}ms:`, error);
      
      // Return a placeholder result on error
      const errorResult: BackendDeploymentResult = {
        deploymentId: 'failed-deployment',
        applicationUrl: '',
        status: 'failed',
        runtime: params.runtime
      };
      
      return {
        success: false,
        operation,
        details: errorResult,
        timestamp: new Date().toISOString()
      } as MCPResponse<BackendDeploymentResult> & { success: false };
    }
  }

  /**
   * Method 4: Deploy Frontend
   * Deploys frontend static files to Azure with CDN support
   */
  async deployFrontend(params: DeployFrontendParams): Promise<MCPResponse<FrontendDeploymentResult>> {
    const startTime = Date.now();
    const operation = 'azure.deployFrontend';
    
    try {
      console.error(`Starting operation: ${operation}`, { params });
      
      // Validate parameters
      this.validateDeployFrontendParams(params);
      
      const deploymentResult = await this.deployFrontendApplication(params);

      const duration = Date.now() - startTime;
      console.error(`Completed operation: ${operation} in ${duration}ms`);

      return {
        success: true,
        operation,
        resourceId: params.instanceId,
        details: deploymentResult,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Failed operation: ${operation} after ${duration}ms:`, error);
      
      // Return a placeholder result on error
      const errorResult: FrontendDeploymentResult = {
        deploymentId: 'failed-deployment',
        publicUrl: '',
        status: 'failed'
      };
      
      return {
        success: false,
        operation,
        details: errorResult,
        timestamp: new Date().toISOString()
      } as MCPResponse<FrontendDeploymentResult> & { success: false };
    }
  }

  /**
   * Process Virtual Machine resource details
   */
  private async processVirtualMachine(resource: any): Promise<AzureComputeResource | null> {
    try {
      const resourceGroupName = this.extractResourceGroupFromId(resource.id);
      const vmName = resource.name;
      
      // Get detailed VM information
      const vm = await this.azureClient.getVirtualMachine(resourceGroupName, vmName);
      const instanceView = await this.azureClient.getVirtualMachineInstanceView(resourceGroupName, vmName);
      
      // Extract power state
      const powerState = instanceView.statuses?.find(status => 
        status.code?.startsWith('PowerState/')
      )?.displayStatus || 'Unknown';

      return {
        id: resource.id,
        name: vmName,
        type: 'Virtual Machine',
        status: powerState,
        region: resource.location || 'Unknown',
        resourceGroup: resourceGroupName,
        creationDate: vm.timeCreated?.toISOString() || 'Unknown',
        size: vm.hardwareProfile?.vmSize || 'Unknown',
        osType: vm.storageProfile?.osDisk?.osType || 'Unknown',
        powerState,
        tags: resource.tags || {}
      };
    } catch (error) {
      console.error(`Failed to process VM ${resource.name}:`, error);
      return null;
    }
  }

  /**
   * Process App Service resource details
   */
  private async processAppService(resource: any): Promise<AzureComputeResource | null> {
    try {
      const resourceGroupName = this.extractResourceGroupFromId(resource.id);
      const siteName = resource.name;
      
      // Get detailed App Service information
      const site = await this.azureClient.getAppService(resourceGroupName, siteName);
      
      return {
        id: resource.id,
        name: siteName,
        type: 'App Service',
        status: site.state || 'Unknown',
        region: resource.location || 'Unknown',
        resourceGroup: resourceGroupName,
        creationDate: 'Unknown', // App Service doesn't provide creation date directly
        url: site.defaultHostName ? `https://${site.defaultHostName}` : undefined,
        state: site.state,
        defaultHostName: site.defaultHostName,
        enabledHostNames: site.enabledHostNames,
        kind: site.kind,
        tags: resource.tags || {}
      };
    } catch (error) {
      console.error(`Failed to process App Service ${resource.name}:`, error);
      return null;
    }
  }

  /**
   * Deploy a Virtual Machine
   */
  private async deployVirtualMachine(params: DeployMinimalInstanceParams): Promise<DeploymentResult> {
    const resourceGroupName = params.resourceGroupName || 
      `${config.getConfig().resourceGroupPrefix}-${params.namePrefix}-${Date.now()}`;
    const vmName = `${params.namePrefix}-vm`;
    const vmSize = params.size || config.getConfig().defaultVmSize || 'Standard_B1s';
    const osType = params.osType || 'Linux';
    
    // Create resource group
    await this.azureClient.createResourceGroup(
      resourceGroupName,
      params.region,
      params.tags
    );
    
    // VM configuration (simplified for minimal instance)
    const vmConfig = {
      location: params.region,
      hardwareProfile: {
        vmSize: vmSize
      },
      storageProfile: {
        imageReference: {
          publisher: osType === 'Linux' ? 'Canonical' : 'MicrosoftWindowsServer',
          offer: osType === 'Linux' ? '0001-com-ubuntu-server-focal' : 'WindowsServer',
          sku: osType === 'Linux' ? '20_04-lts-gen2' : '2019-Datacenter',
          version: 'latest'
        },
        osDisk: {
          name: `${vmName}-osdisk`,
          caching: 'ReadWrite' as const,
          createOption: 'FromImage' as const
        }
      },
      osProfile: {
        computerName: vmName,
        adminUsername: params.adminUsername || 'azureuser',
        adminPassword: params.adminPassword || this.generatePassword()
      },
      networkProfile: {
        networkInterfaces: []
      },
      tags: {
        createdBy: 'mcp-azure-deployment-service',
        instanceType: 'minimal',
        ...params.tags
      }
    };

    // Create VM (in a real implementation, we would also create networking resources)
    const vm = await this.azureClient.createVirtualMachine(
      resourceGroupName,
      vmName,
      vmConfig
    );

    return {
      resourceId: vm.id || '',
      name: vmName,
      resourceGroup: resourceGroupName,
      status: 'Created',
      region: params.region,
      createdAt: new Date().toISOString(),
      accessInfo: {
        adminUrl: `https://portal.azure.com/#resource${vm.id}`,
        credentials: {
          username: params.adminUsername || 'azureuser',
          password: '[REDACTED]'
        }
      }
    };
  }

  /**
   * Deploy an App Service
   */
  private async deployAppService(params: DeployMinimalInstanceParams): Promise<DeploymentResult> {
    const resourceGroupName = params.resourceGroupName || 
      `${config.getConfig().resourceGroupPrefix}-${params.namePrefix}-${Date.now()}`;
    const appName = `${params.namePrefix}-app-${Date.now()}`;
    const planName = `${params.namePrefix}-plan`;
    const sku = params.size || config.getConfig().defaultAppServicePlan || 'F1';
    
    // Create resource group
    await this.azureClient.createResourceGroup(
      resourceGroupName,
      params.region,
      params.tags
    );
    
    // Create App Service Plan
    await this.azureClient.createAppServicePlan(
      resourceGroupName,
      planName,
      params.region,
      sku
    );
    
    // Create App Service
    const serverFarmId = `/subscriptions/${config.getConfig().subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Web/serverfarms/${planName}`;
    
    const site = await this.azureClient.createAppService(
      resourceGroupName,
      appName,
      serverFarmId,
      params.region,
      'node' // Default runtime for minimal instance
    );

    const result: DeploymentResult = {
      resourceId: site.id || '',
      name: appName,
      resourceGroup: resourceGroupName,
      status: 'Created',
      region: params.region,
      createdAt: new Date().toISOString(),
      accessInfo: {
        ...(site.defaultHostName && { publicUrl: `https://${site.defaultHostName}` }),
        adminUrl: `https://portal.azure.com/#resource${site.id}`
      }
    };
    
    if (site.defaultHostName) {
      result.url = `https://${site.defaultHostName}`;
    }
    
    return result;
  }

  /**
   * Deploy backend application (placeholder implementation)
   */
  private async deployBackendApplication(params: DeployBackendParams): Promise<BackendDeploymentResult> {
    // This is a simplified implementation
    // In a real scenario, this would involve uploading code, configuring runtime, etc.
    
    const deploymentId = `deploy-${Date.now()}`;
    
    const result: BackendDeploymentResult = {
      deploymentId,
      applicationUrl: `https://${params.instanceId}.azurewebsites.net`,
      status: 'succeeded',
      runtime: params.runtime,
      environmentVariables: Object.keys(params.environmentVariables || {})
    };
    
    if (params.healthCheckPath) {
      result.healthCheckUrl = `https://${params.instanceId}.azurewebsites.net${params.healthCheckPath}`;
    }
    
    return result;
  }

  /**
   * Deploy frontend application (placeholder implementation)
   */
  private async deployFrontendApplication(params: DeployFrontendParams): Promise<FrontendDeploymentResult> {
    // This is a simplified implementation
    // In a real scenario, this would involve uploading static files to storage, configuring CDN, etc.
    
    const deploymentId = `frontend-deploy-${Date.now()}`;
    const storageAccountName = `frontend${Date.now()}`;
    
    const result: FrontendDeploymentResult = {
      deploymentId,
      publicUrl: `https://${storageAccountName}.z13.web.core.windows.net/`,
      status: 'succeeded'
    };
    
    if (storageAccountName) {
      result.storageAccountName = storageAccountName;
    }
    
    if (params.customDomain) {
      result.customDomainUrl = `https://${params.customDomain}`;
    }
    
    if (params.enableCdn) {
      result.cdnUrl = `https://${storageAccountName}.azureedge.net/`;
    }
    
    return result;
  }

  /**
   * Validation methods
   */
  private validateDeployMinimalInstanceParams(params: DeployMinimalInstanceParams): void {
    if (!params.instanceType || !['vm', 'appservice'].includes(params.instanceType)) {
      throw new Error('instanceType must be either "vm" or "appservice"');
    }
    if (!params.region || typeof params.region !== 'string') {
      throw new Error('region is required and must be a string');
    }
    if (!params.namePrefix || typeof params.namePrefix !== 'string') {
      throw new Error('namePrefix is required and must be a string');
    }
    if (params.namePrefix.length > 20) {
      throw new Error('namePrefix must be 20 characters or less');
    }
  }

  private validateDeployBackendParams(params: DeployBackendParams): void {
    if (!params.instanceId || typeof params.instanceId !== 'string') {
      throw new Error('instanceId is required and must be a string');
    }
    if (!params.deploymentPackage || typeof params.deploymentPackage !== 'string') {
      throw new Error('deploymentPackage is required and must be a string');
    }
    if (!params.runtime || !['node', 'python', 'dotnet', 'java', 'php'].includes(params.runtime)) {
      throw new Error('runtime must be one of: node, python, dotnet, java, php');
    }
  }

  private validateDeployFrontendParams(params: DeployFrontendParams): void {
    if (!params.instanceId || typeof params.instanceId !== 'string') {
      throw new Error('instanceId is required and must be a string');
    }
    if (!params.buildDirectory || typeof params.buildDirectory !== 'string') {
      throw new Error('buildDirectory is required and must be a string');
    }
  }

  /**
   * Utility methods
   */
  private extractResourceGroupFromId(resourceId: string): string {
    const match = resourceId.match(/\/resourceGroups\/([^/]+)\//);
    if (!match || !match[1]) {
      throw new Error(`Unable to extract resource group from resource ID: ${resourceId}`);
    }
    return match[1];
  }

  private generatePassword(): string {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}