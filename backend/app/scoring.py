"""Check-in questions and scoring (pure Python, no web framework).

PLACEHOLDERS: the questions, the 0-100 score and the band thresholds are NOT
clinical. Replace them with MindPulse's official questions and scoring
matrices when they are provided.
"""

SCALE_MIN = 1  # e.g. "Never"
SCALE_MAX = 5  # e.g. "Always"

QUESTIONS = [
    {"id": 1, "text": "I have felt calm and settled over the last two weeks."},
    {"id": 2, "text": "I have felt able to cope with day-to-day pressures."},
    {"id": 3, "text": "I have slept well and felt rested."},
    {"id": 4, "text": "I have had energy for the things that matter to me."},
    {"id": 5, "text": "I have felt connected to people around me."},
    {"id": 6, "text": "I have been able to focus on what I am doing."},
    {"id": 7, "text": "I have felt optimistic about the near future."},
    {"id": 8, "text": "I have found time for things I enjoy."},
    {"id": 9, "text": "I have felt useful and valued."},
    {"id": 10, "text": "I have felt able to reach out when I needed support."},
]


def validate_answers(answers: list[dict]) -> None:
    """Raise ValueError with a clear message if the answers are not usable."""
    expected = {q["id"] for q in QUESTIONS}
    if len(answers) != len(expected):
        raise ValueError(f"Please answer all {len(expected)} questions.")
    seen = set()
    for answer in answers:
        qid, value = answer["id"], answer["value"]
        if qid not in expected:
            raise ValueError(f"Unknown question id: {qid}.")
        if qid in seen:
            raise ValueError(f"Question {qid} was answered more than once.")
        if not SCALE_MIN <= value <= SCALE_MAX:
            raise ValueError(
                f"Answers must be between {SCALE_MIN} and {SCALE_MAX} (question {qid})."
            )
        seen.add(qid)


def compute_score(answers: list[dict]) -> int:
    """Percentage 0-100. Higher means better recent wellbeing."""
    total = sum(a["value"] for a in answers)
    maximum = len(QUESTIONS) * SCALE_MAX
    return round(total / maximum * 100)


def score_to_band(score: int) -> str:
    """Placeholder thresholds, same as the frontend mock."""
    if score >= 75:
        return "Good"
    if score < 40:
        return "Low"
    return "Moderate"