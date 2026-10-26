"""Risk detection (STUB, layer 1 of 2).

Layer 1 (this file): pattern matching on the user's message.
Layer 2 (coach.py + chat.py): the model is told to answer "[[RISK]]" if a
message suggests self-harm or suicide, and chat.py then swaps in the fixed
referral text. Either layer alone is enough to trigger the referral.

A teammate can replace check_risk with a better version. Keep the same
function name and return shape so chat.py does not need to change.
"""

import re

# Demo patterns. Replace with MindPulse-approved criteria.
RISK_PATTERNS = [
    r"suicid",                                   # suicide, suicidal, commiting suicide
    r"kill(ing)?\s+my\s?self",                   # kill myself, killing myself
    r"(end|ending|take|taking)\s+(it\s+all|my\s+(own\s+)?life)",
    r"(hurt|hurting|harm|harming)\s+my\s?self",
    r"self[\s\-]?harm",
    r"(cut|cutting)\s+my\s?self",
    r"no\s+reason\s+to\s+(live|go\s+on)",
    r"(don'?t|do\s+not|dont)\s+want\s+to\s+(live|be\s+here|exist|wake\s+up)",
    r"want\s+to\s+(die|disappear)",
    r"wish\s+i\s+(was|were)\s+(dead|never\s+born)",
    r"better\s+off\s+(dead|without\s+me)",
    r"can'?t\s+go\s+on",
    r"hopeless",
]
_COMPILED = [re.compile(p, re.IGNORECASE) for p in RISK_PATTERNS]

# Fixed, hardcoded response. The model never improvises this text.
# TODO: replace with MindPulse-approved referral pathways (esp. Australian users).
REFERRAL_MESSAGE = (
    "I'm really glad you told me how you're feeling, and I want you to know "
    "you're not alone. What you're describing deserves support from a "
    "qualified person. Please consider reaching out to a mental health "
    "professional, your doctor, or a local support service as soon as you "
    "can. If you feel you might be in immediate danger, contact your local "
    "emergency services right now. I'm a non-clinical wellbeing coach, so I "
    "can't diagnose or treat anything, but I'm here to keep you company while "
    "you take that step."
)


def check_risk(message: str) -> dict:
    """Return {"risk": bool, "level": "none" | "high"}."""
    text = message.replace("’", "'")  # curly apostrophe -> straight
    if any(pattern.search(text) for pattern in _COMPILED):
        return {"risk": True, "level": "high"}
    return {"risk": False, "level": "none"}