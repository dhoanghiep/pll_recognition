import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PLLHintDrawer from './PLLHintDrawer';
import './TrainingPage.css';

const API_BASE_URL = 'http://localhost:8000';

function TrainingPage() {
  // PLL selection state
  const [availablePLLs, setAvailablePLLs] = useState([]);
  const [selectedPLLs, setSelectedPLLs] = useState([]);
  
  // Training state
  const [trainingMode, setTrainingMode] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  
  // Timer state
  const [startTime, setStartTime] = useState(null);
  const [reactionTime, setReactionTime] = useState(0);
  const [timerDisplay, setTimerDisplay] = useState('0.00');
  
  // Statistics
  const [sessionStats, setSessionStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // View angle state
  const [elev, setElev] = useState(30);
  const [azim, setAzim] = useState(45);

  // Training view angle state (separate from setup)
  const [trainingElev, setTrainingElev] = useState(30);
  const [trainingAzim, setTrainingAzim] = useState(45);
  const [regeneratingPlot, setRegeneratingPlot] = useState(false);

  // Load available PLLs on component mount
  useEffect(() => {
    const fetchPLLs = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/cube/pll_list`);
        setAvailablePLLs(response.data.pll_cases);
        // Select all PLLs by default
        setSelectedPLLs(response.data.pll_cases);
      } catch (err) {
        console.error('Error loading PLL list:', err);
        setError('Failed to load PLL list. Make sure the backend is running.');
      }
    };
    fetchPLLs();
  }, []);

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (trainingMode && startTime && !feedback) {
      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setTimerDisplay(elapsed.toFixed(2));
      }, 10);
    }
    return () => clearInterval(interval);
  }, [trainingMode, startTime, feedback]);

  const handlePLLToggle = (pll) => {
    setSelectedPLLs(prev => 
      prev.includes(pll) 
        ? prev.filter(p => p !== pll)
        : [...prev, pll]
    );
  };

  const selectAllPLLs = () => {
    setSelectedPLLs(availablePLLs);
  };

  const deselectAllPLLs = () => {
    setSelectedPLLs([]);
  };

  const startTraining = async () => {
    if (selectedPLLs.length === 0) {
      setError('Please select at least one PLL case for training');
      return;
    }

    setLoading(true);
    setError('');
    setFeedback(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/training/start_session`, {
        selected_plls: selectedPLLs,
        elev: elev,
        azim: azim
      });

      setSessionId(response.data.session_id);
      setCurrentQuestion(response.data.question);
      setTrainingMode(true);
      setStartTime(Date.now());
      setUserAnswer('');
      setTimerDisplay('0.00');
      setTrainingElev(elev); // Initialize training angles from setup
      setTrainingAzim(azim);
      
    } catch (err) {
      console.error('Error starting training:', err);
      setError('Failed to start training session.');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (selectedAnswer) => {
    if (!selectedAnswer.trim()) {
      setError('Please select an answer');
      return;
    }

    const endTime = Date.now();
    const reactionTimeSeconds = (endTime - startTime) / 1000;
    setReactionTime(reactionTimeSeconds);

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/training/submit_answer`, {
        session_id: sessionId,
        pll_case: currentQuestion.pll_case,
        user_answer: selectedAnswer,
        reaction_time: reactionTimeSeconds
      });

      const result = response.data;
      setFeedback({
        isCorrect: result.is_correct,
        correctAnswer: result.correct_answer,
        userAnswer: selectedAnswer,
        reactionTime: reactionTimeSeconds
      });

      if (result.is_correct && result.next_question) {
        // Prepare for next question
        setTimeout(() => {
          setCurrentQuestion(result.next_question);
          setUserAnswer('');
          setFeedback(null);
          setStartTime(Date.now());
          setTimerDisplay('0.00');
        }, 2000); // Show feedback for 2 seconds
      } else if (!result.is_correct) {
        // Allow user to try again
        setUserAnswer('');
        setTimeout(() => {
          setFeedback(null);
          setStartTime(Date.now());
          setTimerDisplay('0.00');
        }, 3000); // Show feedback for 3 seconds
      }

    } catch (err) {
      console.error('Error submitting answer:', err);
      setError('Failed to submit answer.');
    } finally {
      setLoading(false);
    }
  };

  const endTraining = async () => {
    if (sessionId) {
      try {
        await axios.post(`${API_BASE_URL}/training/end_session/${sessionId}`);
        
        // Get session stats
        const statsResponse = await axios.get(`${API_BASE_URL}/training/session_stats/${sessionId}`);
        setSessionStats(statsResponse.data);
        
      } catch (err) {
        console.error('Error ending session:', err);
      }
    }

    setTrainingMode(false);
    setSessionId(null);
    setCurrentQuestion(null);
    setFeedback(null);
    setUserAnswer('');
    setStartTime(null);
    setTimerDisplay('0.00');
  };

  const resetSession = () => {
    setSessionStats(null);
    setError('');
  };

  const regenerateCurrentPlot = async (newElev, newAzim) => {
    if (!currentQuestion || regeneratingPlot) return;
    
    setRegeneratingPlot(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/cube/get_pll_plot`, {
        pll_name: currentQuestion.pll_case,
        elev: newElev,
        azim: newAzim
      });

      setCurrentQuestion(prev => ({
        ...prev,
        plot: response.data.plot
      }));
    } catch (err) {
      console.error('Error regenerating plot:', err);
      setError('Failed to update cube visualization');
    } finally {
      setRegeneratingPlot(false);
    }
  };

  const handleTrainingElevChange = (newElev) => {
    setTrainingElev(newElev);
    regenerateCurrentPlot(newElev, trainingAzim);
  };

  const handleTrainingAzimChange = (newAzim) => {
    setTrainingAzim(newAzim);
    regenerateCurrentPlot(trainingElev, newAzim);
  };

  if (sessionStats) {
    return (
      <div className="training-page">
        <div className="session-results">
          <h2>🎉 Training Session Complete!</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{sessionStats.total_attempts}</div>
              <div className="stat-label">Total Attempts</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{sessionStats.correct_attempts}</div>
              <div className="stat-label">Correct Answers</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{sessionStats.accuracy.toFixed(1)}%</div>
              <div className="stat-label">Accuracy</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{sessionStats.average_time.toFixed(2)}s</div>
              <div className="stat-label">Average Time</div>
            </div>
          </div>
          <div className="session-actions">
            <button onClick={resetSession} className="start-button">
              Start New Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (trainingMode) {
    return (
      <div className={`training-page ${drawerOpen ? 'drawer-open' : ''}`}>
        <div className="training-header">
          <h2>🧩 PLL Recognition Training</h2>
          <div className="training-controls">
            <div className="timer-display">
              Time: <span className="timer">{timerDisplay}s</span>
            </div>
            <div className="control-buttons">
              <button 
                onClick={() => setDrawerOpen(true)} 
                className="hint-button"
                title="Open PLL reference guide"
              >
                🔍 Hint
              </button>
              <button onClick={endTraining} className="end-button">
                End Training
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {currentQuestion && !feedback && (
          <div className="training-question">
            <div className="training-view-controls">
              <h4>🎛️ Adjust Viewing Angle</h4>
              <div className="training-angle-controls">
                <div className="training-angle-control">
                  <label htmlFor="training-elev">Elevation: {trainingElev}°</label>
                  <input
                    id="training-elev"
                    type="range"
                    min="-90"
                    max="90"
                    value={trainingElev}
                    onChange={(e) => handleTrainingElevChange(parseInt(e.target.value))}
                    className="training-angle-slider"
                    disabled={regeneratingPlot}
                  />
                </div>
                <div className="training-angle-control">
                  <label htmlFor="training-azim">Azimuth: {trainingAzim}°</label>
                  <input
                    id="training-azim"
                    type="range"
                    min="0"
                    max="360"
                    value={trainingAzim}
                    onChange={(e) => handleTrainingAzimChange(parseInt(e.target.value))}
                    className="training-angle-slider"
                    disabled={regeneratingPlot}
                  />
                </div>
                <button 
                  onClick={() => {
                    handleTrainingElevChange(30);
                    handleTrainingAzimChange(45);
                  }}
                  className="reset-training-angles-button"
                  disabled={regeneratingPlot}
                >
                  Reset View
                </button>
              </div>
              {regeneratingPlot && (
                <div className="regenerating-indicator">
                  <div className="mini-spinner"></div>
                  <span>Updating view...</span>
                </div>
              )}
            </div>

            <div className="cube-display">
              <img 
                src={`data:image/png;base64,${currentQuestion.plot}`} 
                alt="PLL Case visualization"
                className="training-cube-image"
              />
            </div>
            
            <div className="answer-section">
              <h3>Which PLL case is this?</h3>
              <div className="answer-buttons">
                {currentQuestion.available_answers.map((answer, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setUserAnswer(answer);
                      submitAnswer(answer); // Auto-submit immediately
                    }}
                    disabled={loading}
                    className={`answer-button ${userAnswer === answer ? 'selected' : ''} ${loading ? 'disabled' : ''}`}
                  >
                    {answer}
                  </button>
                ))}
              </div>
              
              {loading && (
                <div className="submitting-message">
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Submitting answer...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {feedback && (
          <div className={`feedback ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>
            {feedback.isCorrect ? (
              <div className="feedback-content">
                <div className="feedback-icon">✅</div>
                <div className="feedback-text">
                  <h3>Correct!</h3>
                  <p>You got <strong>{feedback.correctAnswer}</strong> in <strong>{feedback.reactionTime.toFixed(2)}s</strong></p>
                  <p>Loading next question...</p>
                </div>
              </div>
            ) : (
              <div className="feedback-content">
                <div className="feedback-icon">❌</div>
                <div className="feedback-text">
                  <h3>Incorrect</h3>
                  <p>You selected: <strong>{feedback.userAnswer}</strong></p>
                  <p>Correct answer: <strong>{feedback.correctAnswer}</strong></p>
                  <p>Try again in a moment...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PLL Hint Drawer */}
        <PLLHintDrawer 
          isOpen={drawerOpen} 
          onClose={() => setDrawerOpen(false)} 
        />
      </div>
    );
  }

  return (
    <div className={`training-page ${drawerOpen ? 'drawer-open' : ''}`}>
      <div className="training-setup">
        <div className="setup-header">
          <div className="setup-title">
            <h2>🎯 PLL Recognition Training Setup</h2>
            <p>Select which PLL cases you want to practice recognizing</p>
          </div>
          <button 
            onClick={() => setDrawerOpen(true)} 
            className="reference-button"
            title="View PLL reference and visualizer"
          >
            🔍 PLL Reference
          </button>
        </div>

        <div className="pll-selection">
          <div className="selection-controls">
            <button onClick={selectAllPLLs} className="control-button">
              Select All ({availablePLLs.length})
            </button>
            <button onClick={deselectAllPLLs} className="control-button">
              Deselect All
            </button>
            <span className="selection-count">
              {selectedPLLs.length} selected
            </span>
          </div>

          <div className="pll-grid">
            {availablePLLs.map((pll) => (
              <label key={pll} className="pll-checkbox">
                <input
                  type="checkbox"
                  checked={selectedPLLs.includes(pll)}
                  onChange={() => handlePLLToggle(pll)}
                />
                <span className="pll-name">{pll}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="view-angle-controls">
          <h3>Initial Cube Viewing Angles</h3>
          <p className="angle-info">Set the starting angle - you can adjust these during training!</p>
          <div className="angle-controls">
            <div className="angle-control">
              <label htmlFor="elev-input">Elevation: {elev}°</label>
              <input
                id="elev-input"
                type="range"
                min="-90"
                max="90"
                value={elev}
                onChange={(e) => setElev(parseInt(e.target.value))}
                className="angle-slider"
              />
            </div>
            <div className="angle-control">
              <label htmlFor="azim-input">Azimuth: {azim}°</label>
              <input
                id="azim-input"
                type="range"
                min="0"
                max="360"
                value={azim}
                onChange={(e) => setAzim(parseInt(e.target.value))}
                className="angle-slider"
              />
            </div>
            <button 
              onClick={() => {setElev(30); setAzim(45);}}
              className="reset-angles-button"
            >
              Reset to Default
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <div className="start-section">
          <button 
            onClick={startTraining}
            disabled={selectedPLLs.length === 0 || loading}
            className="start-button"
          >
            {loading ? 'Starting...' : `Start Training (${selectedPLLs.length} PLLs)`}
          </button>
        </div>

        <div className="training-info">
          <h3>How Training Works:</h3>
          <ul>
            <li>📸 You'll see cube visualizations showing PLL cases with random AUF (U moves)</li>
            <li>⏱️ Timer starts when each question appears</li>
            <li>🎛️ Adjust viewing angles in real-time while the timer runs!</li>
            <li>✅ Click the correct PLL name - answers submit automatically!</li>
            <li>🎯 All 22 PLL cases are available as answer options</li>
            <li>🔄 Continue until you want to stop</li>
            <li>📊 View your detailed statistics at the end</li>
          </ul>
        </div>
      </div>

      {/* PLL Hint Drawer */}
      <PLLHintDrawer 
        isOpen={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
      />
    </div>
  );
}

export default TrainingPage;
