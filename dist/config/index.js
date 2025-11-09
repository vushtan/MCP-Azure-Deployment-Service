/**
 * Configuration management for Azure MCP server
 * Handles validation, multi-profile support, and environment variables
 */
import { config as dotenvConfig } from 'dotenv';
import Joi from 'joi';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
// Load environment variables from .env file
dotenvConfig();
/**
 * Configuration validation schema using Joi
 */
const configSchema = Joi.object({
    subscriptionId: Joi.string().guid({ version: 'uuidv4' }).required()
        .messages({
        'string.guid': 'AZURE_SUBSCRIPTION_ID must be a valid UUID',
        'any.required': 'AZURE_SUBSCRIPTION_ID is required'
    }),
    tenantId: Joi.string().guid({ version: 'uuidv4' }).required()
        .messages({
        'string.guid': 'AZURE_TENANT_ID must be a valid UUID',
        'any.required': 'AZURE_TENANT_ID is required'
    }),
    clientId: Joi.string().guid({ version: 'uuidv4' }).required()
        .messages({
        'string.guid': 'AZURE_CLIENT_ID must be a valid UUID',
        'any.required': 'AZURE_CLIENT_ID is required'
    }),
    clientSecret: Joi.string().min(1).required()
        .messages({
        'string.min': 'AZURE_CLIENT_SECRET cannot be empty',
        'any.required': 'AZURE_CLIENT_SECRET is required'
    }),
    defaultRegion: Joi.string().default('eastus')
        .valid('eastus', 'westus', 'westus2', 'eastus2', 'centralus', 'northcentralus', 'southcentralus', 'westcentralus', 'canadacentral', 'canadaeast', 'brazilsouth', 'northeurope', 'westeurope', 'uksouth', 'ukwest', 'francecentral', 'germanywestcentral', 'switzerlandnorth', 'norwayeast', 'japaneast', 'japanwest', 'southeastasia', 'eastasia', 'australiaeast', 'australiasoutheast', 'centralindia', 'southindia', 'westindia', 'koreacentral', 'koreasouth', 'southafricanorth', 'uaenorth'),
    resourceGroupPrefix: Joi.string().default('mcp-rg')
        .pattern(/^[a-zA-Z0-9-_]+$/)
        .messages({
        'string.pattern.base': 'Resource group prefix can only contain alphanumeric characters, hyphens, and underscores'
    }),
    environment: Joi.string().default('AzureCloud')
        .valid('AzureCloud', 'AzureChinaCloud', 'AzureUSGovernment', 'AzureGermanCloud'),
    authorityHost: Joi.string().uri().default('https://login.microsoftonline.com'),
    defaultVmSize: Joi.string().default('Standard_B1s'),
    defaultAppServicePlan: Joi.string().default('F1')
        .valid('F1', 'D1', 'B1', 'B2', 'B3', 'S1', 'S2', 'S3', 'P1V2', 'P2V2', 'P3V2'),
    defaultStorageSku: Joi.string().default('Standard_LRS')
        .valid('Standard_LRS', 'Standard_GRS', 'Standard_RAGRS', 'Premium_LRS')
});
/**
 * Configuration manager class
 */
