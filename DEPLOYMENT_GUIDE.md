# 🚀 ZERO-TO-HERO OPENSHIFT DEPLOYMENT GUIDE
# Complete Step-by-Step Instructions for Absolute Beginners

---

## 📋 TABLE OF CONTENTS

1. [Prerequisites](#1-prerequisites)
2. [What is OpenShift?](#2-what-is-openshift)
3. [Installing OpenShift CLI](#3-installing-openshift-cli)
4. [Accessing OpenShift](#4-accessing-openshift)
5. [Creating Your Project](#5-creating-your-project)
6. [Building Docker Images](#6-building-docker-images)
7. [Deploying the Database](#7-deploying-the-database)
8. [Deploying the Backend](#8-deploying-the-backend)
9. [Deploying the Frontend](#9-deploying-the-frontend)
10. [Accessing Your Application](#10-accessing-your-application)
11. [Verifying Data Persistence](#11-verifying-data-persistence)
12. [Scaling and Load Balancing](#12-scaling-and-load-balancing)
13. [Troubleshooting](#13-troubleshooting)
14. [Monitoring and Logs](#14-monitoring-and-logs)

---

## 1. PREREQUISITES

### What You Need:

✅ **Computer Requirements**:
- Ubuntu Linux (or any Linux distribution)
- Internet connection
- Terminal access

✅ **Access Requirements**:
- OpenShift cluster access (provided by instructor or cloud provider)
- OpenShift web console URL
- Login credentials

✅ **Project Files**:
- All files in this project directory
- Complete source code

### Time Required:
- **First time**: 45-60 minutes
- **After practice**: 15-20 minutes

---

## 2. WHAT IS OPENSHIFT?

### Simple Explanation

**OpenShift** = A platform that runs your applications in containers in the cloud

Think of it like this:
- **Traditional hosting**: You rent a server, install software manually
- **OpenShift**: You upload your code, OpenShift handles everything else

### Key Concepts (Simple Definitions)

#### Container
A lightweight, standalone package containing your application and all its dependencies.
- Like a shipping container 📦
- Works the same everywhere
- Isolated from other containers

#### Pod
The smallest unit in OpenShift.
- Usually contains 1 container
- Has its own IP address
- Can be created/destroyed automatically

#### Service
A stable network endpoint that routes traffic to pods.
- Like a phone number that never changes
- Even if pods get new IP addresses
- Load balances between multiple pods

#### Route
Exposes your application to the internet.
- Creates a public URL
- Handles HTTPS
- The entry point for users

#### Project/Namespace
Your own isolated workspace in OpenShift.
- Like a folder for your application
- Keeps your stuff separate from others

### Analogy

```
Project     = Your house
Pods        = Rooms in your house
Services    = Room numbers (always the same)
Routes      = Your home address (public)
Containers  = Furniture in the rooms
```

### Why OpenShift for This Project?

✅ **Automatic Scaling**: Add more pods when traffic increases
✅ **Self-Healing**: Restarts crashed containers automatically
✅ **Load Balancing**: Distributes traffic evenly
✅ **Rolling Updates**: Update with zero downtime
✅ **Persistent Storage**: Data survives crashes
✅ **Built-in CI/CD**: Build and deploy automatically

This checks ALL the boxes for IT460 requirements! ✅

---

## 3. INSTALLING OPENSHIFT CLI

### A. What is `oc` CLI?

**`oc`** = OpenShift Command-Line Interface
- Like Git commands (`git clone`, `git push`)
- Lets you control OpenShift from terminal
- Required for deployment

### B. Download and Install

#### Option 1: From OpenShift Web Console (Easiest)

1. **Open your OpenShift web console** in browser
2. **Click the "?" icon** (top-right corner)
3. **Select "Command Line Tools"**
4. **Download `oc` for Linux**
5. **Extract and install**:

```bash
# Navigate to Downloads folder
cd ~/Downloads

# Extract the downloaded file (name may vary)
tar -xvf oc-linux.tar.gz

# Move to system path
sudo mv oc /usr/local/bin/

# Make executable
sudo chmod +x /usr/local/bin/oc
```

#### Option 2: From GitHub (Alternative)

```bash
# Download latest version
wget https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/openshift-client-linux.tar.gz

# Extract
tar -xvf openshift-client-linux.tar.gz

# Install
sudo mv oc /usr/local/bin/
sudo chmod +x /usr/local/bin/oc
```

### C. Verify Installation

```bash
oc version
```

**Expected Output**:
```
Client Version: 4.14.0
Kubernetes Version: v1.27.6+f67aeb3
```

**If you see version numbers → SUCCESS!** ✅

**If you see "command not found"**:
- Check if `/usr/local/bin` is in your PATH
- Try: `echo $PATH`
- If missing, add to `~/.bashrc`:
  ```bash
  export PATH=$PATH:/usr/local/bin
  source ~/.bashrc
  ```

### D. Enable Auto-Completion (Optional but Helpful)

```bash
# Add to .bashrc
oc completion bash >> ~/.bashrc
source ~/.bashrc
```

Now you can press TAB to auto-complete commands!

---

## 4. ACCESSING OPENSHIFT

### A. Web Console vs CLI

**Web Console**:
- Visual interface (GUI)
- Good for exploring
- See graphs, logs, status

**CLI (`oc` commands)**:
- Text-based terminal commands
- Faster for deployment
- Required for this guide

**You'll use BOTH!**

### B. Getting Your Login Token

#### Method 1: From Web Console

1. **Open OpenShift web console** in browser
2. **Log in** with your credentials
3. **Click your username** (top-right corner)
4. **Click "Copy Login Command"**
5. **Click "Display Token"**
6. **Copy the full `oc login` command**

It looks like this:
```bash
oc login --token=sha256~XXXXXXXXXXXXX --server=https://api.openshift.example.com:6443
```

#### Method 2: Direct Login

```bash
oc login https://api.openshift.example.com:6443
```

You'll be prompted for:
- **Username**: Your OpenShift username
- **Password**: Your OpenShift password

### C. Log In via Terminal

**Paste the login command** from Method 1:

```bash
oc login --token=sha256~XXXXXXXXXXXXX --server=https://api.openshift.example.com:6443
```

**Expected Output**:
```
Logged into "https://api.openshift.example.com:6443" as "your-username" using the token provided.

You have access to the following projects and can switch between them with 'oc project <projectname>':

  * default
    notes-app
    
Using project "default".
```

**If you see "Logged into..." → SUCCESS!** ✅

### D. Verify Connection

```bash
oc whoami
```

**Expected Output**: Your username

```bash
oc cluster-info
```

**Expected Output**: Cluster details

---

## 5. CREATING YOUR PROJECT

### A. What is a Project?

A **project** (also called **namespace**) is your isolated workspace.
- Keeps your resources separate from others
- Like having your own folder on a shared server

### B. Create the Project

```bash
oc new-project notes-app --display-name="Notes Application" --description="IT460 Cloud Computing Project"
```

**Command Breakdown**:
- `oc new-project` = Create new project
- `notes-app` = Project name (must be unique in cluster)
- `--display-name` = Friendly name (can have spaces)
- `--description` = What this project is for

**Expected Output**:
```
Now using project "notes-app" on server "https://api.openshift.example.com:6443".

You can add applications to this project with the 'new-app' command.
```

### C. Verify Project Creation

```bash
oc project
```

**Expected Output**:
```
Using project "notes-app" on server "https://api.openshift.example.com:6443".
```

```bash
oc status
```

**Expected Output**:
```
In project notes-app on server https://api.openshift.example.com:6443

You have no services, deployment configs, or build configs.
Run 'oc new-app' to create an application.
```

This is normal! We'll add resources next.

### D. View in Web Console

1. Open OpenShift web console
2. Click **"Projects"** (left sidebar)
3. Find **"notes-app"**
4. Click it to view (currently empty)

---

## 6. BUILDING DOCKER IMAGES

### A. Understanding the Build Process

**What happens**:
1. You upload source code to OpenShift
2. OpenShift reads the Dockerfile
3. OpenShift builds the Docker image
4. Image is stored in OpenShift's internal registry
5. Pods are created from the image

**You DON'T need Docker installed locally!**
OpenShift builds images for you.

### B. Navigate to Project Directory

```bash
cd /home/houssem/Desktop/project_cloud
```

**Verify you're in the right place**:
```bash
ls
```

**Expected Output**:
```
backend/
frontend/
openshift/
docker/
PROJECT_OVERVIEW.md
prompt.md
```

### C. Create BuildConfig and ImageStream for Backend

```bash
oc apply -f openshift/backend.yaml
```

**What this does**:
- Creates `BuildConfig` (build instructions)
- Creates `ImageStream` (image repository)
- Creates `DeploymentConfig` (how to run pods)
- Creates `Service` (network endpoint)

**Expected Output**:
```
buildconfig.build.openshift.io/backend-build created
imagestream.image.openshift.io/backend created
deploymentconfig.apps.openshift.io/backend created
service/backend-service created
```

**All "created" → SUCCESS!** ✅

### D. Build Backend Image

```bash
oc start-build backend-build --from-dir=./backend --follow
```

**Command Breakdown**:
- `oc start-build` = Start building an image
- `backend-build` = Name of BuildConfig
- `--from-dir=./backend` = Upload this directory
- `--follow` = Show build logs in real-time

**Expected Output** (builds for ~1-2 minutes):
```
Uploading directory "backend" as binary input for the build ...
...
Uploading finished
build.build.openshift.io/backend-build-1 started

Receiving source from STDIN as archive ...
Step 1/8 : FROM node:18-alpine
 ---> Pulling image...
Step 2/8 : WORKDIR /app
 ---> Running in...
Step 3/8 : COPY package*.json ./
 ---> Running in...
Step 4/8 : RUN npm install --production
 ---> Running in...
added 89 packages in 8s
Step 5/8 : COPY . .
 ---> Running in...
Step 6/8 : EXPOSE 8080
 ---> Running in...
Step 7/8 : HEALTHCHECK...
 ---> Running in...
Step 8/8 : CMD ["node", "server.js"]
 ---> Running in...
Successfully built 7a3f8c9d1e2b
Pushing image ...
Push successful
```

**If you see "Push successful" → BUILD COMPLETE!** ✅

### E. Create BuildConfig for Frontend

```bash
oc apply -f openshift/frontend.yaml
```

**Expected Output**:
```
buildconfig.build.openshift.io/frontend-build created
imagestream.image.openshift.io/frontend created
configmap/frontend-config created
deploymentconfig.apps.openshift.io/frontend created
service/frontend-service created
route.route.openshift.io/frontend-route created
```

### F. Build Frontend Image

```bash
oc start-build frontend-build --from-dir=./frontend --follow
```

**This takes longer** (~2-3 minutes) because:
1. Installs Node.js dependencies
2. Builds React app (`npm run build`)
3. Creates optimized production bundle

**Expected Output** (final lines):
```
...
Creating an optimized production build...
Compiled successfully.
...
Successfully built 9f2c7a4e8d1c
Pushing image ...
Push successful
```

**If you see "Push successful" → FRONTEND BUILD COMPLETE!** ✅

### G. Verify Images

```bash
oc get imagestreams
```

**Expected Output**:
```
NAME       IMAGE REPOSITORY                                                         TAGS      UPDATED
backend    image-registry.openshift-image-registry.svc:5000/notes-app/backend       latest    2 minutes ago
frontend   image-registry.openshift-image-registry.svc:5000/notes-app/frontend      latest    1 minute ago
```

**If you see both images → ALL BUILDS SUCCESSFUL!** ✅

---

## 7. DEPLOYING THE DATABASE

### A. Why Deploy Database First?

Backend needs database to be running before it starts.
Order matters: Database → Backend → Frontend

### B. Deploy PostgreSQL

```bash
oc apply -f openshift/postgres.yaml
```

**What this creates**:
- `PersistentVolumeClaim` (1GB storage)
- `Secret` (database credentials)
- `DeploymentConfig` (PostgreSQL pod)
- `Service` (internal network endpoint)

**Expected Output**:
```
persistentvolumeclaim/postgres-pvc created
secret/postgres-secret created
deploymentconfig.apps.openshift.io/postgres created
service/postgres-service created
```

### C. Wait for PostgreSQL to Start

```bash
oc get pods -w
```

**`-w` flag** = watch mode (updates in real-time)

**You'll see**:
```
NAME                READY   STATUS              RESTARTS   AGE
postgres-1-deploy   0/1     ContainerCreating   0          5s
postgres-1-xxxxx    0/1     ContainerCreating   0          3s
postgres-1-xxxxx    0/1     Running             0          10s
postgres-1-xxxxx    1/1     Running             0          15s
```

**Wait until you see**: `1/1     Running`

**Press Ctrl+C** to exit watch mode

### D. Verify Database is Running

```bash
oc get pods
```

**Expected Output**:
```
NAME                READY   STATUS      RESTARTS   AGE
postgres-1-deploy   0/1     Completed   0          1m
postgres-1-xxxxx    1/1     Running     0          1m
```

**Key Things to Check**:
- ✅ READY: `1/1` (not 0/1)
- ✅ STATUS: `Running` (not CrashLoopBackOff, Error, etc.)
- ✅ RESTARTS: `0` (low number is okay, high number means problems)

### E. Check Persistent Volume

```bash
oc get pvc
```

**Expected Output**:
```
NAME           STATUS   VOLUME                                     CAPACITY   ACCESS MODES   AGE
postgres-pvc   Bound    pvc-a1b2c3d4-e5f6-7890-abcd-ef1234567890   1Gi        RWO            2m
```

**STATUS must be "Bound"!** This means storage is attached.

### F. Test Database Connection

```bash
oc rsh deployment/postgres
```

**This opens a shell INSIDE the PostgreSQL pod!**

**Inside the pod, run**:
```bash
psql -U notesuser -d notesdb
```

**You'll see**:
```
psql (13.x)
Type "help" for help.

notesdb=>
```

**Check if notes table exists**:
```sql
\dt
```

**Expected Output**:
```
         List of relations
 Schema | Name  | Type  |   Owner   
--------+-------+-------+-----------
 public | notes | table | notesuser
```

**Exit**:
```sql
\q
exit
```

**If you see the notes table → DATABASE WORKING!** ✅

---

## 8. DEPLOYING THE BACKEND

### A. Check Backend Deployment Status

The backend should have deployed automatically after the image build.

```bash
oc get deploymentconfig backend
```

**Expected Output**:
```
NAME      REVISION   DESIRED   CURRENT   TRIGGERED BY
backend   1          2         2         config,image(backend:latest)
```

**Key**: DESIRED and CURRENT should both be `2` (two replicas)

### B. Wait for Backend Pods

```bash
oc get pods -w
```

**Expected**:
```
NAME                READY   STATUS      RESTARTS   AGE
backend-1-deploy    0/1     Completed   0          30s
backend-1-xxxxx     1/1     Running     0          25s
backend-1-yyyyy     1/1     Running     0          25s
postgres-1-deploy   0/1     Completed   0          5m
postgres-1-xxxxx    1/1     Running     0          5m
```

**Wait for**: Two backend pods with `1/1 Running`

### C. Check Backend Logs

```bash
oc logs deployment/backend --tail=20
```

**Expected Output**:
```
========================================
🚀 Backend API Server Running
📡 Port: 8080
🗄️  Database: postgres-service
========================================
✅ Database initialized successfully
```

**If you see "Database initialized successfully" → BACKEND WORKING!** ✅

### D. Test Backend API Internally

```bash
# Get a backend pod name
BACKEND_POD=$(oc get pods -l deploymentconfig=backend -o jsonpath='{.items[0].metadata.name}')

# Test health endpoint
oc exec $BACKEND_POD -- curl -s http://localhost:8080/api/health
```

**Expected Output**:
```json
{"status":"healthy","service":"notes-backend","timestamp":"2026-01-17T..."}
```

### E. Verify Backend Service

```bash
oc get service backend-service
```

**Expected Output**:
```
NAME              TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
backend-service   ClusterIP   10.217.5.123    <none>        8080/TCP   5m
```

**ClusterIP** means internal only (not exposed to internet) ✅

---

## 9. DEPLOYING THE FRONTEND

### A. Check Frontend Deployment

```bash
oc get deploymentconfig frontend
```

**Expected Output**:
```
NAME       REVISION   DESIRED   CURRENT   TRIGGERED BY
frontend   1          2         2         config,image(frontend:latest)
```

### B. Wait for Frontend Pods

```bash
oc get pods | grep frontend
```

**Expected Output**:
```
frontend-1-deploy   0/1     Completed   0          1m
frontend-1-xxxxx    1/1     Running     0          1m
frontend-1-yyyyy    1/1     Running     0          1m
```

### C. Check Frontend Logs

```bash
oc logs deployment/frontend --tail=15
```

**Expected Output**:
```
========================================
🚀 Frontend Server Running
📡 Port: 3000
📂 Serving from: /app/build
========================================
```

### D. Verify Frontend Service

```bash
oc get service frontend-service
```

**Expected Output**:
```
NAME               TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
frontend-service   ClusterIP   10.217.5.124    <none>        3000/TCP   2m
```

---

## 10. ACCESSING YOUR APPLICATION

### A. Get the Route URL

```bash
oc get route frontend-route
```

**Expected Output**:
```
NAME             HOST/PORT                                                  PATH   SERVICES           PORT   TERMINATION
frontend-route   frontend-route-notes-app.apps.openshift.example.com              frontend-service   http   edge
```

**The URL is**: `https://frontend-route-notes-app.apps.openshift.example.com`

**Copy this URL!**

### B. Open in Browser

```bash
# If you have xdg-open
xdg-open https://frontend-route-notes-app.apps.openshift.example.com

# Or just copy the URL to your browser
```

### C. What You Should See

1. **Page Title**: "📝 Notes Application"
2. **Subtitle**: "IT460 Cloud Computing Project - OpenShift Deployment"
3. **Create Note Form**: Title and Content fields
4. **Empty Notes Section**: "No notes yet. Create your first note above!"

**If you see this → APPLICATION DEPLOYED SUCCESSFULLY!** 🎉

### D. Create Your First Note

1. **Title**: Enter "Hello OpenShift"
2. **Content**: Enter "This is my first note deployed on OpenShift!"
3. **Click "Create Note"**

**You should see**:
- Alert: "Note created successfully!"
- Your note appears in the "My Notes" section below

### E. Verify Backend Communication

**Open browser developer tools** (F12):
1. Go to **Network** tab
2. Click **"Create Note"** again
3. Look for request to `/api/notes`
4. **Status should be 201 Created**

**This proves**: Frontend → Backend → Database communication ✅

---

## 11. VERIFYING DATA PERSISTENCE

### A. What is Data Persistence?

**Persistence** = Data survives even if the application crashes or restarts

**How we test this**:
1. Create a note
2. Delete the database pod
3. OpenShift creates a new pod
4. Check if the note still exists

### B. Create a Test Note

1. Open your application in browser
2. Create a note:
   - **Title**: "Persistence Test"
   - **Content**: "If you can see this after deleting the pod, persistence works!"
3. Click **"Create Note"**

### C. Find the PostgreSQL Pod

```bash
oc get pods | grep postgres
```

**Expected Output**:
```
postgres-1-xxxxx    1/1     Running     0          10m
```

**Copy the full pod name** (e.g., `postgres-1-a1b2c3`)

### D. Delete the Database Pod

```bash
# Replace xxxxx with your actual pod name
oc delete pod postgres-1-xxxxx
```

**Expected Output**:
```
pod "postgres-1-xxxxx" deleted
```

**What happens now**:
1. Pod is deleted
2. DeploymentConfig notices pod is missing
3. OpenShift creates a new pod automatically
4. New pod mounts the SAME PersistentVolume
5. Data is still there!

### E. Watch New Pod Start

```bash
oc get pods -w | grep postgres
```

**You'll see**:
```
postgres-1-yyyyy    0/1     ContainerCreating   0          5s
postgres-1-yyyyy    0/1     Running             0          10s
postgres-1-yyyyy    1/1     Running             0          20s
```

**Press Ctrl+C** when you see `1/1 Running`

### F. Verify Data Still Exists

1. **Refresh your browser** (F5)
2. **Look for your note**: "Persistence Test"

**If you can still see the note → DATA PERSISTENCE VERIFIED!** ✅

### G. Explanation for Evaluators

**Write this in your report**:

> "Data persistence is achieved through a PersistentVolumeClaim (PVC) that provides 1GB of storage. The PostgreSQL pod mounts this volume at `/var/lib/postgresql/data`, where PostgreSQL stores all database files. When a pod is deleted, OpenShift creates a new pod that mounts the same PVC, ensuring all data persists across pod lifecycles. This was verified by creating a note, deleting the database pod, and confirming the note remained accessible after pod recreation."

---

## 12. SCALING AND LOAD BALANCING

### A. What is Scaling?

**Horizontal Scaling** = Adding more identical pods to handle more traffic
- 1 pod → 5 pods = 5x capacity
- Load balancer distributes traffic evenly

### B. Check Current Scale

```bash
oc get deploymentconfig backend
```

**Expected Output**:
```
NAME      REVISION   DESIRED   CURRENT
backend   1          2         2
```

**Currently**: 2 backend pods

### C. Scale Up Backend

```bash
oc scale deploymentconfig backend --replicas=5
```

**Expected Output**:
```
deploymentconfig.apps.openshift.io/backend scaled
```

### D. Watch Pods Being Created

```bash
oc get pods -w | grep backend
```

**You'll see**:
```
backend-1-xxxxx     1/1     Running       0          10m
backend-1-yyyyy     1/1     Running       0          10m
backend-1-zzzzz     0/1     Pending       0          1s
backend-1-aaaaa     0/1     Pending       0          1s
backend-1-bbbbb     0/1     Pending       0          1s
backend-1-zzzzz     0/1     ContainerCreating   0     2s
backend-1-aaaaa     0/1     ContainerCreating   0     2s
backend-1-bbbbb     0/1     ContainerCreating   0     2s
backend-1-zzzzz     1/1     Running       0          15s
backend-1-aaaaa     1/1     Running       0          16s
backend-1-bbbbb     1/1     Running       0          17s
```

**Wait until all 5 pods are `1/1 Running`**

**Press Ctrl+C** to exit

### E. Verify Scale

```bash
oc get pods | grep backend | grep Running | wc -l
```

**Expected Output**: `5`

**If you see 5 → SCALING SUCCESSFUL!** ✅

### F. Check Load Balancing

**How OpenShift Load Balances**:
1. Service (`backend-service`) has a single ClusterIP
2. When frontend makes request to `backend-service:8080`
3. Service routes to one of the 5 backend pods (round-robin)
4. Next request goes to a different pod

**Verify Load Distribution**:

```bash
# Make multiple requests and see which pod handles them
for i in {1..10}; do
  oc exec deployment/frontend -- curl -s http://backend-service:8080/api/health | grep service
done
```

**You should see**: Responses from different pods (indicated by different timestamps)

### G. Scale Frontend Too

```bash
oc scale deploymentconfig frontend --replicas=3
```

```bash
oc get pods | grep frontend | grep Running | wc -l
```

**Expected Output**: `3`

### H. View Load Balancer in Action

**Web Console Method**:
1. Open OpenShift web console
2. Go to **Networking → Services**
3. Click **backend-service**
4. See **Pods** section shows 5 pods
5. Traffic is distributed to all 5

**This satisfies Scalability and Load Balancing requirements!** ✅

### I. Scale Down (Optional)

```bash
oc scale deploymentconfig backend --replicas=2
oc scale deploymentconfig frontend --replicas=2
```

Back to original scale (saves resources).

---

## 13. TROUBLESHOOTING

### Common Issues and Solutions

#### Issue 1: Pod Stuck in "Pending"

**Symptom**:
```bash
oc get pods
```
Shows: `STATUS: Pending` for a long time

**Cause**: Not enough resources (CPU/memory) in cluster

**Solution**:
```bash
# Check events
oc get events --sort-by='.lastTimestamp' | tail -20

# Look for errors like "Insufficient cpu" or "Insufficient memory"

# Solution: Reduce resource requests in YAML
# Or ask administrator for more cluster resources
```

---

#### Issue 2: Pod in "CrashLoopBackOff"

**Symptom**:
```bash
oc get pods
```
Shows: `STATUS: CrashLoopBackOff`, `RESTARTS: 5`

**Cause**: Application is crashing immediately after start

**Solution**:
```bash
# Check logs for error messages
oc logs <pod-name> --tail=50

# Common causes:
# - Database connection failed (check DB_HOST environment variable)
# - Missing dependencies (rebuild image)
# - Port already in use (check PORT environment variable)
```

---

#### Issue 3: "ImagePullBackOff"

**Symptom**:
```bash
oc get pods
```
Shows: `STATUS: ImagePullBackOff` or `ErrImagePull`

**Cause**: Cannot pull Docker image

**Solution**:
```bash
# Check if image exists
oc get imagestreams

# If missing, rebuild
oc start-build backend-build --from-dir=./backend --follow

# Check build status
oc get builds
```

---

#### Issue 4: Application Not Accessible

**Symptom**: Route URL shows "Application is not available"

**Causes and Solutions**:

**A. Pods not running**:
```bash
oc get pods
# All frontend pods must be Running
```

**B. Service misconfigured**:
```bash
oc get service frontend-service
# Must exist and have ClusterIP
```

**C. Route not created**:
```bash
oc get route
# frontend-route must exist
```

**D. Wrong port**:
```bash
oc describe route frontend-route
# Port must be 3000
```

---

#### Issue 5: Database Connection Failed

**Symptom**: Backend logs show:
```
Error: connect ECONNREFUSED postgres-service:5432
```

**Cause**: Backend cannot connect to database

**Solution**:
```bash
# Check if PostgreSQL is running
oc get pods | grep postgres
# Must be 1/1 Running

# Check if service exists
oc get service postgres-service
# Must exist

# Check environment variables
oc set env deploymentconfig/backend --list
# Must have DB_HOST=postgres-service

# Test DNS resolution
oc exec deployment/backend -- ping postgres-service
```

---

#### Issue 6: PersistentVolumeClaim Stuck in "Pending"

**Symptom**:
```bash
oc get pvc
```
Shows: `STATUS: Pending`

**Cause**: No available storage in cluster

**Solution**:
```bash
# Check PVC events
oc describe pvc postgres-pvc

# Look for errors like "no persistent volumes available"

# Solution: Contact cluster administrator
# Or use dynamic provisioning storage class
```

---

#### Issue 7: Build Failed

**Symptom**:
```bash
oc start-build backend-build --from-dir=./backend --follow
```
Shows: `error: build failed`

**Solutions**:

**A. Dockerfile error**:
```bash
# Check build logs
oc logs build/backend-build-1

# Look for syntax errors in Dockerfile
# Fix Dockerfile and rebuild
```

**B. npm install failed**:
```bash
# Check if package.json exists
ls -la backend/package.json

# Check npm logs in build output
# May need to update dependencies
```

**C. Out of disk space**:
```bash
# Check cluster capacity
oc describe node <node-name>

# Solution: Clean old builds
oc delete builds --all
```

---

### General Debugging Commands

```bash
# View all resources
oc get all

# View events (recent activity)
oc get events --sort-by='.lastTimestamp' | tail -30

# Describe a resource (detailed info)
oc describe pod <pod-name>

# Check logs
oc logs <pod-name> --tail=100

# Check previous container logs (if crashed)
oc logs <pod-name> --previous

# Open shell in pod
oc rsh <pod-name>

# Check resource usage
oc adm top pods

# Check node status
oc get nodes
```

---

## 14. MONITORING AND LOGS

### A. View Real-Time Logs

**Single Pod**:
```bash
oc logs -f <pod-name>
```
**`-f`** = follow (stream logs in real-time)

**All Pods of a Deployment**:
```bash
oc logs -f deployment/backend
```

**Last N Lines**:
```bash
oc logs <pod-name> --tail=50
```

### B. Check Application Status

```bash
# All resources
oc status

# Pods
oc get pods

# Services
oc get services

# Routes
oc get routes

# Storage
oc get pvc
```

### C. Monitor Resource Usage

```bash
# CPU and Memory usage
oc adm top pods

# Show all pods sorted by CPU
oc adm top pods --sort-by=cpu

# Show all pods sorted by memory
oc adm top pods --sort-by=memory
```

### D. View in Web Console

**Better Visual Experience**:
1. Open OpenShift web console
2. Navigate to **Administrator** view
3. Select your project: **notes-app**

**Useful Sections**:
- **Workloads → Pods**: See all pods, click for logs
- **Workloads → DeploymentConfigs**: Manage deployments
- **Networking → Services**: View services
- **Networking → Routes**: See public URLs
- **Storage → PersistentVolumeClaims**: Check storage
- **Monitoring → Dashboard**: Graphs and metrics

---

## 15. DEPLOYMENT SUMMARY CHECKLIST

Use this checklist to verify complete deployment:

### ✅ Prerequisites
- [ ] OpenShift CLI (`oc`) installed
- [ ] Logged into OpenShift cluster
- [ ] Project created (`notes-app`)

### ✅ Images Built
- [ ] Backend image built successfully
- [ ] Frontend image built successfully
- [ ] Both images visible in `oc get imagestreams`

### ✅ Database Deployed
- [ ] PostgreSQL pod running (1/1)
- [ ] PersistentVolumeClaim bound
- [ ] Secret created
- [ ] Service `postgres-service` exists
- [ ] Can connect to database (`oc rsh` test)

### ✅ Backend Deployed
- [ ] 2 backend pods running (1/1 each)
- [ ] Service `backend-service` exists
- [ ] Health check passes (`/api/health`)
- [ ] Connected to database (check logs)

### ✅ Frontend Deployed
- [ ] 2 frontend pods running (1/1 each)
- [ ] Service `frontend-service` exists
- [ ] Route `frontend-route` created
- [ ] Health check passes (`/health`)

### ✅ Application Working
- [ ] Can access application via browser
- [ ] Can create notes
- [ ] Notes display correctly
- [ ] Data persists after pod deletion

### ✅ Scalability Verified
- [ ] Scaled backend to 5 replicas
- [ ] All pods running correctly
- [ ] Load balancing confirmed
- [ ] Scaled frontend to 3 replicas

### ✅ Project Requirements
- [ ] Containerization ✅ (Dockerfiles)
- [ ] Microservices ✅ (3 services)
- [ ] Communication ✅ (Service DNS)
- [ ] OpenShift Deployment ✅ (YAML configs)
- [ ] Data Persistence ✅ (PVC test passed)
- [ ] Scalability ✅ (Scaled to 5 replicas)
- [ ] Load Balancing ✅ (Service distribution)

---

## 🎉 CONGRATULATIONS!

You have successfully:
✅ Deployed a complete multi-container application on OpenShift
✅ Implemented data persistence
✅ Demonstrated horizontal scaling
✅ Verified load balancing
✅ Satisfied ALL IT460 project requirements

**You are now an OpenShift deployer!** 🚀

---

## QUICK REFERENCE

### Most Used Commands

```bash
# Login
oc login --token=<token> --server=<server>

# Create project
oc new-project notes-app

# Apply YAML
oc apply -f openshift/postgres.yaml
oc apply -f openshift/backend.yaml
oc apply -f openshift/frontend.yaml

# Build images
oc start-build backend-build --from-dir=./backend --follow
oc start-build frontend-build --from-dir=./frontend --follow

# Check status
oc get pods
oc get services
oc get routes
oc get pvc

# View logs
oc logs <pod-name>
oc logs deployment/backend --tail=50

# Scale
oc scale deploymentconfig backend --replicas=5

# Delete resources
oc delete pod <pod-name>
oc delete all --all
```

### Important URLs

- **OpenShift Web Console**: Check your cluster URL
- **Application URL**: `oc get route frontend-route`
- **Documentation**: https://docs.openshift.com

---

**END OF DEPLOYMENT GUIDE**

This guide was created for the IT460 Cloud Computing course.
If you followed all steps, you should have a fully functional, scalable application running on OpenShift!
