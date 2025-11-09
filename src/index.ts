#!/usr/bin/env node

/**
 * Main entry point for MCP Azure Deployment Service
 * Starts the JSON-RPC server and handles process lifecycle
 */

import { server } from './server/mcp-server.js';
import { config } from './config/index.js';

/**
 * Main function to start the MCP server
 */
async function main(): Promise<void> {
  try {
    // Test configuration on startup
    console.error('Testing Azure configuration...');
    const configTest = await config.testConfiguration();
    
    if (!configTest.valid) {
      console.error('❌ Configuration validation failed:', configTest.error);
      console.error('Please check your Azure credentials in .env file or environment variables');
      process.exit(1);
    }
    
    console.error('✅ Azure configuration validated successfully');
    console.error('Configuration summary:', config.getConfigSummary());
    
    // Start the MCP server
    await server.start();
    
  } catch (error) {
    console.error('❌ Failed to start MCP server:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Handle uncaught exceptions and rejections
 */
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
main().catch((error) => {
  console.error('Main process error:', error);
  process.exit(1);
});