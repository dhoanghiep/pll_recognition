import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import TrainingPage from './components/TrainingPage';
import StatisticsPage from './components/StatisticsPage';
import './App.css';

function NavigationBar() {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="nav-bar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          🧩 Rubik's Cube Hub
        </Link>
        
        <div className="nav-links">
          <Link 
            to="/" 
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
          >
            🎯 Training
          </Link>
          <Link 
            to="/statistics" 
            className={`nav-link ${isActive('/statistics') ? 'active' : ''}`}
          >
            📈 Statistics
          </Link>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <NavigationBar />

        <main className="App-main">
          <Routes>
            <Route path="/" element={<TrainingPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
          </Routes>
        </main>

        <footer className="App-footer">
          <p>Built with React + FastAPI | PLL Training Platform</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;