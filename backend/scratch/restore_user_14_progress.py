import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import Unit, Lesson, UserLessonCompletion, User, TestResult

def restore_progress(user_id=14):
    db = SessionLocal()
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        print(f"User {user_id} not found.")
        return
        
    print(f"Restoring progress for {user.name} (ID: {user_id})")
    
    # Get A1 units 1, 2, 3
    a1_units = db.query(Unit).filter(Unit.level == 'A1', Unit.order.in_([1, 2, 3])).all()
    
    total_restored = 0
    xp_gained = 0
    
    for u in a1_units:
        lessons = db.query(Lesson).filter(Lesson.unit_id == u.id).all()
        for l in lessons:
            # Check if completion already exists
            existing = db.query(UserLessonCompletion).filter(
                UserLessonCompletion.user_id == user_id,
                UserLessonCompletion.lesson_id == l.id
            ).first()
            
            if not existing:
                comp = UserLessonCompletion(user_id=user_id, lesson_id=l.id)
                db.add(comp)
                
                # Add test result for 100% accuracy to ensure good stats
                tr = TestResult(
                    user_id=user_id,
                    question_type="lesson_completion",
                    question_id=l.id,
                    score=1.0
                )
                db.add(tr)
                
                total_restored += 1
                xp_gained += 20  # Base 10 + Acc 10
                print(f"Restored completion for Lesson {l.id} ('{l.title}') in Unit {u.order}")

    # Give user the XP they missed
    if user.total_xp is None:
        user.total_xp = 0
    user.total_xp += xp_gained
    
    db.commit()
    print(f"\nSuccessfully restored {total_restored} lessons.")
    print(f"Added {xp_gained} XP to user.")

if __name__ == "__main__":
    restore_progress(14)
