"""Temporary in-memory stand-ins for the teammate's app/db.py helpers.

chat.py falls back to this file only if app.db cannot be imported.
Once the real db.py lands, this file is no longer used and can be deleted.
"""

_messages: dict[str, list[dict]] = {}


def save_message(session_id: str, role: str, text: str) -> None:
    _messages.setdefault(session_id, []).append({"role": role, "text": text})


def get_history(session_id: str) -> list[dict]:
    return list(_messages.get(session_id, []))