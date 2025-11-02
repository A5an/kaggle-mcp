#!/usr/bin/env node

// Standalone Kaggle MCP Server - Single file with all dependencies bundled
// This avoids module resolution issues in deployment environments

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { exec } = require('child_process');
const { promisify } = require('util');
const { z } = require('zod');

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

// Validation schemas
const DatasetSearchSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(100, 'Query too long')
});

const DatasetDownloadSchema = z.object({
  dataset_ref: z.string()
    .regex(/^[\w\-\.]+\/[\w\-\.]+$/, 'Dataset reference must be in format "username/dataset-name"')
    .min(3, 'Dataset reference too short')
    .max(100, 'Dataset reference too long'),
  download_path: z.string().optional()
});

const CompetitionSearchSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(100, 'Query too long')
});

const CompetitionDownloadSchema = z.object({
  competition_id: z.string()
    .min(1, 'Competition ID cannot be empty')
    .max(50, 'Competition ID too long')
    .regex(/^[\w\-]+$/, 'Competition ID can only contain letters, numbers, and hyphens'),
  download_path: z.string().optional()
});

const EnvironmentSchema = z.object({
  KAGGLE_USERNAME: z.string().min(1, 'KAGGLE_USERNAME is required'),
  KAGGLE_KEY: z.string().min(1, 'KAGGLE_KEY is required'),
  PORT: z.string().optional().default('8080'),
  NODE_ENV: z.string().optional().default('development')
});

// Kaggle Service Class
class KaggleService {
  constructor(kaggleUsername, kaggleKey) {
    this.kaggleUsername = kaggleUsername;
    this.kaggleKey = kaggleKey;
  }

  async executeCommand(command) {
    try {
      if (!this.kaggleUsername || !this.kaggleKey) {
        return {
          success: false,
          stdout: '',
          stderr: 'Kaggle credentials not configured',
          error: new Error('KAGGLE_USERNAME and KAGGLE_KEY environment variables are required')
        };
      }

      const env = {
        ...process.env,
        KAGGLE_USERNAME: this.kaggleUsername,
        KAGGLE_KEY: this.kaggleKey
      };

      const commandString = command.join(' ');
      console.log(`Executing Kaggle command: ${commandString}`);

      const { stdout, stderr } = await execAsync(commandString, { 
        env,
        timeout: 300000 // 5 minute timeout
      });

      return {
        success: true,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      };
    } catch (error) {
      console.error(`Command execution failed: ${error.message}`);
      return {
        success: false,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        error: error
      };
    }
  }

  async validateCredentials() {
    try {
      if (!this.kaggleUsername || !this.kaggleKey) {
        console.log('Kaggle credentials not provided');
        return false;
      }

      const result = await this.executeCommand(['kaggle', 'datasets', 'list', '--page-size', '1']);
      
      if (result.success) {
        console.log('Kaggle credentials validated successfully');
        return true;
      } else {
        console.error('Kaggle credential validation failed:', result.stderr);
        return false;
      }
    } catch (error) {
      console.error('Error validating Kaggle credentials:', error.message);
      return false;
    }
  }

  async searchDatasets(query) {
    const command = ['kaggle', 'datasets', 'list', '-s', `"${query}"`, '--json'];
    const result = await this.executeCommand(command);

    if (!result.success) {
      throw new Error(`Dataset search failed: ${result.stderr}`);
    }

    if (!result.stdout.trim()) {
      return [];
    }

    try {
      const datasets = JSON.parse(result.stdout);
      return datasets.slice(0, 10).map((ds) => ({
        ref: ds.ref || 'N/A',
        title: ds.title || 'N/A',
        subtitle: ds.subtitle || 'N/A',
        downloadCount: ds.downloadCount || 0,
        lastUpdated: ds.lastUpdated || 'N/A',
        usabilityRating: ds.usabilityRating || 'N/A'
      }));
    } catch (parseError) {
      throw new Error(`Failed to parse dataset search results: ${parseError.message}`);
    }
  }

  async downloadDataset(ref, path) {
    const downloadPath = path || `./datasets/${ref.split('/')[1]}`;
    const command = ['kaggle', 'datasets', 'download', ref, '-p', downloadPath, '--unzip'];
    const result = await this.executeCommand(command);

    if (!result.success) {
      return {
        success: false,
        downloadPath,
        downloadedFiles: [],
        fileCount: 0,
        error: result.stderr || 'Download failed'
      };
    }

    return {
      success: true,
      downloadPath,
      downloadedFiles: [],
      fileCount: 0
    };
  }

  async searchCompetitions(query) {
    const command = ['kaggle', 'competitions', 'list', '-s', `"${query}"`, '--json'];
    const result = await this.executeCommand(command);

    if (!result.success) {
      throw new Error(`Competition search failed: ${result.stderr}`);
    }

    if (!result.stdout.trim()) {
      return [];
    }

    try {
      const competitions = JSON.parse(result.stdout);
      return competitions.slice(0, 10).map((comp) => ({
        ref: comp.ref || 'N/A',
        title: comp.title || 'N/A',
        description: (comp.description || 'N/A').substring(0, 200) + '...',
        url: `https://www.kaggle.com/competitions/${comp.ref || ''}`,
        deadline: comp.deadline || 'N/A',
        category: comp.category || 'N/A',
        reward: comp.reward || 'N/A',
        teamCount: comp.teamCount || 0,
        userHasEntered: comp.userHasEntered || false
      }));
    } catch (parseError) {
      throw new Error(`Failed to parse competition search results: ${parseError.message}`);
    }
  }

