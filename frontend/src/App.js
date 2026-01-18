// Enhanced Notes Application - Main Component with Advanced Features
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import './App.css';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);

function App() {
  // State management
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState('');
  const [color, setColor] = useState('#667eea');
  const [dueDate, setDueDate] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [viewMode, setViewMode] = useState('notes'); // 'notes' | 'analytics'
  const [achievements, setAchievements] = useState([]);
  const [shareLink, setShareLink] = useState('');

  // Categories and color options
  const categories = ['general', 'work', 'personal', 'ideas', 'important'];
  const colorOptions = [
    { name: 'Purple', value: '#667eea' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Yellow', value: '#f59e0b' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Teal', value: '#14b8a6' }
  ];

  const API_URL = process.env.REACT_APP_API_URL || 'https://backend-route-houssemsouari-dev.apps.rm2.thpm.p1.openshiftapps.com';

  // Fetch notes from backend on component mount
  useEffect(() => {
    fetchNotes();
    fetchStats();
    fetchAnalytics();
    checkAchievements();
  }, []);

  // Fetch notes when search or filter changes
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchNotes();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, filterCategory, showFavoritesOnly]);

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let url = `${API_URL}/api/notes`;
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      let filteredNotes = data.notes || [];
      
      if (showFavoritesOnly) {
        filteredNotes = filteredNotes.filter(note => note.is_favorite);
      }
      
      // Sort: pinned first, then by created date
      filteredNotes.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      setNotes(filteredNotes);
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError('Failed to load notes.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_URL}/api/analytics`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  const checkAchievements = () => {
    const earned = [];
    const noteCount = notes.length;
    
    if (noteCount >= 1) earned.push({ icon: '🎯', title: 'First Note', desc: 'Created your first note!' });
    if (noteCount >= 5) earned.push({ icon: '🚀', title: 'Getting Started', desc: '5 notes created!' });
    if (noteCount >= 10) earned.push({ icon: '💪', title: 'Power User', desc: '10 notes and counting!' });
    if (noteCount >= 25) earned.push({ icon: '🏆', title: 'Note Master', desc: '25 notes achieved!' });
    if (notes.some(n => n.tags && n.tags.length > 0)) earned.push({ icon: '🏷️', title: 'Organizer', desc: 'Used tags!' });
    if (notes.some(n => n.is_favorite)) earned.push({ icon: '⭐', title: 'Favorites', desc: 'Marked a favorite!' });
    
    setAchievements(earned);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      alert('Please fill in both title and content');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const noteData = {
        title,
        content,
        category,
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        color,
        due_date: dueDate || null,
        reminder_date: reminderDate || null
      };

      const url = editingNote 
        ? `${API_URL}/api/notes/${editingNote.id}`
        : `${API_URL}/api/notes`;
      
      const method = editingNote ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      setTitle('');
      setContent('');
      setCategory('general');
      setTags('');
      setColor('#667eea');
      setDueDate('');
      setReminderDate('');
      setEditingNote(null);
      
      await fetchNotes();
      await fetchStats();
      await fetchAnalytics();
      checkAchievements();
      
      alert(editingNote ? 'Note updated successfully!' : 'Note created successfully!');
    } catch (err) {
      console.error('Error saving note:', err);
      setError('Failed to save note. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category || 'general');
    setTags(note.tags ? note.tags.join(', ') : '');
    setColor(note.color || '#667eea');
    setDueDate(note.due_date ? note.due_date.substring(0, 16) : '');
    setReminderDate(note.reminder_date ? note.reminder_date.substring(0, 16) : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`${API_URL}/api/notes/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      await fetchNotes();
      await fetchStats();
      alert('Note deleted successfully!');
    } catch (err) {
      console.error('Error deleting note:', err);
      setError('Failed to delete note.');
    }
  };

  const toggleFavorite = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/notes/${id}/favorite`, { method: 'PATCH' });
      if (response.ok) {
        await fetchNotes();
        await fetchStats();
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const togglePin = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/notes/${id}/pin`, { method: 'PATCH' });
      if (response.ok) await fetchNotes();
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  };

  const generateShareLink = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/notes/${id}/share`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        const fullLink = `${window.location.origin}/shared/${data.token}`;
        setShareLink(fullLink);
        navigator.clipboard.writeText(fullLink);
        alert('Share link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error generating share link:', err);
    }
  };

  const exportNotes = () => {
    const dataStr = JSON.stringify(notes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notes-export-${new Date().toISOString()}.json`;
    link.click();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  // Analytics Chart Data
  const getAnalyticsChartData = () => {
    if (!analytics || !analytics.notesPerDay) return null;
    
    return {
      labels: analytics.notesPerDay.map(d => new Date(d.date).toLocaleDateString()).reverse(),
      datasets: [{
        label: 'Notes Created',
        data: analytics.notesPerDay.map(d => parseInt(d.count)).reverse(),
        backgroundColor: 'rgba(102, 126, 234, 0.5)',
        borderColor: '#667eea',
        borderWidth: 2
      }]
    };
  };

  const getCategoryChartData = () => {
    if (!stats || !stats.byCategory) return null;
    
    return {
      labels: stats.byCategory.map(c => c.category),
      datasets: [{
        data: stats.byCategory.map(c => parseInt(c.count)),
        backgroundColor: ['#667eea', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
      }]
    };
  };

  return (
    <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
      <header className="App-header">
        <div className="header-content">
          <h1>📝 Enhanced Notes Application</h1>
          <p className="subtitle">IT460 Cloud Computing - Advanced Features Demo</p>
          {stats && (
            <div className="stats-bar">
              <span>📚 Total: {stats.total}</span>
              <span>⭐ Favorites: {stats.favorites}</span>
              <span>📌 Pinned: {stats.pinned}</span>
              {stats.overdue > 0 && <span className="overdue">⚠️ Overdue: {stats.overdue}</span>}
            </div>
          )}
          <div className="header-actions">
            <button onClick={() => setDarkMode(!darkMode)} className="icon-btn">
              {darkMode ? '☀️' : '🌙'} {darkMode ? 'Light' : 'Dark'} Mode
            </button>
            <button onClick={() => setViewMode(viewMode === 'notes' ? 'analytics' : 'notes')} className="icon-btn">
              {viewMode === 'notes' ? '📊' : '📝'} {viewMode === 'notes' ? 'Analytics' : 'Notes'}
            </button>
            <button onClick={exportNotes} className="icon-btn">
              📤 Export
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        {viewMode === 'analytics' ? (
          /* Analytics View */
          <section className="analytics-section">
            <h2>📊 Analytics Dashboard</h2>
            
            {achievements.length > 0 && (
              <div className="achievements-bar">
                <h3>🏆 Achievements</h3>
                <div className="achievements-grid">
                  {achievements.map((achievement, idx) => (
                    <div key={idx} className="achievement-badge">
                      <span className="achievement-icon">{achievement.icon}</span>
                      <div>
                        <strong>{achievement.title}</strong>
                        <p>{achievement.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="charts-grid">
              {getAnalyticsChartData() && (
                <div className="chart-card">
                  <h3>Notes Created Over Time</h3>
                  <Bar data={getAnalyticsChartData()} options={{ responsive: true }} />
                </div>
              )}
              
              {getCategoryChartData() && (
                <div className="chart-card">
                  <h3>Notes by Category</h3>
                  <Doughnut data={getCategoryChartData()} options={{ responsive: true }} />
                </div>
              )}
            </div>

            {analytics && analytics.mostViewed && analytics.mostViewed.length > 0 && (
              <div className="most-viewed-section">
                <h3>👀 Most Viewed Shared Notes</h3>
                <ul>
                  {analytics.mostViewed.map(note => (
                    <li key={note.id}>
                      <strong>{note.title}</strong> - {note.view_count} views
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analytics && analytics.upcomingDueDates && analytics.upcomingDueDates.length > 0 && (
              <div className="upcoming-section">
                <h3>📅 Upcoming Due Dates</h3>
                <ul>
                  {analytics.upcomingDueDates.map(note => (
                    <li key={note.id}>
                      <strong>{note.title}</strong> - Due: {formatDate(note.due_date)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ) : (
          /* Notes View */
          <>
            {/* Create/Edit Note Form */}
            <section className="create-note-section">
              <h2>{editingNote ? '✏️ Edit Note' : '➕ Create New Note'}</h2>
              <form onSubmit={handleSubmit} className="note-form">
                <div className="form-group">
                  <label htmlFor="title">Title:</label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter note title"
                    maxLength="255"
                    disabled={submitting}
                  />
                  <span className="char-counter">{title.length}/255</span>
                </div>
                
                <div className="form-group">
                  <label htmlFor="content">
                    Content: 
                    <button 
                      type="button" 
                      className="toggle-preview-btn"
                      onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                    >
                      {showMarkdownPreview ? '📝 Edit' : '👁️ Preview'}
                    </button>
                  </label>
                  {showMarkdownPreview ? (
                    <div className="markdown-preview">
                      <ReactMarkdown>{content}</ReactMarkdown>
                    </div>
                  ) : (
                    <textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Enter note content (Markdown supported)"
                      rows="6"
                      disabled={submitting}
                    />
                  )}
                  <span className="char-counter">{content.length} characters • Markdown supported</span>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="category">Category:</label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      disabled={submitting}
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="color">Color Theme:</label>
                    <div className="color-picker">
                      {colorOptions.map(colorOpt => (
                        <button
                          key={colorOpt.value}
                          type="button"
                          className={`color-option ${color === colorOpt.value ? 'selected' : ''}`}
                          style={{ backgroundColor: colorOpt.value }}
                          onClick={() => setColor(colorOpt.value)}
                          title={colorOpt.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="dueDate">📅 Due Date (optional):</label>
                    <input
                      type="datetime-local"
                      id="dueDate"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="reminderDate">🔔 Reminder (optional):</label>
                    <input
                      type="datetime-local"
                      id="reminderDate"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="tags">Tags (comma-separated):</label>
                  <input
                    type="text"
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g., urgent, todo, meeting"
                    disabled={submitting}
                  />
                </div>
                
                <div className="button-group">
                  <button type="submit" className="submit-btn" disabled={submitting}>
                    {submitting ? 'Saving...' : (editingNote ? '💾 Update Note' : '✨ Create Note')}
                  </button>
                  {editingNote && (
                    <button 
                      type="button" 
                      className="cancel-btn"
                      onClick={() => {
                        setEditingNote(null);
                        setTitle('');
                        setContent('');
                        setCategory('general');
                        setTags('');
                        setColor('#667eea');
                        setDueDate('');
                        setReminderDate('');
                      }}
                      disabled={submitting}
                    >
                      ✖️ Cancel
                    </button>
                  )}
                </div>
              </form>
            </section>

            {error && <div className="error-message">⚠️ {error}</div>}

            {/* Search and Filter Section */}
            <section className="filter-section">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="🔍 Search notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="category-filters">
                <button
                  className={`filter-btn ${filterCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterCategory('all')}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    className={`filter-btn ${filterCategory === cat ? 'active' : ''}`}
                    onClick={() => setFilterCategory(cat)}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
                <button
                  className={`filter-btn ${showFavoritesOnly ? 'active' : ''}`}
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                >
                  ⭐ Favorites Only
                </button>
              </div>
            </section>

            {/* Notes List */}
            <section className="notes-section">
              <div className="notes-header">
                <h2>📚 My Notes ({notes.length})</h2>
                <button onClick={fetchNotes} className="refresh-btn" disabled={loading}>
                  🔄 Refresh
                </button>
              </div>

              {loading ? (
                <div className="loading">
                  <div className="spinner"></div>
                  Loading notes...
                </div>
              ) : notes.length === 0 ? (
                <div className="empty-state">
                  <p>📭 No notes found. {searchTerm || filterCategory !== 'all' || showFavoritesOnly ? 'Try adjusting your filters.' : 'Create your first note above!'}</p>
                </div>
              ) : (
                <div className="notes-grid">
                  {notes.map((note) => (
                    <div 
                      key={note.id} 
                      className={`note-card category-${note.category || 'general'} ${note.is_pinned ? 'pinned' : ''}`}
                      style={{ borderTopColor: note.color }}
                    >
                      <div className="note-header">
                        <span className="category-badge" style={{ backgroundColor: note.color }}>
                          {note.category || 'general'}
                        </span>
                        <div className="note-actions">
                          {note.is_pinned && <span className="pin-indicator">📌</span>}
                          <button 
                            className={`action-btn favorite-btn ${note.is_favorite ? 'active' : ''}`}
                            onClick={() => toggleFavorite(note.id)}
                            title="Toggle favorite"
                          >
                            {note.is_favorite ? '⭐' : '☆'}
                          </button>
                          <button 
                            className="action-btn pin-btn"
                            onClick={() => togglePin(note.id)}
                            title="Toggle pin"
                          >
                            📌
                          </button>
                          <button 
                            className="action-btn share-btn"
                            onClick={() => generateShareLink(note.id)}
                            title="Share note"
                          >
                            🔗
                          </button>
                          <button 
                            className="action-btn edit-btn"
                            onClick={() => handleEdit(note)}
                            title="Edit note"
                          >
                            ✏️
                          </button>
                          <button 
                            className="action-btn delete-btn"
                            onClick={() => handleDelete(note.id)}
                            title="Delete note"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <h3>{note.title}</h3>
                      <div className="note-content">
                        <ReactMarkdown>{note.content}</ReactMarkdown>
                      </div>
                      {note.tags && note.tags.length > 0 && (
                        <div className="tags">
                          {note.tags.map((tag, idx) => (
                            <span key={idx} className="tag">#{tag}</span>
                          ))}
                        </div>
                      )}
                      {note.due_date && (
                        <div className={`due-date ${isOverdue(note.due_date) ? 'overdue' : ''}`}>
                          📅 Due: {formatDate(note.due_date)}
                          {isOverdue(note.due_date) && ' ⚠️ OVERDUE'}
                        </div>
                      )}
                      {note.view_count > 0 && (
                        <div className="view-count">👀 {note.view_count} views</div>
                      )}
                      <div className="note-footer">
                        <span className="note-date">📅 {formatDate(note.created_at)}</span>
                        {note.updated_at && note.updated_at !== note.created_at && (
                          <span className="note-updated">✏️ Updated {formatDate(note.updated_at)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="App-footer">
        <p>🚀 Deployed on OpenShift | ✨ Enhanced Notes App | Total Notes: {stats?.total || 0} | Made with ❤️ for IT460</p>
      </footer>
    </div>
  );
}

export default App;
