# ============================================
# Multi-Stage Dockerfile for Notes Frontend
# ============================================
# Stage 1: Build the React application
# Stage 2: Serve the built files with Express

# ========== BUILD STAGE ==========
# Use Node.js to build the React app
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for building)
RUN npm install --silent

# Copy source code
COPY . .

# Build the React application
# This creates an optimized production build in the 'build' folder
RUN npm run build

# ========== PRODUCTION STAGE ==========
# Use a fresh Node.js image for the final container
FROM node:18-alpine

# Set metadata labels
LABEL maintainer="IT460 Student"
LABEL description="Frontend UI for Notes Application"
LABEL version="1.0"

# Set working directory
WORKDIR /app

# Copy package files for production server
COPY package*.json ./

# Install ONLY express (production dependency)
# We don't need react-scripts in production
RUN npm install --production --silent

# Copy the production server script
COPY server.js .

# Copy the built React app from builder stage
# This is the optimized production build
COPY --from=builder /app/build ./build

# Expose port 3000
# This is the port the frontend server listens on
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Set environment variable
ENV NODE_ENV=production

# Start the Express server
CMD ["node", "server.js"]
