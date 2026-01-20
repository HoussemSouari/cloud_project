const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const amqp = require('amqplib');

const app = express();
const PORT = process.env.PORT || 8082;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection pool (read-only access)
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres-service',
  port: 5432,
  user: process.env.DB_USER || 'notesuser',
  password: process.env.DB_PASSWORD || 'notespass',
  database: process.env.DB_NAME || 'notesdb',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// RabbitMQ connection
let channel = null;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq-service:5672';

// In-memory cache for analytics (updated via events)
let analyticsCache = {
  totalNotes: 0,
  categoryCounts: {},
  lastUpdated: new Date()
};

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange('notes_events', 'topic', { durable: true });
    
    // Create queue for this service
    const queue = await channel.assertQueue('analytics_queue', { durable: true });
    
    // Bind to all note events
    await channel.bindQueue(queue.queue, 'notes_events', 'note.*');
    
    // Consume events
    channel.consume(queue.queue, async (msg) => {
      if (msg) {
        try {
          const event = JSON.parse(msg.content.toString());
          console.log(`📥 Received event: ${event.eventType}`);
          
          // Update cache based on event
          await updateAnalyticsCache();
          
          channel.ack(msg);
        } catch (error) {
          console.error('❌ Error processing event:', error);
          channel.nack(msg);
        }
      }
    });
    
    console.log('✅ Connected to RabbitMQ and listening for events');
    
    // Initial cache update
    await updateAnalyticsCache();
  } catch (error) {
    console.error('❌ RabbitMQ connection failed:', error.message);
    setTimeout(connectRabbitMQ, 5000);
  }
}

// Update analytics cache from database
async function updateAnalyticsCache() {
  try {
    // Total notes count
    const countResult = await pool.query('SELECT COUNT(*) FROM notes');
    analyticsCache.totalNotes = parseInt(countResult.rows[0].count);
    
    // Category counts
    const categoryResult = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM notes 
      GROUP BY category
    `);
    analyticsCache.categoryCounts = {};
    categoryResult.rows.forEach(row => {
      analyticsCache.categoryCounts[row.category] = parseInt(row.count);
    });
    
    analyticsCache.lastUpdated = new Date();
    console.log('📊 Analytics cache updated');
  } catch (error) {
    console.error('❌ Failed to update analytics cache:', error);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'analytics-service',
    rabbitmq: channel ? 'connected' : 'disconnected',
    cacheUpdated: analyticsCache.lastUpdated
  });
});

// Get comprehensive analytics
app.get('/api/analytics', async (req, res) => {
  try {
    // Notes created per day (last 30 days)
    const notesPerDayResult = await pool.query(`
      SELECT 
        DATE(created_at) as date, 
        COUNT(*) as count
      FROM notes
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    // Most viewed notes (if we had view tracking in notes table)
    // For now, we'll get most recent notes
    const recentNotesResult = await pool.query(`
      SELECT id, title, created_at
      FROM notes
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    // Upcoming due dates
    const upcomingDueDatesResult = await pool.query(`
      SELECT id, title, due_date
      FROM notes
      WHERE due_date IS NOT NULL 
        AND due_date >= CURRENT_TIMESTAMP
      ORDER BY due_date ASC
      LIMIT 10
    `);
    
    // Category distribution
    const categoryDistResult = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM notes
      GROUP BY category
      ORDER BY count DESC
    `);
    
    // Tag frequency (top 10 most used tags)
    const tagFreqResult = await pool.query(`
      SELECT 
        unnest(tags) as tag, 
        COUNT(*) as count
      FROM notes
      WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      analytics: {
        notesPerDay: notesPerDayResult.rows,
        recentNotes: recentNotesResult.rows,
        upcomingDueDates: upcomingDueDatesResult.rows,
        categoryDistribution: categoryDistResult.rows,
        tagFrequency: tagFreqResult.rows,
        cached: {
          totalNotes: analyticsCache.totalNotes,
          categoryCounts: analyticsCache.categoryCounts,
          lastUpdated: analyticsCache.lastUpdated
        }
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch analytics' 
    });
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE category = 'work') as work,
        COUNT(*) FILTER (WHERE category = 'personal') as personal,
        COUNT(*) FILTER (WHERE category = 'ideas') as ideas,
        COUNT(*) FILTER (WHERE is_favorite = true) as favorites,
        COUNT(*) FILTER (WHERE is_pinned = true) as pinned,
        COUNT(*) FILTER (WHERE due_date < CURRENT_TIMESTAMP AND due_date IS NOT NULL) as overdue
      FROM notes
    `);
    
    res.json({
      success: true,
      stats: statsResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch stats' 
    });
  }
});

// Get category breakdown
app.get('/api/analytics/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        category,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE is_favorite = true) as favorites,
        COUNT(*) FILTER (WHERE due_date IS NOT NULL) as with_due_date
      FROM notes
      GROUP BY category
      ORDER BY count DESC
    `);
    
    res.json({
      success: true,
      categories: result.rows
    });
  } catch (error) {
    console.error('Error fetching category analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch category analytics' 
    });
  }
});

// Get time-based analytics
app.get('/api/analytics/timeline', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const result = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as notes_created,
        COUNT(*) FILTER (WHERE is_favorite = true) as favorites_added
      FROM notes
      WHERE created_at >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    
    res.json({
      success: true,
      timeline: result.rows
    });
  } catch (error) {
    console.error('Error fetching timeline analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch timeline analytics' 
    });
  }
});

// Get productivity insights
app.get('/api/analytics/insights', async (req, res) => {
  try {
    // Most productive day of week
    const dowResult = await pool.query(`
      SELECT 
        TO_CHAR(created_at, 'Day') as day_of_week,
        COUNT(*) as count
      FROM notes
      GROUP BY day_of_week, EXTRACT(DOW FROM created_at)
      ORDER BY EXTRACT(DOW FROM created_at)
    `);
    
    // Most productive hour
    const hourResult = await pool.query(`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as count
      FROM notes
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 5
    `);
    
    // Average notes per day
    const avgResult = await pool.query(`
      SELECT 
        ROUND(COUNT(*)::numeric / GREATEST(DATE_PART('day', CURRENT_TIMESTAMP - MIN(created_at)), 1), 2) as avg_per_day
      FROM notes
    `);
    
    res.json({
      success: true,
      insights: {
        mostProductiveDays: dowResult.rows,
        mostProductiveHours: hourResult.rows,
        averageNotesPerDay: avgResult.rows[0].avg_per_day
      }
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch insights' 
    });
  }
});

// Start server
async function startServer() {
  try {
    await connectRabbitMQ();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Analytics Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
