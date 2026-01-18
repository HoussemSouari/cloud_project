# Notes Frontend UI

## Overview
React-based web interface for the Notes application. Communicates with the backend API to display and create notes.

## Technology Stack
- **Framework**: React 18
- **Server**: Express.js (for production serving)
- **Build Tool**: react-scripts
- **Port**: 3000

## Features
- Display all notes from the database
- Create new notes via form
- Responsive design for mobile and desktop
- Real-time refresh capability
- Error handling and loading states

## Environment Variables
- `REACT_APP_API_URL` - Backend API URL (default: http://backend-service:8080)
- `PORT` - Server port (default: 3000)

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Component Structure

```
src/
├── index.js         # Entry point
├── index.css        # Global styles
├── App.js           # Main application component
└── App.css          # Application styles
```

## API Integration

The frontend makes HTTP requests to the backend:
- `GET /api/notes` - Fetch all notes
- `POST /api/notes` - Create new note

## Docker Build

```bash
docker build -t notes-frontend .
docker run -p 3000:3000 notes-frontend
```
