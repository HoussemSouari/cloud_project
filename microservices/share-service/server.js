const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');
const amqp = require('amqplib');

const app = express();
const PORT = process.env.PORT || 8083;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres-service',
  port: 5432,
  user: process.env.DB_USER || 'notesuser',
  password: process.env.DB_PASSWORD || 'notespass',
  database: process.env.DB_NAME || 'notesdb',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// RabbitMQ connection
let channel = null;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq-service:5672';

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange('notes_events', 'topic', { durable: true });
    console.log('✅ Connected to RabbitMQ');
  } catch (error) {
    console.error('❌ RabbitMQ connection failed:', error.message);
    setTimeout(connectRabbitMQ, 5000);
  }
}

// Publish event to RabbitMQ
async function publishEvent(eventType, data) {
  if (channel) {
    try {
      const message = JSON.stringify({ eventType, data, timestamp: new Date() });
      channel.publish('notes_events', eventType, Buffer.from(message));
      console.log(`📤 Published event: ${eventType}`);
    } catch (error) {
      console.error('❌ Failed to publish event:', error.message);
    }
  }
}

// Initialize share table
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Add shared_token and view_count columns if they don't exist
    await client.query(`
      ALTER TABLE notes 
      ADD COLUMN IF NOT EXISTS shared_token VARCHAR(64)
    `);
    
    await client.query(`
      ALTER TABLE notes 
      ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0
    `);
    
    // Create index on shared_token for fast lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notes_shared_token 
      ON notes(shared_token) 
      WHERE shared_token IS NOT NULL
    `);
    
    console.log('✅ Share service database initialized');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  } finally {
    client.release();
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'share-service',
    rabbitmq: channel ? 'connected' : 'disconnected'
  });
});

// Generate share link for a note
app.post('/api/notes/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if note exists
    const noteResult = await pool.query('SELECT id, shared_token FROM notes WHERE id = $1', [id]);
    
    if (noteResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Note not found' 
      });
    }
    
    // If already has a share token, return it
    if (noteResult.rows[0].shared_token) {
      const token = noteResult.rows[0].shared_token;
      const shareUrl = `${req.protocol}://${req.get('host')}/api/shared/${token}`;
      
      return res.json({
        success: true,
        shareUrl,
        token,
        message: 'Share link already exists'
      });
    }
    
    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Update note with share token
    await pool.query(
      'UPDATE notes SET shared_token = $1 WHERE id = $2',
      [token, id]
    );
    
    const shareUrl = `${req.protocol}://${req.get('host')}/api/shared/${token}`;
    
    // Publish event
    await publishEvent('note.shared', { noteId: parseInt(id), token, shareUrl });
    
    res.json({
      success: true,
      shareUrl,
      token,
      message: 'Share link generated successfully'
    });
  } catch (error) {
    console.error('Error generating share link:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate share link' 
    });
  }
});

// Access shared note (public endpoint - no auth required)
app.get('/api/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Find note by token
    const result = await pool.query(
      'SELECT id, title, content, category, tags, color, created_at FROM notes WHERE shared_token = $1',
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Shared note not found or link expired' 
      });
    }
    
    const note = result.rows[0];
    
    // Increment view count
    await pool.query(
      'UPDATE notes SET view_count = view_count + 1 WHERE shared_token = $1',
      [token]
    );
    
    // Publish event
    await publishEvent('note.viewed', { noteId: note.id, token });
    
    res.json({
      success: true,
      note: {
        ...note,
        isShared: true,
        viewedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error accessing shared note:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to access shared note' 
    });
  }
});

// Revoke share link
app.delete('/api/notes/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE notes SET shared_token = NULL WHERE id = $1 RETURNING id, title',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Note not found' 
      });
    }
    
    // Publish event
    await publishEvent('note.share.revoked', { noteId: parseInt(id) });
    
    res.json({
      success: true,
      message: 'Share link revoked successfully',
      note: result.rows[0]
    });
  } catch (error) {
    console.error('Error revoking share link:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to revoke share link' 
    });
  }
});

// Get share statistics for a note
app.get('/api/notes/:id/share/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT 
        id, 
        title, 
        shared_token,
        view_count,
        CASE WHEN shared_token IS NOT NULL THEN true ELSE false END as is_shared
      FROM notes 
      WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Note not found' 
      });
    }
    
    const note = result.rows[0];
    
    res.json({
      success: true,
      stats: {
        noteId: note.id,
        title: note.title,
        isShared: note.is_shared,
        viewCount: note.view_count || 0,
        shareToken: note.shared_token || null
      }
    });
  } catch (error) {
    console.error('Error fetching share stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch share stats' 
    });
  }
});

// Get all shared notes (for dashboard/management)
app.get('/api/shared', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        title, 
        category,
        shared_token,
        view_count,
        created_at
      FROM notes 
      WHERE shared_token IS NOT NULL
      ORDER BY view_count DESC, created_at DESC
    `);
    
    res.json({
      success: true,
      count: result.rows.length,
      sharedNotes: result.rows.map(note => ({
        ...note,
        shareUrl: `${req.protocol}://${req.get('host')}/api/shared/${note.shared_token}`
      }))
    });
  } catch (error) {
    console.error('Error fetching shared notes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch shared notes' 
    });
  }
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    await connectRabbitMQ();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Share Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
