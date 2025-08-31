from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class Move(BaseModel):
    moves: str
    elev: Optional[float] = 30  # Default elevation angle
    azim: Optional[float] = 45  # Default azimuth angle


class PLLRequest(BaseModel):
    pll_name: str
    elev: Optional[float] = 30  # Default elevation angle
    azim: Optional[float] = 45  # Default azimuth angle


class Plot(BaseModel):
    plot: str  # base64 encoded PNG image


# Training-related models
class TrainingSetup(BaseModel):
    selected_plls: List[str]
    elev: Optional[float] = 30  # Default elevation for training visualizations
    azim: Optional[float] = 45  # Default azimuth for training visualizations


class TrainingQuestion(BaseModel):
    pll_case: str
    plot: str
    available_answers: List[str]
    full_algorithm: str  # Store the complete algorithm including random moves


class TrainingAnswer(BaseModel):
    session_id: int
    pll_case: str
    user_answer: str
    reaction_time: float


class TrainingResult(BaseModel):
    is_correct: bool
    correct_answer: str
    next_question: Optional[TrainingQuestion] = None


class SessionStats(BaseModel):
    session_id: int
    total_attempts: int
    correct_attempts: int
    accuracy: float
    average_time: float
    start_time: datetime
    end_time: Optional[datetime] = None


class PLLStats(BaseModel):
    pll_case: str
    total_attempts: int
    correct_attempts: int
    accuracy: float
    best_time: float
    average_time: float
    recent_attempts: List[dict]


class RegeneratePlotRequest(BaseModel):
    pll_case: str
    full_algorithm: str
    elev: Optional[float] = 30
    azim: Optional[float] = 45
