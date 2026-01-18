// Simple Express server to serve React build in production
// This allows us to run the frontend in a container

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, 'build')));

// API health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    service: 'notes-frontend' 
  });
});

// All other requests return the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log('========================================');
  console.log(`🚀 Frontend Server Running`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`📂 Serving from: ${path.join(__dirname, 'build')}`);
  console.log('========================================');
});
