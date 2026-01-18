# 📝 Notes Application - OpenShift Multi-Container Deployment

## IT460 Cloud Computing Project

A complete multi-container application demonstrating microservices architecture, data persistence, scalability, and load balancing on OpenShift.

---

## 🎯 Project Overview

This project implements a simple yet complete **Notes Application** with:
- **Frontend**: React-based web interface
- **Backend**: Node.js/Express REST API
- **Database**: PostgreSQL with persistent storage

**Deployed on OpenShift** to demonstrate cloud-native application development and container orchestration.

---

## 🏗️ Architecture

```
Internet Users
       ↓
   OpenShift Route (HTTPS)
       ↓
   Frontend Service (Load Balancer)
       ↓
   [Frontend Pod 1] [Frontend Pod 2]  ← Horizontally Scalable
       ↓
   Backend Service (Load Balancer)
       ↓
   [Backend Pod 1] [Backend Pod 2]    ← Horizontally Scalable
       ↓
   PostgreSQL Service
       ↓
   [PostgreSQL Pod]
       ↓
   PersistentVolume (1GB Storage)     ← Data Persistence
```

### Microservices Breakdown

| Service | Technology | Purpose | Scalable |
|---------|-----------|---------|----------|
| **Frontend** | React + Express | User interface, serve static files | ✅ Yes |
| **Backend** | Node.js + Express | REST API, business logic | ✅ Yes |
| **Database** | PostgreSQL 13 | Data storage, persistence | ❌ No (single instance) |

---

## 📂 Project Structure

```
project_cloud/
├── backend/                    # Backend API service
│   ├── server.js              # Express server
│   ├── package.json           # Node dependencies
│   ├── Dockerfile             # Container image definition
│   └── README.md              # Backend documentation
│
├── frontend/                   # Frontend UI service
│   ├── src/                   # React source code
│   │   ├── App.js            # Main React component
│   │   ├── App.css           # Styling
│   │   └── index.js          # Entry point
│   ├── public/                # Static files
│   ├── server.js              # Production server
│   ├── package.json           # Node dependencies
│   ├── Dockerfile             # Multi-stage build
│   └── README.md              # Frontend documentation
│
├── openshift/                  # Kubernetes/OpenShift configurations
│   ├── postgres.yaml          # Database deployment + PVC
│   ├── backend.yaml           # Backend deployment + service
│   ├── frontend.yaml          # Frontend deployment + route
│   └── YAML_EXPLANATION.md    # Detailed YAML guide
│
├── docker/                     # Docker documentation
│   └── DOCKERFILE_EXPLANATION.md
│
├── PROJECT_OVERVIEW.md         # Architecture explanation
├── DEPLOYMENT_GUIDE.md         # Zero-to-hero deployment steps
├── FINAL_REPORT.md            # Project report for submission
└── README.md                   # This file
```

---

## ✨ Features

### Functional Features
- ✅ Create notes with title and content
- ✅ View all notes in chronological order
- ✅ Responsive design (mobile + desktop)
- ✅ Real-time data refresh
- ✅ Error handling and loading states

### Cloud Features (IT460 Requirements)
- ✅ **Containerization**: Docker images for all services
- ✅ **Microservices**: Three independent services
- ✅ **Inter-Container Communication**: Services communicate via internal DNS
- ✅ **OpenShift Deployment**: Native OpenShift resources (DeploymentConfig, Service, Route)
- ✅ **Data Persistence**: PostgreSQL data survives pod restarts
- ✅ **Horizontal Scaling**: Backend and Frontend scale to multiple replicas
- ✅ **Load Balancing**: OpenShift Services distribute traffic automatically

---

## 🚀 Quick Start

### Prerequisites
- OpenShift cluster access
- `oc` CLI installed
- Project source code

### Deploy in 5 Steps

```bash
# 1. Login to OpenShift
oc login --token=<your-token> --server=<your-server>

# 2. Create project
oc new-project notes-app

# 3. Deploy database
oc apply -f openshift/postgres.yaml

# 4. Build and deploy backend
oc apply -f openshift/backend.yaml
oc start-build backend-build --from-dir=./backend --follow

# 5. Build and deploy frontend
oc apply -f openshift/frontend.yaml
oc start-build frontend-build --from-dir=./frontend --follow
```

