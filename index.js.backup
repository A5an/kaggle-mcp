#!/usr/bin/env node

// Entry point for the Kaggle MCP TypeScript Server
// This file ensures the server starts correctly in different environments

const path = require('path');
const fs = require('fs');

// Check if compiled version exists
const compiledServer = path.join(__dirname, 'dist', 'server.js');
const sourceServer = path.join(__dirname, 'src', 'server.ts');

if (fs.existsSync(compiledServer)) {
  // Use compiled version
  console.log('Starting Kaggle MCP Server (compiled)...');
  require('./dist/server.js');
} else if (fs.existsSync(sourceServer)) {
  // Use TypeScript directly with ts-node
  console.log('Starting Kaggle MCP Server (TypeScript)...');
  require('ts-node/register');
  require('./src/server.ts');
} else {
  console.error('Error: Could not find server files');
  process.exit(1);
}