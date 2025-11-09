/**
 * Core types for the MCP Azure Deployment Service
 * Defines interfaces for Azure operations, responses, and configuration
 */

export interface AzureCredentials {
  subscriptionId: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

export interface AzureConfiguration extends AzureCredentials {
  defaultRegion: string;
  resourceGroupPrefix: string;
  environment?: string;
  authorityHost?: string;
  defaultVmSize?: string;
  defaultAppServicePlan?: string;
  defaultStorageSku?: string;
}

export interface ConfigurationProfile {
  name: string;
  config: AzureConfiguration;
}

export interface MCPResponse<T = any> {
  success: boolean;
  operation: string;
  resourceId?: string;
  details: T;
  timestamp: string;
}

export interface MCPError {
  success: false;
  operation: string;
  error: string;
  errorCode: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface AzureResource {
  id: string;
  name: string;
  type: string;
  status: string;
  region: string;
  resourceGroup: string;
  creationDate: string;
  tags?: Record<string, string>;
  properties?: Record<string, any>;
}

export interface ComputeResource extends AzureResource {
  size?: string;
  osType?: string;
  powerState?: string;
  publicIpAddress?: string;
  privateIpAddress?: string;
  fqdn?: string;
}

export interface AppServiceResource extends AzureResource {
  url?: string;
  state?: string;
  defaultHostName?: string;
  enabledHostNames?: string[];
  repositoryUrl?: string;
  kind?: string;
}

export type AzureComputeResource = ComputeResource | AppServiceResource;

export interface DeployMinimalInstanceParams {
  instanceType: 'vm' | 'appservice';
  region: string;
  namePrefix: string;
  size?: string;
  osType?: 'Linux' | 'Windows';
  adminUsername?: string;
  adminPassword?: string;
  resourceGroupName?: string;
  tags?: Record<string, string>;
  dryRun?: boolean;
}

export interface DeployBackendParams {
  instanceId: string;
  deploymentPackage: string;
  runtime: 'node' | 'python' | 'dotnet' | 'java' | 'php';
  environmentVariables?: Record<string, string>;
  startupCommand?: string;
  healthCheckPath?: string;
  dryRun?: boolean;
}

export interface DeployFrontendParams {
  instanceId: string;
  buildDirectory: string;
  customDomain?: string;
  enableCdn?: boolean;
  indexDocument?: string;
  errorDocument?: string;
  cacheControl?: string;
  dryRun?: boolean;
}

export interface DeploymentResult {
  resourceId: string;
  name: string;
  url?: string;
  ipAddress?: string;
  resourceGroup: string;
  status: string;
  region: string;
  createdAt: string;
  accessInfo?: {
    publicUrl?: string;
    adminUrl?: string;
    credentials?: Record<string, string>;
  };
}

export interface BackendDeploymentResult {
  deploymentId: string;
  applicationUrl: string;
  logsUrl?: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  runtime: string;
  version?: string;
  environmentVariables?: string[];
  healthCheckUrl?: string;
}

export interface FrontendDeploymentResult {
  deploymentId: string;
  publicUrl: string;
  cdnUrl?: string;
  customDomainUrl?: string;
  status: 'pending' | 'succeeded' | 'failed';
  storageAccountName?: string;
  containerName?: string;
  fileCount?: number;
  totalSize?: number;
}

export interface JSONRPCRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, any>;
  id: string | number | null;
}

export interface JSONRPCResponse<T = any> {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: T;
  error?: JSONRPCError;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: any;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolHandler {
  definition: ToolDefinition;
  handler: (params: any) => Promise<MCPResponse>;
}

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

export interface LogContext {
  operation?: string;
  resourceId?: string;
  correlationId?: string;
  userId?: string;
  [key: string]: any;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: {
    azure_connectivity: boolean;
    configuration_valid: boolean;
    credentials_valid: boolean;
  };
  timestamp: string;
  version: string;
}

export interface OperationProgress {
  operationId: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  progress: number;
  message: string;
  startTime: string;
  estimatedCompletion?: string;
  details?: Record<string, any>;
}