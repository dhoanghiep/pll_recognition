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

  useEffect(() => {
    fetchStatistics();
  }, []);

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

  const formatTime = (seconds) => {
    if (seconds === 0) return 'N/A';
    return `${seconds.toFixed(2)}s`;
  };

  const formatAccuracy = (accuracy) => {
    return `${accuracy.toFixed(1)}%`;
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

      {/* Overall Statistics */}
      {overallStats && (
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

      {/* Performance Insights */}
      {pllStats.length > 0 && (
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
    </div>
  );
}

export default StatisticsPage;
