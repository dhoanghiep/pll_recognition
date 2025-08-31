from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import random
import json

from cube import Cube
from cube.common import reverse_moves
from models.cube import (
    TrainingSetup,
    TrainingQuestion,
    TrainingAnswer,
    TrainingResult,
    SessionStats,
    PLLStats,
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
            status_code=400, detail=f"Invalid PLL cases: {invalid_plls}"
        )

    # Create new session
    session = TrainingSession(
        selected_plls=json.dumps(setup.selected_plls), elev=setup.elev, azim=setup.azim
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Generate first question
    first_question = generate_training_question(
        setup.selected_plls, pll_data, setup.elev, setup.azim
    )

    return {"session_id": session.id, "question": first_question}


@router.post("/submit_answer")
def submit_training_answer(answer: TrainingAnswer, db: Session = Depends(get_db)):
    """Submit an answer for a training question"""

    # Get session
    session = (
        db.query(TrainingSession)
        .filter(TrainingSession.id == answer.session_id)
        .first()
    )

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
        reaction_time=answer.reaction_time,
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
        next_question = generate_training_question(
            selected_plls, pll_data, session.elev, session.azim
        )

    return TrainingResult(
        is_correct=is_correct,
        correct_answer=answer.pll_case,
        next_question=next_question,
    )


@router.post("/get_next_question/{session_id}")
def get_next_question(session_id: int, elev: float = 30, azim: float = 45, db: Session = Depends(get_db)):
    """Get the next question for a training session"""
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")
    
    # Generate next question
    selected_plls = json.loads(session.selected_plls)
    pll_data = load_pll_data()
    next_question = generate_training_question(selected_plls, pll_data, elev, azim)
    
    return next_question


@router.post("/end_session/{session_id}")
def end_training_session(session_id: int, db: Session = Depends(get_db)):
    """End a training session"""
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()

    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")

    session.end_time = func.now()
    db.commit()

    return {"message": "Session ended successfully"}


@router.get("/session_stats/{session_id}")
def get_session_stats(session_id: int, db: Session = Depends(get_db)):
    """Get statistics for a specific training session"""
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()

    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")

    # Calculate average reaction time
    avg_time_result = (
        db.query(func.avg(TrainingAttempt.reaction_time))
        .filter(
            TrainingAttempt.session_id == session_id, TrainingAttempt.is_correct == True
        )
        .scalar()
    )

    avg_time = float(avg_time_result) if avg_time_result else 0.0
    accuracy = (
        (session.correct_attempts / session.total_attempts * 100)
        if session.total_attempts > 0
        else 0.0
    )

    return SessionStats(
        session_id=session.id,
        total_attempts=session.total_attempts,
        correct_attempts=session.correct_attempts,
        accuracy=accuracy,
        average_time=avg_time,
        start_time=session.start_time,
        end_time=session.end_time,
    )


@router.get("/pll_stats")
def get_pll_statistics(db: Session = Depends(get_db)):
    """Get overall statistics for each PLL case"""
    pll_data = load_pll_data()
    stats = []

    for pll_case in pll_data.keys():
        attempts = (
            db.query(TrainingAttempt).filter(TrainingAttempt.pll_case == pll_case).all()
        )

        if attempts:
            total_attempts = len(attempts)
            correct_attempts = sum(1 for a in attempts if a.is_correct)
            correct_times = [a.reaction_time for a in attempts if a.is_correct]

            accuracy = (
                (correct_attempts / total_attempts * 100) if total_attempts > 0 else 0.0
            )
            best_time = min(correct_times) if correct_times else 0.0
            avg_time = sum(correct_times) / len(correct_times) if correct_times else 0.0

            # Get recent attempts (last 10)
            recent = sorted(attempts, key=lambda x: x.timestamp, reverse=True)[:10]
            recent_data = [
                {
                    "timestamp": a.timestamp.isoformat(),
                    "is_correct": a.is_correct,
                    "reaction_time": a.reaction_time,
                    "user_answer": a.user_answer,
                }
                for a in recent
            ]

            stats.append(
                PLLStats(
                    pll_case=pll_case,
                    total_attempts=total_attempts,
                    correct_attempts=correct_attempts,
                    accuracy=accuracy,
                    best_time=best_time,
                    average_time=avg_time,
                    recent_attempts=recent_data,
                )
            )
        else:
            # No attempts for this PLL case
            stats.append(
                PLLStats(
                    pll_case=pll_case,
                    total_attempts=0,
                    correct_attempts=0,
                    accuracy=0.0,
                    best_time=0.0,
                    average_time=0.0,
                    recent_attempts=[],
                )
            )

    # Sort by accuracy (descending) then by average time (ascending)
    stats.sort(
        key=lambda x: (
            -x.accuracy,
            x.average_time if x.average_time > 0 else float("inf"),
        )
    )

    return stats


@router.get("/overall_stats")
def get_overall_statistics(db: Session = Depends(get_db)):
    """Get overall training statistics"""

    total_sessions = db.query(TrainingSession).count()
    total_attempts = db.query(TrainingAttempt).count()
    correct_attempts = (
        db.query(TrainingAttempt).filter(TrainingAttempt.is_correct == True).count()
    )

    overall_accuracy = (
        (correct_attempts / total_attempts * 100) if total_attempts > 0 else 0.0
    )

    # Average reaction time for correct answers
    avg_time_result = (
        db.query(func.avg(TrainingAttempt.reaction_time))
        .filter(TrainingAttempt.is_correct == True)
        .scalar()
    )
    avg_reaction_time = float(avg_time_result) if avg_time_result else 0.0

    # Best reaction time
    best_time_result = (
        db.query(func.min(TrainingAttempt.reaction_time))
        .filter(TrainingAttempt.is_correct == True)
        .scalar()
    )
    best_reaction_time = float(best_time_result) if best_time_result else 0.0

    return {
        "total_sessions": total_sessions,
        "total_attempts": total_attempts,
        "correct_attempts": correct_attempts,
        "overall_accuracy": overall_accuracy,
        "average_reaction_time": avg_reaction_time,
        "best_reaction_time": best_reaction_time,
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
        raise HTTPException(
            status_code=500, detail=f"Failed to reset database: {str(e)}"
        )


@router.get("/sessions")
def get_all_sessions(db: Session = Depends(get_db)):
    """Get all training sessions with summary information"""
    sessions = (
        db.query(TrainingSession).order_by(TrainingSession.start_time.desc()).all()
    )

    session_summaries = []
    for session in sessions:
        # Get attempt count for this session
        attempt_count = (
            db.query(TrainingAttempt)
            .filter(TrainingAttempt.session_id == session.id)
            .count()
        )

        # Calculate session duration if ended
        duration = None
        if session.end_time:
            duration = (session.end_time - session.start_time).total_seconds()

        # Parse selected PLLs
        selected_plls = (
            json.loads(session.selected_plls) if session.selected_plls else []
        )

        session_summaries.append(
            {
                "id": session.id,
                "start_time": session.start_time.isoformat(),
                "end_time": session.end_time.isoformat() if session.end_time else None,
                "duration_seconds": duration,
                "total_attempts": session.total_attempts,
                "correct_attempts": session.correct_attempts,
                "accuracy": (session.correct_attempts / session.total_attempts * 100)
                if session.total_attempts > 0
                else 0.0,
                "attempt_count": attempt_count,
                "selected_plls": selected_plls,
                "selected_pll_count": len(selected_plls),
            }
        )

    return session_summaries


@router.post("/sessions/delete")
def delete_sessions(session_ids: List[int], db: Session = Depends(get_db)):
    """Delete selected training sessions and their attempts"""
    try:
        # Delete attempts for these sessions
        db.query(TrainingAttempt).filter(
            TrainingAttempt.session_id.in_(session_ids)
        ).delete(synchronize_session=False)

        # Delete the sessions
        deleted_count = (
            db.query(TrainingSession)
            .filter(TrainingSession.id.in_(session_ids))
            .delete(synchronize_session=False)
        )

        db.commit()

        return {
            "message": f"Successfully deleted {deleted_count} sessions",
            "deleted_count": deleted_count,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to delete sessions: {str(e)}"
        )


@router.post("/sessions_stats")
def get_sessions_statistics(session_ids: List[int], db: Session = Depends(get_db)):
    """Get statistics for selected sessions"""
    if not session_ids:
        return {
            "total_sessions": 0,
            "total_attempts": 0,
            "correct_attempts": 0,
            "overall_accuracy": 0.0,
            "average_reaction_time": 0.0,
            "total_training_time": 0.0,
            "pll_breakdown": [],
        }

    # Get session data
    sessions = (
        db.query(TrainingSession).filter(TrainingSession.id.in_(session_ids)).all()
    )

    # Get attempts for these sessions
    attempts = (
        db.query(TrainingAttempt)
        .filter(TrainingAttempt.session_id.in_(session_ids))
        .all()
    )

    total_sessions = len(sessions)
    total_attempts = len(attempts)
    correct_attempts = sum(1 for a in attempts if a.is_correct)
    overall_accuracy = (
        (correct_attempts / total_attempts * 100) if total_attempts > 0 else 0.0
    )

    # Calculate average reaction time for correct attempts
    correct_times = [a.reaction_time for a in attempts if a.is_correct]
    average_reaction_time = (
        sum(correct_times) / len(correct_times) if correct_times else 0.0
    )

    # Calculate total training time
    total_training_time = 0.0
    for session in sessions:
        if session.end_time:
            total_training_time += (
                session.end_time - session.start_time
            ).total_seconds()

    # PLL breakdown
    pll_breakdown = {}
    for attempt in attempts:
        pll = attempt.pll_case
        if pll not in pll_breakdown:
            pll_breakdown[pll] = {"total": 0, "correct": 0, "times": []}

        pll_breakdown[pll]["total"] += 1
        if attempt.is_correct:
            pll_breakdown[pll]["correct"] += 1
            pll_breakdown[pll]["times"].append(attempt.reaction_time)

    # Format PLL breakdown
    pll_stats = []
    for pll, stats in pll_breakdown.items():
        accuracy = (
            (stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0.0
        )
        avg_time = sum(stats["times"]) / len(stats["times"]) if stats["times"] else 0.0
        best_time = min(stats["times"]) if stats["times"] else 0.0

        pll_stats.append(
            {
                "pll_case": pll,
                "total_attempts": stats["total"],
                "correct_attempts": stats["correct"],
                "accuracy": accuracy,
                "average_time": avg_time,
                "best_time": best_time,
            }
        )

    # Sort by accuracy descending
    pll_stats.sort(key=lambda x: -x["accuracy"])

    return {
        "total_sessions": total_sessions,
        "total_attempts": total_attempts,
        "correct_attempts": correct_attempts,
        "overall_accuracy": overall_accuracy,
        "average_reaction_time": average_reaction_time,
        "total_training_time": total_training_time,
        "pll_breakdown": pll_stats,
    }


def generate_training_question(
    selected_plls: List[str], pll_data: dict, elev: float = 30, azim: float = 45
) -> TrainingQuestion:
    """Generate a random training question from selected PLLs"""

    # Randomly select a PLL case
    pll_case = random.choice(selected_plls)

    # Get the algorithm and reverse it to create the cube state
    algorithm = pll_data[pll_case]
    reversed_algorithm = reverse_moves(algorithm)

    # Add random U moves (U, U', U2) to the end for AUF (Adjust U Face)
    y_moves = ["y", "y'", "y2"]
    random_y_move_start = random.choice(y_moves)
    random_y_move_end = random.choice(y_moves)
    u_moves = ["U", "U'", "U2"]
    random_u_move = random.choice(u_moves)
    final_algorithm = (
        random_y_move_start
        + " "
        + reversed_algorithm
        + " "
        + random_y_move_end
        + " "
        + random_u_move
    )

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
        available_answers=all_plls,  # Show all PLLs as options
    )
