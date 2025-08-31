import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PLLHintDrawer.css';

const API_BASE_URL = 'http://localhost:8000';

function PLLHintDrawer({ isOpen, onClose }) {
  const [availablePLLs, setAvailablePLLs] = useState([]);
  const [selectedPLL, setSelectedPLL] = useState('');
  const [pllPlot, setPllPlot] = useState('');
  const [customMoves, setCustomMoves] = useState('');
  const [customPlot, setCustomPlot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pll'); // 'pll' or 'custom'
  const [elev, setElev] = useState(30); // Elevation angle
  const [azim, setAzim] = useState(45); // Azimuth angle

  // Load available PLLs on component mount
  useEffect(() => {
    if (isOpen) {
      fetchPLLs();
    }
  }, [isOpen]);

  // Regenerate plots when elev/azim changes
  useEffect(() => {
    if (selectedPLL && activeTab === 'pll') {
      generatePLLPlot(selectedPLL);
    }
  }, [elev, azim, selectedPLL, activeTab]);

  useEffect(() => {
    if (customMoves.trim() && activeTab === 'custom') {
      generateCustomPlot();
    }
  }, [elev, azim]);

  const fetchPLLs = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/cube/pll_list`);
      setAvailablePLLs(response.data.pll_cases);
      if (response.data.pll_cases.length > 0) {
        setSelectedPLL(response.data.pll_cases[0]);
        generatePLLPlot(response.data.pll_cases[0]);
      }
    } catch (err) {
      console.error('Error loading PLL list:', err);
      setError('Failed to load PLL list');
    }
  };

  const generatePLLPlot = async (pllName) => {
    if (!pllName) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/cube/get_pll_plot`, {
        pll_name: pllName,
        elev: elev,
        azim: azim
      });
      setPllPlot(response.data.plot);
    } catch (err) {
      console.error('Error generating PLL plot:', err);
      setError(`Failed to generate plot for ${pllName}`);
      setPllPlot('');
    } finally {
      setLoading(false);
    }
  };

  const generateCustomPlot = async () => {
    if (!customMoves.trim()) {
      setError('Please enter some moves');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/cube/get_plot`, {
        moves: customMoves,
        elev: elev,
        azim: azim
      });
      setCustomPlot(response.data.plot);
    } catch (err) {
      console.error('Error generating custom plot:', err);
      setError('Failed to generate plot for custom moves');
      setCustomPlot('');
    } finally {
      setLoading(false);
    }
  };

  const handlePLLChange = (pllName) => {
    setSelectedPLL(pllName);
    generatePLLPlot(pllName);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      generateCustomPlot();
    }
  };

  return (
    <div className={`drawer-container ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h2>🔍 PLL Reference & Visualizer</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="drawer-tabs">
          <button 
            className={`tab-button ${activeTab === 'pll' ? 'active' : ''}`}
            onClick={() => setActiveTab('pll')}
          >
            📋 PLL Cases
          </button>
          <button 
            className={`tab-button ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            🎮 Custom Moves
          </button>
        </div>

        <div className="view-controls">
          <div className="view-control-group">
            <label htmlFor="elev-slider">Elevation: {elev}°</label>
            <input
              id="elev-slider"
              type="range"
              min="-90"
              max="90"
              value={elev}
              onChange={(e) => setElev(parseInt(e.target.value))}
              className="view-slider"
            />
          </div>
          <div className="view-control-group">
            <label htmlFor="azim-slider">Azimuth: {azim}°</label>
            <input
              id="azim-slider"
              type="range"
              min="0"
              max="360"
              value={azim}
              onChange={(e) => setAzim(parseInt(e.target.value))}
              className="view-slider"
            />
          </div>
          <button 
            onClick={() => {setElev(30); setAzim(45);}}
            className="reset-view-button"
          >
            Reset View
          </button>
        </div>

        <div className="drawer-body">
          {activeTab === 'pll' && (
            <div className="pll-tab">
              <div className="pll-selector">
                <label>Select PLL Case:</label>
                <div className="pll-buttons-grid">
                  {availablePLLs.map((pll) => (
                    <button
                      key={pll}
                      onClick={() => handlePLLChange(pll)}
                      className={`pll-button ${selectedPLL === pll ? 'selected' : ''}`}
                    >
                      {pll}
                    </button>
                  ))}
                </div>
              </div>

              {loading && (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Generating visualization...</p>
                </div>
              )}

              {pllPlot && !loading && (
                <div className="plot-container">
                  <h3>PLL Case: {selectedPLL}</h3>
                  <img 
                    src={`data:image/png;base64,${pllPlot}`} 
                    alt={`PLL ${selectedPLL}`}
                    className="cube-plot"
                  />
                  <p className="plot-description">
                    This shows what the cube looks like when {selectedPLL} PLL case occurs
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="custom-tab">
              <div className="custom-input">
                <label htmlFor="moves-input">Enter Cube Moves:</label>
                <div className="input-group">
                  <input
                    id="moves-input"
                    type="text"
                    value={customMoves}
                    onChange={(e) => setCustomMoves(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="e.g., R U R' U' R' F R F'"
                    className="moves-input"
                  />
                  <button 
                    onClick={generateCustomPlot}
                    disabled={loading || !customMoves.trim()}
                    className="generate-button"
                  >
                    {loading ? 'Generating...' : 'Visualize'}
                  </button>
                </div>
                <p className="input-help">
                  Enter standard cube notation (R, U, L, D, F, B, M, x, y, z with ' for counterclockwise, 2 for double)
                </p>
              </div>

              {loading && (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Generating visualization...</p>
                </div>
              )}

              {customPlot && !loading && (
                <div className="plot-container">
                  <h3>Custom Moves: {customMoves}</h3>
                  <img 
                    src={`data:image/png;base64,${customPlot}`} 
                    alt="Custom cube state"
                    className="cube-plot"
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
        </div>

        <div className="drawer-footer">
          <p>💡 Use this reference to help identify PLL cases during training!</p>
        </div>
    </div>
  );
}

export default PLLHintDrawer;
