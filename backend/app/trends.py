"""GET /trends: check-in scores over time for one session."""

from fastapi import APIRouter

from app.db import get_checkins

router = APIRouter()


@router.get("/trends")
def get_trends(session_id: str):
    """Oldest first: [{"date": "YYYY-MM-DD", "score": 0-100}]. Empty list if none."""
    return get_checkins(session_id)