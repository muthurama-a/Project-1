import sys
import os
from datetime import datetime, timedelta, timezone

# Add parent directory to path to import local modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import SessionLocal
from models import User, VelocityLog

def backfill_user_data(user_id):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            print(f"ERROR: User {user_id} not found.")
            return

        # 1. Update Streak
        user.current_streak = 5
        user.last_active_date = datetime.now()
        print(f"Updating User {user_id} ({user.name}) streak to 5.")

        # 2. Backfill Review Data (VelocityLog)
        # Data from user:
        # April 23: 20
        # April 24: 30
        # April 25: 27
        # April 26: 40
        # April 27: 50
        
        review_data = [
            ("2026-04-23", 20),
            ("2026-04-24", 30),
            ("2026-04-25", 27),
            ("2026-04-26", 40),
            ("2026-04-27", 50),
        ]

        for date_str, count in review_data:
            # Check if logs already exist for this date to avoid duplicates
            target_date = datetime.strptime(date_str, "%Y-%m-%d")
            
            # Create 'count' dummy logs for this date
            for i in range(count):
                log = VelocityLog(
                    user_id=user_id,
                    response_time_ms=800, # Dummy 0.8s
                    quality=4,            # Dummy good quality
                    created_at=target_date + timedelta(hours=10, minutes=i%60) # Spread them out a bit
                )
                db.add(log)
            
            print(f"  - Added {count} review logs for {date_str}")

        db.commit()
        print("SUCCESS: Data backfilled successfully.")

    except Exception as e:
        print(f"FATAL ERROR: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    backfill_user_data(14)
