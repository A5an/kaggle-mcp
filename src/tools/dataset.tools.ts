import { KaggleService } from '../services/kaggle.service.js';
import { 
  DatasetSearchSchema, 
  DatasetDownloadSchema,
  validateDatasetSearch,
  validateDatasetDownload 
} from '../utils/validation.js';
import { MCPTool } from '../types/kaggle.js';

export function createDatasetTools(kaggleService: KaggleService): MCPTool[] {
  return [
    {
      name: 'search_kaggle_datasets',
      description: 'Search for datasets on Kaggle matching the provided query string. Returns a JSON list of matching datasets with details like reference, title, download count, and last updated date.',
      inputSchema: DatasetSearchSchema,
      handler: async (input: any): Promise<string> => {
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
          
        } catch (error: any) {
          console.error(`Error searching datasets: ${error.message}`);
          return JSON.stringify({
            error: `Error searching datasets: ${error.message}`
          });
        }
      }
    },
    {
      name: 'download_kaggle_dataset',
      description: 'Download and unzip files for a specific Kaggle dataset. The dataset_ref should be in format "username/dataset-slug" (e.g., "kaggle/titanic"). Optionally specify a download path.',
      inputSchema: DatasetDownloadSchema,
      handler: async (input: any): Promise<string> => {
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
          
        } catch (error: any) {
          console.error(`Error downloading dataset: ${error.message}`);
          
          // Check for specific error types
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
    }
  ];
}