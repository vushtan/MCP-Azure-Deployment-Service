/**
 * Azure operations implementation for the four core MCP methods
 * Provides high-level Azure deployment and management functionality
 */
import type { AzureComputeResource, DeployMinimalInstanceParams, DeployBackendParams, DeployFrontendParams, DeploymentResult, BackendDeploymentResult, FrontendDeploymentResult, MCPResponse } from '../types/index.js';
/**
 * Azure operations service class
 */
export declare class AzureOperations {
    private azureClient;
    constructor();
    /**
     * Method 1: Get Existing Servers
     * Lists all compute resources in subscription (VMs, App Services)
     */
    getExistingServers(): Promise<MCPResponse<AzureComputeResource[]>>;
    /**
     * Method 2: Deploy Minimal Instance
     * Creates a basic VM or App Service with default configuration
     */
    deployMinimalInstance(params: DeployMinimalInstanceParams): Promise<MCPResponse<DeploymentResult>>;
    /**
     * Method 3: Deploy Backend
     * Deploys backend application code to Azure instance
     */
    deployBackend(params: DeployBackendParams): Promise<MCPResponse<BackendDeploymentResult>>;
    /**
     * Method 4: Deploy Frontend
     * Deploys frontend static files to Azure with CDN support
     */
    deployFrontend(params: DeployFrontendParams): Promise<MCPResponse<FrontendDeploymentResult>>;
    /**
     * Process Virtual Machine resource details
     */
    private processVirtualMachine;
    /**
     * Process App Service resource details
     */
    private processAppService;
    /**
     * Deploy a Virtual Machine
     */
    private deployVirtualMachine;
    /**
     * Deploy an App Service
     */
    private deployAppService;
    /**
     * Deploy backend application (placeholder implementation)
     */
    private deployBackendApplication;
    /**
     * Deploy frontend application (placeholder implementation)
     */
    private deployFrontendApplication;
    /**
     * Validation methods
     */
    private validateDeployMinimalInstanceParams;
    private validateDeployBackendParams;
    private validateDeployFrontendParams;
    /**
     * Utility methods
     */
    private extractResourceGroupFromId;
    private generatePassword;
}
//# sourceMappingURL=azure-operations.d.ts.map