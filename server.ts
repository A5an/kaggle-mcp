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
    console.log('Kaggle MCP Server starting...');
    console.log('Config received:', { 
      hasUsername: !!config.kaggleUsername, 
      hasKey: !!config.kaggleKey 
    });

    /**
     * Tool: search_kaggle_datasets
     * Search for datasets on Kaggle
     */
    server.registerTool(
      'search_kaggle_datasets',
      {
        title: 'Search Kaggle Datasets',
        description: 'Search for datasets on Kaggle matching the provided query string.',
        inputSchema: {
          query: z.string().min(1).max(100).describe('Search query for datasets')
        }
      },
      async ({ query }) => {
        try {
          console.log(`Searching datasets for: ${query}`);
          
          // Import Node.js modules dynamically
          const { exec } = await import('node:child_process');
          const { promisify } = await import('node:util');
          const execAsync = promisify(exec);

          if (!config.kaggleUsername || !config.kaggleKey) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({
                    error: 'Kaggle credentials not configured. Please set kaggleUsername and kaggleKey.'
                  })
                }
              ]
            };
          }

          const env = {
            ...process.env,
            KAGGLE_USERNAME: config.kaggleUsername,
            KAGGLE_KEY: config.kaggleKey
          };

          const command = `kaggle datasets list -s "${query}" --json`;
          console.log(`Executing: ${command}`);

          const { stdout, stderr } = await execAsync(command, { 
            env,
            timeout: 60000 // 1 minute timeout
          });

          if (stderr && stderr.includes('error')) {
            throw new Error(stderr);
          }

          if (!stdout.trim()) {
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

          const datasets = JSON.parse(stdout);
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
     * Download a Kaggle dataset
     */
    server.registerTool(
      'download_kaggle_dataset',
      {
        title: 'Download Kaggle Dataset',
        description: 'Download and unzip files for a specific Kaggle dataset.',
        inputSchema: {
          dataset_ref: z.string()
            .regex(/^[\w\-\.]+\/[\w\-\.]+$/, 'Dataset reference must be in format "username/dataset-name"')
            .describe('Dataset reference in format "username/dataset-name"'),
          download_path: z.string().optional().describe('Optional download path')
        }
      },
      async ({ dataset_ref, download_path }) => {
        try {
          console.log(`Downloading dataset: ${dataset_ref}`);
          
          // Import Node.js modules dynamically
          const { exec } = await import('node:child_process');
          const { promisify } = await import('node:util');
          const execAsync = promisify(exec);

          if (!config.kaggleUsername || !config.kaggleKey) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({
                    error: 'Kaggle credentials not configured. Please set kaggleUsername and kaggleKey.'
                  })
                }
              ]
            };
          }

          const env = {
            ...process.env,
            KAGGLE_USERNAME: config.kaggleUsername,
            KAGGLE_KEY: config.kaggleKey
          };

          const downloadPath = download_path || `./datasets/${dataset_ref.split('/')[1]}`;
          const command = `kaggle datasets download ${dataset_ref} -p ${downloadPath} --unzip`;
          console.log(`Executing: ${command}`);

          const { stdout, stderr } = await execAsync(command, { 
            env,
            timeout: 300000 // 5 minute timeout
          });

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  message: `Successfully downloaded dataset '${dataset_ref}'`,
                  dataset_ref: dataset_ref,
                  download_path: downloadPath,
                  stdout: stdout,
                  stderr: stderr
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

    console.log('Kaggle MCP Server initialized successfully');
  }
);