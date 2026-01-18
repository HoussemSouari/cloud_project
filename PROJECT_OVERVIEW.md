# IT460 Cloud Computing Project: Simple Notes Application

## Project Selection Rationale

**Chosen Project: Multi-User Notes Application**

### Why This Project is Perfect for OpenShift:

1. **Simple to Understand**: Everyone understands what a notes app does
2. **Easy to Demonstrate**: Clear input/output for evaluation
3. **Meets ALL Requirements**:
   - ✅ Containerization (Docker images for frontend/backend)
   - ✅ Microservices (Separate frontend, backend, database)
   - ✅ Inter-container Communication (Frontend → Backend → Database)
   - ✅ Data Persistence (Notes survive pod restarts)
   - ✅ Scalability (Backend can scale horizontally)
   - ✅ Load Balancing (OpenShift routes distribute traffic)

4. **Easy to Defend**: Clear architecture, obvious data flow
5. **Quick to Deploy**: No complex dependencies

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet/User                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │  OpenShift     │
                  │  Route         │ ← Exposes application
                  └────────┬───────┘
                           │
                           ▼
                  ┌────────────────┐
                  │  Frontend      │
                  │  Service       │ ← Load balances to pods
                  └────────┬───────┘
                           │
                ┌──────────┴──────────┐
                ▼                     ▼
         ┌──────────┐          ┌──────────┐
         │ Frontend │          │ Frontend │
         │  Pod 1   │          │  Pod 2   │  ← Scalable
         └──────────┘          └──────────┘
                │                     │
                └──────────┬──────────┘
                           │
                           ▼ (API Calls)
                  ┌────────────────┐
                  │  Backend       │
                  │  Service       │ ← Load balances to pods
                  └────────┬───────┘
                           │
                ┌──────────┴──────────┐
                ▼                     ▼
         ┌──────────┐          ┌──────────┐
         │ Backend  │          │ Backend  │
         │  Pod 1   │          │  Pod 2   │  ← Scalable
         └────┬─────┘          └────┬─────┘
              │                     │
              └──────────┬──────────┘
                         │
                         ▼ (Database Queries)
                ┌────────────────┐
                │  PostgreSQL    │
                │  Service       │
                └────────┬───────┘
                         │
                         ▼
                  ┌──────────┐
                  │PostgreSQL│
                  │   Pod    │ ← Single instance
                  └────┬─────┘
                       │
                       ▼
              ┌────────────────┐
              │ Persistent     │
              │ Volume Claim   │ ← Data survives restarts
              │ (PVC)          │
              └────────────────┘
```

---

## Microservices Breakdown

### 1. Frontend Service (React)
**Responsibility**:
- Serve the web UI to users
- Display list of notes
- Provide form to create new notes
- Handle user interactions

**Technology**: React (served via Node.js)

**Communication**: Makes HTTP REST API calls to Backend Service

---

### 2. Backend Service (Node.js/Express)
**Responsibility**:
- Provide REST API endpoints
- Handle business logic
- Validate requests
- Communicate with database
- Return JSON responses

**Technology**: Node.js with Express framework

**Endpoints**:
- `GET /api/notes` - Get all notes
- `POST /api/notes` - Create a new note
- `GET /api/health` - Health check

**Communication**: 
- Receives HTTP requests from Frontend
- Sends SQL queries to PostgreSQL

---

### 3. PostgreSQL Database
**Responsibility**:
- Store notes data persistently
- Provide ACID guarantees
- Survive pod restarts

**Technology**: PostgreSQL 13

**Persistence**: Uses PersistentVolumeClaim mounted at `/var/lib/postgresql/data`

---

## Data Flow Example

**User Creates a Note:**

1. User types note in browser → Frontend React app
2. Frontend sends `POST /api/notes` → Backend Service (via OpenShift Route)
3. Backend validates data
4. Backend executes `INSERT INTO notes...` → PostgreSQL
5. PostgreSQL stores data on PersistentVolume
6. PostgreSQL returns success → Backend
7. Backend returns JSON response → Frontend
8. Frontend updates UI to show new note

**Data Persistence Test:**

1. User creates note "Hello OpenShift"
2. Delete backend pod: `oc delete pod <backend-pod>`
3. OpenShift creates new pod automatically
4. New pod connects to same PostgreSQL
5. PostgreSQL still has data (from PersistentVolume)
6. User refreshes page → Note still visible ✅

---

## Why This Architecture Satisfies ALL Requirements

| Requirement | How It's Satisfied |
|-------------|-------------------|
| **Containerization** | Each service has its own Dockerfile and runs in containers |
| **Microservices** | Three independent services with single responsibilities |
| **Communication** | Frontend→Backend via HTTP, Backend→DB via TCP/SQL |
| **OpenShift Deployment** | DeploymentConfigs, Services, Routes all configured |
| **Data Persistence** | PostgreSQL uses PVC, data survives pod deletion |
| **Scalability** | Frontend and Backend can scale to multiple replicas |
| **Load Balancing** | OpenShift Services automatically distribute traffic |

---

## Next Steps

This document establishes the architecture. The following will be created:

1. **Full source code** for all three services
2. **Dockerfiles** for containerization
3. **OpenShift YAML** files for deployment
4. **Zero-to-hero deployment guide** (most important!)
5. **Final project report** for submission