### Access Application

```bash
# Get application URL
oc get route frontend-route

# Open in browser
https://frontend-route-notes-app.apps.<your-cluster>.com
```

**For detailed step-by-step instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**

---

## 🗄️ Data Persistence Explained

### How It Works

1. **PersistentVolumeClaim (PVC)**: Requests 1GB of storage from OpenShift
2. **Volume Mount**: PostgreSQL pod mounts PVC at `/var/lib/postgresql/data`
3. **Data Storage**: All database files stored on PVC (not in container)
4. **Pod Restart**: New pod mounts same PVC → data persists

### Verification Test

```bash
# 1. Create a note in the UI
# 2. Delete PostgreSQL pod
oc delete pod <postgres-pod-name>

# 3. Wait for new pod to start
oc get pods -w

# 4. Refresh browser - note still exists! ✅
```

**This proves data survives pod deletion.**

---

## 📈 Scalability & Load Balancing

### Horizontal Scaling

**Scale Backend**:
```bash
# Increase to 5 replicas
oc scale deploymentconfig backend --replicas=5

# Verify
oc get pods | grep backend
```

**Scale Frontend**:
```bash
# Increase to 3 replicas
oc scale deploymentconfig frontend --replicas=3

# Verify
oc get pods | grep frontend
```

### Load Balancing

**How OpenShift Load Balances**:

1. **Service** creates a single virtual IP
2. **kube-proxy** distributes traffic across all pod IPs
3. **Round-robin** algorithm (default)
4. **Automatic**: No configuration needed

**Traffic Flow**:
```
User Request → Route → Service → [Pod 1, Pod 2, Pod 3, ...] (Round-robin)
```

**Verify Load Distribution**:
```bash
# Make multiple requests
for i in {1..10}; do
  oc exec deployment/frontend -- curl -s http://backend-service:8080/api/health
done
```

Requests are handled by different backend pods.

---

## 🔗 Inter-Container Communication

### Service DNS

OpenShift creates DNS entries for Services:

```
<service-name>.<namespace>.svc.cluster.local
```

**Examples**:
- `postgres-service.notes-app.svc.cluster.local`
- `backend-service.notes-app.svc.cluster.local`

**Short form** (within same namespace):
- `postgres-service`
- `backend-service`

### Communication Flow

**Frontend → Backend**:
```javascript
// Frontend code
fetch('http://backend-service:8080/api/notes')
```

**Backend → Database**:
```javascript
// Backend code
host: 'postgres-service',
port: 5432
```

**No hardcoded IPs!** All communication uses DNS names.

---

## 📊 Resource Requirements

### Minimum Cluster Resources

| Component | CPU Request | Memory Request | CPU Limit | Memory Limit |
|-----------|-------------|----------------|-----------|--------------|
| Frontend (per pod) | 100m | 128Mi | 500m | 256Mi |
| Backend (per pod) | 100m | 128Mi | 500m | 256Mi |
| PostgreSQL | 100m | 256Mi | 500m | 512Mi |
| **Total (2+2+1 pods)** | **500m** | **768Mi** | **2.5 cores** | **1.5Gi** |

### Storage

- **PersistentVolumeClaim**: 1Gi
- **Access Mode**: ReadWriteOnce (RWO)

---

## 🧪 Testing

### Health Checks

**Backend**:
```bash
oc exec deployment/backend -- curl http://localhost:8080/api/health
```

**Frontend**:
```bash
oc exec deployment/frontend -- curl http://localhost:3000/health
```

**Database**:
```bash
oc rsh deployment/postgres
psql -U notesuser -d notesdb -c "\dt"
```

### Functional Testing

1. **Create Note**: Enter title/content, click "Create Note"
2. **View Notes**: All notes displayed in grid
3. **Refresh**: Click refresh button to reload
4. **Persistence**: Delete pod, verify data remains

### Load Testing (Optional)

