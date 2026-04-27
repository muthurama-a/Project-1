import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import SessionLocal
from models import User
from datetime import datetime

def update_streak(user_id, streak_count):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.current_streak = streak_count
            # Use UTC for consistency if backend uses it, or local time if preferred.
            # Most PostgreSQL setups handle datetime objects well.
            user.last_active_date = datetime.now()
            db.commit()
            print(f"SUCCESS: Updated User {user_id} ({user.name}) streak to {streak_count}")
        else:
            print(f"ERROR: User with ID {user_id} not found.")
    except Exception as e:
        print(f"FATAL ERROR: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Target User ID 14 as requested
    update_streak(14, 5)
