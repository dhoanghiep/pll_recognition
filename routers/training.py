from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import random
import json

from cube import Cube
from cube.common import reverse_moves
from models.cube import (
    TrainingSetup, TrainingQuestion, TrainingAnswer, 
    TrainingResult, SessionStats, PLLStats
)
from database import get_db, TrainingSession, TrainingAttempt, create_tables
from routers.cube import load_pll_data

router = APIRouter()

# Create tables on startup
create_tables()

@router.post("/start_session")
def start_training_session(setup: TrainingSetup, db: Session = Depends(get_db)):
    """Start a new training session with selected PLLs"""
    if not setup.selected_plls:
        raise HTTPException(status_code=400, detail="No PLLs selected for training")
    
    # Validate selected PLLs
    pll_data = load_pll_data()
    invalid_plls = [pll for pll in setup.selected_plls if pll not in pll_data]
    if invalid_plls:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid PLL cases: {invalid_plls}"
        )
    
    # Create new session
    session = TrainingSession(
        selected_plls=json.dumps(setup.selected_plls),
        elev=setup.elev,
        azim=setup.azim
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # Generate first question
    first_question = generate_training_question(setup.selected_plls, pll_data, setup.elev, setup.azim)
    
    return {
        "session_id": session.id,
        "question": first_question
    }

@router.post("/submit_answer")
def submit_training_answer(answer: TrainingAnswer, db: Session = Depends(get_db)):
    """Submit an answer for a training question"""
    
    # Get session
    session = db.query(TrainingSession).filter(
        TrainingSession.id == answer.session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")
    
    # Check if answer is correct
    is_correct = answer.user_answer.strip().lower() == answer.pll_case.strip().lower()
    
    # Record the attempt
    attempt = TrainingAttempt(
        session_id=answer.session_id,
        pll_case=answer.pll_case,
        user_answer=answer.user_answer,
        is_correct=is_correct,
        reaction_time=answer.reaction_time
    )
    db.add(attempt)
    
    # Update session stats
    session.total_attempts += 1
    if is_correct:
        session.correct_attempts += 1
    
    db.commit()
    
    # Generate next question if correct, or return result if incorrect
    next_question = None
    if is_correct:
        selected_plls = json.loads(session.selected_plls)
        pll_data = load_pll_data()
        next_question = generate_training_question(selected_plls, pll_data, session.elev, session.azim)
    
    return TrainingResult(
        is_correct=is_correct,
        correct_answer=answer.pll_case,
        next_question=next_question
    )

@router.post("/end_session/{session_id}")
def end_training_session(session_id: int, db: Session = Depends(get_db)):
    """End a training session"""
    session = db.query(TrainingSession).filter(
        TrainingSession.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")
    
    session.end_time = func.now()
    db.commit()
    
    return {"message": "Session ended successfully"}

@router.get("/session_stats/{session_id}")
def get_session_stats(session_id: int, db: Session = Depends(get_db)):
    """Get statistics for a specific training session"""
    session = db.query(TrainingSession).filter(
        TrainingSession.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")
    
    # Calculate average reaction time
    avg_time_result = db.query(func.avg(TrainingAttempt.reaction_time)).filter(
        TrainingAttempt.session_id == session_id,
        TrainingAttempt.is_correct == True
    ).scalar()
    
    avg_time = float(avg_time_result) if avg_time_result else 0.0
    accuracy = (session.correct_attempts / session.total_attempts * 100) if session.total_attempts > 0 else 0.0
    
    return SessionStats(
        session_id=session.id,
        total_attempts=session.total_attempts,
        correct_attempts=session.correct_attempts,
        accuracy=accuracy,
        average_time=avg_time,
        start_time=session.start_time,
        end_time=session.end_time
    )

@router.get("/pll_stats")
def get_pll_statistics(db: Session = Depends(get_db)):
    """Get overall statistics for each PLL case"""
    pll_data = load_pll_data()
    stats = []
    
    for pll_case in pll_data.keys():
        attempts = db.query(TrainingAttempt).filter(
            TrainingAttempt.pll_case == pll_case
        ).all()
        
        if attempts:
            total_attempts = len(attempts)
            correct_attempts = sum(1 for a in attempts if a.is_correct)
            correct_times = [a.reaction_time for a in attempts if a.is_correct]
            
            accuracy = (correct_attempts / total_attempts * 100) if total_attempts > 0 else 0.0
            best_time = min(correct_times) if correct_times else 0.0
            avg_time = sum(correct_times) / len(correct_times) if correct_times else 0.0
            
            # Get recent attempts (last 10)
            recent = sorted(attempts, key=lambda x: x.timestamp, reverse=True)[:10]
            recent_data = [
                {
                    "timestamp": a.timestamp.isoformat(),
                    "is_correct": a.is_correct,
                    "reaction_time": a.reaction_time,
                    "user_answer": a.user_answer
                }
                for a in recent
            ]
            
            stats.append(PLLStats(
                pll_case=pll_case,
                total_attempts=total_attempts,
                correct_attempts=correct_attempts,
                accuracy=accuracy,
                best_time=best_time,
                average_time=avg_time,
                recent_attempts=recent_data
            ))
        else:
            # No attempts for this PLL case
            stats.append(PLLStats(
                pll_case=pll_case,
                total_attempts=0,
                correct_attempts=0,
                accuracy=0.0,
                best_time=0.0,
                average_time=0.0,
                recent_attempts=[]
            ))
    
    # Sort by accuracy (descending) then by average time (ascending)
    stats.sort(key=lambda x: (-x.accuracy, x.average_time if x.average_time > 0 else float('inf')))
    
    return stats

@router.get("/overall_stats")
def get_overall_statistics(db: Session = Depends(get_db)):
    """Get overall training statistics"""
    
    total_sessions = db.query(TrainingSession).count()
    total_attempts = db.query(TrainingAttempt).count()
    correct_attempts = db.query(TrainingAttempt).filter(
        TrainingAttempt.is_correct == True
    ).count()
    
    overall_accuracy = (correct_attempts / total_attempts * 100) if total_attempts > 0 else 0.0
    
    # Average reaction time for correct answers
    avg_time_result = db.query(func.avg(TrainingAttempt.reaction_time)).filter(
        TrainingAttempt.is_correct == True
    ).scalar()
    avg_reaction_time = float(avg_time_result) if avg_time_result else 0.0
    
    # Best reaction time
    best_time_result = db.query(func.min(TrainingAttempt.reaction_time)).filter(
        TrainingAttempt.is_correct == True
    ).scalar()
    best_reaction_time = float(best_time_result) if best_time_result else 0.0
    
    return {
        "total_sessions": total_sessions,
        "total_attempts": total_attempts,
        "correct_attempts": correct_attempts,
        "overall_accuracy": overall_accuracy,
        "average_reaction_time": avg_reaction_time,
        "best_reaction_time": best_reaction_time
    }

@router.post("/reset_database")
def reset_training_database(db: Session = Depends(get_db)):
    """Reset all training statistics by deleting all data"""
    try:
        # Delete all training attempts
        db.query(TrainingAttempt).delete()
        # Delete all training sessions
        db.query(TrainingSession).delete()
        db.commit()
        
        return {"message": "Training database reset successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reset database: {str(e)}")

def generate_training_question(selected_plls: List[str], pll_data: dict, elev: float = 30, azim: float = 45) -> TrainingQuestion:
    """Generate a random training question from selected PLLs"""
    
    # Randomly select a PLL case
    pll_case = random.choice(selected_plls)
    
    # Get the algorithm and reverse it to create the cube state
    algorithm = pll_data[pll_case]
    reversed_algorithm = reverse_moves(algorithm)
    
    # Add random U moves (U, U', U2) to the end for AUF (Adjust U Face)
    y_moves = ["y", "y'", "y2"]
    random_y_move = random.choice(y_moves)
    u_moves = ["U", "U'", "U2"]
    random_u_move = random.choice(u_moves)
    final_algorithm = reversed_algorithm + " " + random_y_move + " " + random_u_move
    
    # Create cube and apply reversed algorithm + random U move
    cube = Cube()
    cube.rotate(final_algorithm)
    
    # Generate plot
    plot_data = cube.plot_to_base64(elev=elev, azim=azim)
    
    # Return ALL PLL cases as answer options instead of just a few
    all_plls = list(pll_data.keys())
    
    return TrainingQuestion(
        pll_case=pll_case,
        plot=plot_data,
        available_answers=all_plls  # Show all PLLs as options
    )