  async downloadCompetitionData(id, path) {
    const downloadPath = path || `./competitions/${id}`;
    const command = ['kaggle', 'competitions', 'download', id, '-p', downloadPath];
    const result = await this.executeCommand(command);

    if (!result.success) {
      return {
        success: false,
        downloadPath,
        downloadedFiles: [],
        fileCount: 0,
        error: result.stderr || 'Download failed'
      };
    }

    return {
      success: true,
      downloadPath,
      downloadedFiles: [],
      fileCount: 0
    };
  }
}

// Validation functions
function validateDatasetSearch(input) {
  return DatasetSearchSchema.parse(input);
}

function validateDatasetDownload(input) {
  return DatasetDownloadSchema.parse(input);
}

function validateCompetitionSearch(input) {
  return CompetitionSearchSchema.parse(input);
}

function validateCompetitionDownload(input) {
  return CompetitionDownloadSchema.parse(input);
}

function validateEnvironment(input) {
  return EnvironmentSchema.parse(input);
}

// Error handling
function logError(error, context, details) {
  const timestamp = new Date().toISOString();
  const message = typeof error === 'string' ? error : error.message;
  
  const logEntry = {
    timestamp,
    level: 'ERROR',
    message,
    context,
    details,
    stack: typeof error === 'object' ? error.stack : undefined
  };

  console.error(JSON.stringify(logEntry, null, 2));
}

function handleApiError(error, context) {
  logError(error, context);
  
  const userMessage = typeof error === 'string' ? error : error.message;
  const errorResponse = {
    error: userMessage
  };
  
  return JSON.stringify(errorResponse);
}

// MCP Tool handlers
async function searchKaggleDatasets(kaggleService, input) {
  try {
    const validatedInput = validateDatasetSearch(input);
    console.log(`Searching datasets for: ${validatedInput.query}`);
    
    const results = await kaggleService.searchDatasets(validatedInput.query);
    
    if (results.length === 0) {
      return JSON.stringify({
        message: "No datasets found matching the query.",
        results: []
      });
    }

    return JSON.stringify({
      message: `Found ${results.length} datasets`,
      results: results
    }, null, 2);
    
  } catch (error) {
    console.error(`Error searching datasets: ${error.message}`);
    return JSON.stringify({
      error: `Error searching datasets: ${error.message}`
    });
  }
}

async function downloadKaggleDataset(kaggleService, input) {
  try {
    const validatedInput = validateDatasetDownload(input);
    console.log(`Downloading dataset: ${validatedInput.dataset_ref}`);
    
    const result = await kaggleService.downloadDataset(
      validatedInput.dataset_ref, 
      validatedInput.download_path
    );
    
    if (!result.success) {
      return JSON.stringify({
        error: result.error || 'Download failed',
        dataset_ref: validatedInput.dataset_ref
      });
    }

    return JSON.stringify({
      success: true,
      message: `Successfully downloaded dataset '${validatedInput.dataset_ref}'`,
      dataset_ref: validatedInput.dataset_ref,
      download_path: result.downloadPath,
      downloaded_files: result.downloadedFiles,
      file_count: result.fileCount
    }, null, 2);
    
  } catch (error) {
    console.error(`Error downloading dataset: ${error.message}`);
    
    if (error.message.includes('404')) {
      return JSON.stringify({
        error: `Dataset '${input.dataset_ref}' not found or access denied.`
      });
    }
    
    return JSON.stringify({
      error: `Error downloading dataset: ${error.message}`
    });
  }
}

async function searchKaggleCompetitions(kaggleService, input) {
  try {
    const validatedInput = validateCompetitionSearch(input);
    console.log(`Searching competitions for: ${validatedInput.query}`);
    
    const results = await kaggleService.searchCompetitions(validatedInput.query);
    
    if (results.length === 0) {
      return JSON.stringify({
        message: "No competitions found matching the query.",
        results: []
      });
    }

    return JSON.stringify({
      message: `Found ${results.length} competitions`,
      results: results
    }, null, 2);
    
  } catch (error) {
    console.error(`Error searching competitions: ${error.message}`);
    return JSON.stringify({
      error: `Error searching competitions: ${error.message}`
    });
  }
}

