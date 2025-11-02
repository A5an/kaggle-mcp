// Kaggle API response types
export interface DatasetSearchResult {
  ref: string;
  title: string;
  subtitle: string;
  downloadCount: number;
  lastUpdated: string;
  usabilityRating: number;
}

export interface CompetitionSearchResult {
  ref: string;
  title: string;
  description: string;
  url: string;
  deadline: string;
  category: string;
  reward: string;
  teamCount: number;
  userHasEntered: boolean;
}

export interface DownloadResult {
  success: boolean;
  downloadPath: string;
  downloadedFiles: string[];
  fileCount: number;
  error?: string;
}

// Command execution types
export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: Error;
}

// Service interfaces
export interface KaggleService {
  executeCommand(command: string[]): Promise<CommandResult>;
  validateCredentials(): Promise<boolean>;
  searchDatasets(query: string): Promise<DatasetSearchResult[]>;
  downloadDataset(ref: string, path?: string): Promise<DownloadResult>;
  searchCompetitions(query: string): Promise<CompetitionSearchResult[]>;
  downloadCompetitionData(id: string, path?: string): Promise<DownloadResult>;
}

// MCP Tool interface
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any; // Zod schema
  handler: (input: any) => Promise<string>;
}

// Server configuration
export interface ServerConfig {
  port: number;
  kaggleUsername: string;
  kaggleKey: string;
}

// Environment configuration
export interface EnvironmentConfig {
  KAGGLE_USERNAME: string;
  KAGGLE_KEY: string;
  PORT?: string;
  NODE_ENV?: string;
}

// Error response format
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
}