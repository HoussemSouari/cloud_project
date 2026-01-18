# ============================================
# Dockerfile Explanation Guide
# ============================================

## Backend Dockerfile Breakdown

### Line-by-Line Explanation:

1. **FROM node:18-alpine**
   - Starts from official Node.js version 18 image
   - Alpine Linux = smaller size (~150MB vs 900MB)
   - More secure, fewer vulnerabilities

2. **WORKDIR /app**
   - Sets current directory to /app
   - All following commands execute here
   - If directory doesn't exist, Docker creates it

3. **COPY package*.json ./**
   - Copies package.json and package-lock.json
   - The * matches both files
   - Copied BEFORE source code for caching efficiency

4. **RUN npm install --production**
   - Installs only production dependencies
   - Skips devDependencies (like nodemon)
   - --silent reduces console output

5. **COPY . .**
   - Copies all application source code
   - First . = source (host machine)
   - Second . = destination (container /app)

6. **EXPOSE 8080**
   - Documents which port the app uses
   - Doesn't actually open the port (that's OpenShift's job)
   - Helps other developers understand the app

7. **HEALTHCHECK**
   - OpenShift uses this to check if container is healthy
   - Runs every 30 seconds
   - Calls /api/health endpoint
   - If it fails, OpenShift restarts the container

8. **CMD ["node", "server.js"]**
   - The command that runs when container starts
   - JSON array format is preferred (exec form)
   - Alternative: CMD node server.js (shell form)

---

## Frontend Dockerfile Breakdown

### Multi-Stage Build Concept:

**Why Multi-Stage?**
- Stage 1: Build the React app (needs dev tools, large size)
- Stage 2: Only keep the built files (small, production-ready)
- Result: Final image is ~50% smaller

### Stage 1: Builder

1. **FROM node:18-alpine AS builder**
   - AS builder = names this stage
   - We'll reference it later

2. **npm install** (without --production)
   - Installs ALL dependencies
   - react-scripts is needed to build
   - devDependencies are required

3. **npm run build**
   - Runs React's build script
   - Creates optimized /build folder
   - Minifies JavaScript, CSS
   - Output: static HTML/JS/CSS files

### Stage 2: Production

1. **FROM node:18-alpine**
   - Fresh start, clean image
   - Previous stage is discarded (saves space)

2. **npm install --production**
   - Only installs 'express'
   - react-scripts NOT installed (not needed)
   - Much smaller node_modules

3. **COPY --from=builder /app/build ./build**
   - Copy ONLY the /build folder from Stage 1
   - Everything else from Stage 1 is thrown away
   - This is the magic of multi-stage builds

4. **CMD ["node", "server.js"]**
   - Starts Express server
   - Express serves the static React files

---

## Key Docker Concepts Explained

### Layer Caching
```
COPY package.json  → Layer 1 (cached if file unchanged)
RUN npm install    → Layer 2 (cached if Layer 1 unchanged)
COPY source code   → Layer 3 (changes often)
```

**Best Practice**: Copy dependencies first, source code last

### .dockerignore File
Excludes files from Docker build:
- node_modules (will be installed in container)
- .git (not needed in production)
- README.md (documentation only)

**Why?** Smaller build context = faster builds

### Port Exposure
```
EXPOSE 8080  ← Documentation only
```
Actual port mapping happens at runtime:
- Local: `docker run -p 8080:8080`
- OpenShift: Handled by Service resource

### Health Checks
```
HEALTHCHECK CMD curl http://localhost:8080/health
```
If health check fails 3 times → Container marked unhealthy → OpenShift restarts it

---

## Building Images

### Local Build (for testing):
```bash
# Backend
cd backend
docker build -t notes-backend:latest .

# Frontend
cd frontend
docker build -t notes-frontend:latest .
```

### OpenShift Build (automatic):
OpenShift uses BuildConfig to:
1. Pull source code from Git (or upload from local)
2. Run `docker build` inside OpenShift
3. Push image to OpenShift's internal registry
4. Deploy to pods

**You don't manually build** - OpenShift does it for you!

---

## Image Size Comparison

### Without Multi-Stage (Frontend):
- Base image: 900MB
- node_modules (all deps): 400MB
- Source code: 10MB
- **Total: ~1.3GB** ❌

### With Multi-Stage (Frontend):
- Base image: 150MB
- node_modules (express only): 10MB
- Built files: 5MB
- **Total: ~165MB** ✅

**Savings: 87% smaller!**

---

## Common Issues & Solutions

### Issue 1: "npm ERR! code ENOENT"
**Cause**: package.json not found
**Solution**: Check COPY command, ensure file exists

### Issue 2: "permission denied"
**Cause**: OpenShift runs as non-root user
**Solution**: Use official Node images (already configured)

### Issue 3: Build takes forever
**Cause**: No layer caching, copying node_modules
**Solution**: Add .dockerignore, copy package.json first

### Issue 4: Image too large
**Cause**: Using full ubuntu/node image
**Solution**: Use alpine variant (node:18-alpine)

---

## Security Best Practices

1. ✅ Use official images (node:18-alpine)
2. ✅ Run as non-root user (handled by OpenShift)
3. ✅ Use specific versions (node:18, not node:latest)
4. ✅ Install only production dependencies
5. ✅ Don't copy .env files or secrets
6. ✅ Scan images for vulnerabilities

---

## Testing Dockerfiles Locally

```bash
# Build the image
docker build -t test-backend .

# Run the container
docker run -p 8080:8080 --name test test-backend

# Test the endpoint
curl http://localhost:8080/api/health

# Check logs
docker logs test

# Stop and remove
docker stop test
docker rm test
```

---

## Summary

| Service | Base Image | Final Size | Build Time |
|---------|-----------|------------|------------|
| Backend | node:18-alpine | ~170MB | ~1 min |
| Frontend | node:18-alpine | ~165MB | ~2 min |
| PostgreSQL | postgres:13-alpine | ~200MB | N/A (pre-built) |

**Total Application Size**: ~535MB

This is excellent for cloud deployment! 🚀
