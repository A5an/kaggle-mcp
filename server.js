#!/usr/bin/env node

// Simple entry point that directly requires the compiled server
// This is for deployment platforms that might have issues with the index.js approach

try {
  // Try to load the compiled server
  require('./dist/server.js');
} catch (error) {
  console.error('Failed to start server:', error.message);
  
  // Try to use TypeScript directly as fallback
  try {
    console.log('Attempting to run TypeScript source directly...');
    require('ts-node/register');
    require('./src/server.ts');
  } catch (tsError) {
    console.error('Failed to start with TypeScript:', tsError.message);
    process.exit(1);
  }
}