/**
 * Azure client wrapper with retry logic, rate limiting, and comprehensive error handling
 * Provides a unified interface for all Azure operations with proper logging and monitoring
 */
import { type VirtualMachine, type VirtualMachineInstanceView } from '@azure/arm-compute';
import { type ResourceGroup, type GenericResource } from '@azure/arm-resources';
import { type Site, type AppServicePlan } from '@azure/arm-appservice';
import { type StorageAccount } from '@azure/arm-storage';
import { BlobServiceClient } from '@azure/storage-blob';
import type { AzureConfiguration, RetryOptions, LogContext } from '../types/index.js';
/**
 * Azure client wrapper class providing unified access to Azure services
 */
export declare class AzureClientManager {
    private config;
    private credential;
    private computeClient;
    private resourceClient;
    private webClient;
    private storageClient;
    private retryOptions;
    private requestCount;
    private lastRequestTime;
    private readonly rateLimitDelay;
    constructor(config: AzureConfiguration, retryOptions?: Partial<RetryOptions>);
    /**
     * Initialize Azure SDK clients with proper authentication
     */
    private initializeClients;
    /**
     * Execute operation with retry logic and rate limiting
     */
    private executeWithRetry;
    /**
     * Apply rate limiting between requests
     */
    private applyRateLimit;
    /**
     * Check if error is retryable based on error type and message
     */
    private isRetryableError;
    /**
     * Sleep utility function
     */
    private sleep;
    /**
     * Get all compute resources (VMs and App Services) in the subscription
     */
    getAllComputeResources(context?: LogContext): Promise<GenericResource[]>;
    /**
     * Get detailed information about a virtual machine
     */
    getVirtualMachine(resourceGroupName: string, vmName: string, context?: LogContext): Promise<VirtualMachine>;
    /**
     * Get virtual machine instance view (runtime status)
     */
    getVirtualMachineInstanceView(resourceGroupName: string, vmName: string, context?: LogContext): Promise<VirtualMachineInstanceView>;
    /**
     * Get detailed information about an App Service
     */
    getAppService(resourceGroupName: string, siteName: string, context?: LogContext): Promise<Site>;
    /**
     * Create a resource group
     */
    createResourceGroup(resourceGroupName: string, location: string, tags?: Record<string, string>, context?: LogContext): Promise<ResourceGroup>;
    /**
     * Create a virtual machine
     */
    createVirtualMachine(resourceGroupName: string, vmName: string, parameters: any, context?: LogContext): Promise<VirtualMachine>;
    /**
     * Create an App Service Plan
     */
    createAppServicePlan(resourceGroupName: string, planName: string, location: string, sku: string, context?: LogContext): Promise<AppServicePlan>;
    /**
     * Create an App Service (Web App)
     */
    createAppService(resourceGroupName: string, siteName: string, serverFarmId: string, location: string, runtime: string, context?: LogContext): Promise<Site>;
    /**
     * Create a storage account
     */
    createStorageAccount(resourceGroupName: string, accountName: string, location: string, sku: string, context?: LogContext): Promise<StorageAccount>;
    /**
     * Get storage account keys
     */
    getStorageAccountKeys(resourceGroupName: string, accountName: string, context?: LogContext): Promise<string>;
    /**
     * Create blob service client for storage operations
     */
    createBlobServiceClient(resourceGroupName: string, accountName: string, context?: LogContext): Promise<BlobServiceClient>;
    /**
     * Get Linux FX version string for App Service runtime
     */
    private getLinuxFxVersion;
    /**
     * Test Azure connectivity and authentication
     */
    testConnection(context?: LogContext): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Get client statistics for monitoring
     */
    getStatistics(): {
        requestCount: number;
        lastRequestTime: number;
    };
}
//# sourceMappingURL=azure-client.d.ts.map