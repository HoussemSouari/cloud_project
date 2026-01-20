# Microservices Architecture Deployment Guide

## Overview

This deployment guide covers the microservices-based architecture for the Notes Application. The application has been decomposed into multiple independent services:

1. **Notes Service** (Port 8081) - CRUD operations for notes
2. **Analytics Service** (Port 8082) - Statistics and analytics
3. **Share Service** (Port 8083) - Note sharing and public access
4. **API Gateway** (Port 8080) - Request routing and rate limiting
5. **RabbitMQ** (Port 5672/15672) - Event-driven communication
6. **PostgreSQL** (Port 5432) - Shared database
7. **Frontend** (Port 3000) - React UI

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      USERS / BROWSERS                        │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (React)                           │
│                   Port 3000                                  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/HTTPS
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway (NGINX)                        │
│              Port 8080 - Route: /api/*                       │
│   Rate Limiting | Load Balancing | Request Routing          │
└──────┬──────────────────┬──────────────────┬────────────────┘
       │                  │                  │
       ↓                  ↓                  ↓
┌────────────┐     ┌────────────┐     ┌────────────┐
│   Notes    │     │ Analytics  │     │   Share    │
│  Service   │     │  Service   │     │  Service   │
│ Port 8081  │     │ Port 8082  │     │ Port 8083  │
│ (3 pods)   │     │ (2 pods)   │     │ (2 pods)   │
└─────┬──────┘     └─────┬──────┘     └─────┬──────┘
      │                  │                  │
      │ Events           │ Events           │ Events
      └──────────────────┼──────────────────┘
                         ↓
                  ┌──────────────┐
                  │  RabbitMQ    │
                  │  Port 5672   │
                  │  (1 pod)     │
                  └──────────────┘
      
      ↓ Database Queries ↓          ↓
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database (Port 5432)                 │
│              PersistentVolume: 1GB                           │
└─────────────────────────────────────────────────────────────┘
```

## Service Responsibilities

### 1. Notes Service (8081)
**Purpose:** Core CRUD operations for notes

**Endpoints:**
- `GET /api/notes` - List all notes (with search/filter)
- `GET /api/notes/:id` - Get single note
- `POST /api/notes` - Create new note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `PATCH /api/notes/:id/favorite` - Toggle favorite
- `PATCH /api/notes/:id/pin` - Toggle pin

**Events Published:**
- `note.created`
- `note.updated`
- `note.deleted`
- `note.favorite.toggled`
- `note.pin.toggled`

**Replicas:** 3 (high traffic expected)

### 2. Analytics Service (8082)
**Purpose:** Statistics, metrics, and insights

**Endpoints:**
- `GET /api/analytics` - Comprehensive analytics data
- `GET /api/stats` - Quick statistics summary
- `GET /api/analytics/categories` - Category breakdown
- `GET /api/analytics/timeline` - Time-based analytics
- `GET /api/analytics/insights` - Productivity insights

**Events Consumed:**
- `note.*` (all note events for cache updates)

**Replicas:** 2 (moderate traffic, complex queries)

### 3. Share Service (8083)
**Purpose:** Note sharing and public access

**Endpoints:**
- `POST /api/notes/:id/share` - Generate share link
- `GET /api/shared/:token` - Access shared note (public)
- `DELETE /api/notes/:id/share` - Revoke share link
- `GET /api/notes/:id/share/stats` - Share statistics
- `GET /api/shared` - List all shared notes

**Events Published:**
- `note.shared`
- `note.viewed`
- `note.share.revoked`

**Replicas:** 2 (public access, higher availability)

### 4. API Gateway (8080)
**Purpose:** Single entry point, routing, rate limiting

**Features:**
- Request routing to microservices
- Rate limiting per endpoint
- CORS handling
- Load balancing
- Health checks aggregation

**Rate Limits:**
- Notes Service: 100 requests/minute
- Analytics Service: 50 requests/minute
- Share Service: 200 requests/minute (public access)

**Replicas:** 2 (high availability for entry point)

### 5. RabbitMQ (5672)
**Purpose:** Event-driven communication between services

**Configuration:**
- Exchange: `notes_events` (topic, durable)
- Queues: `analytics_queue`
- Management UI: Port 15672

**Replicas:** 1 (message broker)

## Prerequisites

- OpenShift cluster access
- `oc` CLI installed and logged in
- Existing PostgreSQL deployment (from previous setup)
- Project/namespace created

## Deployment Steps

### Step 1: Deploy RabbitMQ

```bash
# Deploy RabbitMQ
oc apply -f openshift-microservices/rabbitmq.yaml

# Wait for RabbitMQ to be ready
oc get pods -w | grep rabbitmq

# Verify RabbitMQ is running
oc logs deployment/rabbitmq | grep "Server startup complete"

# Get RabbitMQ Management UI URL
oc get route rabbitmq-management-route
```

**Access Management UI:**
- URL: `https://rabbitmq-management-route-<namespace>.apps.<cluster-domain>`
- Username: `admin`
- Password: `rabbitmq_pass`

### Step 2: Deploy Notes Service

```bash
# Apply OpenShift manifests
oc apply -f openshift-microservices/notes-service.yaml

# Build and push container image
cd microservices/notes-service
oc start-build notes-service-build --from-dir=. --follow

# Wait for deployment
oc get pods -w | grep notes-service

# Verify 3 replicas are running
oc get pods -l app=notes-service

# Test health endpoint
oc exec deployment/notes-service -- curl http://localhost:8081/health
```

### Step 3: Deploy Analytics Service

```bash
# Apply OpenShift manifests
oc apply -f openshift-microservices/analytics-service.yaml

# Build and push container image
cd ../analytics-service
oc start-build analytics-service-build --from-dir=. --follow

# Wait for deployment
oc get pods -w | grep analytics-service

# Verify 2 replicas are running
oc get pods -l app=analytics-service

# Test health endpoint
oc exec deployment/analytics-service -- curl http://localhost:8082/health
```

### Step 4: Deploy Share Service

```bash
# Apply OpenShift manifests
oc apply -f openshift-microservices/share-service.yaml

# Build and push container image
cd ../share-service
oc start-build share-service-build --from-dir=. --follow

# Wait for deployment
oc get pods -w | grep share-service

# Verify 2 replicas are running
oc get pods -l app=share-service

# Test health endpoint
oc exec deployment/share-service -- curl http://localhost:8083/health
```

### Step 5: Deploy API Gateway

```bash
# Apply OpenShift manifests
oc apply -f openshift-microservices/api-gateway.yaml

# Build and push container image
cd ../api-gateway
oc start-build api-gateway-build --from-dir=. --follow

# Wait for deployment
oc get pods -w | grep api-gateway

# Verify 2 replicas are running
oc get pods -l app=api-gateway

# Get API Gateway URL
oc get route api-gateway-route
```

### Step 6: Update and Redeploy Frontend

```bash
# Frontend now points to API Gateway
# URL updated in App.js to api-gateway-route

cd ../../frontend

# Rebuild frontend
oc start-build frontend-build --from-dir=. --follow

# Wait for new pods
oc get pods -w | grep frontend

# Get frontend URL
oc get route frontend-route
```

## Verification & Testing

### 1. Check All Pods Are Running

```bash
oc get pods

# Expected output:
# notes-service-X-xxxxx          1/1     Running     0          5m
# notes-service-X-yyyyy          1/1     Running     0          5m
# notes-service-X-zzzzz          1/1     Running     0          5m
# analytics-service-X-xxxxx      1/1     Running     0          5m
# analytics-service-X-yyyyy      1/1     Running     0          5m
# share-service-X-xxxxx          1/1     Running     0          5m
# share-service-X-yyyyy          1/1     Running     0          5m
# api-gateway-X-xxxxx            1/1     Running     0          5m
# api-gateway-X-yyyyy            1/1     Running     0          5m
# rabbitmq-X-xxxxx               1/1     Running     0          10m
# postgres-X-xxxxx               1/1     Running     0          30m
# frontend-X-xxxxx               1/1     Running     0          5m
# frontend-X-yyyyy               1/1     Running     0          5m
```

### 2. Test API Gateway Health

```bash
GATEWAY_URL=$(oc get route api-gateway-route -o jsonpath='{.spec.host}')

# Test gateway health
curl https://$GATEWAY_URL/health

# Test service health endpoints
curl https://$GATEWAY_URL/api/health/notes
curl https://$GATEWAY_URL/api/health/analytics
curl https://$GATEWAY_URL/api/health/share
```

### 3. Test Notes Service Through Gateway

```bash
# Create a note
curl -X POST https://$GATEWAY_URL/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Microservices Test",
    "content": "Testing the new architecture",
    "category": "work"
  }'

# Get all notes
curl https://$GATEWAY_URL/api/notes
```

### 4. Test Analytics Service

```bash
# Get statistics
curl https://$GATEWAY_URL/api/stats

# Get analytics
curl https://$GATEWAY_URL/api/analytics
```

### 5. Test Share Service

```bash
# Create a share link (replace :id with actual note ID)
curl -X POST https://$GATEWAY_URL/api/notes/1/share

# Access shared note (replace :token with actual token)
curl https://$GATEWAY_URL/api/shared/<token>
```

### 6. Verify RabbitMQ Event Flow

```bash
# Check RabbitMQ logs for event processing
oc logs deployment/rabbitmq | tail -20

# Check Analytics Service for received events
oc logs deployment/analytics-service | grep "Received event"

# Access RabbitMQ Management UI
RABBITMQ_URL=$(oc get route rabbitmq-management-route -o jsonpath='{.spec.host}')
echo "RabbitMQ UI: https://$RABBITMQ_URL"
echo "Username: admin"
echo "Password: rabbitmq_pass"
```

### 7. Test Frontend

```bash
FRONTEND_URL=$(oc get route frontend-route -o jsonpath='{.spec.host}')
echo "Frontend URL: https://$FRONTEND_URL"

# Open in browser and verify:
# - Can create notes (Notes Service)
# - Can view analytics (Analytics Service)
# - Can generate share links (Share Service)
# - All requests go through API Gateway
```

## Load Balancing Verification

### Test Notes Service Load Balancing

```bash
# Make 20 requests and check which pods handle them
for i in {1..20}; do
  curl -s https://$GATEWAY_URL/api/notes > /dev/null
  sleep 0.1
done

# Check log counts per pod
oc logs notes-service-X-xxxxx | grep "GET /api/notes" | wc -l
oc logs notes-service-X-yyyyy | grep "GET /api/notes" | wc -l
oc logs notes-service-X-zzzzz | grep "GET /api/notes" | wc -l

# Should be roughly even distribution (e.g., 6-8 requests each)
```

## Scaling Services

### Scale Notes Service to 5 Replicas

```bash
oc scale deploymentconfig notes-service --replicas=5

# Verify
oc get pods -l app=notes-service
```

### Scale Analytics Service to 3 Replicas

```bash
oc scale deploymentconfig analytics-service --replicas=3

# Verify
oc get pods -l app=analytics-service
```

### Scale API Gateway to 3 Replicas

```bash
oc scale deploymentconfig api-gateway --replicas=3

# Verify
oc get pods -l app=api-gateway
```

## Monitoring and Troubleshooting

### View Logs for All Services

```bash
# Notes Service
oc logs -f deployment/notes-service

# Analytics Service
oc logs -f deployment/analytics-service

# Share Service
oc logs -f deployment/share-service

# API Gateway
oc logs -f deployment/api-gateway

# RabbitMQ
oc logs -f deployment/rabbitmq
```

### Check Service Endpoints

```bash
# List all services
oc get svc

# Check service endpoints (pods behind each service)
oc get endpoints notes-service
oc get endpoints analytics-service
oc get endpoints share-service
oc get endpoints api-gateway-service
```

### Debug Network Communication

```bash
# Test DNS resolution from Notes Service to RabbitMQ
oc exec deployment/notes-service -- nslookup rabbitmq-service

# Test connectivity from API Gateway to Notes Service
oc exec deployment/api-gateway -- wget -qO- http://notes-service:8081/health

# Test connectivity from Analytics Service to PostgreSQL
oc exec deployment/analytics-service -- nc -zv postgres-service 5432
```

### View Events

```bash
# Get all events (errors, warnings, pod scheduling)
oc get events --sort-by='.lastTimestamp'

# Filter for specific service
oc get events --field-selector involvedObject.name=notes-service
```

## Resource Usage

### Check Resource Consumption

```bash
# CPU and Memory usage per pod
oc adm top pods

# Resource requests and limits
oc describe pod notes-service-X-xxxxx | grep -A 5 "Requests:"
```

### Expected Resource Usage (Approximate)

| Service | Pods | CPU Request | CPU Limit | Memory Request | Memory Limit | Total Memory |
|---------|------|-------------|-----------|----------------|--------------|--------------|
| Notes Service | 3 | 300m | 1.5 | 384Mi | 768Mi | 768Mi |
| Analytics Service | 2 | 200m | 1.0 | 256Mi | 512Mi | 512Mi |
| Share Service | 2 | 200m | 1.0 | 256Mi | 512Mi | 512Mi |
| API Gateway | 2 | 100m | 400m | 128Mi | 256Mi | 256Mi |
| RabbitMQ | 1 | 100m | 500m | 256Mi | 512Mi | 512Mi |
| PostgreSQL | 1 | 100m | 500m | 256Mi | 512Mi | 512Mi |
| Frontend | 2 | 200m | 1.0 | 256Mi | 512Mi | 512Mi |
| **TOTAL** | **13** | **1.2** | **6.4** | **1792Mi** | **3584Mi** | **3584Mi** |

## Rollback Procedures

### Rollback to Previous Version

```bash
# Rollback Notes Service
oc rollback notes-service

# Rollback Analytics Service
oc rollback analytics-service

# Rollback Share Service
oc rollback share-service

# Rollback API Gateway
oc rollback api-gateway

# Verify rollback
oc get pods -w
```

### View Deployment History

```bash
# Check deployment history
oc rollout history deploymentconfig/notes-service

# View specific revision
oc rollout history deploymentconfig/notes-service --revision=2
```

## Performance Testing

### Load Test API Gateway

```bash
# Install Apache Bench (if not installed)
# sudo apt-get install apache2-utils

# Test with 1000 requests, 10 concurrent
ab -n 1000 -c 10 https://$GATEWAY_URL/api/notes

# Test with authentication header
ab -n 1000 -c 10 -H "Authorization: Bearer token" https://$GATEWAY_URL/api/analytics
```

### Expected Performance Metrics

- **Requests per second:** 100-200 req/sec (with 3 Notes Service replicas)
- **Average response time:** 50-100ms (simple queries)
- **Analytics queries:** 200-500ms (complex aggregations)
- **Failed requests:** 0 (under normal load)

## Benefits of Microservices Architecture

### 1. Independent Scaling
- Scale Notes Service to 5 replicas during high traffic
- Keep Analytics Service at 2 replicas (less frequent access)
- API Gateway can scale independently

### 2. Technology Flexibility
- Could rewrite Analytics Service in Python for better data processing
- Each service can use optimal tech stack
- Easy to add new services (e.g., User Service, Notification Service)

### 3. Fault Isolation
- Analytics Service crash doesn't affect note creation
- Share Service issues don't impact core CRUD operations
- RabbitMQ failure degrades gracefully (events buffered)

### 4. Team Autonomy
- Different teams can own different services
- Independent deployment cycles
- Clear service boundaries and contracts

### 5. Easier Maintenance
- Smaller codebases per service
- Focused testing per service
- Easier to understand and debug

## Event-Driven Communication Benefits

### 1. Loose Coupling
- Notes Service doesn't know about Analytics Service
- Services communicate via events, not direct calls
- Easy to add new consumers

### 2. Asynchronous Processing
- Note creation doesn't wait for analytics update
- Faster response times for users
- Background processing of events

### 3. Event History
- RabbitMQ stores events (durable queues)
- Can replay events if needed
- Audit trail of all changes

## Comparison: Monolithic vs Microservices

| Aspect | Monolithic (Before) | Microservices (After) |
|--------|---------------------|------------------------|
| **Deployment** | Single backend deployment | 4 independent services |
| **Scaling** | Scale entire backend | Scale only needed services |
| **Technology** | Locked to Node.js | Can use different languages |
| **Development** | One large codebase | Multiple focused codebases |
| **Failure Impact** | Entire app down | Isolated failures |
| **Team Structure** | Single backend team | Multiple service teams |
| **Resource Usage** | Fixed allocation | Dynamic per service |
| **Deployment Speed** | Slow (deploy everything) | Fast (deploy one service) |
| **Complexity** | Lower (simpler) | Higher (distributed) |
| **Testing** | Integration tests | Service + contract tests |

## Next Steps

### 1. Add Authentication Service
- JWT token generation
- User management
- Session handling

### 2. Implement API Versioning
- `/api/v1/notes`
- `/api/v2/notes`
- Backward compatibility

### 3. Add Monitoring
- Prometheus metrics
- Grafana dashboards
- Alert manager

### 4. Implement Distributed Tracing
- Jaeger integration
- Request flow visualization
- Performance bottleneck identification

### 5. Add Caching Layer
- Redis for frequently accessed data
- Cache invalidation via RabbitMQ events
- Reduce database load

## Conclusion

The microservices architecture provides significant benefits for the Notes Application:

✅ **Independent scaling** - Scale services based on demand
✅ **Technology flexibility** - Use best tool for each service  
✅ **Fault isolation** - Service failures don't cascade
✅ **Team autonomy** - Clear ownership boundaries
✅ **Event-driven** - Loosely coupled communication
✅ **Production-ready** - API Gateway with rate limiting

The application now demonstrates enterprise-grade architecture patterns suitable for cloud-native deployments and showcases advanced OpenShift/Kubernetes concepts beyond basic containerization.

---

**Deployment Complete!** 🎉

Access your microservices application:
- **Frontend:** `https://frontend-route-<namespace>.apps.<cluster-domain>`
- **API Gateway:** `https://api-gateway-route-<namespace>.apps.<cluster-domain>`
- **RabbitMQ UI:** `https://rabbitmq-management-route-<namespace>.apps.<cluster-domain>`

Total Pods: 13 (Notes: 3, Analytics: 2, Share: 2, Gateway: 2, RabbitMQ: 1, Postgres: 1, Frontend: 2)
