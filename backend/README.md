# Notes Backend API

## Overview
RESTful API service for managing notes. Built with Node.js and Express, connects to PostgreSQL database.

## Technology Stack
- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Database Client**: node-postgres (pg)
- **Port**: 8080

## API Endpoints

### Health Check
```
GET /api/health
Response: { "status": "healthy", "service": "notes-backend" }
```

### Get All Notes
```
GET /api/notes
Response: { "success": true, "count": 2, "notes": [...] }
```

### Create Note
```
POST /api/notes
Body: { "title": "My Note", "content": "Note content here" }
Response: { "success": true, "note": {...} }
```

## Environment Variables
- `PORT` - Server port (default: 8080)
- `DB_HOST` - PostgreSQL host (default: postgres-service)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_USER` - Database user (default: notesuser)
- `DB_PASSWORD` - Database password (default: notespass)
- `DB_NAME` - Database name (default: notesdb)

## Local Development

```bash
# Install dependencies
npm install

# Start server
npm start

# Development mode with auto-reload
npm run dev
```

## Database Schema

```sql
CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Docker Build

```bash
docker build -t notes-backend .
docker run -p 8080:8080 -e DB_HOST=localhost notes-backend
```
