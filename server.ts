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

    /**
     * Tool: search_kaggle_competitions
     * Search for competitions on Kaggle
     */
    server.registerTool(
      'search_kaggle_competitions',
      {
        title: 'Search Kaggle Competitions',
        description: 'Search for competitions on Kaggle matching the provided query string.',
        inputSchema: {
          query: z.string().min(0).max(100).describe('Search query for competitions'),
          status: z.string().optional().describe('Competition status: all, active, completed')
        }
      },
      async ({ query, status }) => {
        try {
          console.log(`Searching competitions for: ${query} (status: ${status || 'all'})`);
          
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

          let command = `kaggle competitions list --json`;
          if (query && query.trim()) {
            command = `kaggle competitions list -s "${query}" --json`;
          }
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
                    message: "No competitions found matching the query.",
                    results: []
                  }, null, 2)
                }
              ]
            };
          }

          const competitions = JSON.parse(stdout);
          const limitedResults = competitions.slice(0, 10).map((comp: any) => ({
            ref: comp.ref || 'N/A',
            title: comp.title || 'N/A',
            description: (comp.description || 'N/A').substring(0, 200) + '...',
            url: `https://www.kaggle.com/competitions/${comp.ref || ''}`,
            deadline: comp.deadline || 'N/A',
            category: comp.category || 'N/A',
            reward: comp.reward || 'N/A',
            teamCount: comp.teamCount || 0
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
     * Tool: get_competition_details
     * Get details about a specific competition
     */
    server.registerTool(
      'get_competition_details',
      {
        title: 'Get Competition Details',
        description: 'Get comprehensive details about a specific Kaggle competition.',
        inputSchema: {
          competition_id: z.string().min(1).max(100).describe('Competition identifier (e.g., "titanic")')
        }
      },
      async ({ competition_id }) => {
        try {
          console.log(`Getting competition details for: ${competition_id}`);
          
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

          // Get competition list and find the specific competition
          const command = `kaggle competitions list -s "${competition_id}" --json`;
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
                    error: `Competition '${competition_id}' not found`
                  })
                }
              ]
            };
          }

          const competitions = JSON.parse(stdout);
          const competition = competitions.find((comp: any) => 
            comp.ref === competition_id || comp.ref?.includes(competition_id)
          ) || competitions[0]; // Fallback to first result

          if (!competition) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({
                    error: `Competition '${competition_id}' not found`
                  })
                }
              ]
            };
          }

          const details = {
            id: competition_id,
            title: competition.title || 'N/A',
            description: competition.description || 'N/A',
            evaluation_metric: competition.evaluationMetric || 'N/A',
            deadline: competition.deadline || 'N/A',
            category: competition.category || 'N/A',
            reward: competition.reward || 'N/A',
            team_count: competition.teamCount || 0,
            user_has_entered: competition.userHasEntered || false,
            url: `https://www.kaggle.com/competitions/${competition_id}`
          };

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(details, null, 2)
              }
            ]
          };
          
        } catch (error: any) {
          console.error(`Error getting competition details: ${error.message}`);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: `Error getting competition details: ${error.message}`
                })
              }
            ]
          };
        }
      }
    );

    /**
     * Tool: download_competition_data
     * Download competition data files
     */
    server.registerTool(
      'download_competition_data',
      {
        title: 'Download Competition Data',
        description: 'Download all competition files including datasets, sample submissions, and descriptions.',
        inputSchema: {
          competition_id: z.string().min(1).max(100).describe('Competition identifier (e.g., "titanic")'),
          download_path: z.string().optional().describe('Optional download path')
        }
      },
      async ({ competition_id, download_path }) => {
        try {
          console.log(`Downloading competition data for: ${competition_id}`);
          
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

          const downloadPath = download_path || `./competitions/${competition_id}`;
          const command = `kaggle competitions download ${competition_id} -p ${downloadPath}`;
          console.log(`Executing: ${command}`);

          const { stdout, stderr } = await execAsync(command, { 
            env,
            timeout: 300000 // 5 minute timeout
          });

          // List downloaded files
          const listCommand = `find ${downloadPath} -type f -name "*.csv" -o -name "*.zip" -o -name "*.txt" | head -20`;
          let fileList = [];
          try {
            const { stdout: listOutput } = await execAsync(listCommand, { env, timeout: 10000 });
            fileList = listOutput.trim().split('\n').filter(f => f.trim());
          } catch (e) {
            // Ignore file listing errors
          }

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  competition_id: competition_id,
                  download_path: downloadPath,
                  downloaded_files: fileList,
                  file_count: fileList.length,
                  stdout: stdout,
                  stderr: stderr
                }, null, 2)
              }
            ]
          };
          
        } catch (error: any) {
          console.error(`Error downloading competition data: ${error.message}`);
          
          if (error.message.includes('403') || error.message.includes('Forbidden')) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({
                    error: `Access denied for competition '${competition_id}'. You may need to accept the competition rules first.`,
                    solutions: [
                      `Go to https://www.kaggle.com/competitions/${competition_id} and accept the competition rules`,
                      "Join the competition first before downloading data",
                      "Use an accessible competition like 'titanic' instead"
                    ]
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

    /**
     * Tool: submit_to_competition
     * Submit a file to a Kaggle competition
     */
    server.registerTool(
      'submit_to_competition',
      {
        title: 'Submit to Competition',
        description: 'Submit a CSV file to a Kaggle competition.',
        inputSchema: {
          competition_id: z.string().min(1).max(100).describe('Competition identifier (e.g., "titanic")'),
          file_content: z.string().describe('CSV file content to submit'),
          filename: z.string().describe('Name of the submission file'),
          message: z.string().optional().describe('Optional submission message/description')
        }
      },
      async ({ competition_id, file_content, filename, message }) => {
        try {
          console.log(`Submitting to competition: ${competition_id}`);
          
          // Import Node.js modules dynamically
          const { exec } = await import('node:child_process');
          const { promisify } = await import('node:util');
          const { writeFile, mkdir } = await import('node:fs/promises');
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

          // Create temporary directory and file
          const tempDir = `./temp_submissions`;
          const tempFilePath = `${tempDir}/${filename}`;
          
          await mkdir(tempDir, { recursive: true });
          await writeFile(tempFilePath, file_content);

          const submissionMessage = message || "Submission via ML Engineer Agent";
          const command = `kaggle competitions submit ${competition_id} -f ${tempFilePath} -m "${submissionMessage}"`;
          console.log(`Executing: ${command}`);

          const { stdout, stderr } = await execAsync(command, { 
            env,
            timeout: 120000 // 2 minute timeout
          });

          // Clean up temp file
          try {
            const { unlink } = await import('node:fs/promises');
            await unlink(tempFilePath);
          } catch (e) {
            // Ignore cleanup errors
          }

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  competition_id: competition_id,
                  submission_file: filename,
                  message: submissionMessage,
                  stdout: stdout,
                  stderr: stderr
                }, null, 2)
              }
            ]
          };
          
        } catch (error: any) {
          console.error(`Error submitting to competition: ${error.message}`);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: `Error submitting to competition: ${error.message}`
                })
              }
            ]
          };
        }
      }
    );

    console.log('Kaggle MCP Server initialized successfully with all tools');
  }
);