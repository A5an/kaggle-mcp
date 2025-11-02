# Use Node.js 18 slim as base image
FROM node:18-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Kaggle CLI
RUN pip3 install kaggle

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript application
RUN npm run build

# Set environment variables (placeholders to be overridden at runtime)
ENV KAGGLE_USERNAME=""
ENV KAGGLE_KEY=""
ENV PORT=8080
ENV NODE_ENV=production

# Create directories for downloads
RUN mkdir -p /app/datasets /app/competitions

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["npm", "start"]