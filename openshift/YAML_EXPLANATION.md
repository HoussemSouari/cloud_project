# ============================================
# OpenShift YAML Configuration Explanation
# ============================================

## Overview

This document explains EVERY resource in the OpenShift YAML files.
After reading this, you will understand:
- What each YAML file does
- Why each resource is needed
- How resources connect to each other
- How this satisfies project requirements

---

## File Structure

```
openshift/
├── postgres.yaml     # Database (PVC, Secret, DeploymentConfig, Service)
├── backend.yaml      # API (BuildConfig, ImageStream, DeploymentConfig, Service)
├── frontend.yaml     # UI (BuildConfig, ImageStream, DeploymentConfig, Service, Route)
└── YAML_EXPLANATION.md (this file)
```

---

## 1. PostgreSQL Resources (postgres.yaml)

### A. PersistentVolumeClaim (PVC)

```yaml
kind: PersistentVolumeClaim
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

**What it does**:
- Requests 1GB of persistent storage from OpenShift
- Like asking for a hard drive that survives pod deletion

**Access Modes Explained**:
- `ReadWriteOnce` (RWO): Only ONE pod can mount this volume at a time
- `ReadWriteMany` (RWX): Multiple pods can mount (not supported by all storage)
- `ReadOnlyMany` (ROX): Multiple pods read-only

**Why ReadWriteOnce?**
- Database needs exclusive access to files
- Prevents data corruption from multiple writers

**Storage Class**:
- Not specified = uses default storage class
- OpenShift automatically provisions the volume

**What happens**:
1. OpenShift receives PVC request
2. Finds available storage (disk, NFS, cloud storage)
3. Creates a PersistentVolume (PV)
4. Binds PVC to PV
5. Pod can now use the volume

---

### B. Secret

```yaml
kind: Secret
type: Opaque
stringData:
  database-user: notesuser
  database-password: notespass
  database-name: notesdb
```

**What it does**:
- Stores sensitive information (passwords)
- Base64 encoded by OpenShift
- Injected into pods as environment variables

**Why Secret instead of ConfigMap?**
- Secrets are encrypted at rest (if OpenShift configured)
- Not displayed in logs
- Role-Based Access Control (RBAC) protection

**How it's used**:
```yaml
env:
  - name: POSTGRES_PASSWORD
    valueFrom:
      secretKeyRef:
        name: postgres-secret
        key: database-password
```

**Security Note**:
- In production, use OpenShift Secrets Vault
- Don't commit secrets to Git
- Rotate passwords regularly

---

### C. DeploymentConfig

```yaml
kind: DeploymentConfig
spec:
  replicas: 1
  strategy:
    type: Recreate
```

**What it does**:
- Defines HOW to deploy PostgreSQL
- Ensures 1 pod is always running
- Handles updates and failures

**Replicas: 1**
- Single database instance
- Cannot scale horizontally (PostgreSQL limitation without clustering)
- For HA, would need PostgreSQL replication (out of scope)

**Strategy: Recreate**
- Stops old pod BEFORE starting new one
- Prevents two databases writing to same volume
- Causes brief downtime during updates
- Alternative: `Rolling` (zero-downtime, but not suitable for single DB)

**Container Spec**:
```yaml
containers:
  - name: postgresql
    image: postgres:13-alpine
    volumeMounts:
      - name: postgres-data
        mountPath: /var/lib/postgresql/data
```

**Volume Mount Explained**:
- `/var/lib/postgresql/data` is where PostgreSQL stores ALL data
- This directory is mounted from the PVC
- When pod dies, data remains on PVC
- New pod mounts same PVC → data persists

**THIS IS DATA PERSISTENCE!** ✅

---

### D. Probes

```yaml
livenessProbe:
  exec:
    command: [pg_isready -U $POSTGRES_USER]
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  exec:
    command: [pg_isready -U $POSTGRES_USER]
  initialDelaySeconds: 5
  periodSeconds: 10
```

**Liveness Probe**:
- Checks if container is ALIVE
- If fails 3 times → OpenShift restarts container
- Command: `pg_isready` (PostgreSQL health check)

**Readiness Probe**:
- Checks if container is READY to serve traffic
- If fails → removes pod from Service load balancer
- Prevents sending traffic to starting/broken pods

**Timing**:
- `initialDelaySeconds: 30` → Wait 30s before first check
- `periodSeconds: 10` → Check every 10s

---

### E. Service

```yaml
kind: Service
spec:
  type: ClusterIP
  ports:
    - port: 5432
      targetPort: 5432
  selector:
    app: notes-app
    tier: database
