import json
import os

lessons = []
for i in range(1, 11):
    lesson_id = f"a1_unit6_lesson{i:02d}"
    title = f"Daily Routine Part {i}"
    
    tasks = [
        {
            "task_id": f"t06{i:02d}_01",
            "order": 1,
            "type": "learn_card",
            "category": "vocabulary",
            "title": f"Wake up & Morning {i}",
            "content": {
                "explanation": "Let's learn some morning routine verbs.",
                "structure": "I wake up at 7 AM.",
                "examples": [
                    {"sentence": "I brush my teeth.", "note": "Every morning"},
                    {"sentence": "She eats breakfast.", "note": "At 8 AM"}
                ]
            }
        },
        {
            "task_id": f"t06{i:02d}_02",
            "order": 2,
            "type": "mcq",
            "category": "vocabulary",
            "title": "Select the correct verb",
            "content": {
                "question": "I ___ my face in the morning.",
                "options": ["wash", "watch", "walk", "wake"],
                "correct_index": 0,
                "explanation": "Wash is the action for cleaning your face."
            }
        },
        {
            "task_id": f"t06{i:02d}_03",
            "order": 3,
            "type": "fill_blank",
            "category": "grammar",
            "title": "Fill the blanks",
            "content": {
                "sentence": "I ___ up at 6 AM. Then I ___ breakfast.",
                "blanks": [
                    {"position": 1, "options": ["wake", "woke", "wakes"], "correct": "wake"},
                    {"position": 2, "options": ["eat", "eats", "ate"], "correct": "eat"}
                ],
                "explanation": "Present simple for routines: I wake, I eat."
            }
        },
        {
            "task_id": f"t06{i:02d}_04",
            "order": 4,
            "type": "sort_words",
            "category": "grammar",
            "title": "Build the sentence",
            "content": {
                "instruction": "Rearrange to make a routine sentence.",
                "words": ["I", "always", "drink", "coffee", "morning", "in", "the"],
                "correct_sentence": "I always drink coffee in the morning.",
                "explanation": "Subject + adverb + verb + object + time."
            }
        },
        {
            "task_id": f"t06{i:02d}_05",
            "order": 5,
            "type": "lesson_summary",
            "category": "review",
            "title": "Lesson complete!",
            "content": {
                "what_you_learned": [
                    "Morning routine verbs",
                    "Present simple for habits"
                ],
                "next_lesson": f"a1_unit6_lesson{i+1:02d}" if i < 10 else "unit_complete",
                "next_lesson_title": f"Daily Routine Part {i+1}" if i < 10 else "Unit Complete"
            }
        }
    ]
    
    lessons.append({
        "lesson_id": lesson_id,
        "unit": 6,
        "lesson_number": i,
        "level": "A1",
        "title": title,
        "description": "Learn to talk about your daily habits.",
        "estimated_minutes": 15,
        "xp_reward": 100,
        "tasks": tasks
    })

data = {
    "unit": {
        "unit_number": 6,
        "lessons": lessons
    }
}

path = os.path.join(os.path.dirname(__file__), "..", "utils", "unit6_lessons.json")
with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"Created {path}")
