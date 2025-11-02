import { KaggleService } from '../services/kaggle.service.js';
import { 
  CompetitionSearchSchema, 
  CompetitionDownloadSchema,
  validateCompetitionSearch,
  validateCompetitionDownload 
} from '../utils/validation.js';
import { MCPTool } from '../types/kaggle.js';

export function createCompetitionTools(kaggleService: KaggleService): MCPTool[] {
  return [
    {
      name: 'search_kaggle_competitions',
      description: 'Search for competitions on Kaggle matching the provided query string. Returns a JSON list of matching competitions with details like title, deadline, reward, and team count.',
      inputSchema: CompetitionSearchSchema,
      handler: async (input: any): Promise<string> => {
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
          
        } catch (error: any) {
          console.error(`Error searching competitions: ${error.message}`);
          return JSON.stringify({
            error: `Error searching competitions: ${error.message}`
          });
        }
      }
    },
    {
      name: 'download_competition_data',
      description: 'Download all competition files including datasets, sample submissions, and descriptions. The competition_id should be the competition identifier (e.g., "titanic"). Optionally specify a download path.',
      inputSchema: CompetitionDownloadSchema,
      handler: async (input: any): Promise<string> => {
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
          
        } catch (error: any) {
          console.error(`Error downloading competition data: ${error.message}`);
          
          // Check for specific error types
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
    }
  ];
}