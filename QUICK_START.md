# 🚀 QUICK START GUIDE
# Deploy Notes App on OpenShift in 10 Minutes

---

## Prerequisites (2 minutes)

```bash
# 1. Install oc CLI (if not installed)
# Download from OpenShift web console → Command Line Tools

# 2. Login to OpenShift
oc login --token=YOUR_TOKEN --server=YOUR_SERVER

# 3. Navigate to project directory
cd /home/houssem/Desktop/project_cloud
```

---

## Deploy Application (5 minutes)

```bash
# Step 1: Create project
oc new-project notes-app

# Step 2: Deploy database
oc apply -f openshift/postgres.yaml

# Step 3: Wait for database to be ready
oc get pods -w
# Wait until postgres pod shows 1/1 Running
# Press Ctrl+C to exit

# Step 4: Deploy backend
oc apply -f openshift/backend.yaml
oc start-build backend-build --from-dir=./backend --follow

# Step 5: Deploy frontend
oc apply -f openshift/frontend.yaml
oc start-build frontend-build --from-dir=./frontend --follow
```

---

## Access Application (1 minute)

```bash
# Get application URL
oc get route frontend-route -o jsonpath='{.spec.host}'

# Open in browser
# Format: https://frontend-route-notes-app.apps.<cluster>.com
```

---

## Verify Everything Works (2 minutes)

```bash
# Check all pods are running
oc get pods

# Expected output:
# NAME                READY   STATUS      RESTARTS   AGE
# backend-1-deploy    0/1     Completed   0          5m
# backend-1-xxxxx     1/1     Running     0          5m
# backend-1-yyyyy     1/1     Running     0          5m
# frontend-1-deploy   0/1     Completed   0          4m
# frontend-1-xxxxx    1/1     Running     0          4m
# frontend-1-yyyyy    1/1     Running     0          4m
# postgres-1-deploy   0/1     Completed   0          8m
# postgres-1-xxxxx    1/1     Running     0          8m

# All should show 1/1 Running (except -deploy pods which are Completed)

# Test in browser
# 1. Create a note
# 2. Verify it appears in the list
# ✅ Success!
```

---

## Demonstrate Key Features

### Data Persistence Test
```bash
# 1. Create a note in the browser titled "Persistence Test"
# 2. Delete PostgreSQL pod
POSTGRES_POD=$(oc get pods -l deploymentconfig=postgres -o jsonpath='{.items[0].metadata.name}')
oc delete pod $POSTGRES_POD

# 3. Wait for new pod
oc get pods -w | grep postgres
# Wait for 1/1 Running, then Ctrl+C

# 4. Refresh browser
# Note "Persistence Test" still visible ✅
```

### Scalability Test
```bash
# Scale backend to 5 replicas
oc scale deploymentconfig backend --replicas=5

# Verify
oc get pods | grep backend | grep Running | wc -l
# Output: 5 ✅

# Scale frontend to 3 replicas
oc scale deploymentconfig frontend --replicas=3

# Verify
oc get pods | grep frontend | grep Running | wc -l
# Output: 3 ✅
```

### Load Balancing Test
```bash
# Make multiple requests and see distribution
for i in {1..20}; do
  oc exec deployment/frontend -- curl -s http://backend-service:8080/api/health | grep timestamp
done

# Different timestamps = different pods handling requests ✅
```

---

## Common Commands

```bash
# View logs
oc logs deployment/backend --tail=50
oc logs deployment/frontend --tail=50

# Check pod status
oc get pods

# Check services
oc get services

# Check routes
oc get routes

# Check storage
oc get pvc

# View all resources
oc get all

# Open shell in pod
oc rsh deployment/backend

# Delete everything (careful!)
oc delete project notes-app
```

---

## Troubleshooting Quick Fixes

### Pods not starting
```bash
# Check events
oc get events --sort-by='.lastTimestamp' | tail -20

# Check pod details
oc describe pod <pod-name>
```

### Build failed
```bash
# Check build logs
oc logs build/<build-name>

# Retry build
oc start-build backend-build --from-dir=./backend --follow
```

### Can't access application
```bash
# Verify route exists
oc get route

# Verify pods are running
oc get pods | grep frontend

# Check frontend logs
oc logs deployment/frontend
```

---

## IT460 Requirements Checklist

Use this during demonstration:

- [ ] ✅ **Containerization**: Show Dockerfiles in backend/ and frontend/
- [ ] ✅ **Microservices**: Explain 3 services (Frontend, Backend, Database)
- [ ] ✅ **Communication**: Show Service DNS (`backend-service`, `postgres-service`)
- [ ] ✅ **OpenShift Config**: Show YAML files in openshift/
- [ ] ✅ **Data Persistence**: Demonstrate pod deletion test above
- [ ] ✅ **Scalability**: Scale to 5 replicas
- [ ] ✅ **Load Balancing**: Show traffic distribution

---

## Project Structure Quick Reference

```
project_cloud/
├── backend/              # Node.js API
│   ├── server.js
│   ├── Dockerfile
│   └── package.json
├── frontend/             # React UI
│   ├── src/App.js
│   ├── Dockerfile
│   └── package.json
├── openshift/            # Deployment configs
│   ├── postgres.yaml
│   ├── backend.yaml
│   └── frontend.yaml
├── DEPLOYMENT_GUIDE.md   # Detailed guide
├── FINAL_REPORT.md       # Project report
└── README.md             # Main documentation
```

---

## Emergency Help

If something goes wrong:

1. **Check pod status**: `oc get pods`
2. **View logs**: `oc logs <pod-name>`
3. **Check events**: `oc get events | tail -20`
4. **Describe resource**: `oc describe pod <pod-name>`
5. **Restart deployment**: `oc rollout restart deploymentconfig/<name>`
6. **Delete and redeploy**: `oc delete all -l app=notes-app` then reapply YAMLs

---

## Success Indicators

Your deployment is successful when:

✅ All pods show `1/1 Running`  
✅ Application accessible via browser  
✅ Can create and view notes  
✅ Data persists after pod deletion  
✅ Multiple replicas running  
✅ Load balancing works  

---

## Demo Script (5 minutes)

1. **Show Architecture** (30 seconds)
   - Open PROJECT_OVERVIEW.md
   - Explain 3-tier architecture

2. **Show Code** (1 minute)
   - Backend: `backend/server.js` (API endpoints)
   - Frontend: `frontend/src/App.js` (React UI)
   - Docker: `backend/Dockerfile` (containerization)

3. **Show OpenShift Config** (1 minute)
   - `openshift/postgres.yaml` (PVC for persistence)
   - `openshift/backend.yaml` (DeploymentConfig, Service)
   - `openshift/frontend.yaml` (Route for external access)

4. **Show Running Application** (1 minute)
   - `oc get pods` (all running)
   - `oc get services` (internal networking)
   - `oc get routes` (external URL)
   - Open browser, create note

5. **Demonstrate Persistence** (1 minute)
   - Delete postgres pod
   - Show new pod starts
   - Refresh browser, note still there

6. **Demonstrate Scaling** (30 seconds)
   - `oc scale deploymentconfig backend --replicas=5`
   - `oc get pods` (5 backend pods)
   - Explain load balancing

---

**TOTAL TIME: 10 minutes to deploy, 5 minutes to demonstrate**

Good luck with your presentation! 🚀
