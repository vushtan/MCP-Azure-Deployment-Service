/**
 * MCP (Model Context Protocol) server implementation for Azure deployments
 * Provides JSON-RPC server with tool registration and request handling
 */
import type { JSONRPCRequest, JSONRPCResponse, ToolDefinition } from '../types/index.js';
/**
 * MCP Server class implementing JSON-RPC protocol for Azure operations
 */
export declare class MCPServer {
    private azureOperations;
    private toolHandlers;
    constructor();
    /**
     * Register all Azure operation tools
     */
    private registerTools;
    /**
     * Register a tool handler
     */
    private registerTool;
    /**
     * Get list of available tools
     */
    getAvailableTools(): ToolDefinition[];
    /**
     * Handle JSON-RPC request
     */
    handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse>;
    /**
     * Call a specific tool
     */
    private callTool;
    /**
     * Basic parameter validation
     */
    private validateParams;
    /**
     * Format tool execution result for display
     */
    private formatToolResult;
    /**
     * Create success response
     */
    private createSuccessResponse;
    /**
     * Create error response
     */
    private createErrorResponse;
    /**
     * Start the MCP server (stdio-based)
     */
    start(): Promise<void>;
}
/**
 * Create and export server instance
 */
export declare const server: MCPServer;
//# sourceMappingURL=mcp-server.d.ts.map