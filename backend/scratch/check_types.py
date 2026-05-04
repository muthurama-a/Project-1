import json
import os

types = set()
for file in ["utils/unit4_lessons.json", "utils/unit5_lessons.json"]:
    with open(file, "r", encoding="utf-8") as f:
        data = json.load(f)
        if "unit" in data and "lessons" in data["unit"]:
            lessons = data["unit"]["lessons"]
        elif "lessons" in data:
            lessons = data["lessons"]
        else:
            lessons = []
        for l in lessons:
            for t in l.get("tasks", []):
                types.add(t.get("type"))

print("All task types:", types)
