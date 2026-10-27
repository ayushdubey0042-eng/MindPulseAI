"""Risk detection for self-harm, harming others and imminent danger."""

import re

RISK_PATTERNS = [
    r"suicid",
    r"kill(?:ing)?\s+(?:myself|someone|them|him|her|people|others)",
    r"(?:hurt|harm|kill)(?:ing)?\s+(?:myself|someone|them|him|her|people|others)",
    r"(?:end|ending|take|taking)\s+(?:it\s+all|my\s+(?:own\s+)?life)",
    r"self[\s\-]?harm",
    r"(?:cut|cutting)\s+(?:myself|someone|them|him|her|people|others)",
    r"no\s+reason\s+to\s+(?:live|go\s+on)",
    r"(?:don'?t|do\s+not|dont)\s+want\s+to\s+(?:live|be\s+here|exist|wake\s+up)",
    r"want\s+to\s+(?:die|disappear)",
    r"wish\s+i\s+(?:was|were)\s+(?:dead|never\s+born)",
    r"better\s+off\s+(?:dead|without\s+me)",
    r"can'?t\s+go\s+on",
    r"hopeless",
    r"(?:i'?m|i\s+am|we\s+are|he|she|they)\s+(?:in\s+danger|not\s+safe)",
    r"(?:going\s+to\s+hurt|going\s+to\s+kill|going\s+to\s+harm)",
    r"(?:he|she|they|someone|people)\s+(?:is|are)\s+going\s+to\s+hurt\s+(?:me|us|them)",
    r"(?:hurt|harm|kill)\s+(?:someone|them|him|her|people|others)",
    r"(?:i'?m|i\s+am)\s+not\s+safe",
]
_COMPILED = [re.compile(p, re.IGNORECASE) for p in RISK_PATTERNS]

EMERGENCY_MESSAGE = (
    "Please contact emergency services or a crisis line now. This coach cannot provide crisis support."
)

REFERRAL_MESSAGE = EMERGENCY_MESSAGE


def check_risk(message: str) -> dict:
    """Return {"risk": bool, "level": "none" | "high"}."""
    text = message.replace("’", "'")
    if any(pattern.search(text) for pattern in _COMPILED):
        return {"risk": True, "level": "high"}
    return {"risk": False, "level": "none"}