export class ConfigurationManager {
    static instance;
    profiles = new Map();
    activeProfile = 'default';
    constructor() {
        this.loadConfiguration();
    }
    /**
     * Get singleton instance of ConfigurationManager
     */
    static getInstance() {
        if (!ConfigurationManager.instance) {
            ConfigurationManager.instance = new ConfigurationManager();
        }
        return ConfigurationManager.instance;
    }
    /**
     * Load configuration from environment variables and config files
     */
    loadConfiguration() {
        try {
            // Load default configuration from environment variables
            const defaultConfig = this.loadFromEnvironment();
            this.profiles.set('default', defaultConfig);
            // Load additional profiles from config.json if it exists
            this.loadProfilesFromFile();
        }
        catch (error) {
            throw new Error(`Configuration loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Load configuration from environment variables
     */
    loadFromEnvironment() {
        const rawConfig = {
            subscriptionId: process.env['AZURE_SUBSCRIPTION_ID'],
            tenantId: process.env['AZURE_TENANT_ID'],
            clientId: process.env['AZURE_CLIENT_ID'],
            clientSecret: process.env['AZURE_CLIENT_SECRET'],
            defaultRegion: process.env['AZURE_DEFAULT_REGION'] || 'eastus',
            resourceGroupPrefix: process.env['AZURE_RESOURCE_GROUP_PREFIX'] || 'mcp-rg',
            environment: process.env['AZURE_ENVIRONMENT'] || 'AzureCloud',
            authorityHost: process.env['AZURE_AUTHORITY_HOST'] || 'https://login.microsoftonline.com',
            defaultVmSize: process.env['AZURE_DEFAULT_VM_SIZE'] || 'Standard_B1s',
            defaultAppServicePlan: process.env['AZURE_DEFAULT_APP_SERVICE_PLAN'] || 'F1',
            defaultStorageSku: process.env['AZURE_DEFAULT_STORAGE_SKU'] || 'Standard_LRS'
        };
        return this.validateConfiguration(rawConfig);
    }
    /**
     * Load multiple configuration profiles from config.json
     */
    loadProfilesFromFile() {
        const configPath = join(process.cwd(), 'config.json');
        if (existsSync(configPath)) {
            try {
                const configFile = readFileSync(configPath, 'utf-8');
                const parsedConfig = JSON.parse(configFile);
                if (parsedConfig.profiles && Array.isArray(parsedConfig.profiles)) {
                    for (const profile of parsedConfig.profiles) {
                        if (profile.name && profile.config) {
                            const validatedConfig = this.validateConfiguration(profile.config);
                            this.profiles.set(profile.name, validatedConfig);
                        }
                    }
                }
            }
            catch (error) {
                console.warn(`Failed to load config.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }
    /**
     * Validate configuration object against schema
     */
    validateConfiguration(config) {
        const { error, value } = configSchema.validate(config, {
            allowUnknown: false,
            stripUnknown: true,
            abortEarly: false
        });
        if (error) {
            const errorMessages = error.details.map((detail) => detail.message).join(', ');
            throw new Error(`Configuration validation failed: ${errorMessages}`);
        }
        return value;
    }
    /**
     * Get current active configuration
     */
    getConfig() {
        const config = this.profiles.get(this.activeProfile);
        if (!config) {
            throw new Error(`Profile '${this.activeProfile}' not found`);
        }
        return config;
    }
    /**
     * Get configuration for specific profile
     */
    getProfileConfig(profileName) {
        const config = this.profiles.get(profileName);
        if (!config) {
            throw new Error(`Profile '${profileName}' not found`);
        }
        return config;
    }
    /**
     * Set active configuration profile
     */
    setActiveProfile(profileName) {
        if (!this.profiles.has(profileName)) {
            throw new Error(`Profile '${profileName}' not found`);
        }
        this.activeProfile = profileName;
    }
    /**
     * Get list of available profile names
     */
    getAvailableProfiles() {
        return Array.from(this.profiles.keys());
    }
    /**
     * Get current active profile name
     */
    getActiveProfile() {
        return this.activeProfile;
    }
    /**
     * Add or update a configuration profile
     */
    addProfile(name, config) {
        const validatedConfig = this.validateConfiguration(config);
        this.profiles.set(name, validatedConfig);
    }
    /**
     * Remove a configuration profile
     */
    removeProfile(name) {
        if (name === 'default') {
            throw new Error('Cannot remove default profile');
        }
        if (this.activeProfile === name) {
            this.activeProfile = 'default';
        }
        return this.profiles.delete(name);
    }
    /**
     * Test configuration by attempting to create Azure clients
     */
    async testConfiguration(profileName) {
        try {
            const config = profileName ? this.getProfileConfig(profileName) : this.getConfig();
            // Basic validation - check if all required fields are present
            if (!config.subscriptionId || !config.tenantId || !config.clientId || !config.clientSecret) {
                return {
                    valid: false,
                    error: 'Missing required Azure credentials'
                };
            }
            // Additional validation could be added here to test actual Azure connectivity
            // For now, we'll just validate the configuration structure
            return { valid: true };
        }
        catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Unknown configuration error'
            };
        }
    }
    /**
     * Get configuration summary for debugging (without sensitive data)
     */
    getConfigSummary() {
        const config = this.getConfig();
        return {
            activeProfile: this.activeProfile,
            availableProfiles: this.getAvailableProfiles(),
            subscriptionId: config.subscriptionId,
            tenantId: config.tenantId,
            defaultRegion: config.defaultRegion,
            resourceGroupPrefix: config.resourceGroupPrefix,
            environment: config.environment,
            defaultVmSize: config.defaultVmSize,
            defaultAppServicePlan: config.defaultAppServicePlan,
            // Sensitive fields are omitted
            clientIdPresent: !!config.clientId,
            clientSecretPresent: !!config.clientSecret
        };
    }
}
/**
 * Export singleton instance for easy access
 */
export const config = ConfigurationManager.getInstance();
//# sourceMappingURL=index.js.map