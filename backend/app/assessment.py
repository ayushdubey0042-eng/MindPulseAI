"""K10 assessment endpoints."""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db import create_session, create_user, get_session, save_assessment
from app.k10 import (
    ANSWER_OPTIONS,
    BAND_CONTENT,
    INSTRUCTION_TEXT,
    MANDATORY_SUPPORT_MESSAGE,
    QUESTIONS,
    compute_score,
    score_to_band,
    validate_answers,
)
from app.support import EMERGENCY_SUPPORT_OPTIONS

router = APIRouter()


class Answer(BaseModel):
    id: int
    value: int


class AssessmentRequest(BaseModel):
    session_id: Optional[str] = None
    answers: list[Answer]


class AssessmentResponse(BaseModel):
    user_id: str
    session_id: str
    score: int
    max_score: int
    band: str
    band_label: str
    explanation: str
    recommended_features: list[str]
    support_options: list[dict]
    suggested_questions: list[str]
    chat_seed: str


@router.get("/assessment/questions")
def get_questions():
    return {
        "instruction": INSTRUCTION_TEXT,
        "options": [{"value": value, "label": label} for value, label in ANSWER_OPTIONS.items()],
        "questions": QUESTIONS,
    }


@router.post("/assessment", response_model=AssessmentResponse)
def submit_assessment(req: AssessmentRequest):
    try:
        answers = [a.model_dump() for a in req.answers]
        validate_answers(answers)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    session_id = req.session_id
    user_id = None
    if not session_id or not get_session(session_id):
        user_id = create_user()
        session_id = create_session(user_id, "")
    else:
        session = get_session(session_id)
        user_id = session["user_id"]

    score = compute_score(answers)
    band = score_to_band(score)
    band_data = BAND_CONTENT[band]

    payload = []
    for answer in answers:
        question = next(q for q in QUESTIONS if q["id"] == answer["id"])
        payload.append(
            {
                "question_id": answer["id"],
                "question_text": question["text"],
                "value": answer["value"],
            }
        )

    assessment_id = save_assessment(session_id, payload, score, band)
    support_options = EMERGENCY_SUPPORT_OPTIONS if band == "very_high" else []
    explanation = band_data["result_text"]
    if band == "very_high":
        explanation = MANDATORY_SUPPORT_MESSAGE

    return AssessmentResponse(
        user_id=user_id,
        session_id=session_id,
        score=score,
        max_score=50,
        band=band,
        band_label=band_data["label"],
        explanation=explanation,
        recommended_features=band_data["recommended_features"],
        support_options=support_options,
        suggested_questions=band_data["example_questions"],
        chat_seed="I just completed the check-in and would like to talk about it.",
    )