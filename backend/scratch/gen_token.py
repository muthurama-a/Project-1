import os
import jwt
import time
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "thingual_jwt_secret_change_in_production")
JWT_ALGO = os.getenv("JWT_ALGORITHM", "HS256")

def create_token():
    payload = {
        "user_id": 1,
        "email": "test@thingual.com",
        "name": "Test User",
        "exp": time.time() + 3600
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)
    print(token)

if __name__ == "__main__":
    create_token()
