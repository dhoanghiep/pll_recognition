# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import cube, training

app = FastAPI(
    title="Rubiks Cube API",
    description="A API for Rubiks Cube with PLL Training",
    version="0.2.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(cube.router, prefix="/cube", tags=["Cube"])
app.include_router(training.router, prefix="/training", tags=["Training"])


@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to Rubiks Cube API with PLL Training!"}
