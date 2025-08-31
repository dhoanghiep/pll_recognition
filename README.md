# Rubik's Cube Visualization App

A full-stack application for visualizing Rubik's cube states using moves and PLL algorithms.

## Features

### Backend (FastAPI)
- **Move Visualization**: Input moves and get 3D cube visualization
- **PLL Algorithm Support**: Input PLL case name, get visualization using reversed algorithm  
- **RESTful API**: Clean endpoints with proper error handling
- **3D Rendering**: Matplotlib-based cube rendering with base64 image export

### Frontend (React)
- **Interactive UI**: Modern, responsive interface
- **Move Input**: Enter standard cube notation
- **PLL Selection**: Choose from 22 available PLL cases
- **Real-time Visualization**: Instant cube state rendering
- **Tabbed Interface**: Switch between move input and PLL selection

## Quick Start

### 1. Backend Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload
```

The backend will be available at `http://localhost:8000`

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Start the React development server
npm start
```

The frontend will be available at `http://localhost:3000`

## API Endpoints

### GET `/`
Welcome message

### POST `/cube/get_plot`
Generate cube visualization from moves
- **Request**: `{"moves": "R U R' U'"}`
- **Response**: `{"plot": "base64_encoded_image"}`

### POST `/cube/get_pll_plot`  
Generate cube visualization from PLL case (using reversed algorithm)
- **Request**: `{"pll_name": "T"}`
- **Response**: `{"plot": "base64_encoded_image"}`

### GET `/cube/pll_list`
Get list of available PLL cases
- **Response**: `{"pll_cases": ["Aa", "Ab", "E", "F", ...]}`

## Move Notation

- **R, L, U, D, F, B**: Clockwise face turns (90°)
- **R', L', U', D', F', B'**: Counterclockwise turns (90°)
- **R2, L2, U2, D2, F2, B2**: Double turns (180°)

## PLL Cases

The app supports all 22 PLL cases:
- **Adjacent Corner Swaps**: Aa, Ab
- **Diagonal Corner Swaps**: E  
- **Adjacent Edge Swaps**: Ra, Rb, Ja, Jb, T, F
- **Diagonal Edge Swaps**: Na, Nb, V, Y
- **Double Swaps**: H, Ua, Ub, Z
- **G Perms**: Ga, Gb, Gc, Gd

## Project Structure

```
pll_recognization/
├── cube/                 # Core cube logic
│   ├── cube.py          # Cube class with 3D plotting
│   ├── cubie.py         # Individual cube piece logic
│   ├── common.py        # Move utilities and reversal
│   └── constants.py     # Cube constants
├── models/              # Pydantic models
│   └── cube.py         # API request/response models
├── routers/             # FastAPI routers
│   └── cube.py         # Cube API endpoints
├── db/                  # Data
│   └── PLL.txt         # PLL algorithms database
├── frontend/            # React application
│   ├── src/
│   │   ├── App.js      # Main React component
│   │   ├── App.css     # Styling
│   │   └── index.js    # React entry point
│   └── package.json    # Node.js dependencies
├── main.py             # FastAPI application entry
└── requirements.txt    # Python dependencies
```

## Development

### Backend Development
```bash
# Run with auto-reload
uvicorn main:app --reload --port 8000

# View API docs
# Navigate to http://localhost:8000/docs
```

### Frontend Development
```bash
cd frontend
npm start
# Runs on http://localhost:3000 with hot reload
```

## Technologies Used

- **Backend**: FastAPI, Matplotlib, NumPy, Pydantic
- **Frontend**: React, Axios, CSS3
- **Visualization**: Matplotlib 3D plotting
- **API**: RESTful with CORS support
