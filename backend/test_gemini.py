import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
print(f"API Key: {os.getenv('GEMINI_API_KEY')[:10]}...")
print("Successfully imported google.generativeai")
