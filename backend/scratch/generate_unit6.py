import os
import json
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-flash-latest')

prompt = """
Generate a JSON file for an English learning app (A1 Level) for Unit 6. 
The Unit title is "Daily Routines & Telling Time".
There should be 10 lessons.
Each lesson should contain a mix of interactive tasks: learn_card, listen_repeat, mcq, fill_blank, sort_words, match_pairs, error_correction, dialogue, scenario_mcq, speaking, lesson_summary.
The structure MUST match this exact schema format:
{
  "unit": {
    "lessons": [
      {
        "lesson_id": "a1_unit6_lesson01",
        "unit": 6,
        "lesson_number": 1,
        "title": "Telling the Time",
        "description": "Learn how to ask and tell the time in English.",
        "tasks": [
          {
            "task_id": "t0601_01",
            "order": 1,
            "type": "learn_card",
            "title": "What time is it?",
            "content": { ... }
          }
        ]
      }
    ]
  }
}
Return ONLY a valid JSON object. No markdown formatting, no comments.
Ensure the JSON is perfectly valid and complete for all 10 lessons with at least 10 tasks each.
"""

print("Generating Unit 6 with Gemini...")
response = model.generate_content(prompt)

text = response.text
if text.startswith("```json"):
    text = text[7:]
if text.endswith("```"):
    text = text[:-3]
text = text.strip()

with open(os.path.join(os.path.dirname(__file__), "..", "utils", "unit6_lessons.json"), "w", encoding="utf-8") as f:
    f.write(text)

print("Generated unit6_lessons.json")
