import { ErrorResponse } from '../types/kaggle.js';

// Error categories
export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  COMMAND_EXECUTION = 'COMMAND_EXECUTION',
  FILE_SYSTEM = 'FILE_SYSTEM',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN'
}

// Error codes
export enum ErrorCode {
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_INPUT = 'INVALID_INPUT',
  COMMAND_FAILED = 'COMMAND_FAILED',
  NOT_FOUND = 'NOT_FOUND',
  ACCESS_DENIED = 'ACCESS_DENIED',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED'
}

// Create structured error response
export function createErrorResponse(
  message: string, 
  code?: ErrorCode, 
  details?: any
): ErrorResponse {
  return {
    error: message,
    code,
    details
  };
}

// Categorize error based on message content
export function categorizeError(error: Error | string): ErrorCategory {
  const message = typeof error === 'string' ? error : error.message;
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('credential') || lowerMessage.includes('authentication')) {
    return ErrorCategory.AUTHENTICATION;
  }
  
  if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
    return ErrorCategory.VALIDATION;
  }
  
  if (lowerMessage.includes('command') || lowerMessage.includes('exec')) {
    return ErrorCategory.COMMAND_EXECUTION;
  }
  
  if (lowerMessage.includes('file') || lowerMessage.includes('directory')) {
    return ErrorCategory.FILE_SYSTEM;
  }
  
  if (lowerMessage.includes('network') || lowerMessage.includes('timeout') || lowerMessage.includes('connection')) {
    return ErrorCategory.NETWORK;
  }
  
  return ErrorCategory.UNKNOWN;
}

// Get user-friendly error message
export function getUserFriendlyMessage(error: Error | string, category?: ErrorCategory): string {
  const message = typeof error === 'string' ? error : error.message;
  const errorCategory = category || categorizeError(error);

  switch (errorCategory) {
    case ErrorCategory.AUTHENTICATION:
      return 'Authentication failed. Please check your Kaggle credentials.';
    
    case ErrorCategory.VALIDATION:
      return 'Invalid input provided. Please check your parameters and try again.';
    
    case ErrorCategory.COMMAND_EXECUTION:
      if (message.includes('404')) {
        return 'The requested resource was not found or access is denied.';
      }
      if (message.includes('403')) {
        return 'Access denied. You may need to accept competition rules or check permissions.';
      }
      return 'Command execution failed. Please try again later.';
    
    case ErrorCategory.FILE_SYSTEM:
      return 'File system operation failed. Please check permissions and available space.';
    
    case ErrorCategory.NETWORK:
      return 'Network error occurred. Please check your connection and try again.';
    
    default:
      return 'An unexpected error occurred. Please try again later.';
  }
}

// Log error with appropriate detail level
export function logError(error: Error | string, context?: string, details?: any): void {
  const timestamp = new Date().toISOString();
  const message = typeof error === 'string' ? error : error.message;
  const category = categorizeError(error);
  
  const logEntry = {
    timestamp,
    level: 'ERROR',
    category,
    message,
    context,
    details,
    stack: typeof error === 'object' ? error.stack : undefined
  };

  console.error(JSON.stringify(logEntry, null, 2));
}

// Handle and format error for API response
export function handleApiError(error: Error | string, context?: string): string {
  const category = categorizeError(error);
  const userMessage = getUserFriendlyMessage(error, category);
  
  // Log detailed error for debugging
  logError(error, context);
  
  // Return user-friendly error response
  const errorCode = getErrorCode(error, category);
  const errorResponse = createErrorResponse(userMessage, errorCode);
  
  return JSON.stringify(errorResponse);
}

// Get appropriate error code
function getErrorCode(error: Error | string, category: ErrorCategory): ErrorCode {
  const message = typeof error === 'string' ? error : error.message;
  const lowerMessage = message.toLowerCase();

  switch (category) {
    case ErrorCategory.AUTHENTICATION:
      if (lowerMessage.includes('missing') || lowerMessage.includes('required')) {
        return ErrorCode.MISSING_CREDENTIALS;
      }
      return ErrorCode.INVALID_CREDENTIALS;
    
    case ErrorCategory.VALIDATION:
      return ErrorCode.INVALID_INPUT;
    
    case ErrorCategory.COMMAND_EXECUTION:
      if (lowerMessage.includes('404')) {
        return ErrorCode.NOT_FOUND;
      }
      if (lowerMessage.includes('403')) {
        return ErrorCode.ACCESS_DENIED;
      }
      if (lowerMessage.includes('timeout')) {
        return ErrorCode.TIMEOUT;
      }
      return ErrorCode.COMMAND_FAILED;
    
    case ErrorCategory.FILE_SYSTEM:
      if (lowerMessage.includes('not found')) {
        return ErrorCode.FILE_NOT_FOUND;
      }
      if (lowerMessage.includes('permission')) {
        return ErrorCode.PERMISSION_DENIED;
      }
      return ErrorCode.COMMAND_FAILED;
    
    case ErrorCategory.NETWORK:
      return ErrorCode.NETWORK_ERROR;
    
    default:
      return ErrorCode.COMMAND_FAILED;
  }
}