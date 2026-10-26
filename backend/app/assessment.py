"""Check-in endpoints: GET /assessment/questions and POST /assessment."""

import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.coach import explain_result
from app.db import save_checkin
from app.scoring import QUESTIONS, compute_score, score_to_band, validate_answers

router = APIRouter()


class Answer(BaseModel):
    id: int
    value: int


class AssessmentRequest(BaseModel):
    session_id: Optional[str] = None
    answers: list[Answer]


class AssessmentResponse(BaseModel):
    session_id: str
    score: int  # 0-100, higher = better recent wellbeing
    band: str  # Low | Moderate | Good
    explanation: str


@router.get("/assessment/questions")
def get_questions():
    return QUESTIONS


@router.post("/assessment", response_model=AssessmentResponse)
def submit_assessment(req: AssessmentRequest):
    answers = [a.model_dump() for a in req.answers]
    try:
        validate_answers(answers)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # The server owns session ids: create one if the client did not send it.
    session_id = req.session_id or uuid.uuid4().hex

    score = compute_score(answers)
    band = score_to_band(score)
    save_checkin(session_id, score, band)

    # Gemini writes a warm, non-clinical explanation (falls back to static text).
    explanation = explain_result(score, band)
    return AssessmentResponse(
        session_id=session_id, score=score, band=band, explanation=explanation
    )