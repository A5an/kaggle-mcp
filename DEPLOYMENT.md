# Deployment Guide for Kaggle MCP TypeScript Server

## Metorial Deployment

If you're experiencing module loading issues on Metorial, try these approaches:

### Option 1: Standalone Server (RECOMMENDED)
1. Use `standalone-server.js` - a single file with no module dependencies
2. Rename `standalone-package.json` to `package.json` before deployment
3. Set entry point to `standalone-server.js`
4. This completely avoids module resolution issues

### Option 2: Use the deploy.json configuration
1. Rename `deploy.json` to `package.json` before deployment
2. This includes all dependencies and a postinstall build step

### Option 3: Use the simple server.js entry point
1. Set the main entry point to `server.js` in your deployment configuration
2. This bypasses the complex entry point logic

### Option 4: Pre-build approach
1. Run `npm run build` locally
2. Deploy the entire project including the `dist/` folder
3. Use `node dist/server.js` as the start command

## Environment Variables Required

```
KAGGLE_USERNAME=your_kaggle_username
KAGGLE_KEY=your_kaggle_api_key
PORT=8080
NODE_ENV=production
```

## Troubleshooting

### Module Not Found Errors
- **SOLUTION**: Use `standalone-server.js` - it has no module dependencies
- Ensure TypeScript is compiled before running (if using TypeScript version)
- Check that all dependencies are installed
- Verify the entry point file exists

### Import/Export Issues
- **SOLUTION**: Use `standalone-server.js` - it's a single file with no imports
- The project uses CommonJS modules for better compatibility
- All imports use relative paths without file extensions
- TypeScript compiles to CommonJS format

### Deployment Platform Specific Issues

**Metorial:**
- Use `server.js` as entry point
- Ensure build step runs during deployment
- Set NODE_ENV=production

**Google Cloud Run:**
- Use the Dockerfile provided
- Set environment variables in deployment config
- Ensure port 8080 is exposed

**Heroku:**
- Add `"postinstall": "npm run build"` to package.json scripts
- Use `node server.js` as start command
- Set buildpacks if needed

## Testing Deployment

1. Check health endpoint: `GET /health`
2. Verify MCP tools are loaded
3. Test with sample Kaggle API calls

## Support

If deployment continues to fail:
1. Check the deployment logs for specific error messages
2. Verify all environment variables are set
3. Ensure the platform supports Node.js 18+
4. Try the different entry point options above