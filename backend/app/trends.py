"""K10 trends endpoint."""

from fastapi import APIRouter

from app.db import get_trend

router = APIRouter()


@router.get("/trends")
def get_trends(session_id: str):
    """Oldest first: [{"date": "YYYY-MM-DD", "created_at": ..., "score": 10-50, "band": ...}]"""
    return get_trend(session_id)