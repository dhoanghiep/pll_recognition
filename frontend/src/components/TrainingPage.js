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

  // Next question state
  const [pendingNextQuestion, setPendingNextQuestion] = useState(null);
  const [feedbackTimeout, setFeedbackTimeout] = useState(null);

  // Keyboard input state
  const [keyboardInput, setKeyboardInput] = useState('');
  const [keyboardTimeout, setKeyboardTimeout] = useState(null);
  const [regenerateTimeout, setRegenerateTimeout] = useState(null);

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

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (feedbackTimeout) {
        clearTimeout(feedbackTimeout);
      }
      if (keyboardTimeout) {
        clearTimeout(keyboardTimeout);
      }
      if (regenerateTimeout) {
        clearTimeout(regenerateTimeout);
      }
    };
  }, [feedbackTimeout, keyboardTimeout, regenerateTimeout]);

  // Keyboard event handler - RESTRICTED VERSION
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (!trainingMode || !currentQuestion) return;

      // Don't handle keyboard events if user is interacting with form elements
      const target = event.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' ||
        target.contentEditable === 'true' || target.isContentEditable ||
        target.closest('input[type="range"]') || target.closest('.training-angle-controls') ||
        target.closest('.training-view-controls') || target.closest('.answer-section')) {
        return;
      }

      // Only handle specific keys for PLL input and navigation
      const key = event.key.toLowerCase();

      // Handle Enter key for continue (only in feedback mode)
      if (key === 'enter' && feedback) {
        event.preventDefault();
        if (feedback.isCorrect) {
          proceedToNextQuestion();
        } else {
          proceedToNextQuestion(); // Default to next question for incorrect
        }
        return;
      }

      // Handle Backspace/Delete key for try again (only in feedback mode)
      if (key === 'backspace' && feedback && !feedback.isCorrect) {
        event.preventDefault();
        tryAgain();
        return;
      }

      // Handle PLL case input (only when not in feedback mode and not loading)
      if (!feedback && !loading) {
        // Only handle letter keys and hyphen for PLL names
        if (!/^[a-z-]$/.test(key)) {
          return;
        }

        // Clear previous timeout
        if (keyboardTimeout) {
          clearTimeout(keyboardTimeout);
        }

        // Add key to input
        const newInput = keyboardInput + key;
        setKeyboardInput(newInput);

        // Check for exact matches first
        const exactMatch = currentQuestion.available_answers.find(
          answer => answer.toLowerCase() === newInput.toLowerCase()
        );

        if (exactMatch) {
          // Found exact match, submit immediately
          setKeyboardInput('');
          submitAnswer(exactMatch);
          return;
        }

        // Check for partial matches
        const partialMatches = currentQuestion.available_answers.filter(
          answer => answer.toLowerCase().startsWith(newInput.toLowerCase())
        );

        if (partialMatches.length === 0) {
          // No matches, clear input
          setKeyboardInput('');
        } else if (partialMatches.length === 1 && partialMatches[0].toLowerCase() === newInput.toLowerCase()) {
          // Single exact match, submit
          setKeyboardInput('');
          submitAnswer(partialMatches[0]);
        } else {
          // Multiple matches or partial match, wait for more input
          const timeoutId = setTimeout(() => {
            setKeyboardInput('');
          }, 2000); // Clear after 2 seconds of no input
          setKeyboardTimeout(timeoutId);
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyPress);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [trainingMode, currentQuestion, feedback, loading, keyboardInput, keyboardTimeout]);

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
        // Store the next question for immediate access
        setPendingNextQuestion(result.next_question);

        // Set timeout as fallback (still auto-proceed if user doesn't click)
        const timeoutId = setTimeout(() => {
          proceedToNextQuestion();
        }, 1000); // Show feedback for 1 seconds
        setFeedbackTimeout(timeoutId);
      } else if (!result.is_correct) {
        // Allow user to try again
        setUserAnswer('');

        // Set timeout as fallback (auto-proceed to next question if user doesn't click)
        const timeoutId = setTimeout(() => {
          proceedToNextQuestion();
        }, 5000); // Show feedback for 5 seconds
        setFeedbackTimeout(timeoutId);
      }

    } catch (err) {
      console.error('Error submitting answer:', err);
      setError('Failed to submit answer.');
    } finally {
      setLoading(false);
    }
  };

  const endTraining = async () => {
    // Clear any pending timeouts
    if (feedbackTimeout) {
      clearTimeout(feedbackTimeout);
      setFeedbackTimeout(null);
    }

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
    setPendingNextQuestion(null);
  };

  const resetSession = () => {
    setSessionStats(null);
    setError('');
  };

  const regenerateCurrentPlot = async (newElev, newAzim) => {
    if (!currentQuestion || regeneratingPlot) return;

    setRegeneratingPlot(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/training/regenerate_plot`, {
        pll_case: currentQuestion.pll_case,
        full_algorithm: currentQuestion.full_algorithm,
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
    
    // Clear previous timeout
    if (regenerateTimeout) {
      clearTimeout(regenerateTimeout);
    }
    
    // Debounce the regeneration
    const timeoutId = setTimeout(() => {
      regenerateCurrentPlot(newElev, trainingAzim);
    }, 100); // 100ms delay
    
    setRegenerateTimeout(timeoutId);
  };

  const handleTrainingAzimChange = (newAzim) => {
    setTrainingAzim(newAzim);
    
    // Clear previous timeout
    if (regenerateTimeout) {
      clearTimeout(regenerateTimeout);
    }
    
    // Debounce the regeneration
    const timeoutId = setTimeout(() => {
      regenerateCurrentPlot(trainingElev, newAzim);
    }, 100); // 100ms delay
    
    setRegenerateTimeout(timeoutId);
  };

  const proceedToNextQuestion = async () => {
    if (pendingNextQuestion) {
      setCurrentQuestion(pendingNextQuestion);
      setPendingNextQuestion(null);
    } else {
      // Request a new question from the backend
      try {
        const response = await axios.post(`${API_BASE_URL}/training/get_next_question/${sessionId}?elev=${trainingElev}&azim=${trainingAzim}`);
        setCurrentQuestion(response.data);
      } catch (err) {
        console.error('Error getting next question:', err);
        setError('Failed to get next question');
        return;
      }
    }

    setUserAnswer('');
    setFeedback(null);
    setKeyboardInput(''); // Clear keyboard input
    setStartTime(Date.now());
    setTimerDisplay('0.00');

    // Clear any existing timeout
    if (feedbackTimeout) {
      clearTimeout(feedbackTimeout);
      setFeedbackTimeout(null);
    }
    if (keyboardTimeout) {
      clearTimeout(keyboardTimeout);
      setKeyboardTimeout(null);
    }
  };

  const tryAgain = () => {
    setUserAnswer('');
    setFeedback(null);
    setKeyboardInput(''); // Clear keyboard input
    setStartTime(Date.now());
    setTimerDisplay('0.00');

    // Clear any existing timeout
    if (feedbackTimeout) {
      clearTimeout(feedbackTimeout);
      setFeedbackTimeout(null);
    }
    if (keyboardTimeout) {
      clearTimeout(keyboardTimeout);
      setKeyboardTimeout(null);
    }
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
            <div className="keyboard-hints">
              <span className="keyboard-hint">⌨️ Type PLL name • Enter: Continue • Backspace: Try Again</span>
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

            <div className="training-content">
              <div className="cube-display">
                <img
                  src={`data:image/png;base64,${currentQuestion.plot}`}
                  alt="PLL Case visualization"
                  className="training-cube-image"
                />
              </div>

              <div className="answer-section">
                <h3>Which PLL case is this?</h3>

                {/* Keyboard input indicator */}
                {keyboardInput && (
                  <div className="keyboard-input-indicator">
                    <span className="keyboard-label">Keyboard input:</span>
                    <span className="keyboard-text">{keyboardInput}</span>
                  </div>
                )}

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
                  <div className="feedback-actions">
                    <button
                      onClick={proceedToNextQuestion}
                      className="next-question-button"
                    >
                      ➡️ Next Question
                    </button>
                    <p className="auto-progress-text">Auto-advancing in 1 seconds...</p>
                    <p className="keyboard-shortcut-hint">⌨️ Press Enter to continue</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="feedback-content">
                <div className="feedback-icon">❌</div>
                <div className="feedback-text">
                  <h3>Incorrect</h3>
                  <p>You selected: <strong>{feedback.userAnswer}</strong></p>
                  <p>Correct answer: <strong>{feedback.correctAnswer}</strong></p>
                  <div className="feedback-actions">
                    <button
                      onClick={tryAgain}
                      className="try-again-button"
                    >
                      🔄 Try Again
                    </button>
                    <button
                      onClick={proceedToNextQuestion}
                      className="next-question-button"
                    >
                      ➡️ Next Question
                    </button>
                    <p className="auto-progress-text">Auto-proceeding to next question in 5 seconds...</p>
                    <p className="keyboard-shortcut-hint">⌨️ Press Enter to continue • Backspace to try again</p>
                  </div>
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
            <li>🎯 All 21 PLL cases are available as answer options</li>
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
