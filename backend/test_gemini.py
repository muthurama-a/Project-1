import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
print(f"API Key: {os.getenv('GEMINI_API_KEY')[:10]}...")
print("Successfully imported google.generativeai")

genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(m.name)
