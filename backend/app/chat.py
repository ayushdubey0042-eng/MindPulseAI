"""POST /chat and session creation endpoints."""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import LOCK_SESSION_AFTER_EMERGENCY
from app.coach import RISK_TOKEN, get_coach_reply
from app.db import (
    create_session,
    create_user,
    get_history,
    get_session,
    get_session_detail,
    get_user,
    save_message,
    save_risk_event,
    session_exists,
    set_session_status,
    touch_user,
)
from app.risk import EMERGENCY_MESSAGE, REFERRAL_MESSAGE, check_risk
from app.support import EMERGENCY_SUPPORT_OPTIONS

router = APIRouter()
MAX_HISTORY_MESSAGES = 20


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str


class ChatResponse(BaseModel):
    user_id: str
    session_id: str
    reply: str
    risk_flag: bool
    risk_level: str
    session_locked: bool
    support_options: list[dict]


class SessionRequest(BaseModel):
    user_id: Optional[str] = None
    affiliation: Optional[str] = None


@router.post("/session")
def create_new_session(req: Optional[SessionRequest] = None):
    """The server owns the session identity. Real auth is needed before production."""
    req = req or SessionRequest()
    user_id = req.user_id or None
    if user_id is None or get_user(user_id) is None:
        user_id = create_user()
    else:
        touch_user(user_id)

    affiliation = req.affiliation or ""
    session_id = create_session(user_id, affiliation)
    return {"user_id": user_id, "session_id": session_id}


@router.get("/session/{session_id}")
def get_session_route(session_id: str):
    detail = get_session_detail(session_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return detail


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    message = req.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="message must not be empty")

    session_id = req.session_id
    user_id = None
    if not session_id or not session_exists(session_id):
        user_id = create_user()
        session_id = create_session(user_id, "")

    if user_id is None:
        row = get_session(session_id)
        user_id = row["user_id"] if row else create_user()

    session = get_session(session_id) or {}
    session_locked = session.get("status") == "emergency_locked"
    support_options = []

    if session_locked:
        reply = EMERGENCY_MESSAGE
        risk = {"risk": True, "level": "high"}
        save_message(session_id, "user", message, risk_flag=1)
        assist_id = save_message(session_id, "assistant", reply, risk_flag=1)
        save_risk_event(session_id, assist_id, risk["level"], "pattern")
        return ChatResponse(
            user_id=user_id,
            session_id=session_id,
            reply=reply,
            risk_flag=True,
            risk_level="high",
            session_locked=True,
            support_options=EMERGENCY_SUPPORT_OPTIONS,
        )

    history = get_history(session_id)[-MAX_HISTORY_MESSAGES:]
    save_message(session_id, "user", message, risk_flag=0)

    risk = check_risk(message)
    if risk["risk"]:
        reply = REFERRAL_MESSAGE
        support_options = EMERGENCY_SUPPORT_OPTIONS
        if LOCK_SESSION_AFTER_EMERGENCY:
            set_session_status(session_id, "emergency_locked")
            session_locked = True
        assist_id = save_message(session_id, "assistant", reply, risk_flag=1)
        save_risk_event(session_id, assist_id, risk["level"], "pattern")
        return ChatResponse(
            user_id=user_id,
            session_id=session_id,
            reply=reply,
            risk_flag=True,
            risk_level=risk["level"],
            session_locked=session_locked,
            support_options=support_options,
        )

    latest_band = (get_session(session_id) or {}).get("latest_k10_band")
    reply = get_coach_reply(history, message, band_key=latest_band)
    if RISK_TOKEN in reply:
        risk = {"risk": True, "level": "high"}
        reply = REFERRAL_MESSAGE
        support_options = EMERGENCY_SUPPORT_OPTIONS
        if LOCK_SESSION_AFTER_EMERGENCY:
            set_session_status(session_id, "emergency_locked")
            session_locked = True
        assist_id = save_message(session_id, "assistant", reply, risk_flag=1)
        save_risk_event(session_id, assist_id, risk["level"], "model")
        return ChatResponse(
            user_id=user_id,
            session_id=session_id,
            reply=reply,
            risk_flag=True,
            risk_level=risk["level"],
            session_locked=session_locked,
            support_options=support_options,
        )

    assist_id = save_message(session_id, "assistant", reply, risk_flag=0)
    return ChatResponse(
        user_id=user_id,
        session_id=session_id,
        reply=reply,
        risk_flag=False,
        risk_level="none",
        session_locked=False,
        support_options=[],
    )


@router.get("/chat/history")
def chat_history(session_id: str):
    """Return the saved conversation so the UI can reload it after a refresh."""
    return {"session_id": session_id, "messages": get_history(session_id)}