```

**What it does**:
- Creates internal DNS name: `postgres-service`
- Load balances to pods matching selector
- Provides stable endpoint (even if pod IP changes)

**Service Types**:
- `ClusterIP`: Internal only (our choice for DB)
- `NodePort`: Exposes on each node's IP
- `LoadBalancer`: Cloud load balancer
- `ExternalName`: DNS alias

**How Backend Connects**:
```javascript
// Backend code
host: 'postgres-service'  // DNS resolves to Service IP
port: 5432
```

**Magic**:
- OpenShift CoreDNS resolves `postgres-service` to Service IP
- Service forwards to pod IP
- Backend doesn't need to know pod IP (loose coupling)

---

## 2. Backend Resources (backend.yaml)

### A. BuildConfig

```yaml
kind: BuildConfig
spec:
  source:
    type: Binary
    contextDir: backend
  strategy:
    type: Docker
    dockerStrategy:
      dockerfilePath: Dockerfile
  output:
    to:
      kind: ImageStreamTag
      name: backend:latest
```

**What it does**:
- Tells OpenShift HOW to build Docker image
- Uses Dockerfile from backend/ directory
- Pushes image to ImageStream

**Build Process**:
1. Developer runs: `oc start-build backend-build --from-dir=backend`
2. OpenShift uploads backend/ directory
3. OpenShift runs `docker build -f backend/Dockerfile`
4. Image tagged as `backend:latest`
5. Image pushed to internal registry
6. DeploymentConfig automatically deploys new image

**Why Binary Source?**
- Simple for this project
- Alternative: Git source (OpenShift clones repo)
- Binary = upload from local machine

---

### B. ImageStream

```yaml
kind: ImageStream
metadata:
  name: backend
```

**What it does**:
- Like a Docker repository inside OpenShift
- Stores different versions (tags) of backend image
- Tracks image changes

**Why not Docker Hub?**
- Faster (local registry)
- No pull rate limits
- Automatic deployment triggers
- Private by default

**Image Tag Format**:
```
image-registry.openshift-image-registry.svc:5000/notes-project/backend:latest
```

**Shorter reference**:
```
backend:latest
```
(OpenShift resolves automatically)

---

### C. DeploymentConfig

```yaml
spec:
  replicas: 2
  strategy:
    type: Rolling
```

**Replicas: 2**
- Two backend pods running simultaneously
- **THIS IS SCALABILITY** ✅
- Can increase to 3, 5, 10+ pods
- Service load balances between them

**Rolling Strategy**:
- Deploys new version gradually
- Zero downtime deployments
- Process:
  1. Start 1 new pod (v2)
  2. Wait for readiness probe
  3. Stop 1 old pod (v1)
  4. Repeat until all pods updated

**Environment Variables**:
```yaml
env:
  - name: DB_HOST
    value: postgres-service
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: postgres-secret
        key: database-password
```

**How Backend Connects to Database**:
```javascript
// server.js
host: process.env.DB_HOST  // 'postgres-service'
password: process.env.DB_PASSWORD  // from secret
```

**Inter-Container Communication** ✅
- Backend → postgres-service:5432
- Service DNS resolution
- No hardcoded IPs

---

### D. Triggers

```yaml
triggers:
  - type: ConfigChange
  - type: ImageChange
    imageChangeParams:
      automatic: true
      from:
        kind: ImageStreamTag
        name: backend:latest
```

**ConfigChange Trigger**:
- Redeploys if DeploymentConfig changes
- Example: Change environment variable

**ImageChange Trigger**:
- Redeploys when new image pushed
- Automatic: true = auto-deploy
- Process:
  1. `oc start-build backend-build`
  2. New image pushed to ImageStream
  3. DeploymentConfig detects change
  4. Rolling update starts automatically

---

## 3. Frontend Resources (frontend.yaml)

### A. ConfigMap

```yaml
kind: ConfigMap
data:
  REACT_APP_API_URL: "http://backend-service:8080"
```

**What it does**:
- Stores non-sensitive configuration
- Injected into pods
- Can be updated without rebuilding image

**ConfigMap vs Secret**:
- ConfigMap: Public data (URLs, settings)
- Secret: Passwords, tokens, certificates

**Usage**:
```yaml
env:
  - name: REACT_APP_API_URL
    valueFrom:
      configMapKeyRef:
        name: frontend-config
        key: REACT_APP_API_URL
