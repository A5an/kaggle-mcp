import { metorial, z } from '@metorial/mcp-server-sdk';

/**
 * Kaggle MCP Server
 * Provides tools for interacting with Kaggle API via CLI
 */

interface Config {
  kaggleUsername: string;
  kaggleKey: string;
}

metorial.createServer<Config>(
  {
    name: 'kaggle-mcp-server',
    version: '1.0.0'
  },
  async (server, config) => {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    
    const execAsync = promisify(exec);

    /**
     * Helper function to execute Kaggle CLI commands
     */
    async function executeKaggleCommand(command: string[]): Promise<{
      success: boolean;
      stdout: string;
      stderr: string;
      error?: Error;
    }> {
      try {
        if (!config.kaggleUsername || !config.kaggleKey) {
          return {
            success: false,
            stdout: '',
            stderr: 'Kaggle credentials not configured',
            error: new Error('KAGGLE_USERNAME and KAGGLE_KEY are required')
          };
        }

        const env = {
          ...process.env,
          KAGGLE_USERNAME: config.kaggleUsername,
          KAGGLE_KEY: config.kaggleKey
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
      } catch (error: any) {
        console.error(`Command execution failed: ${error.message}`);
        return {
          success: false,
          stdout: error.stdout || '',
          stderr: error.stderr || error.message,
          error: error
        };
      }
    }

    /**
     * Validate Kaggle credentials
     */
    async function validateCredentials(): Promise<boolean> {
      try {
        if (!config.kaggleUsername || !config.kaggleKey) {
          console.log('Kaggle credentials not provided');
          return false;
        }

        const result = await executeKaggleCommand(['kaggle', 'datasets', 'list', '--page-size', '1']);
        
        if (result.success) {
          console.log('Kaggle credentials validated successfully');
          return true;
        } else {
          console.error('Kaggle credential validation failed:', result.stderr);
          return false;
        }
      } catch (error: any) {
        console.error('Error validating Kaggle credentials:', error.message);
        return false;
      }
    }

    // Validate credentials on startup
    console.log('Validating Kaggle credentials...');
    const isValid = await validateCredentials();
    if (!isValid) {
      console.warn('Warning: Kaggle credentials validation failed. Some features may not work.');
    }

    // ============================================================================
    // TOOLS
    // ============================================================================

    /**
     * Tool: search_kaggle_datasets
     * Search for datasets on Kaggle
     */
    server.registerTool(
      'search_kaggle_datasets',
      {
        title: 'Search Kaggle Datasets',
        description: 'Search for datasets on Kaggle matching the provided query string. Returns a JSON list of matching datasets with details like reference, title, download count, and last updated date.',
        inputSchema: {
          query: z.string().min(1, 'Query cannot be empty').max(100, 'Query too long').describe('Search query for datasets')
        }
      },
      async ({ query }) => {
        try {
          console.log(`Searching datasets for: ${query}`);
          
          const command = ['kaggle', 'datasets', 'list', '-s', `"${query}"`, '--json'];
          const result = await executeKaggleCommand(command);

          if (!result.success) {
            throw new Error(`Dataset search failed: ${result.stderr}`);
          }

          if (!result.stdout.trim()) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({
                    message: "No datasets found matching the query.",
                    results: []
                  }, null, 2)
                }
              ]
            };
          }

          const datasets = JSON.parse(result.stdout);
          const limitedResults = datasets.slice(0, 10).map((ds: any) => ({
            ref: ds.ref || 'N/A',
            title: ds.title || 'N/A',
            subtitle: ds.subtitle || 'N/A',
            downloadCount: ds.downloadCount || 0,
            lastUpdated: ds.lastUpdated || 'N/A',
            usabilityRating: ds.usabilityRating || 'N/A'
          }));

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  message: `Found ${limitedResults.length} datasets`,
                  results: limitedResults
                }, null, 2)
              }
            ]
          };
          
        } catch (error: any) {
          console.error(`Error searching datasets: ${error.message}`);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: `Error searching datasets: ${error.message}`
                })
              }
            ]
          };
        }
      }
    );

    /**
     * Tool: download_kaggle_dataset
     * Download and unzip files for a specific Kaggle dataset
     */
    server.registerTool(
      'download_kaggle_dataset',
      {
        title: 'Download Kaggle Dataset',
        description: 'Download and unzip files for a specific Kaggle dataset. The dataset_ref should be in format "username/dataset-slug" (e.g., "kaggle/titanic"). Optionally specify a download path.',
        inputSchema: {
          dataset_ref: z.string()
            .regex(/^[\w\-\.]+\/[\w\-\.]+$/, 'Dataset reference must be in format "username/dataset-name"')
            .min(3, 'Dataset reference too short')
            .max(100, 'Dataset reference too long')
            .describe('Dataset reference in format "username/dataset-name"'),
          download_path: z.string().optional().describe('Optional download path')
        }
      },
      async ({ dataset_ref, download_path }) => {
        try {
          console.log(`Downloading dataset: ${dataset_ref}`);
          
          const downloadPath = download_path || `./datasets/${dataset_ref.split('/')[1]}`;
          const command = ['kaggle', 'datasets', 'download', dataset_ref, '-p', downloadPath, '--unzip'];
          const result = await executeKaggleCommand(command);
          
          if (!result.success) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({
                    error: result.stderr || 'Download failed',
                    dataset_ref: dataset_ref
                  })
                }
              ]
            };
          }

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  message: `Successfully downloaded dataset '${dataset_ref}'`,
                  dataset_ref: dataset_ref,
                  download_path: downloadPath,
                  downloaded_files: [], // TODO: List actual files
                  file_count: 0
                }, null, 2)
              }
            ]
          };
          
        } catch (error: any) {
          console.error(`Error downloading dataset: ${error.message}`);
          
          if (error.message.includes('404')) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({
                    error: `Dataset '${dataset_ref}' not found or access denied.`
                  })
                }
              ]
            };
          }
          
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: `Error downloading dataset: ${error.message}`
                })
              }
            ]
          };
        }
      }
    );

    /**
     * Tool: search_kaggle_competitions
     * Search for competitions on Kaggle
     */
    server.registerTool(
      'search_kaggle_competitions',
      {
        title: 'Search Kaggle Competitions',
        description: 'Search for competitions on Kaggle matching the provided query string. Returns a JSON list of matching competitions with details like title, deadline, reward, and team count.',
        inputSchema: {
          query: z.string().min(1, 'Query cannot be empty').max(100, 'Query too long').describe('Search query for competitions')
        }
      },
      async ({ query }) => {
        try {
          console.log(`Searching competitions for: ${query}`);
          
          const command = ['kaggle', 'competitions', 'list', '-s', `"${query}"`, '--json'];
          const result = await executeKaggleCommand(command);

          if (!result.success) {
            throw new Error(`Competition search failed: ${result.stderr}`);
          }

          if (!result.stdout.trim()) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({
                    message: "No competitions found matching the query.",
                    results: []
                  })
                }
              ]
            };
          }

          const competitions = JSON.parse(result.stdout);
          const limitedResults = competitions.slice(0, 10).map((comp: any) => ({
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

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  message: `Found ${limitedResults.length} competitions`,
                  results: limitedResults
                }, null, 2)
              }
            ]
          };
          
        } catch (error: any) {
          console.error(`Error searching competitions: ${error.message}`);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: `Error searching competitions: ${error.message}`
                })
              }
            ]
          };
        }
      }
    );

    /**
     * Tool: download_competition_data
     * Download all competition files
     */
    server.registerTool(
      'download_competition_data',
      {
        title: 'Download Competition Data',
        description: 'Download all competition files including datasets, sample submissions, and descriptions. The competition_id should be the competition identifier (e.g., "titanic"). Optionally specify a download path.',
        inputSchema: {
          competition_id: z.string()
            .min(1, 'Competition ID cannot be empty')
            .max(50, 'Competition ID too long')
            .regex(/^[\w\-]+$/, 'Competition ID can only contain letters, numbers, and hyphens')
            .describe('Competition identifier'),
          download_path: z.string().optional().describe('Optional download path')
        }
      },
      async ({ competition_id, download_path }) => {
        try {
          console.log(`Downloading competition data for: ${competition_id}`);
          
          const downloadPath = download_path || `./competitions/${competition_id}`;
          const command = ['kaggle', 'competitions', 'download', competition_id, '-p', downloadPath];
          const result = await executeKaggleCommand(command);
          
          if (!result.success) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({
                    error: result.stderr || 'Download failed',
                    competition_id: competition_id
                  })
                }
              ]
            };
          }

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  message: `Successfully downloaded competition data for '${competition_id}'`,
                  competition_id: competition_id,
                  download_path: downloadPath,
                  downloaded_files: [], // TODO: List actual files
                  file_count: 0
                }, null, 2)
              }
            ]
          };
          
        } catch (error: any) {
          console.error(`Error downloading competition data: ${error.message}`);
          
          if (error.message.includes('404')) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({
                    error: `Competition '${competition_id}' not found or access denied.`
                  })
                }
              ]
            };
          }
          
          if (error.message.includes('403')) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({
                    error: `Access denied to competition '${competition_id}'. You may need to accept the competition rules first.`
                  })
                }
              ]
            };
          }
          
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: `Error downloading competition data: ${error.message}`
                })
              }
            ]
          };
        }
      }
    );
  }
);