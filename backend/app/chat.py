"""POST /chat endpoint."""

import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.coach import RISK_TOKEN, get_coach_reply
from app.risk import REFERRAL_MESSAGE, check_risk

# Use the teammate's real database helpers when available,
# otherwise fall back to the in-memory stand-ins.
try:
    from app.db import get_history, save_message
except ImportError:
    from app.db_stub import get_history, save_message

router = APIRouter()

# Only the most recent messages are sent to the model, which keeps replies
# fast and cheap. The full history is still stored.
MAX_HISTORY_MESSAGES = 20


class ChatRequest(BaseModel):
    # Optional: the API creates the session id on the first message and
    # returns it. The client then sends it back on every later message.
    session_id: Optional[str] = None
    message: str


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    risk_flag: bool
    risk_level: str


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    message = req.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="message must not be empty")

    # The server owns session ids: create one if the client did not send it.
    session_id = req.session_id or uuid.uuid4().hex

    # Load earlier turns BEFORE saving this one, so it is not duplicated.
    history = get_history(session_id)[-MAX_HISTORY_MESSAGES:]
    save_message(session_id, "user", message)

    risk = check_risk(message)
    if risk["risk"]:
        reply = REFERRAL_MESSAGE  # fixed text, the LLM is skipped entirely
    else:
        reply = get_coach_reply(history, message)
        # Layer 2: the model flagged risk that the patterns missed.
        if RISK_TOKEN in reply:
            risk = {"risk": True, "level": "high"}
            reply = REFERRAL_MESSAGE

    save_message(session_id, "assistant", reply)
    return ChatResponse(
        session_id=session_id,
        reply=reply,
        risk_flag=risk["risk"],
        risk_level=risk["level"],
    )


@router.get("/chat/history")
def chat_history(session_id: str):
    """Return the saved conversation so the UI can reload it after a refresh."""
    return {"session_id": session_id, "messages": get_history(session_id)}