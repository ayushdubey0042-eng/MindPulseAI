"""Server-Sent Events (SSE) for the chat: stream the coach's reply as it is written.

This file has no web-framework imports, so it is easy to test on its own.
chat.py wraps stream_events() in a StreamingResponse.

Events sent to the browser (each is "event: <name>\\ndata: <json>\\n\\n"):
  meta   {"session_id": "..."}                      first, so the UI knows the session
  token  {"text": "..."}                            one per piece of the reply
  done   {"reply", "risk_flag", "risk_level"}       last; "reply" is the final, saved text
  error  {"message": "..."}                         if something failed midway
"""

import json
from typing import Callable, Iterable, Iterator


def sse(event: str, data: dict) -> str:
    """Format one SSE message. json.dumps keeps newlines and spaces in the text safe."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def stream_events(
    *,
    session_id: str,
    message: str,
    history: list[dict],
    check_risk: Callable[[str], dict],
    stream_reply: Callable[[list[dict], str], Iterable[str]],
    save_message: Callable[[str, str, str], None],
    risk_token: str,
    referral_message: str,
    fallback_reply: str,
) -> Iterator[str]:
    yield sse("meta", {"session_id": session_id})

    # Layer 1: pattern check. Fixed referral text, the model is never called.
    risk = check_risk(message)
    if risk["risk"]:
        save_message(session_id, "assistant", referral_message)
        yield sse(
            "done",
            {"reply": referral_message, "risk_flag": True, "risk_level": "high"},
        )
        return

    # Layer 2: the model may answer with risk_token instead of a reply. Hold back
    # the first few characters until we know it is not that token, so the token
    # (or a crisis reply) is never shown to the user mid-stream.
    buffer = ""
    decided = False
    model_risk = False
    parts: list[str] = []

    try:
        for piece in stream_reply(history, message):
            if not piece:
                continue
            if not decided:
                buffer += piece
                if len(buffer.lstrip()) < len(risk_token):
                    continue
                decided = True
                if risk_token in buffer:
                    model_risk = True
                    break
                piece, buffer = buffer, ""
            parts.append(piece)
            yield sse("token", {"text": piece})

        # Very short reply: the stream ended before we could decide.
        if not decided and buffer:
            if risk_token in buffer:
                model_risk = True
            else:
                parts.append(buffer)
                yield sse("token", {"text": buffer})
    except Exception as exc:  # never show a stack trace to the user
        print(f"[stream] error: {exc}")
        reply = "".join(parts) or fallback_reply
        save_message(session_id, "assistant", reply)
        yield sse("error", {"message": fallback_reply})
        yield sse("done", {"reply": reply, "risk_flag": False, "risk_level": "none"})
        return

    if model_risk:
        save_message(session_id, "assistant", referral_message)
        yield sse(
            "done",
            {"reply": referral_message, "risk_flag": True, "risk_level": "high"},
        )
        return

    reply = "".join(parts).strip() or fallback_reply
    save_message(session_id, "assistant", reply)
    yield sse("done", {"reply": reply, "risk_flag": False, "risk_level": "none"})