import json
import os

u4_path = r"c:\Users\acer\OneDrive\Documents\l2\frontend\public\a1_unit_4"
out_path_u4 = r"c:\Users\acer\OneDrive\Documents\l2\backend\utils\unit4_lessons.json"
out_path_u5 = r"c:\Users\acer\OneDrive\Documents\l2\backend\utils\unit5_lessons.json"
u5_in = r"c:\Users\acer\OneDrive\Documents\l2\frontend\public\a1_unit_5.json"

# Process Unit 4
lessons = []
for file in ["l01.json", "l02_to_l04.json", "l05_to_l08.json"]:
    with open(os.path.join(u4_path, file), "r", encoding="utf-8") as f:
        data = json.load(f)
        if isinstance(data, list):
            lessons.extend(data)
        elif isinstance(data, dict):
            if "unit" in data and isinstance(data["unit"], dict) and "lessons" in data["unit"]:
                lessons.extend(data["unit"]["lessons"])
            elif "lessons" in data and isinstance(data["lessons"], list):
                lessons.extend(data["lessons"])
            else:
                # It's a single lesson
                lessons.append(data)

with open(out_path_u4, "w", encoding="utf-8") as f:
    json.dump({"unit": {"lessons": lessons}}, f, indent=2)

# Process Unit 5 (just copy)
with open(u5_in, "r", encoding="utf-8") as f:
    data = json.load(f)
    
with open(out_path_u5, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"Unit 4 lessons combined: {len(lessons)}")
