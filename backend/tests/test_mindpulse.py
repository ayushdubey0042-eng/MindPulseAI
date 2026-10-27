import os

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.k10 import (
    ANSWER_OPTIONS,
    BAND_CONTENT,
    INSTRUCTION_TEXT,
    QUESTIONS,
    compute_score,
    score_to_band,
    validate_answers,
)
from app.db import (
    create_session,
    create_user,
    get_assessments,
    get_history,
    get_session_detail,
    get_trend,
    init_db,
    save_assessment,
    save_message,
    session_exists,
)


@pytest.fixture
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "wellbeing_test.db"
    monkeypatch.setenv("MINDPULSE_DB", str(db_path))
    import importlib
    import app.db as db_module

    importlib.reload(db_module)
    db_module.init_db()
    import app.chat as chat_module

    importlib.reload(chat_module)
    import app.assessment as assessment_module

    importlib.reload(assessment_module)
    import app.trends as trends_module

    importlib.reload(trends_module)
    yield TestClient(app)


def test_k10_scoring_and_validation():
    assert validate_answers([{"id": i, "value": 1} for i in range(1, 11)]) is None
    assert compute_score([{"id": 1, "value": 1}] + [{"id": i, "value": 2} for i in range(2, 11)]) == 19
    assert score_to_band(10) == "low"
    assert score_to_band(15) == "low"
    assert score_to_band(16) == "moderate"
    assert score_to_band(21) == "moderate"
    assert score_to_band(22) == "high"
    assert score_to_band(29) == "high"
    assert score_to_band(30) == "very_high"
    assert score_to_band(50) == "very_high"

    with pytest.raises(ValueError, match="10 questions"):
        validate_answers([{"id": 1, "value": 1}, {"id": 2, "value": 2}])
    with pytest.raises(ValueError, match="Question 1 was answered more than once"):
        validate_answers([{"id": 1, "value": 1}, {"id": 1, "value": 2}] + [{"id": i, "value": 3} for i in range(2, 11)])
    with pytest.raises(ValueError, match="Unknown question id"):
        validate_answers([{"id": 9, "value": 1} for _ in range(10)])
    with pytest.raises(ValueError, match="between 1 and 5"):
        validate_answers([{"id": i, "value": 0} for i in range(1, 11)])
    with pytest.raises(ValueError, match="integer"):
        validate_answers([{"id": i, "value": 1.5} for i in range(1, 11)])


def test_k10_text_and_band_content():
    assert INSTRUCTION_TEXT == "In the past 4 weeks:"
    assert len(QUESTIONS) == 10
    assert QUESTIONS[0]["text"] == "About how often did you feel tired out for no good reason?"
    assert QUESTIONS[-1]["text"] == "About how often did you feel worthless?"
    assert ANSWER_OPTIONS[1] == "None of the time"
    assert ANSWER_OPTIONS[5] == "All of the time"
    assert BAND_CONTENT["very_high"]["result_text"] == (
        "Your responses suggest you may be experiencing a high level of distress. "
        "While I can help you reflect on your wellbeing and identify possible next steps, "
        "I am not a clinician and cannot provide mental health advice or treatment. "
        "It is highly recommended that you contact a GP, psychologist, Employee Assistance Program, "
        "or another qualified professional for support."
    )


def test_db_unique_session_and_assessment_storage(client):
    user_a = create_user()
    user_b = create_user()
    session_a = create_session(user_a, "organisation")
    session_b = create_session(user_b, "independent")
    assert session_a != session_b
    assert session_exists(session_a)
    assert session_exists(session_b)

    save_message(session_a, "user", "hello")
    save_message(session_a, "assistant", "hi")

    answers = [{"id": i, "value": 3} for i in range(1, 11)]
    assessment_id = save_assessment(session_a, answers, 30, "very_high")
    assert assessment_id > 0
    loaded = get_assessments(session_a)
    assert len(loaded) == 1
    assert len(loaded[0]["answers"]) == 10
    assert loaded[0]["answers"][0]["question_text"] == QUESTIONS[0]["text"]
    assert loaded[0]["total_score"] == 30

    detail = get_session_detail(session_a)
    assert detail["messages"][0]["role"] == "user"
    assert "risk_events" not in detail
    assert detail["assessments"][0]["band"] == "very_high"

    trends = get_trend(session_a)
    assert len(trends) == 1
    assert trends[0]["score"] == 30
    assert trends[0]["band"] == "very_high"


def test_api_contract_and_emergency_lock(client, monkeypatch):
    import app.chat as chat_module

    monkeypatch.setattr(chat_module, "get_coach_reply", lambda history, message, band_key=None: "safe response")

    session_resp = client.post("/session", json={"affiliation": "organisation"})
    assert session_resp.status_code == 200
    data = session_resp.json()
    assert set(data.keys()) == {"user_id", "session_id"}

    unknown = client.post("/chat", json={"session_id": "missing-abc", "message": "hello"})
    assert unknown.status_code == 200
    created = unknown.json()
    assert created["session_id"] != "missing-abc"
    assert created["user_id"]

    emergency = client.post("/chat", json={"message": "I want to die"})
    assert emergency.status_code == 200
    emergency_data = emergency.json()
    assert emergency_data["risk_flag"] is True
    assert emergency_data["risk_level"] == "high"
    assert emergency_data["session_locked"] is True
    assert emergency_data["support_options"]
    assert emergency_data["reply"]

    locked = client.post("/chat", json={"session_id": emergency_data["session_id"], "message": "hello again"})
    assert locked.status_code == 200
    locked_data = locked.json()
    assert locked_data["session_locked"] is True
    assert locked_data["reply"] == emergency_data["reply"]

    not_trigger = client.post("/chat", json={"message": "my feet are killing me"})
    assert not_trigger.status_code == 200
    assert not_trigger.json()["risk_flag"] is False

    assessment = client.post(
        "/assessment",
        json={
            "session_id": emergency_data["session_id"],
            "answers": [{"id": i, "value": 3} for i in range(1, 11)],
        },
    )
    assert assessment.status_code == 200
    assessment_data = assessment.json()
    assert assessment_data["score"] == 30
    assert assessment_data["band"] == "very_high"
    assert assessment_data["explanation"]
    assert assessment_data["support_options"]
    assert assessment_data["chat_seed"]

    trends_resp = client.get(f"/trends?session_id={assessment_data['session_id']}")
    assert trends_resp.status_code == 200
    assert len(trends_resp.json()) >= 1


def test_get_session_detail_and_unknown_forbidden(client):
    user_id = create_user()
    session_id = create_session(user_id, "organisation")
    save_message(session_id, "user", "hello")
    detail = get_session_detail(session_id)
    assert detail["session"]["session_id"] == session_id
    assert detail["messages"]
    with pytest.raises(KeyError):
        detail["risk_events"]

    response = client.get(f"/session/{session_id}")
    assert response.status_code == 200
    assert response.json()["session"]["session_id"] == session_id

    missing = client.get("/session/not-real")
    assert missing.status_code == 404
