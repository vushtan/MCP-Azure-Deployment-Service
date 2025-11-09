/**
 * Azure client wrapper with retry logic, rate limiting, and comprehensive error handling
 * Provides a unified interface for all Azure operations with proper logging and monitoring
 */

import { 
  ComputeManagementClient,
  type VirtualMachine,
  type VirtualMachineInstanceView 
} from '@azure/arm-compute';
import { 
  ResourceManagementClient,
  type ResourceGroup,
  type GenericResource 
} from '@azure/arm-resources';
import { 
  WebSiteManagementClient,
  type Site,
  type AppServicePlan 
} from '@azure/arm-appservice';
import { 
  StorageManagementClient,
  type StorageAccount 
} from '@azure/arm-storage';
import { 
  BlobServiceClient,
  StorageSharedKeyCredential 
} from '@azure/storage-blob';
import { 
  ClientSecretCredential,
  type TokenCredential 
} from '@azure/identity';
import { v4 as uuidv4 } from 'uuid';
import type { 
  AzureConfiguration,
  RetryOptions,
  LogContext
} from '../types/index.js';
// Temporary console logger until proper logger is set up
const logger = {
  info: (msg: string, ctx?: any) => console.error(`INFO: ${msg}`, ctx || ''),
  error: (msg: string, ctx?: any) => console.error(`ERROR: ${msg}`, ctx || ''),
  warn: (msg: string, ctx?: any) => console.error(`WARN: ${msg}`, ctx || ''),
  debug: (msg: string, ctx?: any) => console.error(`DEBUG: ${msg}`, ctx || '')
};

/**
 * Default retry configuration for Azure operations
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableErrors: [
    'ETIMEDOUT',
    'ECONNRESET',
    'ENOTFOUND',
    'ECONNREFUSED',
    'ThrottledRequest',
    'TooManyRequests',
    'InternalServerError',
    'ServiceUnavailable',
    'RequestTimeout'
  ]
};

/**
 * Azure client wrapper class providing unified access to Azure services
 */
export class AzureClientManager {
  private credential!: TokenCredential;
  private computeClient!: ComputeManagementClient;
  private resourceClient!: ResourceManagementClient;
  private webClient!: WebSiteManagementClient;
  private storageClient!: StorageManagementClient;
  private retryOptions: RetryOptions;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;
  private readonly rateLimitDelay: number = 100; // 100ms between requests

  constructor(
    private config: AzureConfiguration,
    retryOptions: Partial<RetryOptions> = {}
  ) {
    this.retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
    this.initializeClients();
  }

