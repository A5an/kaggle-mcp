import { z } from 'zod';

// Dataset validation schemas
export const DatasetSearchSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(100, 'Query too long')
});

export const DatasetDownloadSchema = z.object({
  dataset_ref: z.string()
    .regex(/^[\w\-\.]+\/[\w\-\.]+$/, 'Dataset reference must be in format "username/dataset-name"')
    .min(3, 'Dataset reference too short')
    .max(100, 'Dataset reference too long'),
  download_path: z.string().optional()
});

// Competition validation schemas
export const CompetitionSearchSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(100, 'Query too long')
});

export const CompetitionDownloadSchema = z.object({
  competition_id: z.string()
    .min(1, 'Competition ID cannot be empty')
    .max(50, 'Competition ID too long')
    .regex(/^[\w\-]+$/, 'Competition ID can only contain letters, numbers, and hyphens'),
  download_path: z.string().optional()
});

// Environment validation schema
export const EnvironmentSchema = z.object({
  KAGGLE_USERNAME: z.string().min(1, 'KAGGLE_USERNAME is required'),
  KAGGLE_KEY: z.string().min(1, 'KAGGLE_KEY is required'),
  PORT: z.string().optional().default('8080'),
  NODE_ENV: z.string().optional().default('development')
});

// Type exports for use in other modules
export type DatasetSearchInput = z.infer<typeof DatasetSearchSchema>;
export type DatasetDownloadInput = z.infer<typeof DatasetDownloadSchema>;
export type CompetitionSearchInput = z.infer<typeof CompetitionSearchSchema>;
export type CompetitionDownloadInput = z.infer<typeof CompetitionDownloadSchema>;
export type EnvironmentConfig = z.infer<typeof EnvironmentSchema>;

// Validation helper functions
export function validateDatasetSearch(input: unknown): DatasetSearchInput {
  return DatasetSearchSchema.parse(input);
}

export function validateDatasetDownload(input: unknown): DatasetDownloadInput {
  return DatasetDownloadSchema.parse(input);
}

export function validateCompetitionSearch(input: unknown): CompetitionSearchInput {
  return CompetitionSearchSchema.parse(input);
}

export function validateCompetitionDownload(input: unknown): CompetitionDownloadInput {
  return CompetitionDownloadSchema.parse(input);
}

export function validateEnvironment(input: unknown): EnvironmentConfig {
  return EnvironmentSchema.parse(input);
}