import json, os
from typing import List, Dict, Any

def generate_personalized_units(level: str) -> List[Dict[str, Any]]:
    if level == "A1":
        return _get_a1_units()
    try:
        import google.generativeai as genai
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key: return _get_a1_units()
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"Generate English learning JSON for CEFR {level}. 5 units, 10 lessons each. Return valid JSON array only."
        response = model.generate_content(prompt)
        text = response.text.replace('```json','').replace('```','').strip()
        return json.loads(text)
    except Exception as e:
        print(f"Gemini failed: {e}. Using A1 fallback.")
        return _get_a1_units()

def _make(title, ctype, order, text, vocab=None, examples=None, questions=None, prompt=None, tip=None, keywords=None, model_answer=None, flashcards=None):
    d = {"text": text}
    if vocab: d["vocabulary"] = vocab
    if examples: d["examples"] = examples
    if questions: d["questions"] = questions
    if prompt: d["prompt"] = prompt
    if tip: d["tip"] = tip
    if keywords: d["keywords"] = keywords
    if model_answer: d["model_answer"] = model_answer
    if flashcards: d["flashcards"] = flashcards
    return {"title": title, "content_type": ctype, "order": order, "content_data": d}

def _v(w, d, ex): return {"word": w, "definition": d, "example": ex}
def _q(question, opts, ans): return {"question": question, "options": opts, "answer": ans}
def _fc(f, b): return {"front": f, "back": b}

