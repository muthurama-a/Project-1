import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import Unit, Lesson, UserLessonCompletion, User

def main():
    db = SessionLocal()
    user_id = 14
    
    user = db.query(User).filter(User.id == user_id).first()
    print(f"User: {user.name if user else 'Not found'} (ID: {user_id})")
    
    completions = db.query(UserLessonCompletion).filter(UserLessonCompletion.user_id == user_id).all()
    print(f"Total completed lessons for user: {len(completions)}")
    
    # Print the completed lessons and their units
    for c in completions:
        lesson = db.query(Lesson).filter(Lesson.id == c.lesson_id).first()
        if lesson:
            unit = db.query(Unit).filter(Unit.id == lesson.unit_id).first()
            print(f"Completed Lesson ID {lesson.id} -> Unit {unit.id if unit else 'None'} ({unit.title if unit else 'None'} - {unit.level if unit else 'None'})")
        else:
            print(f"Completed Lesson ID {c.lesson_id} -> Lesson not found in DB!")
            
    print("\nAll A1 Units and Lessons currently in DB:")
    a1_units = db.query(Unit).filter(Unit.level == 'A1').order_by(Unit.order).all()
    for u in a1_units:
        lessons = db.query(Lesson).filter(Lesson.unit_id == u.id).all()
        print(f"Unit {u.id} - {u.title} (Order {u.order}): {len(lessons)} lessons")
        for l in lessons[:2]:
            print(f"  Lesson {l.id} - {l.title}")
        if len(lessons) > 2:
            print(f"  ... and {len(lessons) - 2} more")

if __name__ == "__main__":
    main()
