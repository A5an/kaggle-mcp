import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types';

import { KaggleService } from './services/kaggle.service.js';
import { createDatasetTools } from './tools/dataset.tools.js';
import { createCompetitionTools } from './tools/competition.tools.js';
import { validateEnvironment, EnvironmentConfig } from './utils/validation.js';
import { logError, handleApiError } from './utils/errors.js';

// Load environment variables
dotenv.config();

// Validate environment configuration
let config: EnvironmentConfig;
try {
    config = validateEnvironment(process.env);
} catch (error: any) {
    console.error('Environment validation failed:', error.message);
    process.exit(1);
}

// Initialize Express app
const app = express();
const port = parseInt(config.PORT || '8080');

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (_req, res) => {
    try {
        const kaggleService = new KaggleService(config.KAGGLE_USERNAME, config.KAGGLE_KEY);
        const credentialsValid = await kaggleService.validateCredentials();

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            kaggle_credentials: credentialsValid ? 'valid' : 'invalid',
            environment: config.NODE_ENV
        });
    } catch (error: any) {
        logError(error, 'Health check');
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed'
        });
    }
});

// Initialize Kaggle service
const kaggleService = new KaggleService(config.KAGGLE_USERNAME, config.KAGGLE_KEY);

// Create MCP server
const server = new Server(
    {
        name: 'kaggle-mcp-typescript',
        version: '1.0.0',
    }
);

// Register all MCP tools
const datasetTools = createDatasetTools(kaggleService);
const competitionTools = createCompetitionTools(kaggleService);
const allTools = [...datasetTools, ...competitionTools];

// Add tools to MCP server
allTools.forEach(tool => {
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        if (request.params.name === tool.name) {
            try {
                console.log(`Executing tool: ${tool.name}`);
                const result = await tool.handler(request.params.arguments);
                return {
                    content: [
                        {
                            type: 'text',
                            text: result,
                        },
                    ],
                };
            } catch (error: any) {
                logError(error, `Tool execution: ${tool.name}`);
                const errorResponse = handleApiError(error, tool.name);
                return {
                    content: [
                        {
                            type: 'text',
                            text: errorResponse,
                        },
                    ],
                };
            }
        }
        throw new Error(`Unknown tool: ${request.params.name}`);
    });
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: allTools.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
        })),
    };
});

// Validate credentials on startup
async function validateStartup(): Promise<void> {
    console.log('Validating Kaggle credentials...');

    try {
        const isValid = await kaggleService.validateCredentials();
        if (!isValid) {
            console.warn('Warning: Kaggle credentials validation failed. Some features may not work.');
        } else {
            console.log('Kaggle credentials validated successfully.');
        }
    } catch (error: any) {
        console.warn('Warning: Could not validate Kaggle credentials:', error.message);
    }
}

// Start server
async function startServer(): Promise<void> {
    try {
        // Validate credentials
        await validateStartup();

        // Start Express server
        app.listen(port, () => {
            console.log(`Kaggle MCP TypeScript Server running on port ${port}`);
            console.log(`Health check available at: http://localhost:${port}/health`);
            console.log(`Environment: ${config.NODE_ENV}`);
            console.log(`Available tools: ${allTools.map(t => t.name).join(', ')}`);
        });

        // Start MCP server with stdio transport for CLI usage
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.log('MCP server connected with stdio transport');

    } catch (error: any) {
        logError(error, 'Server startup');
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

// Start the server
startServer().catch((error) => {
    logError(error, 'Server startup');
    process.exit(1);
});