def _get_a1_units():
    return [
        _unit1(), _unit2(), _unit3(), _unit4(), _unit5()
    ]

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# UNIT 1 — First Steps in English (8 lessons from unit1_lessons.json)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _convert_json_task(task: dict, lesson_id: str) -> list:
    """Convert a single unit1_lessons.json task into one or more frontend-compatible task dicts."""
    t = task.get("type", "")
    tid = task.get("id", "t")
    title = task.get("title", "")
    instruction = task.get("instruction", "")
    out = []

    if t == "learn_flashcard":
        cards = task.get("content", {}).get("cards", [])
        out.append({"id": f"{tid}_tip", "type": "LEARNING_TIP",
                    "data": {"title": title, "explanation": instruction or "Study these key words.",
                             "example": f"{cards[0]['front']} — {cards[0]['back']}" if cards else ""}})
        for i, card in enumerate(cards[:4]):
            out.append({"id": f"{tid}_fc{i}", "type": "FLASHCARD",
                        "data": {"primary_text": card.get("front", ""), "secondary_text": card.get("back", "")}})

    elif t == "learn_grammar":
        c = task.get("content", {})
        pattern = c.get("pattern", "")
        note = c.get("note", "")
        examples = c.get("examples", [])
        explanation = f"{pattern}. {note}".strip(". ") if pattern else note
        example_str = " | ".join(examples[:3])
        out.append({"id": tid, "type": "LEARNING_TIP",
                    "data": {"title": title, "explanation": explanation, "example": example_str}})

    elif t == "learn_dialogue":
        dialogue = task.get("dialogue", [])
        example_str = " | ".join([f"{d['speaker']}: {d['line']}" for d in dialogue[:4]])
        out.append({"id": tid, "type": "LEARNING_TIP",
                    "data": {"title": title, "explanation": instruction or "Read this conversation.", "example": example_str}})

    elif t == "multiple_choice":
        for q in task.get("questions", [])[:2]:
            opts = q.get("options", [])
            correct_val = q.get("correct", "")
            ci = opts.index(correct_val) if correct_val in opts else 0
            out.append({"id": q.get("id", tid), "type": "MULTIPLE_CHOICE",
                        "data": {"question": q.get("prompt", ""), "options": opts,
                                 "correct_index": ci, "explanation": q.get("explanation", "")}})

    elif t == "match_pairs":
        pairs = task.get("pairs", [])[:4]
        out.append({"id": tid, "type": "MATCHING",
                    "data": {"pairs": [{"left": p["left"], "right": p["right"]} for p in pairs]}})

    elif t == "fill_in_blank":
        for q in task.get("questions", [])[:2]:
            sentence = q.get("sentence", "")
            answer = q.get("answer", "")
            out.append({"id": q.get("id", tid), "type": "TRANSLATE",
                        "data": {"source_text": sentence.replace("___", "___?"),
                                 "target_language": "English",
                                 "correct_variants": [answer]}})

    elif t == "reorder_sentence":
        for q in task.get("questions", [])[:2]:
            words = q.get("words", [])
            correct = q.get("correct", " ".join(words))
            out.append({"id": q.get("id", tid), "type": "SCRAMBLE",
                        "data": {"shuffled_words": words, "correct_sequence": correct}})

    elif t == "true_false":
        for q in task.get("questions", [])[:2]:
            statement = q.get("statement", "")
            answer = q.get("answer", True)
            ci = 0 if answer is True else 1
            out.append({"id": q.get("id", tid), "type": "MULTIPLE_CHOICE",
                        "data": {"question": statement, "options": ["True", "False"],
                                 "correct_index": ci, "explanation": q.get("explanation", "")}})

    elif t == "image_label":
        for q in task.get("questions", [])[:2]:
            opts = q.get("options", [])
            correct_val = q.get("correct", opts[0] if opts else "")
            ci = opts.index(correct_val) if correct_val in opts else 0
            out.append({"id": q.get("id", tid), "type": "MULTIPLE_CHOICE",
                        "data": {"question": q.get("image_description", q.get("context", title)),
                                 "options": opts, "correct_index": ci}})

    elif t in ("speaking_prompt", "speaking_roleplay"):
        chars = task.get("characters", [])
        prompts = task.get("prompts", [])
        if chars:
            script = chars[0].get("line", "")
        elif prompts:
            script = prompts[0] if isinstance(prompts, list) else str(prompts)
        else:
            script = task.get("prompt", instruction or "Speak naturally.")
        out.append({"id": tid, "type": "SPEAKING",
                    "data": {"script": script, "difficulty_threshold": 0.8}})

    elif t == "error_correction":
        for q in task.get("questions", [])[:2]:
            sentence = q.get("sentence", "")
            correction = q.get("corrected", q.get("correction", sentence))
            explanation = q.get("explanation", f"Correct: {correction}")
            out.append({"id": q.get("id", tid), "type": "ERROR_CORRECTION",
                        "data": {"sentence": sentence,
                                 "question": "Which is the correct version?",
                                 "options": [sentence, correction],
                                 "correct_index": 1,
                                 "explanation": explanation}})

    elif t == "vocabulary_select":
        for q in task.get("questions", [])[:2]:
            opts = q.get("options", [])
            correct_val = q.get("correct", "")
            ci = opts.index(correct_val) if correct_val in opts else 0
            out.append({"id": q.get("id", tid), "type": "MULTIPLE_CHOICE",
                        "data": {"question": q.get("description", ""), "options": opts, "correct_index": ci}})

    elif t == "dialogue_complete":
        for entry in task.get("dialogue", []):
            opts = entry.get("options")
            if opts:
                correct_val = entry.get("correct", opts[0])
                ci = opts.index(correct_val) if correct_val in opts else 0
                out.append({"id": tid, "type": "MULTIPLE_CHOICE",
                            "data": {"question": f"What is the best reply? ({title})",
                                     "options": opts, "correct_index": ci,
                                     "explanation": entry.get("explanation", "")}})
                break

    elif t in ("negative_form", "yes_no_questions"):
        c = task.get("content", {})
        note = c.get("note", "")
        if note:
            out.append({"id": f"{tid}_tip", "type": "LEARNING_TIP",
                        "data": {"title": title, "explanation": note, "example": ""}})
        for q in c.get("questions", [])[:2]:
            answer = q.get("answer", "")
            words = answer.split() if answer else []
            positive = q.get("positive", q.get("statement", ""))
            action_text = "Make it negative" if t == "negative_form" else "Make it a question"
            out.append({"id": q.get("id", tid), "type": "SENTENCE_BUILDER",
                        "data": {"prompt": f'{action_text}: "{positive}"',
                                 "options": words, "correct_answer": answer}})

    elif t == "writing":
        example = task.get("example_output", "")
        out.append({"id": tid, "type": "LISTENING",
                    "data": {"correct_answer": example,
                             "prompt": instruction}})

    elif t == "reading_comprehension":
        for q in task.get("questions", [])[:2]:
            out.append({"id": q.get("id", tid), "type": "TRANSLATE",
                        "data": {"source_text": q.get("question", ""),
                                 "target_language": "English",
                                 "correct_variants": [q.get("answer", "")]}})

    elif t in ("learn_card", "mcq", "scenario_mcq", "fill_blank", "sort_words", "match_pairs", "speaking", "listen_repeat", "error_correction", "family_tree", "lesson_summary"):
        # These are already in the "professional" new format — pass through
        # but ensure they have an id
        if "id" not in task and "task_id" in task:
            task["id"] = task["task_id"]
        out.append(task)

    elif t == "unit_quiz":
        unit_label = f"Unit {lesson_id.split('_')[1].replace('unit', '')}" if '_' in lesson_id else "Unit 1"
        for q in task.get("questions", [])[:3]:
            opts = q.get("options", [])
            correct_val = q.get("correct", opts[0] if opts else "")
            ci = opts.index(correct_val) if correct_val in opts else 0
            out.append({"id": q.get("id", tid), "type": "REVIEW",
                        "data": {"origin": unit_label,
                                 "question": q.get("prompt", ""),
                                 "options": opts, "correct_index": ci}})

    elif t == "unit_completion":
        unit_label = f"Unit {lesson_id.split('_')[1].replace('unit', '')}" if '_' in lesson_id else "Unit 1"
        skills = task.get("skills_unlocked", [f"{unit_label} Complete!"])
        out.append({"id": tid, "type": "REVIEW",
                    "data": {"origin": unit_label,
                             "question": f"What have you mastered in {unit_label}?",
                             "options": skills[:4] if len(skills) >= 4 else skills + ["Keep going!"] * (4 - len(skills)),
                             "correct_index": 0}})

    return out