async function downloadCompetitionData(kaggleService, input) {
  try {
    const validatedInput = validateCompetitionDownload(input);
    console.log(`Downloading competition data for: ${validatedInput.competition_id}`);
    
    const result = await kaggleService.downloadCompetitionData(
      validatedInput.competition_id, 
      validatedInput.download_path
    );
    
    if (!result.success) {
      return JSON.stringify({
        error: result.error || 'Download failed',
        competition_id: validatedInput.competition_id
      });
    }

    return JSON.stringify({
      success: true,
      message: `Successfully downloaded competition data for '${validatedInput.competition_id}'`,
      competition_id: validatedInput.competition_id,
      download_path: result.downloadPath,
      downloaded_files: result.downloadedFiles,
      file_count: result.fileCount
    }, null, 2);
    
  } catch (error) {
    console.error(`Error downloading competition data: ${error.message}`);
    
    if (error.message.includes('404')) {
      return JSON.stringify({
        error: `Competition '${input.competition_id}' not found or access denied.`
      });
    }
    
    if (error.message.includes('403')) {
      return JSON.stringify({
        error: `Access denied to competition '${input.competition_id}'. You may need to accept the competition rules first.`
      });
    }
    
    return JSON.stringify({
      error: `Error downloading competition data: ${error.message}`
    });
  }
}

// Main server setup
async function startServer() {
  try {
    // Validate environment configuration
    let config;
    try {
      config = validateEnvironment(process.env);
    } catch (error) {
      console.error('Environment validation failed:', error.message);
      process.exit(1);
    }

    // Initialize Express app
    const app = express();
    const port = parseInt(config.PORT || '8080');

    // Middleware
    app.use(cors());
    app.use(express.json());

    // Initialize Kaggle service
    const kaggleService = new KaggleService(config.KAGGLE_USERNAME, config.KAGGLE_KEY);

    // Health check endpoint
    app.get('/health', async (_req, res) => {
      try {
        const credentialsValid = await kaggleService.validateCredentials();

        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          kaggle_credentials: credentialsValid ? 'valid' : 'invalid',
          environment: config.NODE_ENV
        });
      } catch (error) {
        logError(error, 'Health check');
        res.status(500).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Health check failed'
        });
      }
    });

    // MCP tool endpoints
    app.post('/tools/search_kaggle_datasets', async (req, res) => {
      try {
        const result = await searchKaggleDatasets(kaggleService, req.body);
        res.json({ result });
      } catch (error) {
        const errorResponse = handleApiError(error, 'search_kaggle_datasets');
        res.status(500).json({ error: errorResponse });
      }
    });

    app.post('/tools/download_kaggle_dataset', async (req, res) => {
      try {
        const result = await downloadKaggleDataset(kaggleService, req.body);
        res.json({ result });
      } catch (error) {
        const errorResponse = handleApiError(error, 'download_kaggle_dataset');
        res.status(500).json({ error: errorResponse });
      }
    });

    app.post('/tools/search_kaggle_competitions', async (req, res) => {
      try {
        const result = await searchKaggleCompetitions(kaggleService, req.body);
        res.json({ result });
      } catch (error) {
        const errorResponse = handleApiError(error, 'search_kaggle_competitions');
        res.status(500).json({ error: errorResponse });
      }
    });

    app.post('/tools/download_competition_data', async (req, res) => {
      try {
        const result = await downloadCompetitionData(kaggleService, req.body);
        res.json({ result });
      } catch (error) {
        const errorResponse = handleApiError(error, 'download_competition_data');
        res.status(500).json({ error: errorResponse });
      }
    });

    // List available tools
    app.get('/tools', (req, res) => {
      res.json({
        tools: [
          {
            name: 'search_kaggle_datasets',
            description: 'Search for datasets on Kaggle matching the provided query string.',
            endpoint: '/tools/search_kaggle_datasets',
            method: 'POST'
          },
          {
            name: 'download_kaggle_dataset',
            description: 'Download and unzip files for a specific Kaggle dataset.',
            endpoint: '/tools/download_kaggle_dataset',
            method: 'POST'
          },
          {
            name: 'search_kaggle_competitions',
            description: 'Search for competitions on Kaggle matching the provided query string.',
            endpoint: '/tools/search_kaggle_competitions',
            method: 'POST'
          },
          {
            name: 'download_competition_data',
            description: 'Download all competition files including datasets and descriptions.',
            endpoint: '/tools/download_competition_data',
            method: 'POST'
          }
        ]
      });
    });

    // Validate credentials on startup
    console.log('Validating Kaggle credentials...');
    try {
      const isValid = await kaggleService.validateCredentials();
      if (!isValid) {
        console.warn('Warning: Kaggle credentials validation failed. Some features may not work.');
      } else {
        console.log('Kaggle credentials validated successfully.');
      }
    } catch (error) {
      console.warn('Warning: Could not validate Kaggle credentials:', error.message);
    }

    // Start Express server
    app.listen(port, () => {
      console.log(`Kaggle MCP TypeScript Server running on port ${port}`);
      console.log(`Health check available at: http://localhost:${port}/health`);
      console.log(`Tools list available at: http://localhost:${port}/tools`);
      console.log(`Environment: ${config.NODE_ENV}`);
    });

  } catch (error) {
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
if (require.main === module) {
  startServer().catch((error) => {
    logError(error, 'Server startup');
    process.exit(1);
  });
}

module.exports = { startServer, KaggleService };