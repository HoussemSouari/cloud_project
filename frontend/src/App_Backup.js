// Notes Application - Main Component
// This component handles fetching, displaying, and creating notes

import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // State management
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editingNote, setEditingNote] = useState(null);
  const [stats, setStats] = useState(null);

  // Categories
  const categories = ['general', 'work', 'personal', 'ideas', 'important'];

  // Backend API URL - uses environment variable or defaults to backend route
  // In browser, this will use the backend route URL
  const API_URL = process.env.REACT_APP_API_URL || 'https://backend-route-houssemsouari-dev.apps.rm2.thpm.p1.openshiftapps.com';

  // Fetch notes from backend on component mount
  useEffect(() => {
    fetchNotes();
    fetchStats();
  }, []);

  // Fetch notes when search or filter changes
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchNotes();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, filterCategory]);

  // Fetch all notes from the API
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setNotes(data.notes || []);
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError('Failed to load notes. Make sure the backend service is running.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
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

  // Handle form submission to create a new note
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
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
        tags: tags.split(',').map(t => t.trim()).filter(t => t)
      };

      const url = editingNote 
        ? `${API_URL}/api/notes/${editingNote.id}`
        : `${API_URL}/api/notes`;
      
      const method = editingNote ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(noteData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Clear form
      setTitle('');
      setContent('');
      setCategory('general');
      setTags('');
      setEditingNote(null);
      
      // Refresh notes list and stats
      await fetchNotes();
      await fetchStats();
      
      alert(editingNote ? 'Note updated successfully!' : 'Note created successfully!');
    } catch (err) {
      console.error('Error saving note:', err);
      setError('Failed to save note. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle note editing
  const handleEdit = (note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category || 'general');
    setTags(note.tags ? note.tags.join(', ') : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle note deletion
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/notes/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchNotes();
      await fetchStats();
      alert('Note deleted successfully!');
    } catch (err) {
      console.error('Error deleting note:', err);
      setError('Failed to delete note. Please try again.');
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setCategory('general');
    setTags('');
  };

  // Format date for display
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>📝 Notes Application</h1>
        <p className="subtitle">IT460 Cloud Computing Project - OpenShift Deployment</p>
        {stats && (
          <div className="stats-bar">
            <span>Total Notes: {stats.total}</span>
            {stats.byCategory.map(cat => (
              <span key={cat.category}>
                {cat.category}: {cat.count}
              </span>
            ))}
          </div>
        )}
      </header>

      <main className="container">
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
              <label htmlFor="content">Content:</label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter note content"
                rows="6"
                disabled={submitting}
              />
              <span className="char-counter">{content.length} characters</span>
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
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
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
            </div>
            
            <div className="button-group">
              <button 
                type="submit" 
                className="submit-btn"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : (editingNote ? '💾 Update Note' : '✨ Create Note')}
              </button>
              {editingNote && (
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={handleCancelEdit}
                  disabled={submitting}
                >
                  ✖️ Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

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
              <p>📭 No notes found. {searchTerm || filterCategory !== 'all' ? 'Try adjusting your filters.' : 'Create your first note above!'}</p>
            </div>
          ) : (
            <div className="notes-grid">
              {notes.map((note) => (
                <div key={note.id} className={`note-card category-${note.category || 'general'}`}>
                  <div className="note-header">
                    <span className="category-badge">{note.category || 'general'}</span>
                    <div className="note-actions">
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
                  <p className="note-content">{note.content}</p>
                  {note.tags && note.tags.length > 0 && (
                    <div className="tags">
                      {note.tags.map((tag, idx) => (
                        <span key={idx} className="tag">#{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="note-footer">
                    <span className="note-date">
                      📅 {formatDate(note.created_at)}
                    </span>
                    {note.updated_at && note.updated_at !== note.created_at && (
                      <span className="note-updated">
                        ✏️ Updated {formatDate(note.updated_at)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="App-footer">
        <p>
          🚀 Deployed on OpenShift | ✨ Enhanced Notes App | Total Notes: {notes.length}
        </p>
      </footer>
    </div>
  );
}

export default App;
