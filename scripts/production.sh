# In project root
MPLBACKEND=Agg python -m uvicorn main:app --port 8000

# In frontend
cd frontend
npm run build
serve -s build -l 3000