  /**
   * Initialize Azure SDK clients with proper authentication
   */
  private initializeClients(): void {
    try {
      const options = this.config.authorityHost ? { authorityHost: this.config.authorityHost } : {};
      this.credential = new ClientSecretCredential(
        this.config.tenantId,
        this.config.clientId,
        this.config.clientSecret,
        options
      );

      this.computeClient = new ComputeManagementClient(
        this.credential,
        this.config.subscriptionId
      );

      this.resourceClient = new ResourceManagementClient(
        this.credential,
        this.config.subscriptionId
      );

      this.webClient = new WebSiteManagementClient(
        this.credential,
        this.config.subscriptionId
      );

      this.storageClient = new StorageManagementClient(
        this.credential,
        this.config.subscriptionId
      );

      logger.info('Azure clients initialized successfully', {
        subscriptionId: this.config.subscriptionId,
        tenantId: this.config.tenantId
      });
    } catch (error) {
      logger.error('Failed to initialize Azure clients', { error });
      throw new Error(`Azure client initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute operation with retry logic and rate limiting
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: LogContext = {}
  ): Promise<T> {
    const operationId = uuidv4();
    const startTime = Date.now();
    
    // Apply rate limiting
    await this.applyRateLimit();
    
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.retryOptions.maxRetries + 1; attempt++) {
      try {
        logger.debug('Executing Azure operation', {
          ...context,
          operationId,
          attempt,
          maxRetries: this.retryOptions.maxRetries
        });

        const result = await operation();
        
        const duration = Date.now() - startTime;
        logger.info('Azure operation completed successfully', {
          ...context,
          operationId,
          duration,
          attempt
        });
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        const duration = Date.now() - startTime;
        
        logger.warn('Azure operation failed', {
          ...context,
          operationId,
          attempt,
          error: lastError.message,
          duration
        });
        
        // Check if error is retryable
        if (attempt > this.retryOptions.maxRetries || !this.isRetryableError(lastError)) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryOptions.baseDelay * Math.pow(2, attempt - 1),
          this.retryOptions.maxDelay
        );
        
        logger.debug('Retrying Azure operation after delay', {
          ...context,
          operationId,
          delay,
          nextAttempt: attempt + 1
        });
        
        await this.sleep(delay);
      }
    }
    
    // All retries exhausted
    const totalDuration = Date.now() - startTime;
    logger.error('Azure operation failed after all retries', {
      ...context,
      operationId,
      totalDuration,
      attempts: this.retryOptions.maxRetries + 1,
      finalError: lastError?.message
    });
    
    throw lastError || new Error('Operation failed after all retries');
  }

  /**
   * Apply rate limiting between requests
   */
  private async applyRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      await this.sleep(delay);
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
    
    // Log rate limiting info for monitoring
    if (this.requestCount % 100 === 0) {
      logger.debug('Request rate limiting status', {
        totalRequests: this.requestCount,
        rateLimitDelay: this.rateLimitDelay
      });
    }
  }

  /**
   * Check if error is retryable based on error type and message
   */
  private isRetryableError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    
    return this.retryOptions.retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError.toLowerCase()) ||
      error.name.toLowerCase().includes(retryableError.toLowerCase())
    );
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all compute resources (VMs and App Services) in the subscription
   */
  async getAllComputeResources(context: LogContext = {}): Promise<GenericResource[]> {
    return this.executeWithRetry(async () => {
      const resources: GenericResource[] = [];
      
      // Get all resources and filter by type
      const allResources = this.resourceClient.resources.list({
        filter: "resourceType eq 'Microsoft.Compute/virtualMachines' or resourceType eq 'Microsoft.Web/sites'"
      });
      
      for await (const resource of allResources) {
        resources.push(resource);
      }
      
      return resources;
    }, { ...context, operation: 'getAllComputeResources' });
  }

  /**
   * Get detailed information about a virtual machine
   */
  async getVirtualMachine(resourceGroupName: string, vmName: string, context: LogContext = {}): Promise<VirtualMachine> {
    return this.executeWithRetry(async () => {
      return await this.computeClient.virtualMachines.get(resourceGroupName, vmName);
    }, { ...context, operation: 'getVirtualMachine', resourceId: vmName });
  }

  /**
   * Get virtual machine instance view (runtime status)
   */
  async getVirtualMachineInstanceView(resourceGroupName: string, vmName: string, context: LogContext = {}): Promise<VirtualMachineInstanceView> {
    return this.executeWithRetry(async () => {
      return await this.computeClient.virtualMachines.instanceView(resourceGroupName, vmName);
    }, { ...context, operation: 'getVirtualMachineInstanceView', resourceId: vmName });
  }

  /**
   * Get detailed information about an App Service
   */
  async getAppService(resourceGroupName: string, siteName: string, context: LogContext = {}): Promise<Site> {
    return this.executeWithRetry(async () => {
      return await this.webClient.webApps.get(resourceGroupName, siteName);
    }, { ...context, operation: 'getAppService', resourceId: siteName });
  }

  /**
   * Create a resource group
   */
  async createResourceGroup(resourceGroupName: string, location: string, tags: Record<string, string> = {}, context: LogContext = {}): Promise<ResourceGroup> {
    return this.executeWithRetry(async () => {
      const resourceGroupParams = {
        location,
        tags: {
          createdBy: 'mcp-azure-deployment-service',
          createdAt: new Date().toISOString(),
          ...tags
        }
      };
      
      return await this.resourceClient.resourceGroups.createOrUpdate(
        resourceGroupName,
        resourceGroupParams
      );
    }, { ...context, operation: 'createResourceGroup', resourceId: resourceGroupName });
  }

  /**
   * Create a virtual machine
   */
  async createVirtualMachine(
    resourceGroupName: string,
    vmName: string,
    parameters: any,
    context: LogContext = {}
  ): Promise<VirtualMachine> {
    return this.executeWithRetry(async () => {
      const poller = await this.computeClient.virtualMachines.beginCreateOrUpdate(
        resourceGroupName,
        vmName,
        parameters
      );
      
      return await poller.pollUntilDone();
    }, { ...context, operation: 'createVirtualMachine', resourceId: vmName });
  }

  /**
   * Create an App Service Plan
   */
  async createAppServicePlan(
    resourceGroupName: string,
    planName: string,
    location: string,
    sku: string,
    context: LogContext = {}
  ): Promise<AppServicePlan> {
    return this.executeWithRetry(async () => {
      const planParameters = {
        location,
        sku: {
          name: sku,
          tier: sku === 'F1' ? 'Free' : sku.charAt(0) === 'B' ? 'Basic' : 'Standard'
        }
      };
      
      return await this.webClient.appServicePlans.beginCreateOrUpdateAndWait(
        resourceGroupName,
        planName,
        planParameters
      );
    }, { ...context, operation: 'createAppServicePlan', resourceId: planName });
  }

  /**
   * Create an App Service (Web App)
   */
  async createAppService(
    resourceGroupName: string,
    siteName: string,
    serverFarmId: string,
    location: string,
    runtime: string,
    context: LogContext = {}
  ): Promise<Site> {
    return this.executeWithRetry(async () => {
      const siteParameters = {
        location,
        serverFarmId,
        siteConfig: {
          linuxFxVersion: this.getLinuxFxVersion(runtime),
          appSettings: [
            {
              name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE',
              value: 'false'
            }
          ]
        }
      };
      
      return await this.webClient.webApps.beginCreateOrUpdateAndWait(
        resourceGroupName,
        siteName,
        siteParameters
      );
    }, { ...context, operation: 'createAppService', resourceId: siteName });
  }

  /**
   * Create a storage account
   */
  async createStorageAccount(
    resourceGroupName: string,
    accountName: string,
    location: string,
    sku: string,
    context: LogContext = {}
  ): Promise<StorageAccount> {
    return this.executeWithRetry(async () => {
      const parameters = {
        sku: {
          name: sku
        },
        kind: 'StorageV2' as const,
        location,
        accessTier: 'Hot' as const,
        allowBlobPublicAccess: true,
        minimumTlsVersion: 'TLS1_2' as const
      };
      
      const poller = await this.storageClient.storageAccounts.beginCreate(
        resourceGroupName,
        accountName,
        parameters
      );
      
      return await poller.pollUntilDone();
    }, { ...context, operation: 'createStorageAccount', resourceId: accountName });
  }

  /**
   * Get storage account keys
   */
  async getStorageAccountKeys(resourceGroupName: string, accountName: string, context: LogContext = {}): Promise<string> {
    return this.executeWithRetry(async () => {
      const keys = await this.storageClient.storageAccounts.listKeys(
        resourceGroupName,
        accountName
      );
      
      if (!keys.keys || keys.keys.length === 0) {
        throw new Error('No storage account keys found');
      }
      
      const primaryKey = keys.keys[0]?.value;
      if (!primaryKey) {
        throw new Error('Primary storage account key is undefined');
      }
      
      return primaryKey;
    }, { ...context, operation: 'getStorageAccountKeys', resourceId: accountName });
  }

  /**
   * Create blob service client for storage operations
   */
  async createBlobServiceClient(resourceGroupName: string, accountName: string, context: LogContext = {}): Promise<BlobServiceClient> {
    const accountKey = await this.getStorageAccountKeys(resourceGroupName, accountName, context);
    
    const credential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      credential
    );
    
    return blobServiceClient;
  }

  /**
   * Get Linux FX version string for App Service runtime
   */
  private getLinuxFxVersion(runtime: string): string {
    const runtimeMap: Record<string, string> = {
      'node': 'NODE|18-lts',
      'python': 'PYTHON|3.9',
      'dotnet': 'DOTNETCORE|6.0',
      'java': 'JAVA|11-java11',
      'php': 'PHP|8.0'
    };
    
    return runtimeMap[runtime.toLowerCase()] || 'NODE|18-lts';
  }

  /**
   * Test Azure connectivity and authentication
   */
  async testConnection(context: LogContext = {}): Promise<{ success: boolean; error?: string }> {
    try {
      // Simple test by listing resource groups
      const resourceGroups = this.resourceClient.resourceGroups.list();
      await resourceGroups.next();
      
      return { success: true };
    } catch (error) {
      logger.error('Azure connection test failed', { ...context, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown connection error'
      };
    }
  }

  /**
   * Get client statistics for monitoring
   */
  getStatistics(): { requestCount: number; lastRequestTime: number } {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime
    };
  }
}