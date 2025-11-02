#!/bin/bash

# Deploy script for standalone Kaggle MCP server
# This script prepares the project for deployment with the standalone server

echo "🚀 Preparing Kaggle MCP Server for deployment..."

# Backup original package.json
if [ -f "package.json" ]; then
    echo "📦 Backing up original package.json..."
    cp package.json package.json.backup
fi

# Use standalone package.json
echo "📦 Setting up standalone package.json..."
cp standalone-package.json package.json

# Create a simple deployment structure
echo "📁 Creating deployment structure..."
mkdir -p deploy
cp standalone-server.js deploy/
cp package.json deploy/
cp .env.example deploy/

echo "✅ Deployment preparation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy the contents of the 'deploy' folder to your deployment platform"
echo "2. Set environment variables:"
echo "   - KAGGLE_USERNAME=your_username"
echo "   - KAGGLE_KEY=your_api_key"
echo "   - PORT=8080"
echo "3. Set entry point to: standalone-server.js"
echo "4. Deploy!"
echo ""
echo "🔧 The standalone server provides HTTP endpoints instead of MCP protocol:"
echo "   - GET /health - Health check"
echo "   - GET /tools - List available tools"
echo "   - POST /tools/search_kaggle_datasets - Search datasets"
echo "   - POST /tools/download_kaggle_dataset - Download dataset"
echo "   - POST /tools/search_kaggle_competitions - Search competitions"
echo "   - POST /tools/download_competition_data - Download competition data"