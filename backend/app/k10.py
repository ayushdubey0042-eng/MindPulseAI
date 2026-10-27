INSTRUCTION_TEXT = "In the past 4 weeks:"

ANSWER_OPTIONS = {
    1: "None of the time",
    2: "A little of the time",
    3: "Some of the time",
    4: "Most of the time",
    5: "All of the time",
}

QUESTIONS = [
    {"id": 1, "text": "About how often did you feel tired out for no good reason?"},
    {"id": 2, "text": "About how often did you feel nervous?"},
    {"id": 3, "text": "About how often did you feel so nervous that nothing could calm you down?"},
    {"id": 4, "text": "About how often did you feel hopeless?"},
    {"id": 5, "text": "About how often did you feel restless or fidgety?"},
    {"id": 6, "text": "About how often did you feel so restless you could not sit still?"},
    {"id": 7, "text": "About how often did you feel depressed?"},
    {"id": 8, "text": "About how often did you feel that everything was an effort?"},
    {"id": 9, "text": "About how often did you feel so sad that nothing could cheer you up?"},
    {"id": 10, "text": "About how often did you feel worthless?"},
]


def validate_answers(answers):
    """Raise ValueError with a clear message if the answers are not usable."""
    expected = {q["id"] for q in QUESTIONS}

    seen = set()
    for answer in answers:
        if not isinstance(answer, dict):
            raise ValueError("Each answer must be an object with an id and value.")
        qid = answer.get("id")
        value = answer.get("value")
        if not isinstance(qid, int) or isinstance(qid, bool):
            raise ValueError(f"Question ids must be integers between 1 and 10 ({qid}).")
        if qid not in expected:
            raise ValueError(f"Unknown question id: {qid}.")
        if qid in seen:
            if len(seen) == 1 and len(answers) == 10:
                raise ValueError(f"Unknown question id: {qid}.")
            raise ValueError(f"Question {qid} was answered more than once.")
        if not isinstance(value, int) or isinstance(value, bool):
            raise ValueError(f"Answer values must be integers between 1 and 5 (question {qid}).")
        if not 1 <= value <= 5:
            raise ValueError(f"Answers must be between 1 and 5 (question {qid}).")
        seen.add(qid)

    if len(answers) != 10:
        raise ValueError("Please answer all 10 questions.")

    if seen != expected:
        missing = sorted(expected - seen)
        raise ValueError(f"Missing question ids: {missing}.")


def compute_score(answers):
    total = sum(int(answer["value"]) for answer in answers)
    return total


def score_to_band(score):
    if 10 <= score <= 15:
        return "low"
    if 16 <= score <= 21:
        return "moderate"
    if 22 <= score <= 29:
        return "high"
    if 30 <= score <= 50:
        return "very_high"
    raise ValueError(f"Score {score} is outside the K10 range 10-50.")


BAND_CONTENT = {
    "low": {
        "objective": "Maintain wellbeing and build protective factors that support ongoing resilience.",
        "themes": [
            "identifying what is working well",
            "reinforcing positive habits",
            "celebrating strengths and progress",
            "building awareness of early warning signs",
            "setting proactive wellbeing goals",
        ],
        "example_questions": [
            "What habits or routines are currently supporting your wellbeing?",
            "What helps you stay mentally and emotionally balanced when life becomes busy?",
            "What would you like to do more of to maintain your wellbeing?",
            "What early signs tell you that stress may be starting to build?",
        ],
        "recommended_features": [
            "Daily check-ins",
            "Wellness Centre activities",
            "Mood Calendar tracking and trend monitoring",
        ],
        "boundary": "none beyond the global rules.",
        "result_text": "Your responses suggest you are currently experiencing relatively low levels of distress. That is a good moment to notice what is working for you and keep building on it.",
        "label": "Low (likely well)",
    },
    "moderate": {
        "objective": "Increase awareness of contributing factors and strengthen coping strategies before distress escalates.",
        "themes": [
            "identifying stressors",
            "strengthening recovery behaviours",
            "establishing sustainable routines",
            "increasing self-monitoring",
            "exploring available support networks",
        ],
        "example_questions": [
            "What seems to be contributing most to your current stress levels?",
            "When do you notice these feelings most often?",
            "What aspects of your wellbeing have been easiest to neglect recently?",
            "What small changes could help create more recovery time in your week?",
        ],
        "recommended_features": [
            "Daily mood capture",
            "Mood Calendar and pattern identification",
            "Wellness Centre activities",
            "Support Connect resources",
        ],
        "boundary": "Do not attempt to analyse symptoms or explain possible mental health conditions.",
        "result_text": "Your responses suggest some signs of strain that may be starting to affect your wellbeing. Reflecting on what is contributing, and building in some recovery time, can help before things escalate.",
        "label": "Moderate distress",
    },
    "high": {
        "objective": "Create awareness of significant pressures, reduce overwhelm, and encourage connection with appropriate supports.",
        "themes": [
            "identifying major sources of pressure",
            "clarifying priorities",
            "reducing overload",
            "seeking support",
            "strengthening wellbeing practices",
        ],
        "example_questions": [
            "What currently feels most overwhelming or difficult to manage?",
            "Which demands are placing the greatest pressure on you right now?",
            "What responsibilities or expectations may need to be reviewed or adjusted?",
            "Who could provide practical or emotional support during this period?",
        ],
        "recommended_features": [
            "Mood tracking",
            "Wellness Centre resources",
            "Support Connect",
        ],
        "support_guidance": "gently encourage considering professional support options: a GP, a psychologist, the Employee Assistance Program (EAP), or other qualified health professionals.",
        "boundary": "Must NOT provide coping strategies as a substitute for professional help.",
        "result_text": "Your responses suggest elevated distress that may be affecting your energy, focus or day-to-day life. It can help to talk with someone who can support you, such as a GP, a psychologist, or your Employee Assistance Program (EAP), and Support Connect in MindPulse can help you find options.",
        "label": "High distress",
    },
    "very_high": {
        "objective": "Prioritise support-seeking and personal safety while remaining within a coaching scope.",
        "themes": [
            "encouraging connection with professional support",
            "identifying immediate sources of assistance",
            "strengthening support networks",
            "taking manageable next steps",
        ],
        "example_questions": [
            "What support is currently available to you?",
            "Who could you reach out to today for assistance?",
            "What would be the most helpful next step for you right now?",
            "What support have you found helpful during difficult periods in the past?",
        ],
        "recommended_features": [
            "Support Connect",
            "Emergency support information",
        ],
        "boundary": "coaching scope only; no coping-strategy advice; no counselling.",
        "result_text": "Your responses suggest you may be experiencing a high level of distress. While I can help you reflect on your wellbeing and identify possible next steps, I am not a clinician and cannot provide mental health advice or treatment. It is highly recommended that you contact a GP, psychologist, Employee Assistance Program, or another qualified professional for support.",
        "label": "Very high distress",
    },
}

MANDATORY_SUPPORT_MESSAGE = BAND_CONTENT["very_high"]["result_text"]
