#!/usr/bin/env python3
"""
Quick script to start the FastAPI backend server.
Run this from the project root directory.
"""

import subprocess
import sys
import os

def main():
    # Check if we're in the right directory
    if not os.path.exists('main.py'):
        print("❌ Error: main.py not found. Please run this script from the project root directory.")
        sys.exit(1)
    
    print("🚀 Starting Rubik's Cube FastAPI Backend...")
    print("📡 Server will be available at: http://localhost:8000")
    print("📖 API documentation at: http://localhost:8000/docs")
    print("⏹️  Press Ctrl+C to stop the server\n")
    
    try:
        # Start the FastAPI server
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--reload", 
            "--host", "0.0.0.0", 
            "--port", "8000"
        ], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n⏹️  Server stopped by user")

if __name__ == "__main__":
    main()
