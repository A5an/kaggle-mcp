import { metorial, z } from '@metorial/mcp-server-sdk';

/**
 * Kaggle MCP Server
 * Provides tools for interacting with Kaggle REST API directly
 */

interface Config {
  kaggleUsername: string;
  kaggleKey: string;
}

// Kaggle API base URL
const KAGGLE_API_BASE = 'https://www.kaggle.com/api/v1';

// Helper function to make authenticated requests to Kaggle API
async function kaggleApiRequest(endpoint: string, config: Config, options: RequestInit = {}) {
  const auth = Buffer.from(`${config.kaggleUsername}:${config.kaggleKey}`).toString('base64');

  const response = await fetch(`${KAGGLE_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Kaggle API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
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

          // Use Kaggle REST API
          const searchParams = new URLSearchParams({
            search: query,
            sortBy: 'hottest',
            size: 'all',
            filetype: 'all',
            license: 'all'
          });

          const datasets = await kaggleApiRequest(`/datasets/list?${searchParams}`, config);

          const limitedResults = datasets.slice(0, 10).map((ds: any) => ({
            ref: ds.ref || 'N/A',
            title: ds.title || 'N/A',
            subtitle: ds.subtitle || 'N/A',
            downloadCount: ds.downloadCount || 0,
            lastUpdated: ds.lastUpdated || 'N/A',
            usabilityRating: ds.usabilityRating || 'N/A',
            url: `https://www.kaggle.com/datasets/${ds.ref}`
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
        description: 'Get download information for a specific Kaggle dataset.',
        inputSchema: {
          dataset_ref: z.string()
            .regex(/^[\w\-\.]+\/[\w\-\.]+$/, 'Dataset reference must be in format "username/dataset-name"')
            .describe('Dataset reference in format "username/dataset-name"')
        }
      },
      async ({ dataset_ref }) => {
        try {
          console.log(`Getting dataset info: ${dataset_ref}`);

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

          // Get dataset metadata via API
          const [owner, datasetName] = dataset_ref.split('/');
          const datasetInfo = await kaggleApiRequest(`/datasets/view/${owner}/${datasetName}`, config);

          // Get dataset files list
          const files = await kaggleApiRequest(`/datasets/list/${owner}/${datasetName}/files`, config);

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  message: `Dataset information retrieved for '${dataset_ref}'`,
                  dataset_ref: dataset_ref,
                  title: datasetInfo.title,
                  description: datasetInfo.description,
                  downloadCount: datasetInfo.downloadCount,
                  files: files.map((file: any) => ({
                    name: file.name,
                    size: file.totalBytes,
                    creationDate: file.creationDate
                  })),
                  downloadUrl: `https://www.kaggle.com/datasets/${dataset_ref}/download`,
                  note: "Use the downloadUrl to download files directly"
                }, null, 2)
              }
            ]
          };

        } catch (error: any) {
          console.error(`Error getting dataset info: ${error.message}`);

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
                  error: `Error getting dataset info: ${error.message}`
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

          // Use Kaggle REST API
          const searchParams = new URLSearchParams({
            sortBy: 'latestDeadline'
          });

          if (query && query.trim()) {
            searchParams.append('search', query);
          }

          const competitions = await kaggleApiRequest(`/competitions/list?${searchParams}`, config);

          // Filter by status if specified
          let filteredCompetitions = competitions;
          if (status && status !== 'all') {
            const now = new Date();
            filteredCompetitions = competitions.filter((comp: any) => {
              const deadline = new Date(comp.deadline);
              if (status === 'active') {
                return deadline > now;
              } else if (status === 'completed') {
                return deadline <= now;
              }
              return true;
            });
          }

          const limitedResults = filteredCompetitions.slice(0, 10).map((comp: any) => ({
            ref: comp.ref || 'N/A',
            title: comp.title || 'N/A',
            description: (comp.description || 'N/A').substring(0, 200) + '...',
            url: `https://www.kaggle.com/competitions/${comp.ref || ''}`,
            deadline: comp.deadline || 'N/A',
            category: comp.category || 'N/A',
            reward: comp.reward || 'N/A',
            teamCount: comp.teamCount || 0,
            evaluationMetric: comp.evaluationMetric || 'N/A'
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

          // Use Kaggle REST API to get competition details
          const competitionDetails = await kaggleApiRequest(`/competitions/${competition_id}`, config);

          const details = {
            id: competition_id,
            title: competitionDetails.title || 'N/A',
            description: competitionDetails.description || 'N/A',
            evaluation_metric: competitionDetails.evaluationMetric || 'N/A',
            deadline: competitionDetails.deadline || 'N/A',
            category: competitionDetails.category || 'N/A',
            reward: competitionDetails.reward || 'N/A',
            team_count: competitionDetails.teamCount || 0,
            user_has_entered: competitionDetails.userHasEntered || false,
            url: `https://www.kaggle.com/competitions/${competition_id}`,
            tags: competitionDetails.tags || [],
            organizationName: competitionDetails.organizationName || 'N/A',
            organizationDescription: competitionDetails.organizationDescription || 'N/A'
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

          if (error.message.includes('404')) {
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
     * Get competition data file information
     */
    server.registerTool(
      'download_competition_data',
      {
        title: 'Get Competition Data Files',
        description: 'Get information about competition data files available for download.',
        inputSchema: {
          competition_id: z.string().min(1).max(100).describe('Competition identifier (e.g., "titanic")')
        }
      },
      async ({ competition_id }) => {
        try {
          console.log(`Getting competition data files for: ${competition_id}`);

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

          // Use Kaggle REST API to get competition data files
          const files = await kaggleApiRequest(`/competitions/data/list/${competition_id}`, config);

          const fileInfo = files.map((file: any) => ({
            name: file.name,
            size: file.totalBytes,
            creationDate: file.creationDate,
            description: file.description || 'N/A',
            url: file.url
          }));

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  competition_id: competition_id,
                  files: fileInfo,
                  file_count: fileInfo.length,
                  downloadUrl: `https://www.kaggle.com/competitions/${competition_id}/data`,
                  note: "Use the Kaggle website or API to download actual files"
                }, null, 2)
              }
            ]
          };

        } catch (error: any) {
          console.error(`Error getting competition data files: ${error.message}`);

          if (error.message.includes('403') || error.message.includes('Forbidden')) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({
                    error: `Access denied for competition '${competition_id}'. You may need to accept the competition rules first.`,
                    solutions: [
                      `Go to https://www.kaggle.com/competitions/${competition_id} and accept the competition rules`,
                      "Join the competition first before accessing data",
                      "Use an accessible competition like 'titanic' instead"
                    ]
                  })
                }
              ]
            };
          }

          if (error.message.includes('404')) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({
                    error: `Competition '${competition_id}' not found or has no data files`
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
                  error: `Error getting competition data files: ${error.message}`
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
        description: 'Submit a CSV file to a Kaggle competition using the REST API.',
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

          const submissionMessage = message || "Submission via ML Engineer Agent";

          // Create form data for submission
          const formData = new FormData();
          const blob = new Blob([file_content], { type: 'text/csv' });
          formData.append('file', blob, filename);
          formData.append('submissionDescription', submissionMessage);

          // Submit via Kaggle API
          const auth = Buffer.from(`${config.kaggleUsername}:${config.kaggleKey}`).toString('base64');

          const response = await fetch(`${KAGGLE_API_BASE}/competitions/submissions/submit/${competition_id}`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
            },
            body: formData
          });

          if (!response.ok) {
            throw new Error(`Submission failed: ${response.status} ${response.statusText}`);
          }

          const result = await response.json();

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  competition_id: competition_id,
                  submission_file: filename,
                  message: submissionMessage,
                  submission_id: result.submissionId || 'N/A',
                  status: result.status || 'submitted',
                  url: `https://www.kaggle.com/competitions/${competition_id}/submissions`
                }, null, 2)
              }
            ]
          };

        } catch (error: any) {
          console.error(`Error submitting to competition: ${error.message}`);

          if (error.message.includes('403')) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({
                    error: `Access denied for competition '${competition_id}'. You may need to join the competition first.`,
                    solutions: [
                      `Go to https://www.kaggle.com/competitions/${competition_id} and join the competition`,
                      "Accept the competition rules before submitting",
                      "Ensure you have submission permissions"
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