def _build_unit1_lessons_from_json() -> list:
    """Load unit1_lessons.json and convert to interactive lesson format."""
    json_path = os.path.join(os.path.dirname(__file__), "unit1_lessons.json")
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"[lesson_generator] Could not load unit1_lessons.json: {e}")
        return []

    lessons_json = data.get("unit", {}).get("lessons", [])
    result = []

    for lesson in lessons_json:
        lid = lesson.get("id", "L?")
        order = lesson.get("order", 1)
        title = lesson.get("title", "Lesson")
        description = lesson.get("description", "")
        all_tasks = []

        for task in lesson.get("tasks", []):
            converted = _convert_json_task(task, lid)
            all_tasks.extend(converted)

        # Assign sequential IDs
        for i, t in enumerate(all_tasks):
            t["id"] = i + 1

        result.append({
            "title": title,
            "content_type": "interactive",
            "order": order,
            "content_data": {
                "metadata": {
                    "lesson_id": f"A1_U1_{lid}",
                    "unit_number": 1,
                    "lesson_title": title,
                    "total_tasks": len(all_tasks)
                },
                "content_manifest": {
                    "vocabulary": [],
                    "grammar_point": description
                },
                "tasks": all_tasks
            }
        })

    return result


def _unit1():
    lessons = _build_unit1_lessons_from_json()
    return {
        "title": "First Steps in English",
        "description": "Greetings to Daily Life — master the core of everyday English.",
        "level": "A1", "order": 1, "icon": "👋",
        "lessons": lessons
    }


