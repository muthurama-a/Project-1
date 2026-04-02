from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import json
from datetime import datetime, timezone

from database import get_db
from models import Unit, Lesson, User, UserLevel, TestResult, FlashCard, VelocityLog
from schemas.lessons import (
    DashboardResponse, UnitResponse, LessonResponse,
    FlashCardResponse, SM2SubmitRequest, SM2SubmitResponse,
    VelocityLogRequest, VelocityStatsResponse, SeedCardsResponse
)
from routers.auth import get_current_user
from utils.lesson_generator import generate_personalized_units
from utils.sm2 import sm2_next, compute_due_date, compute_hesitation_score, compute_quality_from_velocity

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# SM-2 ENDPOINTS  (must come BEFORE /{lesson_id} wildcard)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/sm2/due", response_model=List[FlashCardResponse])
def get_due_cards(limit: int = 20, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns cards due for review today (SM-2 scheduled)."""
    now_utc = datetime.now(timezone.utc)
    cards = db.query(FlashCard).filter(
        FlashCard.user_id == current_user.id,
        FlashCard.due_date <= now_utc
    ).order_by(FlashCard.due_date.asc()).limit(limit).all()
    return cards


@router.get("/sm2/weak", response_model=List[FlashCardResponse])
def get_weak_cards(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns cards flagged as weak areas (high error rate)."""
    cards = db.query(FlashCard).filter(
        FlashCard.user_id == current_user.id,
        FlashCard.is_weak == True
    ).order_by(FlashCard.incorrect_count.desc()).limit(20).all()
    return cards


@router.get("/sm2/all", response_model=List[FlashCardResponse])
def get_all_cards(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns all flashcards for the user."""
    return db.query(FlashCard).filter(FlashCard.user_id == current_user.id).all()


@router.post("/sm2/submit", response_model=SM2SubmitResponse)
def submit_sm2_review(
    payload: SM2SubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit an SM-2 review. Computes quality from velocity metrics,
    runs the SM-2 algorithm, updates card state and logs velocity.
    """
    card = db.query(FlashCard).filter(
        FlashCard.id == payload.card_id,
        FlashCard.user_id == current_user.id
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    hesitation_score = compute_hesitation_score(payload.response_time_ms, payload.hesitation_count)
    quality = compute_quality_from_velocity(
        payload.response_time_ms, hesitation_score, payload.is_correct
    )
    new_ef, new_interval, new_reps = sm2_next(
        card.easiness, card.interval, card.repetitions, quality
    )
    new_due = compute_due_date(new_interval)

    card.easiness = new_ef
    card.interval = new_interval
    card.repetitions = new_reps
    card.due_date = new_due
    card.last_reviewed = datetime.now(timezone.utc)

    if payload.is_correct:
        card.correct_count += 1
    else:
        card.incorrect_count += 1

    total = card.correct_count + card.incorrect_count
    card.is_weak = (card.incorrect_count >= 2 and (card.incorrect_count / total) >= 0.4)

    vel = VelocityLog(
        user_id=current_user.id,
        lesson_id=card.lesson_id,
        card_id=card.id,
        response_time_ms=payload.response_time_ms,
        answer_duration_ms=payload.answer_duration_ms,
        hesitation_count=payload.hesitation_count,
        hesitation_score=hesitation_score,
        quality=quality,
        transcript=payload.transcript
    )
    db.add(vel)
    db.commit()

    msg = "Great job! 🎉" if quality >= 4 else ("Good effort! 👍" if quality == 3 else "Keep practicing! 💪")
    return SM2SubmitResponse(
        card_id=card.id,
        new_interval=new_interval,
        new_easiness=round(new_ef, 3),
        new_repetitions=new_reps,
        quality=quality,
        hesitation_score=hesitation_score,
        is_weak=card.is_weak,
        next_due=new_due,
        message=msg
    )


@router.post("/sm2/seed/{lesson_id}", response_model=SeedCardsResponse)
def seed_cards_for_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually seeds SM-2 flashcards from a lesson's content_data."""
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    count = _seed_cards_for_lesson(db, current_user.id, lesson)
    return SeedCardsResponse(seeded=count, message=f"Seeded {count} flashcards from '{lesson.title}'")


# ─────────────────────────────────────────────────────────────────────────────
# VELOCITY ENDPOINTS  (also before wildcard)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/velocity/log")
def log_velocity(
    payload: VelocityLogRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    hs = compute_hesitation_score(payload.response_time_ms, payload.hesitation_count)
    vel = VelocityLog(
        user_id=current_user.id,
        lesson_id=payload.lesson_id,
        card_id=payload.card_id,
        response_time_ms=payload.response_time_ms,
        answer_duration_ms=payload.answer_duration_ms,
        hesitation_count=payload.hesitation_count,
        hesitation_score=hs,
        quality=3,
        transcript=payload.transcript
    )
    db.add(vel)
    db.commit()
    return {"logged": True, "hesitation_score": hs}


@router.get("/velocity/stats", response_model=VelocityStatsResponse)
def get_velocity_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    logs = db.query(VelocityLog).filter(
        VelocityLog.user_id == current_user.id
    ).order_by(VelocityLog.created_at.desc()).limit(100).all()

    if not logs:
        return VelocityStatsResponse(
            avg_response_time_ms=0, avg_hesitation_score=0, avg_quality=0,
            total_reviews=0, speed_label="No data", hesitation_label="No data",
            trend=[], weak_areas=[]
        )

    avg_rt = sum(l.response_time_ms for l in logs) / len(logs)
    avg_hs = sum(l.hesitation_score for l in logs) / len(logs)
    avg_q  = sum(l.quality for l in logs) / len(logs)

    speed_label = "Fast" if avg_rt < 2000 else ("Moderate" if avg_rt < 4000 else "Slow")
    hes_label   = "Confident" if avg_hs < 0.3 else ("Some hesitation" if avg_hs < 0.6 else "High hesitation")

    trend = [
        {
            "index": i,
            "response_time_ms": logs[i].response_time_ms,
            "hesitation_score": logs[i].hesitation_score,
            "quality": logs[i].quality,
            "created_at": logs[i].created_at.isoformat() if logs[i].created_at else None
        }
        for i in range(min(7, len(logs)))
    ]
    trend.reverse()

    weak_cards = db.query(FlashCard.front).filter(
        FlashCard.user_id == current_user.id,
        FlashCard.is_weak == True
    ).limit(10).all()
    weak_areas = [row[0] for row in weak_cards]

    return VelocityStatsResponse(
        avg_response_time_ms=round(avg_rt, 1),
        avg_hesitation_score=round(avg_hs, 3),
        avg_quality=round(avg_q, 2),
        total_reviews=len(logs),
        speed_label=speed_label,
        hesitation_label=hes_label,
        trend=trend,
        weak_areas=weak_areas
    )


# ─────────────────────────────────────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard_data(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id

    CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]

    # ── Step 1: ALWAYS ensure A1 curriculum exists with correct label ─────────
    # Old code stored A1 content under wrong level labels like 'B1'.
    # We fix this by guaranteeing properly-labelled A1 units are always present.
    a1_units_exist = db.query(Unit).filter(Unit.level == "A1").count() > 0
    if not a1_units_exist:
        a1_data = generate_personalized_units("A1")
        for u_data in a1_data:
            new_unit = Unit(
                title=u_data["title"], description=u_data["description"],
                level="A1", order=u_data["order"], icon=u_data["icon"]
            )
            db.add(new_unit)
            db.flush()
            for l_data in u_data["lessons"]:
                db.add(Lesson(
                    unit_id=new_unit.id, title=l_data["title"],
                    content_type=l_data["content_type"],
                    content_data=json.dumps(l_data["content_data"]),
                    order=l_data["order"]
                ))
        db.commit()

    # ── Step 2: Walk CEFR_ORDER to find the user's current content level ──────
    # A level is "done" only when ALL its lessons are completed.
    # Only properly-labeled levels (seeded correctly) are considered.
    content_level = "A1"
    for cefr in CEFR_ORDER:
        cefr_units = db.query(Unit).filter(Unit.level == cefr).all()
        if not cefr_units:
            break  # No curriculum beyond this point
        total_l = sum(
            db.query(Lesson).filter(Lesson.unit_id == u.id).count()
            for u in cefr_units
        )
        done_l = sum(
            db.query(Lesson).filter(
                Lesson.unit_id == u.id, Lesson.is_completed == 1
            ).count()
            for u in cefr_units
        )
        content_level = cefr
        if done_l < total_l:
            break  # Still incomplete at this level — stay here

    # ── Step 3: Fetch display units for current content level ─────────────────
    units = db.query(Unit).filter(Unit.level == content_level).order_by(Unit.order).all()

    # ── 3. Compute stats ──────────────────────────────────────────────────────
    accuracy_avg = db.query(func.avg(TestResult.score)).filter(TestResult.user_id == user_id).scalar() or 0.0
    accuracy_percent = round(accuracy_avg * 100, 1)

    completed_lessons_count = db.query(Lesson).join(Unit).filter(
        Unit.level == content_level, Lesson.is_completed == 1
    ).count()
    words_known = 500 + (completed_lessons_count * 50)

    # ── 4. SM-2 due cards + weak areas ────────────────────────────────────────
    now_utc = datetime.now(timezone.utc)
    due_count = db.query(FlashCard).filter(
        FlashCard.user_id == user_id,
        FlashCard.due_date <= now_utc
    ).count()

    weak_cards = db.query(FlashCard.front).filter(
        FlashCard.user_id == user_id,
        FlashCard.is_weak == True
    ).limit(5).all()
    weak_areas = [row[0] for row in weak_cards]

    # ── 5. Build unit/lesson response ─────────────────────────────────────────
    unit_responses = []
    for u in units:
        lessons = db.query(Lesson).filter(Lesson.unit_id == u.id).order_by(Lesson.order).all()
        lesson_data = [
            LessonResponse(
                id=l.id, unit_id=l.unit_id, title=l.title,
                content_type=l.content_type,
                content_data=json.loads(l.content_data),
                order=l.order, is_completed=bool(l.is_completed)
            )
            for l in lessons
        ]
        unit_responses.append(UnitResponse(
            id=u.id, title=u.title, description=u.description,
            level=u.level, order=u.order, icon=u.icon,
            lessons=lesson_data
        ))

    # Streak: days since last completed lesson (simplified: 1 if any done today)
    streak = 1 if completed_lessons_count > 0 else 0

    return DashboardResponse(
        user_name=current_user.name or "Student",
        current_level=content_level,           # ← always the learning content level
        streak=streak,
        accuracy=accuracy_percent,
        words_known=words_known,
        hours_total=round(completed_lessons_count * 0.08, 1),
        units=unit_responses,
        due_cards_count=due_count,
        weak_areas=weak_areas
    )


# ─────────────────────────────────────────────────────────────────────────────
# LESSON DETAIL + COMPLETE  (wildcard — must be LAST)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{lesson_id}", response_model=LessonResponse)
def get_lesson_details(lesson_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return LessonResponse(id=lesson.id, unit_id=lesson.unit_id, title=lesson.title,
                          content_type=lesson.content_type,
                          content_data=json.loads(lesson.content_data),
                          order=lesson.order, is_completed=bool(lesson.is_completed))


@router.post("/{lesson_id}/complete")
def complete_lesson(lesson_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    lesson.is_completed = 1
    db.commit()
    _seed_cards_for_lesson(db, current_user.id, lesson)
    return {"message": "Lesson completed", "lesson_id": lesson_id}


# ─────────────────────────────────────────────────────────────────────────────
# INTERNAL
# ─────────────────────────────────────────────────────────────────────────────

def _seed_cards_for_lesson(db: Session, user_id: int, lesson: Lesson) -> int:
    try:
        data = json.loads(lesson.content_data)
    except Exception:
        return 0

    flashcards = data.get("flashcards", [])
    count = 0
    for fc in flashcards:
        front = fc.get("front", "").strip()
        back  = fc.get("back", "").strip()
        if not front or not back:
            continue
        existing = db.query(FlashCard).filter(
            FlashCard.user_id == user_id,
            FlashCard.front == front
        ).first()
        if existing:
            continue
        card = FlashCard(user_id=user_id, lesson_id=lesson.id, front=front, back=back)
        db.add(card)
        count += 1
    if count > 0:
        db.commit()
    return count