```bash
# Using Apache Bench
ab -n 1000 -c 10 https://<your-route-url>/

# Using curl loop
for i in {1..100}; do
  curl -X POST https://<your-route-url>/api/notes \
    -H "Content-Type: application/json" \
    -d '{"title":"Test","content":"Load test"}'
done
```

---

## 📝 API Documentation

### Endpoints

#### Health Check
```
GET /api/health
Response: 200 OK
{
  "status": "healthy",
  "service": "notes-backend",
  "timestamp": "2026-01-17T10:30:00.000Z"
}
```

#### Get All Notes
```
GET /api/notes
Response: 200 OK
{
  "success": true,
  "count": 2,
  "notes": [
    {
      "id": 1,
      "title": "First Note",
      "content": "Note content here",
      "created_at": "2026-01-17T10:00:00.000Z"
    }
  ]
}
```

#### Create Note
```
POST /api/notes
Content-Type: application/json
Body: {
  "title": "My Note",
  "content": "Content here"
}

Response: 201 Created
{
  "success": true,
  "message": "Note created successfully",
  "note": {
    "id": 3,
    "title": "My Note",
    "content": "Content here",
    "created_at": "2026-01-17T11:00:00.000Z"
  }
}
```

---

## 🛠️ Troubleshooting

### Common Issues

#### Pods Not Starting
```bash
# Check pod status
oc get pods

# View events
oc get events --sort-by='.lastTimestamp' | tail -20

# Check logs
oc logs <pod-name>
```

#### Application Not Accessible
```bash
# Verify route exists
oc get route

# Check service
oc get service frontend-service

# Verify pods running
oc get pods | grep frontend
```

#### Database Connection Failed
```bash
# Check PostgreSQL running
oc get pods | grep postgres

# Verify service
oc get service postgres-service

# Test connection
oc exec deployment/backend -- ping postgres-service
```

**For comprehensive troubleshooting, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md#13-troubleshooting)**

---

## 📚 Documentation

- **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)**: Architecture and design decisions
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**: Complete deployment tutorial
- **[YAML_EXPLANATION.md](./openshift/YAML_EXPLANATION.md)**: OpenShift resource details
- **[DOCKERFILE_EXPLANATION.md](./docker/DOCKERFILE_EXPLANATION.md)**: Container build process
- **[FINAL_REPORT.md](./FINAL_REPORT.md)**: Project report for submission

---

## 🎓 IT460 Requirements Compliance

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| **Containerization with OpenShift** | Dockerfiles + BuildConfig for all services | ✅ Complete |
| **Microservices Architecture** | Frontend, Backend, Database as separate services | ✅ Complete |
| **Communication Between Containers** | Service DNS (backend-service, postgres-service) | ✅ Complete |
| **OpenShift Deployment Configuration** | DeploymentConfig, Service, Route, PVC | ✅ Complete |
| **Data Persistence** | PersistentVolumeClaim mounted to PostgreSQL | ✅ Complete |
| **Scalability and Load Balancing** | Horizontal scaling + Service load balancing | ✅ Complete |

**All requirements satisfied!** ✅

---

## 🚀 Future Enhancements

### Potential Improvements
- [ ] Add authentication (user accounts)
- [ ] Implement note editing/deletion
- [ ] Add categories/tags for notes
- [ ] Implement full-text search
- [ ] Add CI/CD pipeline (GitHub Actions + OpenShift)
- [ ] Implement PostgreSQL replication (HA)
- [ ] Add monitoring (Prometheus + Grafana)
- [ ] Implement caching layer (Redis)

---

## 👥 Authors

- **IT460 Student**
- **Course**: Cloud Computing (IT460)
- **Project**: Multi-Container Application Development

---

## 📄 License

This project is created for educational purposes as part of the IT460 Cloud Computing course.

---

## 🙏 Acknowledgments

- OpenShift documentation and community
- Node.js and React communities
- PostgreSQL documentation
- IT460 course instructors

---

## 📞 Support

For questions or issues:
1. Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) troubleshooting section
2. Review OpenShift logs: `oc logs <pod-name>`
3. Check OpenShift events: `oc get events`
4. Consult instructor or course materials

---

**Last Updated**: January 17, 2026

**Project Status**: ✅ Complete and Deployed
