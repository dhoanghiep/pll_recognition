# 🧩 Rubik's Cube Visualizer - Complete Setup Guide

## 🎉 Development Complete!

Your FastAPI + React Rubik's cube application is now fully functional with:

### ✅ Backend Features
- **PLL Visualization**: Input PLL case names, get cube visualizations using reversed algorithms
- **Move Visualization**: Input standard cube notation, get 3D cube renderings
- **22 PLL Cases**: Complete database with all standard PLL algorithms
- **3D Matplotlib Rendering**: High-quality cube visualizations
- **RESTful API**: Clean endpoints with proper error handling

### ✅ Frontend Features
- **Modern React UI**: Clean, responsive interface with tabbed navigation
- **Move Input**: Standard cube notation support (R, U, R', F2, etc.)
- **PLL Selection**: Interactive buttons for all 22 PLL cases
- **Real-time Visualization**: Instant cube rendering from backend
- **Error Handling**: User-friendly error messages and loading states

## 🚀 Quick Start

### 1. Start the Backend
```bash
# In the project root (/Users/admin/dev/rubiks)
cd /Users/admin/dev/rubiks

# Install dependencies (if not done already)
pip install -r requirements.txt

# Start the FastAPI server
MPLBACKEND=Agg python -m uvicorn main:app --reload --port 8000
```

**Backend will be available at:** `http://localhost:8000`
**API Documentation:** `http://localhost:8000/docs`

### 2. Start the Frontend
```bash
# Open a new terminal and navigate to frontend
cd /Users/admin/dev/rubiks/frontend

# Install dependencies
npm install

# Start the React development server
npm start
```

**Frontend will be available at:** `http://localhost:3000`

## 🔧 API Endpoints

### `GET /`
- **Description**: Welcome message
- **Response**: `{"message": "Welcome to Rubiks Cube API!"}`

### `POST /cube/get_plot`
- **Description**: Generate cube visualization from moves
- **Request**: `{"moves": "R U R' U'"}`
- **Response**: `{"plot": "base64_encoded_png_image"}`

### `POST /cube/get_pll_plot`
- **Description**: Generate cube visualization from PLL case (using reversed algorithm)
- **Request**: `{"pll_name": "T"}`
- **Response**: `{"plot": "base64_encoded_png_image"}`

### `GET /cube/pll_list`
- **Description**: Get list of available PLL cases
- **Response**: `{"pll_cases": ["Aa", "Ab", "E", "F", ...]}`

## 🎯 How to Use

### Move Visualization
1. Go to the "Moves Input" tab
2. Enter cube notation (e.g., `R U R' U' R' F R2 U' R' U' R U R' F'`)
3. Click "Generate Cube"
4. View the 3D visualization

### PLL Visualization
1. Go to the "PLL Cases" tab
2. Either:
   - Type a PLL name (e.g., "T", "Aa", "H")
   - Click on one of the PLL buttons
3. Click "Generate PLL"
4. View the cube state that results from applying the **reversed** PLL algorithm

## 📝 Move Notation Reference

- **R, L, U, D, F, B**: Clockwise face turns (90°)
- **R', L', U', D', F', B'**: Counterclockwise turns (90°)
- **R2, L2, U2, D2, F2, B2**: Double turns (180°)
- **x, y, z**: Cube rotations
- **M, E, S**: Middle slice moves

## 🔍 Available PLL Cases

**Adjacent Corner Swaps**: Aa, Ab  
**Diagonal Corner Swaps**: E  
**Adjacent Edge Swaps**: Ra, Rb, Ja, Jb, T, F  
**Diagonal Edge Swaps**: Na, Nb, V, Y  
**Double Swaps**: H, Ua, Ub, Z  
**G Perms**: Ga, Gb, Gc, Gd  

## 🛠️ Troubleshooting

### Backend Issues
- **Import errors**: Make sure you're in the project root directory
- **Matplotlib issues**: Use `MPLBACKEND=Agg` environment variable
- **Port conflicts**: Change port with `--port 8001`

### Frontend Issues
- **CORS errors**: Make sure backend is running on port 8000
- **API connection**: Check that backend URL in App.js matches your backend
- **Dependency issues**: Delete `node_modules` and run `npm install` again

## 🎨 Customization Ideas

### Backend Extensions
- Add OLL algorithms support
- Implement scramble generation
- Add solve step-by-step visualization
- Support for different cube sizes (2x2, 4x4, etc.)

### Frontend Enhancements
- Add animation for move sequences
- Implement drag-and-drop move builder
- Add algorithm bookmarks/favorites
- Mobile-responsive improvements

## 📁 Project Structure
```
pll_recognization/
├── cube/                 # Core cube logic
├── models/              # Pydantic models
├── routers/             # FastAPI endpoints
├── db/                  # PLL algorithms database
├── frontend/            # React application
├── main.py             # FastAPI app entry point
└── requirements.txt    # Python dependencies
```

## 🎉 Success!

Your Rubik's cube visualization application is now fully functional! You can:

1. ✅ Input moves and see 3D cube visualizations
2. ✅ Select PLL cases and see resulting cube states
3. ✅ Browse all 22 PLL algorithms interactively
4. ✅ Use a modern, responsive web interface
5. ✅ Access a robust RESTful API

**Happy cubing!** 🧩✨
