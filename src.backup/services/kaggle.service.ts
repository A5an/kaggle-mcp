import { exec } from 'child_process';
import { promisify } from 'util';
import { 
  KaggleService as IKaggleService, 
  CommandResult, 
  DatasetSearchResult, 
  CompetitionSearchResult, 
  DownloadResult 
} from '../types/kaggle';

const execAsync = promisify(exec);

export class KaggleService implements IKaggleService {
  private kaggleUsername: string;
  private kaggleKey: string;

  constructor(kaggleUsername: string, kaggleKey: string) {
    this.kaggleUsername = kaggleUsername;
    this.kaggleKey = kaggleKey;
  }

  async executeCommand(command: string[]): Promise<CommandResult> {
    try {
      // Validate credentials before executing any command
      if (!this.kaggleUsername || !this.kaggleKey) {
        return {
          success: false,
          stdout: '',
          stderr: 'Kaggle credentials not configured',
          error: new Error('KAGGLE_USERNAME and KAGGLE_KEY environment variables are required')
        };
      }

      // Set environment variables for the command
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

  async validateCredentials(): Promise<boolean> {
    try {
      if (!this.kaggleUsername || !this.kaggleKey) {
        console.log('Kaggle credentials not provided');
        return false;
      }

      // Try to execute a simple command to validate credentials
      const result = await this.executeCommand(['kaggle', 'datasets', 'list', '--page-size', '1']);
      
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

  async searchDatasets(query: string): Promise<DatasetSearchResult[]> {
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
      // Limit to 10 results for performance
      return datasets.slice(0, 10).map((ds: any) => ({
        ref: ds.ref || 'N/A',
        title: ds.title || 'N/A',
        subtitle: ds.subtitle || 'N/A',
        downloadCount: ds.downloadCount || 0,
        lastUpdated: ds.lastUpdated || 'N/A',
        usabilityRating: ds.usabilityRating || 'N/A'
      }));
    } catch (parseError: any) {
      throw new Error(`Failed to parse dataset search results: ${parseError.message}`);
    }
  }

  async downloadDataset(ref: string, path?: string): Promise<DownloadResult> {
    // Create download directory if path is provided
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

    // TODO: List downloaded files (would require fs operations)
    return {
      success: true,
      downloadPath,
      downloadedFiles: [], // Will be populated when we add file system operations
      fileCount: 0
    };
  }

  async searchCompetitions(query: string): Promise<CompetitionSearchResult[]> {
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
      // Limit to 10 results for performance
      return competitions.slice(0, 10).map((comp: any) => ({
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
    } catch (parseError: any) {
      throw new Error(`Failed to parse competition search results: ${parseError.message}`);
    }
  }

  async downloadCompetitionData(id: string, path?: string): Promise<DownloadResult> {
    // Create download directory if path is provided
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

    // TODO: List downloaded files (would require fs operations)
    return {
      success: true,
      downloadPath,
      downloadedFiles: [], // Will be populated when we add file system operations
      fileCount: 0
    };
  }
}