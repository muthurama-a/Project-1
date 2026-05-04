import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import Unit, Lesson, UserLessonCompletion, User, FlashCard
from routers.lessons import _seed_cards_for_lesson

def seed_missing_cards(user_id=14):
    db = SessionLocal()
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        print(f"User {user_id} not found.")
        return
        
    print(f"Seeding missing flashcards for {user.name} (ID: {user_id})")
    
    completions = db.query(UserLessonCompletion).filter(UserLessonCompletion.user_id == user_id).all()
    print(f"Found {len(completions)} completed lessons.")
    
    total_seeded = 0
    for comp in completions:
        lesson = db.query(Lesson).filter(Lesson.id == comp.lesson_id).first()
        if lesson:
            count = _seed_cards_for_lesson(db, user_id, lesson)
            total_seeded += count
            if count > 0:
                print(f"Seeded {count} cards for Lesson {lesson.id} ('{lesson.title}')")

    db.commit()
    print(f"\nSuccessfully seeded {total_seeded} total missing flashcards.")

    # Let's also check if they have any due cards now
    from datetime import datetime, timezone
    now_utc = datetime.now(timezone.utc)
    due_count = db.query(FlashCard).filter(
        FlashCard.user_id == user_id,
        FlashCard.due_date <= now_utc
    ).count()
    
    print(f"User now has {due_count} cards due for review.")
    
if __name__ == "__main__":
    seed_missing_cards(14)
