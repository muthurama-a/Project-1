from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


# ─── Lesson ──────────────────────────────────────────────────────────────────

class LessonCreate(BaseModel):
    unit_id: int
    title: str
    content_type: str
    content_data: Dict[str, Any]
    order: int

class LessonResponse(BaseModel):
    id: int
    unit_id: int
    title: str
    content_type: str
    content_data: Dict[str, Any]
    order: int
    is_completed: bool

    class Config:
        from_attributes = True

class UnitResponse(BaseModel):
    id: int
    title: str
    description: str
    level: str
    order: int
    icon: Optional[str] = None
    lessons: List[LessonResponse] = []

    class Config:
        from_attributes = True

class DashboardResponse(BaseModel):
    user_name: str
    current_level: str
    streak: int = 0
    accuracy: float = 0.0
    words_known: int = 0
    hours_total: float = 0.0
    units: List[UnitResponse]
    due_cards_count: int = 0
    weak_areas: List[str] = []


# ─── SM-2 FlashCard ──────────────────────────────────────────────────────────

class FlashCardResponse(BaseModel):
    id: int
    lesson_id: Optional[int]
    front: str
    back: str
    easiness: float
    interval: int
    repetitions: int
    due_date: datetime
    correct_count: int
    incorrect_count: int
    is_weak: bool

    class Config:
        from_attributes = True

class SM2SubmitRequest(BaseModel):
    card_id: int
    is_correct: bool
    response_time_ms: int       # Time to start answering (ms)
    hesitation_count: int = 0   # Number of detected pauses/hesitations
    answer_duration_ms: int = 0 # Total answer duration (ms)
    transcript: Optional[str] = None  # For speaking cards

class SM2SubmitResponse(BaseModel):
    card_id: int
    new_interval: int
    new_easiness: float
    new_repetitions: int
    quality: int
    hesitation_score: float
    is_weak: bool
    next_due: datetime
    message: str


# ─── Velocity ────────────────────────────────────────────────────────────────

class VelocityLogRequest(BaseModel):
    lesson_id: Optional[int] = None
    card_id: Optional[int] = None
    response_time_ms: int
    answer_duration_ms: int = 0
    hesitation_count: int = 0
    transcript: Optional[str] = None

class VelocityStatsResponse(BaseModel):
    avg_response_time_ms: float
    avg_hesitation_score: float
    avg_quality: float
    total_reviews: int
    speed_label: str              # "Fast", "Moderate", "Slow"
    hesitation_label: str         # "Confident", "Some hesitation", "High hesitation"
    trend: List[Dict[str, Any]]   # last 7 data points for chart
    weak_areas: List[str]         # lesson/card fronts that are repeatedly weak


# ─── Seed Cards ──────────────────────────────────────────────────────────────

class SeedCardsResponse(BaseModel):
    seeded: int
    message: str
