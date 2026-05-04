"""Reset old units/lessons so the new 10-lesson-per-unit A1 curriculum re-seeds."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    db.execute(text("DELETE FROM user_lesson_completions"))
    db.execute(text("DELETE FROM velocity_logs"))
    db.execute(text("DELETE FROM flashcards"))
    db.execute(text("DELETE FROM lessons"))
    db.execute(text("DELETE FROM units"))
    db.commit()
    print("Done! Cleared all units, lessons, flashcards, velocity logs.")
    print("Next dashboard load will seed the new 50-lesson A1 curriculum!")
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()
