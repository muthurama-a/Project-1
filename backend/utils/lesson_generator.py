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
# UNIT 1 — Greetings & Introductions (10 lessons)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def _unit1():
    return {
        "title": "Greetings & Introductions",
        "description": "Say hello, introduce yourself, and meet new people.",
        "level": "A1", "order": 1, "icon": "👋",
        "lessons": [
            _make("Hello & Goodbye", "theory", 1,
                "Greetings are the first step. Use 'Hello' or 'Hi' anytime. 'Good morning' before noon, 'Good afternoon' until 6 PM, 'Good evening' after 6 PM. To say farewell: 'Goodbye', 'Bye', 'See you later'.",
                vocab=[_v("Hello","A standard greeting","Hello, how are you?"), _v("Hi","Informal greeting","Hi there!"), _v("Good morning","Before noon greeting","Good morning, class!"), _v("Goodbye","Farewell","Goodbye, see you!"), _v("See you later","Informal farewell","See you later!")],
                examples=["Hello, how are you?", "Good morning, everyone!", "Goodbye, have a nice day!"],
                flashcards=[_fc("Hello","A greeting used anytime"), _fc("Good morning","Before 12 PM"), _fc("Goodbye","Said when leaving")]),

            _make("Introducing Yourself", "theory", 2,
                "To introduce yourself say: 'My name is ___.' or 'I am ___.' Tell where you are from: 'I am from ___.' End with 'Nice to meet you!'",
                vocab=[_v("My name is","Used to tell your name","My name is Priya."), _v("I am from","Tell your origin","I am from Chennai."), _v("Nice to meet you","First meeting phrase","Nice to meet you, Tom!")],
                examples=["Hello! My name is Raj. I am from Mumbai. Nice to meet you!", "Hi, I am Sara. I am from Delhi."],
                flashcards=[_fc("My name is ___","Introduce your name"), _fc("Nice to meet you","Said when meeting someone new")]),

            _make("Greetings Practice", "speaking", 3,
                "Practice greeting and introducing yourself out loud.",
                prompt="Say: 'Hello! My name is [your name]. I am from [your city]. Nice to meet you!'",
                tip="Speak slowly and clearly. Smile when you greet!", keywords=["name","from","nice","meet"],
                model_answer="Hello! My name is Priya. I am from Chennai. Nice to meet you!"),

            _make("Asking About Others", "theory", 4,
                "To learn about someone, ask: 'What is your name?', 'Where are you from?', 'How are you?' Answer 'How are you?' with 'I am fine, thank you.' or 'I am good.'",
                vocab=[_v("What is your name?","Ask someone's name","What is your name?"), _v("Where are you from?","Ask someone's origin","Where are you from?"), _v("How are you?","Ask about wellbeing","How are you today?"), _v("I am fine","Response to How are you","I am fine, thank you.")],
                examples=["What is your name? – My name is Raj.", "How are you? – I am fine, thank you!"],
                flashcards=[_fc("What is your name?","Ask for someone's name"), _fc("How are you?","Ask about someone's wellbeing")]),

            _make("Greetings Quiz", "quiz", 5,
                "Test your knowledge of greetings and introductions.",
                questions=[
                    _q("Which greeting is used in the morning?", ["Good night","Good morning","Good evening","Goodbye"], "Good morning"),
                    _q("How do you introduce your name?", ["I am from ___","My name is ___","How are you?","Goodbye"], "My name is ___"),
                    _q("What do you say when you meet someone new?", ["See you later","Good night","Nice to meet you","Goodbye"], "Nice to meet you"),
                    _q("'How are you?' — What is a good answer?", ["My name is Raj","I am fine, thank you","Goodbye","Good morning"], "I am fine, thank you")
                ]),

            _make("Polite Expressions", "theory", 6,
                "Polite words make conversations friendly. 'Please' when asking, 'Thank you' when receiving, 'Sorry' when apologizing, 'Excuse me' to get attention.",
                vocab=[_v("Please","Polite request word","Can I have water, please?"), _v("Thank you","Gratitude expression","Thank you very much!"), _v("Sorry","Apology word","Sorry, I am late."), _v("Excuse me","Get attention politely","Excuse me, where is the bus stop?"), _v("You're welcome","Response to thank you","You're welcome!")],
                examples=["Please sit down.", "Thank you for your help!", "Sorry, I don't understand.", "Excuse me, can you help me?"],
                flashcards=[_fc("Please","Used for polite requests"), _fc("Thank you","Express gratitude"), _fc("Sorry","Apologize"), _fc("Excuse me","Get someone's attention")]),

            _make("Pronunciation: Greetings", "speaking", 7,
                "Practice the pronunciation of common greeting words.",
                prompt="Repeat each word clearly: Hello. Good morning. Good afternoon. Good evening. Goodbye. Thank you. Please. Sorry.",
                tip="Focus on the stress: HEL-lo, good MOR-ning, THANK you.",
                keywords=["hello","morning","afternoon","evening","goodbye","thank","please","sorry"],
                model_answer="Hello. Good morning. Good afternoon. Good evening. Goodbye. Thank you. Please. Sorry."),

            _make("Reading: A Short Conversation", "theory", 8,
                "Read this conversation:\n\nAnna: Hello! My name is Anna. What is your name?\nBen: Hi Anna! My name is Ben. Nice to meet you.\nAnna: Nice to meet you too! Where are you from?\nBen: I am from London. And you?\nAnna: I am from Paris. How are you?\nBen: I am fine, thank you!",
                examples=["Hello! My name is Anna.", "Nice to meet you too!", "I am from London.", "I am fine, thank you!"],
                flashcards=[_fc("What is your name?","Ask someone's name"), _fc("Where are you from?","Ask someone's hometown")]),

            _make("Sentence Building", "quiz", 9,
                "Put together correct English sentences about greetings.",
                questions=[
                    _q("Complete: '___ to meet you!'", ["Good","Nice","Sorry","Please"], "Nice"),
                    _q("Complete: 'I ___ from India.'", ["is","are","am","be"], "am"),
                    _q("Which is correct?", ["My name are Raj","My name is Raj","My name am Raj","My name be Raj"], "My name is Raj"),
                    _q("What comes after 'Thank you'?", ["Sorry","Goodbye","You're welcome","Hello"], "You're welcome")
                ]),

            _make("Unit 1 Review", "quiz", 10,
                "Final review of Greetings & Introductions.",
                questions=[
                    _q("'Good evening' is used ___", ["before noon","after 6 PM","at midnight","anytime"], "after 6 PM"),
                    _q("How do you ask someone's name?", ["How are you?","Where are you from?","What is your name?","Goodbye"], "What is your name?"),
                    _q("'___, can you help me?' (polite)", ["Sorry","Excuse me","Goodbye","Hi"], "Excuse me"),
                    _q("Match: 'I am fine' answers ___", ["What is your name?","Where are you from?","How are you?","Goodbye"], "How are you?")
                ])
        ]
    }

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# UNIT 2 — Numbers, Colors & Descriptions (10 lessons)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def _unit2():
    return {
        "title": "Numbers, Colors & Descriptions",
        "description": "Count, name colors, and describe things around you.",
        "level": "A1", "order": 2, "icon": "🎨",
        "lessons": [
            _make("Numbers 1–10", "theory", 1,
                "Learn to count from 1 to 10: one, two, three, four, five, six, seven, eight, nine, ten.",
                vocab=[_v("One","The number 1","I have one book."), _v("Two","The number 2","Two cups of tea."), _v("Three","The number 3","Three cats."), _v("Five","The number 5","Five fingers."), _v("Ten","The number 10","Ten students in class.")],
                examples=["I have one brother.", "There are five apples.", "She is ten years old."],
                flashcards=[_fc("One","1"), _fc("Five","5"), _fc("Ten","10")]),

            _make("Numbers 11–20", "theory", 2,
                "Continue counting: eleven, twelve, thirteen, fourteen, fifteen, sixteen, seventeen, eighteen, nineteen, twenty.",
                vocab=[_v("Eleven","The number 11","Eleven players."), _v("Fifteen","The number 15","Fifteen minutes."), _v("Twenty","The number 20","Twenty rupees.")],
                examples=["I am fifteen years old.", "There are twenty chairs.", "The bus comes in eleven minutes."],
                flashcards=[_fc("Eleven","11"), _fc("Fifteen","15"), _fc("Twenty","20")]),

            _make("Numbers Practice", "speaking", 3,
                "Say the numbers out loud.",
                prompt="Count from 1 to 20: one, two, three, four, five, six, seven, eight, nine, ten, eleven, twelve, thirteen, fourteen, fifteen, sixteen, seventeen, eighteen, nineteen, twenty.",
                tip="Practice slowly first, then try faster!", keywords=["one","two","three"],
                model_answer="One, two, three, four, five, six, seven, eight, nine, ten, eleven, twelve, thirteen, fourteen, fifteen, sixteen, seventeen, eighteen, nineteen, twenty."),

            _make("Basic Colors", "theory", 4,
                "English has many color words. The basic colors are: red, blue, green, yellow, orange, purple, pink, black, white, brown.",
                vocab=[_v("Red","The color of fire","The apple is red."), _v("Blue","The color of sky","The sky is blue."), _v("Green","The color of leaves","The grass is green."), _v("Yellow","The color of sun","The sunflower is yellow."), _v("Black","The darkest color","My shoes are black."), _v("White","The lightest color","Snow is white.")],
                examples=["The car is red.", "I like blue.", "Her dress is green.", "The cat is black and white."],
                flashcards=[_fc("Red","Color of fire/apple"), _fc("Blue","Color of sky/ocean"), _fc("Green","Color of leaves/grass")]),

            _make("Colors Quiz", "quiz", 5,
                "Test your color knowledge.",
                questions=[
                    _q("What color is the sky?", ["Red","Green","Blue","Yellow"], "Blue"),
                    _q("What color are leaves?", ["Blue","Green","Red","White"], "Green"),
                    _q("What color is snow?", ["Black","Yellow","White","Green"], "White"),
                    _q("Complete: 'The banana is ___'", ["blue","red","yellow","green"], "yellow")
                ]),

            _make("Describing Size & Shape", "theory", 6,
                "Adjectives describe things. Size: big, small, tall, short. Shape: round, square, long. Use them before the noun: 'a big house', 'a small cat'.",
                vocab=[_v("Big","Large in size","A big elephant."), _v("Small","Little in size","A small bird."), _v("Tall","High in height","A tall building."), _v("Short","Low in height","A short boy."), _v("Round","Circle shape","A round ball.")],
                examples=["The house is big.", "She has a small dog.", "He is a tall man.", "The table is round."],
                flashcards=[_fc("Big","Large in size"), _fc("Small","Little/tiny"), _fc("Tall","High in height")]),

            _make("Pronunciation: Colors & Numbers", "speaking", 7,
                "Practice pronouncing colors and numbers clearly.",
                prompt="Say each word: Red. Blue. Green. Yellow. One. Two. Three. Big. Small. Tall.",
                tip="Pay attention to 'th' in three — tongue between teeth!",
                keywords=["red","blue","green","yellow","one","two","three","big","small","tall"],
                model_answer="Red. Blue. Green. Yellow. One. Two. Three. Big. Small. Tall."),

            _make("Describing Objects", "theory", 8,
                "Combine colors, sizes, and objects: 'a big red ball', 'a small green leaf'. The order is: size + color + noun.",
                vocab=[_v("Ball","Round toy","A big red ball."), _v("Book","Pages to read","A small blue book."), _v("Flower","A plant blossom","A pretty yellow flower.")],
                examples=["I have a big red ball.", "She reads a small blue book.", "There is a tall green tree."],
                flashcards=[_fc("a big red ball","Size + Color + Noun"), _fc("a small blue book","Size + Color + Noun")]),

            _make("Sentence Building: Descriptions", "quiz", 9,
                "Build correct descriptive sentences.",
                questions=[
                    _q("Which order is correct?", ["red big ball","big ball red","big red ball","ball big red"], "big red ball"),
                    _q("Complete: 'The elephant is ___'", ["small","big","short","thin"], "big"),
                    _q("How many is 'fifteen'?", ["5","10","15","20"], "15"),
                    _q("'___ is white' — what fits?", ["Grass","Sky","Snow","Leaf"], "Snow")
                ]),

            _make("Unit 2 Review", "quiz", 10,
                "Final review of Numbers, Colors & Descriptions.",
                questions=[
                    _q("What number comes after twelve?", ["Eleven","Fourteen","Thirteen","Fifteen"], "Thirteen"),
                    _q("Which is NOT a color?", ["Blue","Tall","Red","Green"], "Tall"),
                    _q("'A ___ cat' — which word describes size?", ["red","small","happy","fast"], "small"),
                    _q("What color is an orange?", ["Blue","Orange","Green","White"], "Orange")
                ])
        ]
    }

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# UNIT 3 — Daily Routines & Time (10 lessons)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def _unit3():
    return {
        "title": "Daily Routines & Time",
        "description": "Talk about your day, tell time, and learn daily verbs.",
        "level": "A1", "order": 3, "icon": "⏰",
        "lessons": [
            _make("Telling the Time", "theory", 1,
                "Use 'It is ___' to tell time. 'It is 8 o'clock.' For half: 'It is half past 3.' For quarters: 'It is quarter past / quarter to.'",
                vocab=[_v("O'clock","Exact hour","It is 9 o'clock."), _v("Half past","30 minutes after","It is half past 2."), _v("Quarter past","15 minutes after","It is quarter past 4."), _v("Quarter to","15 minutes before","It is quarter to 6.")],
                examples=["It is 7 o'clock.", "School starts at half past 8.", "It is quarter to 12."],
                flashcards=[_fc("O'clock","Exact hour time"), _fc("Half past","30 minutes after the hour")]),

            _make("Days of the Week", "theory", 2,
                "The 7 days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday. Weekend = Saturday and Sunday.",
                vocab=[_v("Monday","First day of the week","I go to school on Monday."), _v("Friday","Fifth day","Friday is my favorite day!"), _v("Sunday","Last day / rest day","We rest on Sunday."), _v("Weekend","Saturday and Sunday","I play cricket on weekends.")],
                examples=["Today is Monday.", "I play football on Saturday.", "School is closed on Sunday."],
                flashcards=[_fc("Monday","First weekday"), _fc("Weekend","Saturday & Sunday")]),

            _make("Days & Time Practice", "speaking", 3,
                "Practice saying days and times.",
                prompt="Say: 'Today is Monday. It is 9 o'clock. I go to school at half past 8. My favorite day is Friday.'",
                tip="Stress the day names: MON-day, TUES-day, WEDNES-day.",
                keywords=["monday","friday","o'clock","half past"],
                model_answer="Today is Monday. It is 9 o'clock. I go to school at half past 8. My favorite day is Friday."),

            _make("Daily Actions (Verbs)", "theory", 4,
                "Common daily verbs: wake up, eat, drink, go, come, sleep, read, write, play, study. Use 'I' + verb: 'I eat breakfast.'",
                vocab=[_v("Wake up","Stop sleeping","I wake up at 7."), _v("Eat","Consume food","I eat breakfast."), _v("Go","Move to a place","I go to school."), _v("Sleep","Rest at night","I sleep at 10 PM."), _v("Study","Learn something","I study English."), _v("Play","Do a game/sport","I play cricket.")],
                examples=["I wake up at 6 AM.", "She eats lunch at 1 PM.", "We go to school by bus.", "They play in the evening."],
                flashcards=[_fc("Wake up","Start your day"), _fc("Eat","Consume food"), _fc("Go","Move to a place"), _fc("Sleep","Rest at night")]),

            _make("Daily Routine Quiz", "quiz", 5,
                "Test your daily routine vocabulary.",
                questions=[
                    _q("What do you do first in the morning?", ["Sleep","Eat dinner","Wake up","Play"], "Wake up"),
                    _q("Which day comes after Monday?", ["Wednesday","Sunday","Tuesday","Friday"], "Tuesday"),
                    _q("'It is ___ past 3' means 3:30", ["quarter","half","full","ten"], "half"),
                    _q("What is the weekend?", ["Monday-Friday","Saturday-Sunday","Tuesday-Thursday","Only Sunday"], "Saturday-Sunday")
                ]),

            _make("My Morning Routine", "theory", 6,
                "A typical morning: 'I wake up at 7. I brush my teeth. I take a bath. I eat breakfast. I go to school at 8.' Use present simple for routines.",
                vocab=[_v("Brush teeth","Clean your teeth","I brush my teeth every morning."), _v("Take a bath","Wash your body","I take a bath before school."), _v("Breakfast","First meal","I eat breakfast at 7:30.")],
                examples=["I wake up at 7 AM.", "I brush my teeth and take a bath.", "I eat breakfast at 7:30.", "I go to school at 8 o'clock."],
                flashcards=[_fc("Brush my teeth","Clean teeth with a brush"), _fc("Take a bath","Wash the body"), _fc("Breakfast","Morning meal")]),

            _make("Pronunciation: Daily Words", "speaking", 7,
                "Practice pronouncing daily routine words.",
                prompt="Repeat: Wake up. Breakfast. Lunch. Dinner. School. Study. Monday. Tuesday. Wednesday. Thursday. Friday.",
                tip="'Wednesday' sounds like WENZ-day, not Wed-NES-day!",
                keywords=["wake","breakfast","lunch","dinner","school","study"],
                model_answer="Wake up. Breakfast. Lunch. Dinner. School. Study. Monday. Tuesday. Wednesday. Thursday. Friday."),

            _make("Reading: A Student's Day", "theory", 8,
                "Read about Ravi's day:\n\nRavi wakes up at 6:30 AM. He brushes his teeth and takes a bath. He eats breakfast at 7. He goes to school at 8 o'clock. He studies English and Maths. He eats lunch at 1 PM. He plays cricket at 4 PM. He eats dinner at 8 PM. He sleeps at 10 PM.",
                examples=["Ravi wakes up at 6:30 AM.", "He goes to school at 8 o'clock.", "He plays cricket at 4 PM.", "He sleeps at 10 PM."],
                flashcards=[_fc("Lunch","Afternoon meal"), _fc("Dinner","Evening meal")]),

            _make("Sentence Building: Routines", "quiz", 9,
                "Build correct sentences about daily routines.",
                questions=[
                    _q("Complete: 'I ___ breakfast at 7 AM.'", ["go","eat","sleep","play"], "eat"),
                    _q("Complete: 'She ___ to school by bus.'", ["eats","sleeps","goes","plays"], "goes"),
                    _q("What time expression means 3:15?", ["Half past 3","Quarter past 3","3 o'clock","Quarter to 3"], "Quarter past 3"),
                    _q("'I ___ up at 6 AM every day.'", ["eat","go","wake","play"], "wake")
                ]),

            _make("Unit 3 Review", "quiz", 10,
                "Final review of Daily Routines & Time.",
                questions=[
                    _q("How many days in a week?", ["5","6","7","10"], "7"),
                    _q("What does 'half past 9' mean?", ["9:00","9:15","9:30","9:45"], "9:30"),
                    _q("Which is a morning activity?", ["Sleep","Eat dinner","Wake up","Play cricket"], "Wake up"),
                    _q("'I ___ my teeth' — fill in:", ["eat","brush","go","play"], "brush")
                ])
        ]
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
