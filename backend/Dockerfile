# ============================================
# Dockerfile for Notes Backend API
# ============================================
# This file defines how to build a Docker container for the backend service
# It uses Node.js 18 and installs all dependencies

# Use official Node.js 18 image as base
# Alpine variant is smaller and more secure
FROM node:18-alpine

# Set metadata labels
LABEL maintainer="IT460 Student"
LABEL description="Backend API for Notes Application"
LABEL version="1.0"

# Set working directory inside container
# All subsequent commands run from this directory
WORKDIR /app

# Copy package files first (for better caching)
# Docker caches layers, so if package.json doesn't change,
# npm install won't run again
COPY package*.json ./

# Install production dependencies only
# --production flag skips devDependencies
# --silent reduces output noise
RUN npm install --production --silent

# Copy application source code
# This is done AFTER npm install for better layer caching
COPY . .

# Expose port 8080
# This is the port the backend listens on
# This is documentation only - doesn't actually open the port
EXPOSE 8080

# Health check for OpenShift
# OpenShift uses this to verify the container is running correctly
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Set environment variable for production
ENV NODE_ENV=production

# Start the server
# This command runs when the container starts
CMD ["node", "server.js"]