def _build_unit2_lessons_from_json() -> list:
    json_path = os.path.join(os.path.dirname(__file__), "unit2_lessons.json")
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"[lesson_generator] Could not load unit2_lessons.json: {e}")
        return []

    lessons_json = data.get("unit", {}).get("lessons", [])
    result = []

    for lesson in lessons_json:
        lid = lesson.get("lesson_id", lesson.get("id", "L?"))
        order = lesson.get("order", lesson.get("lesson_number", 1))
        title = lesson.get("title", "Lesson")
        description = lesson.get("description", "")
        all_tasks = lesson.get("tasks", [])

        # Assign sequential IDs if needed, but original JSON already has task_id.
        for i, t in enumerate(all_tasks):
            if "id" not in t:
                t["id"] = t.get("task_id", i + 1)

        converted_tasks = []
        for t in all_tasks:
            converted_tasks.extend(_convert_json_task(t, lid))

        result.append({
            "title": title,
            "content_type": "interactive",
            "order": order,
            "content_data": {
                "metadata": {
                    "lesson_id": lid,
                    "unit_number": 2,
                    "lesson_title": title,
                    "total_tasks": len(converted_tasks)
                },
                "content_manifest": {
                    "vocabulary": [],
                    "grammar_point": description
                },
                "tasks": converted_tasks
            }
        })

    return result


def _unit2():
    lessons = _build_unit2_lessons_from_json()
    return {
        "title": "Food, Taste & Ordering",
        "description": "Learn vocabulary for food and drink, express preferences, and practise ordering politely.",
        "level": "A1", "order": 2, "icon": "🛒",
        "lessons": lessons
    }

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# UNIT 3
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def _build_unit3_lessons_from_json() -> list:
    json_path = os.path.join(os.path.dirname(__file__), "unit3_lessons.json")
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"[lesson_generator] Could not load unit3_lessons.json: {e}")
        return []

    if "lessons" in data:
        lessons_json = data["lessons"]
    elif "unit" in data and isinstance(data["unit"], dict):
        lessons_json = data["unit"].get("lessons", [])
    else:
        lessons_json = []

    result = []

    for lesson in lessons_json:
        lid = lesson.get("lesson_id", lesson.get("id", "L?"))
        order = lesson.get("order", lesson.get("lesson_number", 1))
        title = lesson.get("title", "Lesson")
        description = lesson.get("description", "")
        all_tasks = lesson.get("tasks", [])

        # Assign sequential IDs if needed
        for i, t in enumerate(all_tasks):
            if "id" not in t:
                t["id"] = t.get("task_id", i + 1)

        converted_tasks = []
        for t in all_tasks:
            converted_tasks.extend(_convert_json_task(t, lid))

        result.append({
            "title": title,
            "content_type": "interactive",
            "order": order,
            "content_data": {
                "metadata": {
                    "lesson_id": lid,
                    "unit_number": 3,
                    "lesson_title": title,
                    "total_tasks": len(converted_tasks)
                },
                "content_manifest": {
                    "vocabulary": [],
                    "grammar_point": description
                },
                "tasks": converted_tasks
            }
        })

    return result

