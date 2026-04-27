from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    current_streak = Column(Integer, default=0)
    last_active_date = Column(DateTime(timezone=True), nullable=True)
    total_xp = Column(Integer, default=0)

class TestResult(Base):
    __tablename__ = "test_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    question_type = Column(String)
    question_id = Column(Integer)
    user_answer = Column(String, nullable=True)
    speech_text = Column(Text, nullable=True)
    score = Column(Float)
    response_time = Column(Float, nullable=True)

class UserLevel(Base):
    __tablename__ = "user_levels"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    level = Column(String)
    score = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Unit(Base):
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String)
    level = Column(String)
    order = Column(Integer)
    icon = Column(String, nullable=True)

class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("units.id"))
    title = Column(String)
    content_type = Column(String)  # theory, quiz, speaking, listening
    content_data = Column(Text)    # JSON blob
    order = Column(Integer)
    is_completed = Column(Integer, default=0)  # 0 or 1

# ─── SM-2 Flashcard Review ──────────────────────────────────────────────────
class FlashCard(Base):
    """
    One SM-2 card per (user, flashcard front text).
    Stores the full SM-2 state so the scheduler knows when to show it again.
    """
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)

    # Flashcard content
    front = Column(Text)          # Question / word
    back = Column(Text)           # Answer / definition

    # SM-2 algorithm fields
    easiness    = Column(Float, default=2.5)    # Easiness Factor (EF) — starts at 2.5
    interval    = Column(Integer, default=1)    # Days until next review
    repetitions = Column(Integer, default=0)    # How many times reviewed correctly in a row
    due_date    = Column(DateTime(timezone=True), server_default=func.now())  # Next review date
    last_reviewed = Column(DateTime(timezone=True), nullable=True)

    # Weak area tracking
    correct_count   = Column(Integer, default=0)
    incorrect_count = Column(Integer, default=0)
    is_weak         = Column(Boolean, default=False)  # True if score < threshold

    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ─── Velocity Tracker ───────────────────────────────────────────────────────
class VelocityLog(Base):
    """
    Records speaking/answer speed and hesitation per lesson attempt.
    Used to compute velocity metrics shown on the Progress page.
    """
    __tablename__ = "velocity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)
    card_id = Column(Integer, ForeignKey("flashcards.id"), nullable=True)

    # Speed metrics
    response_time_ms = Column(Integer)      # How long (ms) until answer started
    answer_duration_ms = Column(Integer, nullable=True)  # How long the full answer took

    # Hesitation — number of long pauses (>500 ms silence in speech or typing delay)
    hesitation_count = Column(Integer, default=0)
    hesitation_score = Column(Float, default=0.0)  # 0.0 (no hesitation) to 1.0 (very hesitant)

    # Overall quality rating (0–5, derived from response_time + hesitation)
    quality = Column(Integer, default=3)

    # Raw transcript if speech-based
    transcript = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserLessonCompletion(Base):
    __tablename__ = "user_lesson_completions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), index=True)
    completed_at = Column(DateTime(timezone=True), server_default=func.now())
