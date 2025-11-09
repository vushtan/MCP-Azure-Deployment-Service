/**
 * Configuration management for Azure MCP server
 * Handles validation, multi-profile support, and environment variables
 */
import type { AzureConfiguration } from '../types/index.js';
/**
 * Configuration manager class
 */
export declare class ConfigurationManager {
    private static instance;
    private profiles;
    private activeProfile;
    private constructor();
    /**
     * Get singleton instance of ConfigurationManager
     */
    static getInstance(): ConfigurationManager;
    /**
     * Load configuration from environment variables and config files
     */
    private loadConfiguration;
    /**
     * Load configuration from environment variables
     */
    private loadFromEnvironment;
    /**
     * Load multiple configuration profiles from config.json
     */
    private loadProfilesFromFile;
    /**
     * Validate configuration object against schema
     */
    private validateConfiguration;
    /**
     * Get current active configuration
     */
    getConfig(): AzureConfiguration;
    /**
     * Get configuration for specific profile
     */
    getProfileConfig(profileName: string): AzureConfiguration;
    /**
     * Set active configuration profile
     */
    setActiveProfile(profileName: string): void;
    /**
     * Get list of available profile names
     */
    getAvailableProfiles(): string[];
    /**
     * Get current active profile name
     */
    getActiveProfile(): string;
    /**
     * Add or update a configuration profile
     */
    addProfile(name: string, config: Partial<AzureConfiguration>): void;
    /**
     * Remove a configuration profile
     */
    removeProfile(name: string): boolean;
    /**
     * Test configuration by attempting to create Azure clients
     */
    testConfiguration(profileName?: string): Promise<{
        valid: boolean;
        error?: string;
    }>;
    /**
     * Get configuration summary for debugging (without sensitive data)
     */
    getConfigSummary(): Record<string, any>;
}
/**
 * Export singleton instance for easy access
 */
export declare const config: ConfigurationManager;
//# sourceMappingURL=index.d.ts.map