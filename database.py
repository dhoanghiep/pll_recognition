from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# SQLite database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./training_stats.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class TrainingSession(Base):
    """A training session containing multiple attempts"""
    __tablename__ = "training_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    total_attempts = Column(Integer, default=0)
    correct_attempts = Column(Integer, default=0)
    selected_plls = Column(String)  # JSON string of selected PLLs
    elev = Column(Float, default=30.0)  # Elevation angle for cube visualization
    azim = Column(Float, default=45.0)  # Azimuth angle for cube visualization

class TrainingAttempt(Base):
    """Individual training attempt within a session"""
    __tablename__ = "training_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, index=True)
    pll_case = Column(String, index=True)
    user_answer = Column(String)
    is_correct = Column(Boolean)
    reaction_time = Column(Float)  # in seconds
    timestamp = Column(DateTime, default=datetime.utcnow)

def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
