#!/bin/bash
# Deployment script for Kaggle MCP Server to Metorial

echo "🚀 Deploying Kaggle MCP Server to Metorial"
echo "=========================================="

# Check if required files exist
if [ ! -f "server.ts" ]; then
    echo "❌ server.ts not found"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found"
    exit 1
fi

echo "✅ Required files found"

# Check TypeScript compilation
echo ""
echo "🔧 Checking TypeScript compilation..."
npx tsc --noEmit server.ts
if [ $? -ne 0 ]; then
    echo "❌ TypeScript compilation failed"
    exit 1
fi
echo "✅ TypeScript compilation successful"

# Test server logic locally (optional)
echo ""
echo "🧪 Testing server logic locally..."
if [ -f "test-server.js" ]; then
    node test-server.js
else
    echo "⏭️  Skipping local tests (test-server.js not found)"
fi

echo ""
echo "📦 Server ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Upload server.ts and package.json to Metorial"
echo "2. Configure environment variables:"
echo "   - kaggleUsername: asanaliaukenov"
echo "   - kaggleKey: 3afe58ac6593f0ac4ad52789536ab1f1"
echo "3. Deploy the server"
echo "4. Test with the ML Engineer Agent"

echo ""
echo "🎯 Server includes these tools:"
echo "   - search_kaggle_datasets"
echo "   - download_kaggle_dataset"
echo "   - search_kaggle_competitions"
echo "   - get_competition_details"
echo "   - download_competition_data"
echo "   - submit_to_competition"

echo ""
echo "✅ Deployment preparation complete!"