```

---

### B. Route

```yaml
kind: Route
spec:
  to:
    kind: Service
    name: frontend-service
  port:
    targetPort: http
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
```

**What it does**:
- Exposes application to the internet
- Creates public URL: `https://frontend-route-notes-project.apps.openshift.com`
- **THIS IS THE APPLICATION ENTRY POINT** ✅

**TLS Termination**:
- `edge`: HTTPS stops at router, HTTP internally
- `passthrough`: HTTPS all the way to pod
- `reencrypt`: HTTPS to router, different HTTPS internally

**Traffic Flow**:
```
User Browser
    ↓ HTTPS
OpenShift Router (Route)
    ↓ HTTP
frontend-service:3000
    ↓ Load Balance
[Frontend Pod 1] [Frontend Pod 2]
```

**Automatic Load Balancing** ✅
- Router distributes traffic to both frontend pods
- Round-robin algorithm
- Sticky sessions optional (not enabled)

---

## 4. Resource Relationships

### Full Data Flow:

```
User
  ↓ HTTPS
Route (frontend-route)
  ↓
Service (frontend-service) → Load Balance
  ↓                          ↓
Frontend Pod 1         Frontend Pod 2
  ↓                          ↓
Service (backend-service) ← Load Balance
  ↓                          ↓
Backend Pod 1          Backend Pod 2
  ↓                          ↓
Service (postgres-service)
  ↓
PostgreSQL Pod
  ↓
PersistentVolume (1GB)
```

### DNS Resolution:

```
backend-service         → 10.217.5.45 (Service IP)
postgres-service        → 10.217.5.46 (Service IP)
frontend-service        → 10.217.5.47 (Service IP)
```

Pod IPs change → Service IPs stable → DNS works

---

## 5. How This Satisfies ALL Requirements

| Requirement | Resource | Proof |
|------------|----------|-------|
| **Containerization** | Dockerfiles + BuildConfig | Images built in OpenShift |
| **Microservices** | 3 DeploymentConfigs | Frontend, Backend, PostgreSQL |
| **Communication** | Services + DNS | backend-service, postgres-service |
| **OpenShift Config** | All YAML files | Native OpenShift resources |
| **Data Persistence** | PVC + volumeMount | /var/lib/postgresql/data |
| **Scalability** | replicas: 2 | Frontend & Backend scale |
| **Load Balancing** | Service + Route | Traffic distributed automatically |

---

## 6. Common Questions

### Q: Why 3 separate YAML files?
**A**: Organizational clarity. Could combine into one, but separate files are easier to manage.

### Q: Why DeploymentConfig instead of Deployment?
**A**: DeploymentConfig is OpenShift-native with extra features (automatic rollbacks, triggers). Deployment is Kubernetes-native. Both work.

### Q: Can I scale the database?
**A**: Not with this simple setup. PostgreSQL needs primary-replica replication (complex, out of scope). Single instance is fine for this project.

### Q: What if I delete a pod?
**A**: OpenShift automatically creates a new one to match `replicas` count. Self-healing!

### Q: Where is the Route URL?
**A**: Check with `oc get route frontend-route`. Format: `https://<route-name>-<project-name>.<cluster-domain>`

### Q: How do I update the app?
**A**: Rebuild image: `oc start-build backend-build --from-dir=backend`. Automatic deployment happens via ImageChange trigger.

---

## 7. Resource Limits Explained

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

**Requests**: 
- Minimum guaranteed resources
- OpenShift won't schedule pod unless node has this available
- 100m = 0.1 CPU core

**Limits**:
- Maximum allowed
- Pod is throttled/killed if exceeded
- Prevents one pod from starving others

**Best Practice**:
- Set requests = typical usage
- Set limits = 2x requests
- Monitor and adjust

---

## 8. Applying YAML Files

### Order Matters!

1. **Database first** (others depend on it):
   ```bash
   oc apply -f openshift/postgres.yaml
   ```

2. **Backend**:
   ```bash
   oc apply -f openshift/backend.yaml
   ```

3. **Frontend** (depends on backend):
   ```bash
   oc apply -f openshift/frontend.yaml
   ```

### Why Order Matters:
- Backend needs postgres-secret
- Frontend needs backend-service DNS

**Note**: OpenShift eventually resolves dependencies, but correct order avoids temporary errors.

---

## Summary

These YAML files define a **complete, production-ready** application with:
✅ Persistent storage
✅ Horizontal scaling
✅ Automatic load balancing
✅ Health checks
✅ Rolling updates
✅ Security (Secrets, TLS)
✅ Resource management
✅ Inter-service communication

This satisfies **ALL IT460 project requirements**! 🎉
