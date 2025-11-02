# Kaggle MCP TypeScript Server

A TypeScript-based Model Context Protocol (MCP) server that wraps the Kaggle CLI to provide AI agents with access to Kaggle datasets and competitions. This server can be deployed as a Docker container to cloud platforms like Google Cloud Run or Metorial.

## Features

- **Dataset Operations**: Search and download Kaggle datasets
- **Competition Operations**: Search competitions and download competition data
- **Type Safety**: Full TypeScript implementation with Zod validation
- **Cloud Ready**: Docker container optimized for cloud deployment
- **Health Monitoring**: Built-in health check endpoint
- **Error Handling**: Comprehensive error handling with structured responses

## Quick Start

### Prerequisites

- Node.js 18+ 
- Python 3 and pip (for Kaggle CLI)
- Kaggle API credentials

### Important Notes

This project uses ES modules (`"type": "module"` in package.json) for compatibility with cloud deployment platforms. All imports use `.js` extensions even in TypeScript files, as required by ES module standards.

### Local Development

1. **Clone and install dependencies:**
   ```bash
   cd kaggle-mcp
   npm install
   ```

2. **Set up Kaggle credentials:**
   ```bash
   cp .env.example .env
   # Edit .env with your Kaggle credentials
   ```

3. **Install Kaggle CLI:**
   ```bash
   pip3 install kaggle
   ```

4. **Run in development mode:**
   ```bash
   npm run dev
   ```

5. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

### Getting Kaggle Credentials

1. Go to [Kaggle Account Settings](https://www.kaggle.com/settings)
2. Click "Create New API Token" to download `kaggle.json`
3. Copy the username and key from the file to your `.env`:
   ```
   KAGGLE_USERNAME=your_username
   KAGGLE_KEY=your_api_key
   ```

## Docker Deployment

### Build and Run Locally

```bash
# Build the Docker image
docker build -t kaggle-mcp-typescript .

# Run with environment variables
docker run -p 8080:8080 \
  -e KAGGLE_USERNAME=your_username \
  -e KAGGLE_KEY=your_api_key \
  kaggle-mcp-typescript
```

### Deploy to Google Cloud Run

1. **Build and push to Google Container Registry:**
   ```bash
   # Set your project ID
   export PROJECT_ID=your-gcp-project-id
   
   # Build and tag
   docker build -t gcr.io/$PROJECT_ID/kaggle-mcp-typescript .
   
   # Push to registry
   docker push gcr.io/$PROJECT_ID/kaggle-mcp-typescript
   ```

2. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy kaggle-mcp-typescript \
     --image gcr.io/$PROJECT_ID/kaggle-mcp-typescript \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars KAGGLE_USERNAME=your_username,KAGGLE_KEY=your_api_key \
     --port 8080 \
     --memory 1Gi \
     --cpu 1
   ```

### Deploy to Other Cloud Platforms

The Docker container can be deployed to any cloud platform that supports containers:

- **AWS ECS/Fargate**: Use the container image with environment variables
- **Azure Container Instances**: Deploy with `az container create`
- **Heroku**: Use `heroku container:push` and `heroku container:release`
- **Railway/Render**: Connect your GitHub repo for automatic deployments
- **Metorial**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for specific instructions

## Deployment Troubleshooting

If you encounter module loading issues during deployment, see the [DEPLOYMENT.md](./DEPLOYMENT.md) guide for platform-specific solutions and troubleshooting steps.

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and credential validation.

### MCP Tools

The server exposes the following MCP tools:

#### `search_kaggle_datasets`
Search for datasets on Kaggle.

**Input:**
```json
{
  "query": "machine learning"
}
```

**Output:**
```json
{
  "message": "Found 10 datasets",
  "results": [
    {
      "ref": "username/dataset-name",
      "title": "Dataset Title",
      "subtitle": "Dataset Description",
      "downloadCount": 1000,
      "lastUpdated": "2023-12-01",
      "usabilityRating": 8.5
    }
  ]
}
```

#### `download_kaggle_dataset`
Download and extract a Kaggle dataset.

**Input:**
```json
{
  "dataset_ref": "username/dataset-name",
  "download_path": "./data" // optional
}
```

#### `search_kaggle_competitions`
Search for Kaggle competitions.

**Input:**
```json
{
  "query": "nlp"
}
```

#### `download_competition_data`
Download competition files.

**Input:**
```json
{
  "competition_id": "titanic",
  "download_path": "./competitions" // optional
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `KAGGLE_USERNAME` | Yes | Your Kaggle username |
| `KAGGLE_KEY` | Yes | Your Kaggle API key |
| `PORT` | No | Server port (default: 8080) |
| `NODE_ENV` | No | Environment (development/production) |

## Development

### Project Structure

```
src/
├── server.ts              # Main server entry point
├── types/
│   └── kaggle.ts          # TypeScript interfaces
├── services/
│   └── kaggle.service.ts  # Kaggle CLI wrapper
├── tools/
│   ├── dataset.tools.ts   # Dataset MCP tools
│   └── competition.tools.ts # Competition MCP tools
└── utils/
    ├── validation.ts      # Input validation schemas
    └── errors.ts          # Error handling utilities
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run clean` - Clean build directory

### Adding New Tools

1. Create tool function in appropriate file under `src/tools/`
2. Define Zod validation schema in `src/utils/validation.ts`
3. Register tool in `src/server.ts`

## Troubleshooting

### Common Issues

1. **Kaggle credentials not working:**
   - Verify credentials at https://www.kaggle.com/settings
   - Ensure environment variables are set correctly
   - Check that Kaggle CLI is installed: `kaggle --version`

2. **Docker build fails:**
   - Ensure you have sufficient disk space
   - Check that Python and pip are available in the container

3. **Downloads fail:**
   - Some datasets/competitions require accepting terms
   - Check if you have access to the requested resource
   - Verify the dataset/competition ID is correct

### Health Check

Visit `http://localhost:8080/health` to check:
- Server status
- Kaggle credential validation
- Environment information

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:
- Check the troubleshooting section above
- Review Kaggle API documentation
- Open an issue on GitHub