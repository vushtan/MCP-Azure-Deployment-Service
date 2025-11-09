/**
 * MCP (Model Context Protocol) server implementation for Azure deployments
 * Provides JSON-RPC server with tool registration and request handling
 */
import { AzureOperations } from '../tools/azure-operations.js';
/**
 * MCP Server class implementing JSON-RPC protocol for Azure operations
 */
export class MCPServer {
    azureOperations;
    toolHandlers = new Map();
    constructor() {
        this.azureOperations = new AzureOperations();
        this.registerTools();
    }
    /**
     * Register all Azure operation tools
     */
    registerTools() {
        // Tool 1: Get Existing Servers
        this.registerTool({
            definition: {
                name: 'azure.getExistingServers',
                description: 'List all compute resources (VMs, App Services) in Azure subscription',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            handler: async () => {
                return await this.azureOperations.getExistingServers();
            }
        });
        // Tool 2: Deploy Minimal Instance
        this.registerTool({
            definition: {
                name: 'azure.deployMinimalInstance',
                description: 'Create a basic Azure compute instance (VM or App Service)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        instanceType: {
                            type: 'string',
                            enum: ['vm', 'appservice'],
                            description: 'Type of instance to deploy (vm or appservice)'
                        },
                        region: {
                            type: 'string',
                            description: 'Azure region to deploy to (e.g., eastus, westus2)'
                        },
                        namePrefix: {
                            type: 'string',
                            description: 'Prefix for resource names (max 20 characters)',
                            maxLength: 20
                        },
                        size: {
                            type: 'string',
                            description: 'Instance size (e.g., Standard_B1s for VM, F1 for App Service)',
                            default: 'Standard_B1s'
                        },
                        osType: {
                            type: 'string',
                            enum: ['Linux', 'Windows'],
                            description: 'Operating system type (for VMs only)',
                            default: 'Linux'
                        },
                        adminUsername: {
                            type: 'string',
                            description: 'Administrator username (for VMs only)',
                            default: 'azureuser'
                        },
                        adminPassword: {
                            type: 'string',
                            description: 'Administrator password (for VMs only, auto-generated if not provided)'
                        },
                        resourceGroupName: {
                            type: 'string',
                            description: 'Custom resource group name (auto-generated if not provided)'
                        },
                        tags: {
                            type: 'object',
                            description: 'Resource tags as key-value pairs',
                            additionalProperties: {
                                type: 'string'
                            }
                        },
                        dryRun: {
                            type: 'boolean',
                            description: 'Preview deployment without creating resources',
                            default: false
                        }
                    },
                    required: ['instanceType', 'region', 'namePrefix']
                }
            },
            handler: async (params) => {
                return await this.azureOperations.deployMinimalInstance(params);
            }
        });
        // Tool 3: Deploy Backend
        this.registerTool({
            definition: {
                name: 'azure.deployBackend',
                description: 'Deploy backend application code to Azure instance',
                inputSchema: {
                    type: 'object',
                    properties: {
                        instanceId: {
                            type: 'string',
                            description: 'Target instance ID or name'
                        },
                        deploymentPackage: {
                            type: 'string',
                            description: 'Path to deployment package (zip file or container image)'
                        },
                        runtime: {
                            type: 'string',
                            enum: ['node', 'python', 'dotnet', 'java', 'php'],
                            description: 'Runtime environment for the backend application'
                        },
                        environmentVariables: {
                            type: 'object',
                            description: 'Environment variables as key-value pairs',
                            additionalProperties: {
                                type: 'string'
                            }
                        },
                        startupCommand: {
                            type: 'string',
                            description: 'Custom startup command for the application'
                        },
                        healthCheckPath: {
                            type: 'string',
                            description: 'Health check endpoint path (e.g., /health)',
                            pattern: '^/'
                        },
                        dryRun: {
                            type: 'boolean',
                            description: 'Preview deployment without applying changes',
                            default: false
                        }
                    },
                    required: ['instanceId', 'deploymentPackage', 'runtime']
                }
            },
            handler: async (params) => {
                return await this.azureOperations.deployBackend(params);
            }
        });
        // Tool 4: Deploy Frontend
        this.registerTool({
            definition: {
                name: 'azure.deployFrontend',
                description: 'Deploy frontend static files to Azure with CDN support',
                inputSchema: {
                    type: 'object',
                    properties: {
                        instanceId: {
                            type: 'string',
                            description: 'Target instance ID or storage account name'
                        },
                        buildDirectory: {
                            type: 'string',
                            description: 'Path to directory containing built static files'
                        },
                        customDomain: {
                            type: 'string',
                            description: 'Custom domain name for the frontend (optional)'
                        },
                        enableCdn: {
                            type: 'boolean',
                            description: 'Enable Azure CDN for improved performance',
                            default: false
                        },
                        indexDocument: {
                            type: 'string',
                            description: 'Default document for static website',
                            default: 'index.html'
                        },
                        errorDocument: {
                            type: 'string',
                            description: 'Error document for static website',
                            default: 'error.html'
                        },
                        cacheControl: {
                            type: 'string',
                            description: 'Cache control header for static files',
                            default: 'public, max-age=31536000'
                        },
                        dryRun: {
                            type: 'boolean',
                            description: 'Preview deployment without uploading files',
                            default: false
                        }
                    },
                    required: ['instanceId', 'buildDirectory']
                }
            },
            handler: async (params) => {
                return await this.azureOperations.deployFrontend(params);
            }
        });
        console.error(`Registered ${this.toolHandlers.size} Azure operation tools`);
    }
    /**
     * Register a tool handler
     */
    registerTool(toolHandler) {
        this.toolHandlers.set(toolHandler.definition.name, toolHandler);
    }
    /**
     * Get list of available tools
     */
    getAvailableTools() {
        return Array.from(this.toolHandlers.values()).map(handler => handler.definition);
    }
    /**
     * Handle JSON-RPC request
     */
    async handleRequest(request) {
        const startTime = Date.now();
        try {
            console.error(`Handling JSON-RPC request: ${request.method}`, {
                id: request.id,
                method: request.method,
                hasParams: !!request.params
            });
            // Validate JSON-RPC format
            if (request.jsonrpc !== '2.0') {
                throw new Error('Invalid JSON-RPC version. Expected "2.0"');
            }
            if (!request.method || typeof request.method !== 'string') {
                throw new Error('Invalid or missing method in JSON-RPC request');
            }
            // Handle built-in methods
            if (request.method === 'tools/list') {
                return this.createSuccessResponse(request.id, {
                    tools: this.getAvailableTools()
                });
            }
            if (request.method === 'tools/call') {
                if (!request.params || !request.params['name']) {
                    throw new Error('Missing tool name in tools/call request');
                }
                return await this.callTool(request.id, request.params['name'], request.params['arguments'] || {});
            }
            // Handle server capabilities and initialization
            if (request.method === 'initialize') {
                return this.createSuccessResponse(request.id, {
                    protocolVersion: '2024-11-05',
                    capabilities: {
                        tools: {
                            listChanged: false
                        }
                    },
                    serverInfo: {
                        name: 'mcp-azure-deployment-service',
                        version: '1.0.0'
                    }
                });
            }
            if (request.method === 'initialized') {
                return this.createSuccessResponse(request.id, {});
            }
            // Unknown method
            throw new Error(`Unknown method: ${request.method}`);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            console.error(`JSON-RPC request failed after ${duration}ms:`, {
                id: request.id,
                method: request.method,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return this.createErrorResponse(request.id, {
                code: -32603, // Internal error
                message: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }
    /**
     * Call a specific tool
     */
    async callTool(requestId, toolName, params) {
        const startTime = Date.now();
        try {
            console.error(`Calling tool: ${toolName}`, { params });
            const toolHandler = this.toolHandlers.get(toolName);
            if (!toolHandler) {
                throw new Error(`Tool not found: ${toolName}`);
            }
            // Validate parameters against schema (basic validation)
            this.validateParams(params, toolHandler.definition.inputSchema);
            // Execute tool
            const result = await toolHandler.handler(params);
            const duration = Date.now() - startTime;
            console.error(`Tool execution completed: ${toolName} in ${duration}ms`);
            return this.createSuccessResponse(requestId, {
                content: [
                    {
                        type: 'text',
                        text: this.formatToolResult(toolName, result)
                    }
                ]
            });
        }
        catch (error) {
            const duration = Date.now() - startTime;
            console.error(`Tool execution failed: ${toolName} after ${duration}ms:`, error);
            return this.createErrorResponse(requestId, {
                code: -32000, // Server error
                message: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    }
    /**
     * Basic parameter validation
     */
    validateParams(params, schema) {
        if (!schema || !schema.required) {
            return;
        }
        for (const requiredField of schema.required) {
            if (!(requiredField in params)) {
                throw new Error(`Missing required parameter: ${requiredField}`);
            }
        }
        // Additional validation could be implemented here using a JSON schema validator
    }
    /**
     * Format tool execution result for display
     */
    formatToolResult(toolName, result) {
        const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
        const timestamp = new Date(result.timestamp).toLocaleString();
        let output = `${status} - ${toolName}\n`;
        output += `📅 Time: ${timestamp}\n`;
        if (result.resourceId) {
            output += `🆔 Resource ID: ${result.resourceId}\n`;
        }
        output += `📊 Operation: ${result.operation}\n\n`;
        if (result.success) {
            output += '**Result:**\n';
            output += '```json\n';
            output += JSON.stringify(result.details, null, 2);
            output += '\n```';
        }
        else {
            output += '**Error Details:**\n';
            output += JSON.stringify(result.details, null, 2);
        }
        return output;
    }
    /**
     * Create success response
     */
    createSuccessResponse(id, result) {
        return {
            jsonrpc: '2.0',
            id,
            result
        };
    }
    /**
     * Create error response
     */
    createErrorResponse(id, error) {
        return {
            jsonrpc: '2.0',
            id,
            error
        };
    }
    /**
     * Start the MCP server (stdio-based)
     */
    async start() {
        console.error('Starting MCP Azure Deployment Server...');
        console.error('Listening for JSON-RPC requests on stdin');
        process.stdin.setEncoding('utf8');
        let buffer = '';
        process.stdin.on('data', async (chunk) => {
            buffer += chunk;
            // Process complete JSON-RPC messages (one per line)
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const request = JSON.parse(line);
                        const response = await this.handleRequest(request);
                        // Send response to stdout
                        console.log(JSON.stringify(response));
                    }
                    catch (error) {
                        console.error('Failed to parse JSON-RPC request:', error);
                        // Send error response for malformed request
                        const errorResponse = {
                            jsonrpc: '2.0',
                            id: null,
                            error: {
                                code: -32700, // Parse error
                                message: 'Parse error'
                            }
                        };
                        console.log(JSON.stringify(errorResponse));
                    }
                }
            }
        });
        process.stdin.on('end', () => {
            console.error('MCP server stdin ended, shutting down...');
            process.exit(0);
        });
        process.on('SIGINT', () => {
            console.error('MCP server received SIGINT, shutting down...');
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            console.error('MCP server received SIGTERM, shutting down...');
            process.exit(0);
        });
    }
}
/**
 * Create and export server instance
 */
export const server = new MCPServer();
//# sourceMappingURL=mcp-server.js.map