import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './StatisticsPage.css';

const API_BASE_URL = 'http://localhost:8000';

function StatisticsPage() {
  const [overallStats, setOverallStats] = useState(null);
  const [pllStats, setPllStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('accuracy'); // accuracy, average_time, total_attempts
  
  // Session management state
  const [activeTab, setActiveTab] = useState('overall'); // overall, sessions
  const [sessions, setSessions] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [sessionStats, setSessionStats] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    fetchStatistics();
    if (activeTab === 'sessions') {
      fetchSessions();
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'sessions' && sessions.length === 0) {
      fetchSessions();
    }
  }, [activeTab]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const [overallResponse, pllResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/training/overall_stats`),
        axios.get(`${API_BASE_URL}/training/pll_stats`)
      ]);

      setOverallStats(overallResponse.data);
      setPllStats(pllResponse.data);
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setError('Failed to load statistics. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const resetDatabase = async () => {
    if (!window.confirm('Are you sure you want to reset all training statistics? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post(`${API_BASE_URL}/training/reset_database`);
      
      // Refresh statistics after reset
      await fetchStatistics();
      
      alert('Training database has been reset successfully!');
    } catch (err) {
      console.error('Error resetting database:', err);
      setError('Failed to reset database. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    setError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/training/sessions`);
      setSessions(response.data);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Failed to load sessions. Make sure the backend is running.');
    } finally {
      setLoadingSessions(false);
    }
  };

  const deleteSessions = async () => {
    if (selectedSessions.length === 0) {
      alert('Please select sessions to delete');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedSessions.length} session(s)? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    setLoadingSessions(true);
    try {
      await axios.post(`${API_BASE_URL}/training/sessions/delete`, selectedSessions);
      setSelectedSessions([]);
      await fetchSessions(); // Refresh sessions
      await fetchStatistics(); // Refresh overall stats
      alert('Sessions deleted successfully!');
    } catch (err) {
      console.error('Error deleting sessions:', err);
      setError('Failed to delete sessions.');
    } finally {
      setLoadingSessions(false);
    }
  };

  const generateSessionStats = async () => {
    if (selectedSessions.length === 0) {
      alert('Please select sessions to generate statistics for');
      return;
    }

    setLoadingSessions(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/training/sessions_stats`, selectedSessions);
      setSessionStats(response.data);
    } catch (err) {
      console.error('Error generating session statistics:', err);
      setError('Failed to generate session statistics.');
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleSessionToggle = (sessionId) => {
    setSelectedSessions(prev => 
      prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const selectAllSessions = () => {
    setSelectedSessions(sessions.map(s => s.id));
  };

  const deselectAllSessions = () => {
    setSelectedSessions([]);
  };

  const formatTime = (seconds) => {
    if (seconds === 0) return 'N/A';
    return `${seconds.toFixed(2)}s`;
  };

  const formatAccuracy = (accuracy) => {
    return `${accuracy.toFixed(1)}%`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getPerformanceColor = (accuracy) => {
    if (accuracy >= 90) return '#28a745';
    if (accuracy >= 70) return '#ffc107';
    if (accuracy >= 50) return '#fd7e14';
    return '#dc3545';
  };

  const sortedPllStats = [...pllStats].sort((a, b) => {
    switch (sortBy) {
      case 'accuracy':
        return b.accuracy - a.accuracy;
      case 'average_time':
        // Sort by time (ascending), but put 0s (no attempts) at the end
        if (a.average_time === 0) return 1;
        if (b.average_time === 0) return -1;
        return a.average_time - b.average_time;
      case 'total_attempts':
        return b.total_attempts - a.total_attempts;
      case 'best_time':
        if (a.best_time === 0) return 1;
        if (b.best_time === 0) return -1;
        return a.best_time - b.best_time;
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="statistics-page">
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="statistics-page">
      <div className="stats-header">
        <h1>📊 Training Statistics</h1>
        <div className="header-buttons">
          <button onClick={fetchStatistics} className="refresh-button">
            🔄 Refresh
          </button>
          <button onClick={resetDatabase} className="reset-button" disabled={loading}>
            🗑️ Reset Database
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="stats-tabs">
        <button 
          className={`tab-button ${activeTab === 'overall' ? 'active' : ''}`}
          onClick={() => setActiveTab('overall')}
        >
          📈 Overall Statistics
        </button>
        <button 
          className={`tab-button ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          📋 Session Management
        </button>
      </div>

      {/* Overall Statistics Tab */}
      {activeTab === 'overall' && overallStats && (
        <div className="overall-stats">
          <h2>📈 Overall Performance</h2>
          <div className="overall-grid">
            <div className="overall-card">
              <div className="card-value">{overallStats.total_sessions}</div>
              <div className="card-label">Total Sessions</div>
            </div>
            <div className="overall-card">
              <div className="card-value">{overallStats.total_attempts}</div>
              <div className="card-label">Total Attempts</div>
            </div>
            <div className="overall-card">
              <div className="card-value">{overallStats.correct_attempts}</div>
              <div className="card-label">Correct Answers</div>
            </div>
            <div className="overall-card">
              <div className="card-value">{formatAccuracy(overallStats.overall_accuracy)}</div>
              <div className="card-label">Overall Accuracy</div>
            </div>
            <div className="overall-card">
              <div className="card-value">{formatTime(overallStats.average_reaction_time)}</div>
              <div className="card-label">Average Time</div>
            </div>
            <div className="overall-card">
              <div className="card-value">{formatTime(overallStats.best_reaction_time)}</div>
              <div className="card-label">Best Time</div>
            </div>
          </div>
        </div>
      )}

      {/* PLL-specific Statistics */}
      {activeTab === 'overall' && (
      <div className="pll-stats">
        <div className="pll-stats-header">
          <h2>🧩 PLL Performance</h2>
          <div className="sort-controls">
            <label>Sort by: </label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="accuracy">Accuracy</option>
              <option value="average_time">Average Time</option>
              <option value="best_time">Best Time</option>
              <option value="total_attempts">Total Attempts</option>
            </select>
          </div>
        </div>

        <div className="pll-stats-grid">
          {sortedPllStats.map((pll, index) => (
            <div 
              key={pll.pll_case} 
              className="pll-stat-card"
              style={{'--rank': index + 1}}
            >
              <div className="pll-header">
                <div className="pll-name">{pll.pll_case}</div>
                <div className="pll-rank">#{index + 1}</div>
              </div>
              
              <div className="pll-metrics">
                <div className="metric">
                  <div 
                    className="metric-value accuracy"
                    style={{color: getPerformanceColor(pll.accuracy)}}
                  >
                    {formatAccuracy(pll.accuracy)}
                  </div>
                  <div className="metric-label">Accuracy</div>
                </div>
                
                <div className="metric">
                  <div className="metric-value">{formatTime(pll.average_time)}</div>
                  <div className="metric-label">Avg Time</div>
                </div>
                
                <div className="metric">
                  <div className="metric-value">{formatTime(pll.best_time)}</div>
                  <div className="metric-label">Best Time</div>
                </div>
                
                <div className="metric">
                  <div className="metric-value">{pll.total_attempts}</div>
                  <div className="metric-label">Attempts</div>
                </div>
              </div>

              {pll.total_attempts > 0 && (
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar"
                    style={{
                      width: `${pll.accuracy}%`,
                      backgroundColor: getPerformanceColor(pll.accuracy)
                    }}
                  />
                </div>
              )}

              {pll.recent_attempts.length > 0 && (
                <div className="recent-attempts">
                  <div className="recent-header">Recent Performance:</div>
                  <div className="recent-dots">
                    {pll.recent_attempts.slice(0, 10).map((attempt, idx) => (
                      <div
                        key={idx}
                        className={`attempt-dot ${attempt.is_correct ? 'correct' : 'incorrect'}`}
                        title={`${attempt.is_correct ? 'Correct' : 'Incorrect'} - ${attempt.reaction_time.toFixed(2)}s`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {pllStats.length === 0 && !loading && (
          <div className="no-stats">
            <div className="no-stats-icon">📊</div>
            <h3>No Training Data Yet</h3>
            <p>Start a training session to see your PLL recognition statistics!</p>
          </div>
        )}
      </div>
      )}

      {/* Performance Insights */}
      {activeTab === 'overall' && pllStats.length > 0 && (
        <div className="insights">
          <h2>💡 Performance Insights</h2>
          <div className="insights-grid">
            <div className="insight-card">
              <h3>🏆 Strongest PLLs</h3>
              <div className="insight-list">
                {sortedPllStats
                  .filter(pll => pll.total_attempts >= 3)
                  .slice(0, 3)
                  .map((pll, index) => (
                    <div key={pll.pll_case} className="insight-item">
                      <span className="insight-rank">{index + 1}.</span>
                      <span className="insight-pll">{pll.pll_case}</span>
                      <span className="insight-value">{formatAccuracy(pll.accuracy)}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            <div className="insight-card">
              <h3>⚡ Fastest Recognition</h3>
              <div className="insight-list">
                {[...pllStats]
                  .filter(pll => pll.best_time > 0)
                  .sort((a, b) => a.best_time - b.best_time)
                  .slice(0, 3)
                  .map((pll, index) => (
                    <div key={pll.pll_case} className="insight-item">
                      <span className="insight-rank">{index + 1}.</span>
                      <span className="insight-pll">{pll.pll_case}</span>
                      <span className="insight-value">{formatTime(pll.best_time)}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            <div className="insight-card">
              <h3>📈 Most Practiced</h3>
              <div className="insight-list">
                {sortedPllStats
                  .sort((a, b) => b.total_attempts - a.total_attempts)
                  .slice(0, 3)
                  .map((pll, index) => (
                    <div key={pll.pll_case} className="insight-item">
                      <span className="insight-rank">{index + 1}.</span>
                      <span className="insight-pll">{pll.pll_case}</span>
                      <span className="insight-value">{pll.total_attempts} attempts</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Management Tab */}
      {activeTab === 'sessions' && (
        <div className="session-management">
          <div className="session-controls">
            <div className="session-header">
              <h2>📋 Training Sessions</h2>
              <div className="session-actions">
                <button 
                  onClick={fetchSessions} 
                  className="refresh-button"
                  disabled={loadingSessions}
                >
                  🔄 Refresh Sessions
                </button>
                <button 
                  onClick={selectAllSessions} 
                  className="select-button"
                  disabled={sessions.length === 0}
                >
                  ✅ Select All
                </button>
                <button 
                  onClick={deselectAllSessions} 
                  className="select-button"
                  disabled={selectedSessions.length === 0}
                >
                  ❌ Deselect All
                </button>
                <button 
                  onClick={generateSessionStats} 
                  className="stats-button"
                  disabled={selectedSessions.length === 0 || loadingSessions}
                >
                  📊 Generate Stats
                </button>
                <button 
                  onClick={deleteSessions} 
                  className="delete-button"
                  disabled={selectedSessions.length === 0 || loadingSessions}
                >
                  🗑️ Delete Selected
                </button>
              </div>
            </div>

            <div className="selection-summary">
              <span>
                {selectedSessions.length} of {sessions.length} sessions selected
              </span>
            </div>
          </div>

          {loadingSessions ? (
            <div className="loading-container">
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Loading sessions...</p>
              </div>
            </div>
          ) : (
            <div className="sessions-list">
              {sessions.length === 0 ? (
                <div className="no-sessions">
                  <p>No training sessions found. Start training to see sessions here!</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="session-item">
                    <div className="session-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedSessions.includes(session.id)}
                        onChange={() => handleSessionToggle(session.id)}
                      />
                    </div>
                    <div className="session-details">
                      <div className="session-main">
                        <div className="session-date">
                          📅 {formatDate(session.start_time)}
                          {session.end_time && (
                            <span className="session-duration">
                              ⏱️ {formatDuration(session.duration_seconds)}
                            </span>
                          )}
                        </div>
                        <div className="session-stats">
                          <span className="session-attempts">
                            {session.total_attempts} attempts
                          </span>
                          <span className="session-accuracy" style={{color: getPerformanceColor(session.accuracy)}}>
                            {formatAccuracy(session.accuracy)} accuracy
                          </span>
                        </div>
                      </div>
                      <div className="session-plls">
                        <div className="pll-count">
                          {session.selected_pll_count} PLLs: 
                        </div>
                        <div className="pll-list">
                          {session.selected_plls.slice(0, 8).map((pll, index) => (
                            <span key={index} className="pll-tag">{pll}</span>
                          ))}
                          {session.selected_plls.length > 8 && (
                            <span className="pll-more">+{session.selected_plls.length - 8} more</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Session Statistics Results */}
          {sessionStats && (
            <div className="session-stats-results">
              <h3>📊 Selected Sessions Statistics</h3>
              <div className="session-overall-grid">
                <div className="overall-card">
                  <div className="card-value">{sessionStats.total_sessions}</div>
                  <div className="card-label">Sessions</div>
                </div>
                <div className="overall-card">
                  <div className="card-value">{sessionStats.total_attempts}</div>
                  <div className="card-label">Total Attempts</div>
                </div>
                <div className="overall-card">
                  <div className="card-value">{sessionStats.correct_attempts}</div>
                  <div className="card-label">Correct</div>
                </div>
                <div className="overall-card">
                  <div className="card-value">{formatAccuracy(sessionStats.overall_accuracy)}</div>
                  <div className="card-label">Accuracy</div>
                </div>
                <div className="overall-card">
                  <div className="card-value">{formatTime(sessionStats.average_reaction_time)}</div>
                  <div className="card-label">Avg Time</div>
                </div>
                <div className="overall-card">
                  <div className="card-value">{formatDuration(sessionStats.total_training_time)}</div>
                  <div className="card-label">Total Time</div>
                </div>
              </div>


            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StatisticsPage;
