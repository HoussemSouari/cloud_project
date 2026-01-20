const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const amqp = require('amqplib');

const app = express();
const PORT = process.env.PORT || 8081;

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
    setTimeout(connectRabbitMQ, 5000); // Retry after 5 seconds
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

// Initialize database
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add columns if they don't exist
    const columnsToAdd = [
      { name: 'category', type: 'VARCHAR(50) DEFAULT \'general\'' },
      { name: 'tags', type: 'TEXT[] DEFAULT \'{}\''},
      { name: 'color', type: 'VARCHAR(7) DEFAULT \'#667eea\'' },
      { name: 'is_favorite', type: 'BOOLEAN DEFAULT false' },
      { name: 'is_pinned', type: 'BOOLEAN DEFAULT false' },
      { name: 'due_date', type: 'TIMESTAMP' },
      { name: 'reminder_date', type: 'TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ];

    for (const column of columnsToAdd) {
      try {
        await client.query(`
          ALTER TABLE notes 
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}
        `);
      } catch (err) {
        // Column might already exist
      }
    }

    console.log('✅ Notes database initialized');
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
    service: 'notes-service',
    rabbitmq: channel ? 'connected' : 'disconnected'
  });
});

// Get all notes with filtering
app.get('/api/notes', async (req, res) => {
  try {
    const { search, category } = req.query;
    
    let query = 'SELECT * FROM notes WHERE 1=1';
    const params = [];
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (title ILIKE $${params.length} OR content ILIKE $${params.length})`;
    }
    
    if (category && category !== 'all') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    
    query += ' ORDER BY is_pinned DESC, created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      count: result.rows.length,
      notes: result.rows
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch notes' 
    });
  }
});

// Get single note by ID
app.get('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM notes WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Note not found' 
      });
    }
    
    res.json({
      success: true,
      note: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch note' 
    });
  }
});

// Create new note
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
      `INSERT INTO notes 
       (title, content, category, tags, color, is_favorite, is_pinned, due_date, reminder_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [title, content, category, tags, color, is_favorite, is_pinned, due_date, reminder_date]
    );
    
    const newNote = result.rows[0];
    
    // Publish event
    await publishEvent('note.created', newNote);
    
    res.status(201).json({
      success: true,
      note: newNote
    });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create note' 
    });
  }
});

// Update note
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
      `UPDATE notes 
       SET title = $1, content = $2, category = $3, tags = $4, color = $5,
           is_favorite = $6, is_pinned = $7, due_date = $8, reminder_date = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 
       RETURNING *`,
      [title, content, category, tags, color, is_favorite, is_pinned, due_date, reminder_date, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Note not found' 
      });
    }
    
    const updatedNote = result.rows[0];
    
    // Publish event
    await publishEvent('note.updated', updatedNote);
    
    res.json({
      success: true,
      note: updatedNote
    });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update note' 
    });
  }
});

// Delete note
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM notes WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Note not found' 
      });
    }
    
    // Publish event
    await publishEvent('note.deleted', { id: parseInt(id) });
    
    res.json({
      success: true,
      message: 'Note deleted successfully',
      note: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete note' 
    });
  }
});

// Toggle favorite
app.patch('/api/notes/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE notes 
       SET is_favorite = NOT is_favorite, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Note not found' 
      });
    }
    
    const updatedNote = result.rows[0];
    
    // Publish event
    await publishEvent('note.favorite.toggled', updatedNote);
    
    res.json({
      success: true,
      note: updatedNote
    });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to toggle favorite' 
    });
  }
});

// Toggle pin
app.patch('/api/notes/:id/pin', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE notes 
       SET is_pinned = NOT is_pinned, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Note not found' 
      });
    }
    
    const updatedNote = result.rows[0];
    
    // Publish event
    await publishEvent('note.pin.toggled', updatedNote);
    
    res.json({
      success: true,
      note: updatedNote
    });
  } catch (error) {
    console.error('Error toggling pin:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to toggle pin' 
    });
  }
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    await connectRabbitMQ();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Notes Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
