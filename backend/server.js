// Backend Service for Notes Application
// This service provides REST API endpoints for managing notes

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors()); // Enable CORS for frontend communication
app.use(bodyParser.json()); // Parse JSON request bodies

// PostgreSQL Connection Configuration
// These environment variables are injected by OpenShift
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres-service',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'notesuser',
  password: process.env.DB_PASSWORD || 'notespass',
  database: process.env.DB_NAME || 'notesdb',
  // Connection pool settings for better performance
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Database initialization
// Create notes table if it doesn't exist
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'general',
        tags TEXT[] DEFAULT '{}',
        color VARCHAR(7) DEFAULT '#667eea',
        is_favorite BOOLEAN DEFAULT false,
        is_pinned BOOLEAN DEFAULT false,
        due_date TIMESTAMP,
        reminder_date TIMESTAMP,
        shared_token VARCHAR(64),
        view_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add columns if they don't exist (for existing tables)
    const columns = [
      { name: 'category', type: 'VARCHAR(50) DEFAULT \'general\'' },
      { name: 'tags', type: 'TEXT[] DEFAULT \'{}\'', isArray: true },
      { name: 'color', type: 'VARCHAR(7) DEFAULT \'#667eea\'' },
      { name: 'is_favorite', type: 'BOOLEAN DEFAULT false' },
      { name: 'is_pinned', type: 'BOOLEAN DEFAULT false' },
      { name: 'due_date', type: 'TIMESTAMP' },
      { name: 'reminder_date', type: 'TIMESTAMP' },
      { name: 'shared_token', type: 'VARCHAR(64)' },
      { name: 'view_count', type: 'INTEGER DEFAULT 0' },
      { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ];
    
    for (const col of columns) {
      try {
        await pool.query(`ALTER TABLE notes ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
      } catch (err) {
        // Column might already exist
      }
    }
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    // Don't exit - keep trying to connect
  }
}

// Call database initialization on startup
initializeDatabase();

// ============================================================
// API ENDPOINTS
// ============================================================

// Health check endpoint
// Used by OpenShift to verify the service is running
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    service: 'notes-backend',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Notes API is running',
    endpoints: [
      'GET /api/health - Health check',
      'GET /api/notes - Get all notes',
      'POST /api/notes - Create a new note'
    ]
  });
});

// GET all notes
// Returns array of all notes from database
// Supports search and filter query parameters
app.get('/api/notes', async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = 'SELECT * FROM notes WHERE 1=1';
    const params = [];
    let paramCount = 0;

    // Add search filter
    if (search) {
      paramCount++;
      query += ` AND (title ILIKE $${paramCount} OR content ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Add category filter
    if (category && category !== 'all') {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    
    console.log(`📖 Retrieved ${result.rows.length} notes`);
    res.json({
      success: true,
      count: result.rows.length,
      notes: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching notes:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch notes',
      details: error.message 
    });
  }
});

// POST new note
// Creates a new note in the database
app.post('/api/notes', async (req, res) => {
  try {
    const { 
      title, 
      content, 
      category = 'general', 
      tags = [], 
      color = '#667eea',
      is_favorite = false,
      is_pinned = false,
      due_date = null,
      reminder_date = null
    } = req.body;

    // Validation
    if (!title || !content) {
      return res.status(400).json({ 
        success: false,
        error: 'Title and content are required' 
      });
    }

    if (title.length > 255) {
      return res.status(400).json({ 
        success: false,
        error: 'Title must be 255 characters or less' 
      });
    }

    // Insert into database
    const result = await pool.query(
      `INSERT INTO notes (title, content, category, tags, color, is_favorite, is_pinned, due_date, reminder_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, content, category, tags, color, is_favorite, is_pinned, due_date, reminder_date]
    );

    console.log(`✅ Created note: ${title}`);
    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      note: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error creating note:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create note',
      details: error.message 
    });
  }
});

// PUT update note
// Updates an existing note
app.put('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      content, 
      category, 
      tags, 
      color,
      is_favorite,
      is_pinned,
      due_date,
      reminder_date
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ 
        success: false,
        error: 'Title and content are required' 
      });
    }

    const result = await pool.query(
      `UPDATE notes SET 
        title = $1, 
        content = $2, 
        category = $3, 
        tags = $4, 
        color = $5,
        is_favorite = $6,
        is_pinned = $7,
        due_date = $8,
        reminder_date = $9,
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = $10 RETURNING *`,
      [title, content, category || 'general', tags || [], color || '#667eea', 
       is_favorite || false, is_pinned || false, due_date, reminder_date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Note not found' 
      });
    }

    console.log(`✅ Updated note: ${id}`);
    res.json({
      success: true,
      message: 'Note updated successfully',
      note: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating note:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update note',
      details: error.message 
    });
  }
});

// DELETE note
// Deletes a note from the database
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM notes WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Note not found' 
      });
    }

    console.log(`🗑️  Deleted note: ${id}`);
    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting note:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete note',
      details: error.message 
    });
  }
});

// GET note statistics
// Returns statistics about notes
app.get('/api/stats', async (req, res) => {
  try {
    const totalResult = await pool.query('SELECT COUNT(*) FROM notes');
    const categoryResult = await pool.query(
      'SELECT category, COUNT(*) as count FROM notes GROUP BY category ORDER BY count DESC'
    );
    const favoriteResult = await pool.query('SELECT COUNT(*) FROM notes WHERE is_favorite = true');
    const pinnedResult = await pool.query('SELECT COUNT(*) FROM notes WHERE is_pinned = true');
    const overdueResult = await pool.query('SELECT COUNT(*) FROM notes WHERE due_date < CURRENT_TIMESTAMP AND due_date IS NOT NULL');

    res.json({
      success: true,
      total: parseInt(totalResult.rows[0].count),
      byCategory: categoryResult.rows,
      favorites: parseInt(favoriteResult.rows[0].count),
      pinned: parseInt(pinnedResult.rows[0].count),
      overdue: parseInt(overdueResult.rows[0].count)
    });
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch statistics',
      details: error.message 
    });
  }
});

// Toggle favorite status
app.patch('/api/notes/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE notes SET is_favorite = NOT is_favorite WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    res.json({
      success: true,
      message: 'Favorite status updated',
      note: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error toggling favorite:', error);
    res.status(500).json({ success: false, error: 'Failed to update favorite status' });
  }
});

// Toggle pin status
app.patch('/api/notes/:id/pin', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE notes SET is_pinned = NOT is_pinned WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    res.json({
      success: true,
      message: 'Pin status updated',
      note: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error toggling pin:', error);
    res.status(500).json({ success: false, error: 'Failed to update pin status' });
  }
});

// Generate share link
app.post('/api/notes/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(
      'UPDATE notes SET shared_token = $1 WHERE id = $2 RETURNING *',
      [token, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    res.json({
      success: true,
      shareLink: `/shared/${token}`,
      token: token
    });
  } catch (error) {
    console.error('❌ Error generating share link:', error);
    res.status(500).json({ success: false, error: 'Failed to generate share link' });
  }
});

// Get shared note (public access)
app.get('/api/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const result = await pool.query(
      'UPDATE notes SET view_count = view_count + 1 WHERE shared_token = $1 RETURNING *',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Shared note not found' });
    }

    res.json({
      success: true,
      note: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error fetching shared note:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch shared note' });
  }
});

// Get analytics data
app.get('/api/analytics', async (req, res) => {
  try {
    const notesPerDay = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count 
      FROM notes 
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at) 
      ORDER BY date DESC 
      LIMIT 30
    `);

    const mostViewed = await pool.query(`
      SELECT id, title, view_count 
      FROM notes 
      WHERE view_count > 0 
      ORDER BY view_count DESC 
      LIMIT 5
    `);

    const upcomingDueDates = await pool.query(`
      SELECT id, title, due_date 
      FROM notes 
      WHERE due_date >= CURRENT_TIMESTAMP 
      ORDER BY due_date ASC 
      LIMIT 10
    `);

    res.json({
      success: true,
      notesPerDay: notesPerDay.rows,
      mostViewed: mostViewed.rows,
      upcomingDueDates: upcomingDueDates.rows
    });
  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ 
    success: false,
    error: 'Internal server error',
    details: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log('========================================');
  console.log(`🚀 Backend API Server Running`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🗄️  Database: ${process.env.DB_HOST || 'postgres-service'}`);
  console.log('========================================');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM received, closing connections...');
  await pool.end();
  process.exit(0);
});
