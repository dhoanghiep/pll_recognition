# In project root
MPLBACKEND=Agg python -m uvicorn main:app --reload --port 8000

# In frontend
cd frontend
npm start