def _unit3():
    lessons = _build_unit3_lessons_from_json()
    return {
        "title": "Daily Life & Surroundings",
        "description": "Talk about your body, clothes, feelings, and the home you live in.",
        "level": "A1", "order": 3, "icon": "🏠",
        "lessons": lessons
    }

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# UNIT 4 — Food, Shopping & Likes (10 lessons)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def _unit4():
    return {
        "title": "Food, Shopping & Likes",
        "description": "Order food, shop at the market, and express preferences.",
        "level": "A1", "order": 4, "icon": "🛒",
        "lessons": [
            _make("Food Vocabulary", "theory", 1,
                "Common foods: rice, bread, milk, water, tea, coffee, apple, banana, egg, chicken. Meals: breakfast, lunch, dinner.",
                vocab=[_v("Rice","A staple grain food","I eat rice for lunch."), _v("Bread","Baked flour food","I have bread for breakfast."), _v("Milk","White dairy drink","I drink milk every day."), _v("Apple","A round fruit","I eat an apple."), _v("Egg","From a chicken","I eat two eggs."), _v("Water","Clear liquid to drink","Can I have water?")],
                examples=["I eat rice and chicken for lunch.", "She drinks milk in the morning.", "We have bread and eggs for breakfast."],
                flashcards=[_fc("Rice","Staple grain food"), _fc("Bread","Baked food"), _fc("Milk","White dairy drink"), _fc("Water","Clear drinking liquid")]),

            _make("Drinks & Beverages", "theory", 2,
                "Common drinks: water, milk, tea, coffee, juice. 'I want ___', 'Can I have ___?', 'I would like ___.'",
                vocab=[_v("Tea","Hot leaf drink","I drink tea."), _v("Coffee","Hot caffeine drink","One coffee, please."), _v("Juice","Fruit drink","Orange juice, please."), _v("I would like","Polite request","I would like a cup of tea.")],
                examples=["I would like a cup of tea.", "Can I have some water?", "Two coffees, please."],
                flashcards=[_fc("Tea","Hot leaf drink"), _fc("Coffee","Caffeine drink"), _fc("I would like","Polite way to ask")]),

            _make("Ordering Food", "speaking", 3,
                "Practice ordering at a restaurant.",
                prompt="Say: 'Hello! I would like rice and chicken, please. And a glass of water. Thank you!'",
                tip="Use 'please' and 'thank you' — it's polite!", keywords=["would like","please","thank you","water"],
                model_answer="Hello! I would like rice and chicken, please. And a glass of water. Thank you!"),

            _make("Likes & Dislikes", "theory", 4,
                "'I like ___' for things you enjoy. 'I don't like ___' for things you dislike. 'Do you like ___?' to ask others.",
                vocab=[_v("I like","Express preference","I like apples."), _v("I don't like","Express dislike","I don't like coffee."), _v("Do you like?","Ask preference","Do you like tea?"), _v("Favorite","Most liked","My favorite food is rice.")],
                examples=["I like chocolate.", "I don't like onions.", "Do you like pizza?", "My favorite fruit is mango."],
                flashcards=[_fc("I like","Show what you enjoy"), _fc("I don't like","Show what you dislike"), _fc("Do you like?","Ask someone's preference")]),

            _make("Food & Likes Quiz", "quiz", 5,
                "Test your food vocabulary and likes/dislikes.",
                questions=[
                    _q("How do you politely order?", ["Give me!","I want now!","I would like ___, please","Hey! Food!"], "I would like ___, please"),
                    _q("'I ___ like coffee' — I dislike it", ["do","am","don't","is"], "don't"),
                    _q("Which is a fruit?", ["Rice","Bread","Apple","Egg"], "Apple"),
                    _q("Which is a drink?", ["Chicken","Rice","Tea","Bread"], "Tea")
                ]),

            _make("At the Market", "theory", 6,
                "Shopping phrases: 'How much is this?', 'It is 50 rupees.', 'I want 1 kilo of ___', 'That is too expensive.'",
                vocab=[_v("How much?","Ask the price","How much is this?"), _v("Expensive","Costs a lot","That is too expensive."), _v("Cheap","Low cost","This is very cheap."), _v("Buy","Purchase something","I want to buy apples.")],
                examples=["How much is this mango?", "It is 30 rupees.", "That is too expensive!", "I want to buy 2 kilos of rice."],
                flashcards=[_fc("How much?","Ask the price"), _fc("Expensive","High price"), _fc("Cheap","Low price")]),

            _make("Pronunciation: Food Words", "speaking", 7,
                "Practice pronouncing food vocabulary.",
                prompt="Repeat: Rice. Bread. Milk. Water. Tea. Coffee. Apple. Banana. Chicken. Egg. Juice. Please. Thank you.",
                tip="'Juice' rhymes with 'goose'. 'Bread' rhymes with 'red'.",
                keywords=["rice","bread","milk","water","tea","coffee","apple"],
                model_answer="Rice. Bread. Milk. Water. Tea. Coffee. Apple. Banana. Chicken. Egg. Juice. Please. Thank you."),

            _make("Reading: At a Restaurant", "theory", 8,
                "Read this conversation:\n\nWaiter: Good evening! What would you like?\nMeera: I would like rice and dal, please.\nWaiter: And to drink?\nMeera: A glass of mango juice, please.\nWaiter: Sure! Anything else?\nMeera: No, thank you.\nWaiter: Your total is 150 rupees.",
                examples=["What would you like?", "I would like rice and dal, please.", "A glass of mango juice, please.", "No, thank you."],
                flashcards=[_fc("What would you like?","Waiter's question"), _fc("Anything else?","Asking for more orders")]),

            _make("Sentence Building: Food", "quiz", 9,
                "Build correct sentences about food and shopping.",
                questions=[
                    _q("Complete: 'I ___ like ice cream.'", ["am","do","have","is"], "do"),
                    _q("'Can I ___ some water?' — polite request", ["eat","go","have","play"], "have"),
                    _q("'___ much is this?' — ask price", ["What","Who","How","Where"], "How"),
                    _q("Complete: 'My ___ food is biryani.'", ["good","nice","big","favorite"], "favorite")
                ]),

            _make("Unit 4 Review", "quiz", 10,
                "Final review of Food, Shopping & Likes.",
                questions=[
                    _q("Which word means 'costs a lot'?", ["Cheap","Free","Expensive","Small"], "Expensive"),
                    _q("'I ___ like fish' means you dislike fish", ["do","don't","am","is"], "don't"),
                    _q("A polite way to order is:", ["Give me food!","I would like ___, please","I want it now","Hey!"], "I would like ___, please"),
                    _q("Which is NOT a drink?", ["Tea","Juice","Water","Bread"], "Bread")
                ])
        ]
    }

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# UNIT 5 — Family & Describing People (10 lessons)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def _unit5():
    return {
        "title": "Family & Describing People",
        "description": "Talk about family members and describe people's appearance.",
        "level": "A1", "order": 5, "icon": "👨‍👩‍👧‍👦",
        "lessons": [
            _make("Family Members", "theory", 1,
                "Family words: mother (mom), father (dad), brother, sister, grandfather, grandmother, uncle, aunt, cousin. 'This is my ___.'",
                vocab=[_v("Mother","Female parent","My mother is a teacher."), _v("Father","Male parent","My father is a doctor."), _v("Brother","Male sibling","I have one brother."), _v("Sister","Female sibling","My sister is 12 years old."), _v("Grandfather","Father's father","My grandfather is 70.")],
                examples=["This is my mother.", "I have two brothers and one sister.", "My grandmother lives in Chennai."],
                flashcards=[_fc("Mother","Mom / female parent"), _fc("Father","Dad / male parent"), _fc("Brother","Male sibling"), _fc("Sister","Female sibling")]),

            _make("Extended Family", "theory", 2,
                "Extended family: uncle (parent's brother), aunt (parent's sister), cousin (uncle/aunt's child), nephew, niece.",
                vocab=[_v("Uncle","Parent's brother","My uncle lives in Delhi."), _v("Aunt","Parent's sister","My aunt is very kind."), _v("Cousin","Uncle/aunt's child","I have 5 cousins.")],
                examples=["My uncle is a teacher.", "I visit my aunt on weekends.", "My cousin is my age."],
                flashcards=[_fc("Uncle","Parent's brother"), _fc("Aunt","Parent's sister"), _fc("Cousin","Uncle/aunt's child")]),

            _make("Talking About Family", "speaking", 3,
                "Practice introducing your family.",
                prompt="Say: 'I have a big family. My father is [job]. My mother is [job]. I have [number] brothers and [number] sisters.'",
                tip="Use 'have' with I/you/we/they. Use 'has' with he/she/it.",
                keywords=["father","mother","brother","sister","family"],
                model_answer="I have a big family. My father is an engineer. My mother is a teacher. I have one brother and two sisters."),

            _make("Describing Appearance", "theory", 4,
                "Describe how people look: tall/short, young/old, thin/fat. Hair: long/short, black/brown/blonde. Eyes: brown/blue/green. 'He is tall. She has long black hair.'",
                vocab=[_v("Tall","High height","He is tall."), _v("Short","Low height","She is short."), _v("Young","Not old","The baby is young."), _v("Old","Not young","My grandfather is old."), _v("Long hair","Hair that is lengthy","She has long hair."), _v("Short hair","Hair that is brief","He has short hair.")],
                examples=["My father is tall.", "My sister has long black hair.", "My grandmother has brown eyes.", "He is young and thin."],
                flashcards=[_fc("Tall","Great height"), _fc("Short","Small height"), _fc("Long hair","Lengthy hair"), _fc("Young","Not old")]),

            _make("Family & Description Quiz", "quiz", 5,
                "Test your family and description vocabulary.",
                questions=[
                    _q("Your mother's brother is your ___", ["cousin","uncle","nephew","grandfather"], "uncle"),
                    _q("Complete: 'She ___ long hair.'", ["is","are","has","have"], "has"),
                    _q("Opposite of 'tall' is ___", ["big","old","short","thin"], "short"),
                    _q("Your father's mother is your ___", ["aunt","sister","mother","grandmother"], "grandmother")
                ]),

            _make("Personality Words", "theory", 6,
                "Describe personality: kind, happy, funny, friendly, quiet, smart, brave, shy, honest, lazy.",
                vocab=[_v("Kind","Nice and caring","My mother is kind."), _v("Funny","Makes people laugh","My brother is funny."), _v("Friendly","Easy to talk to","She is very friendly."), _v("Smart","Intelligent","He is very smart."), _v("Shy","Quiet around new people","The new student is shy.")],
                examples=["My father is kind and honest.", "She is funny and friendly.", "He is smart but shy."],
                flashcards=[_fc("Kind","Nice/caring"), _fc("Funny","Makes people laugh"), _fc("Smart","Intelligent"), _fc("Shy","Quiet around strangers")]),

            _make("Pronunciation: Family Words", "speaking", 7,
                "Practice pronouncing family and description words.",
                prompt="Repeat: Mother. Father. Brother. Sister. Tall. Short. Young. Old. Kind. Funny. Smart.",
                tip="'Brother' — the 'th' sound needs tongue between teeth. Practice: bro-THER.",
                keywords=["mother","father","brother","sister","tall","short"],
                model_answer="Mother. Father. Brother. Sister. Tall. Short. Young. Old. Kind. Funny. Smart."),

            _make("Reading: Meet My Family", "theory", 8,
                "Read about Anita's family:\n\nMy name is Anita. I have a big family. My father is tall and kind. He is a doctor. My mother is short and funny. She is a teacher. I have one brother — his name is Rahul. He is 15 years old and very smart. My sister Priya is 8. She is shy but very kind. My grandmother lives with us. She is old but very happy.",
                examples=["My father is tall and kind.", "My mother is short and funny.", "He is 15 years old and very smart.", "She is shy but very kind."],
                flashcards=[_fc("He is tall","Describing a male"), _fc("She is kind","Describing personality")]),

            _make("Sentence Building: People", "quiz", 9,
                "Build correct sentences about family and people.",
                questions=[
                    _q("Complete: 'I ___ two sisters.'", ["am","is","has","have"], "have"),
                    _q("Complete: 'My mother ___ kind.'", ["have","has","is","are"], "is"),
                    _q("Which describes personality?", ["Tall","Brown","Friendly","Long"], "Friendly"),
                    _q("'He ___ short black hair.'", ["is","are","has","have"], "has")
                ]),

            _make("Unit 5 Review", "quiz", 10,
                "Final review of Family & Describing People.",
                questions=[
                    _q("Your parent's sister is your ___", ["cousin","grandmother","aunt","niece"], "aunt"),
                    _q("Opposite of 'young' is ___", ["short","small","old","thin"], "old"),
                    _q("'She is ___' — which describes personality?", ["tall","smart","short","long"], "smart"),
                    _q("'I ___ a big family' — fill in:", ["am","is","has","have"], "have")
                ])
        ]
    }
