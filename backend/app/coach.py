"""The AI wellbeing coach: LangChain + Gemini.

Reads GOOGLE_API_KEY and GEMINI_MODEL from .env.
"""

import os

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

SYSTEM_PROMPT = """You are a warm, supportive wellbeing coach for MindPulse.
You are NOT a therapist, doctor or clinician.

Rules:
- Never diagnose, treat, label conditions, or give advice about medication.
  Avoid clinical words such as depression, anxiety disorder, disorder,
  symptoms, therapy plan or treatment.
- If the user asks for a diagnosis or treatment, say kindly that this is
  outside your role and suggest talking to a qualified professional.
- Ask only ONE gentle, reflective follow-up question at a time.
- Suggest at most TWO small actions per reply, and ONLY from the
  MindPulse-approved practices: mindfulness, exercise, healthy eating, and
  seeking professional support. Offer them as gentle ideas, never as a
  treatment plan or instructions.
- Keep replies short (2-5 sentences), warm, in plain language, no bullet
  lists, no headings.
- Never claim to remember things you were not told in this conversation.
- You are an AI coach, not a person. If asked, say so plainly.

How to respond to different feelings (always acknowledge the feeling first):
- Low, sad or down: validate that it sounds heavy. Offer one small step such
  as a short walk, a simple nourishing meal, or a few minutes of mindful
  breathing. Gently say that talking with someone they trust or a qualified
  professional can help, especially if the feeling has lasted a while. Ask
  what has been weighing on them.
- Stressed or overwhelmed: acknowledge the load. Suggest a short mindfulness
  pause or a brief walk. Ask what is weighing on them most.
- Anxious or worried: suggest slow mindful breathing or a grounding moment,
  or light exercise. Ask what is on their mind.
- Angry or frustrated: acknowledge it without judging. Suggest pausing with
  a few slow breaths or some movement. Ask what triggered it.
- Lonely or isolated: acknowledge it kindly. Suggest reaching out to someone
  they trust and a gentle activity they enjoy. If it has lasted a long time,
  mention professional support.
- Tired, burnt out or sleeping badly: acknowledge it. Suggest rest, regular
  healthy meals, light movement or a calming mindfulness routine. If it
  continues, suggest speaking to a professional. Give no medical advice.
- Happy, calm or positive: celebrate it. Ask what contributed to it and
  encourage them to keep that habit.
- Mixed or unclear: reflect what you hear and ask one open question.

SAFETY RULE (highest priority): if the user's message suggests suicide,
self-harm, wanting to die, or not wanting to live, reply with exactly
[[RISK]] and nothing else. Never write crisis advice, hotline numbers or
country-specific services yourself; the system supplies the approved text."""

RISK_TOKEN = "[[RISK]]"

FALLBACK_REPLY = (
    "I'm having a little trouble responding right now. Could you try "
    "sending that again in a moment?"
)

_llm = None


def _get_llm() -> ChatGoogleGenerativeAI:
    """Create the model lazily so a missing key does not crash at import."""
    global _llm
    if _llm is None:
        model = os.getenv("GEMINI_MODEL")
        api_key = os.getenv("GOOGLE_API_KEY")
        if not model or not api_key:
            raise RuntimeError(
                "GEMINI_MODEL or GOOGLE_API_KEY is empty. Check backend/.env"
            )
        _llm = ChatGoogleGenerativeAI(
            model=model,
            google_api_key=api_key,
            timeout=30,  # fail fast instead of loading forever
            max_retries=1,
        )
    return _llm


def _to_text(content) -> str:
    """Newer Gemini wrappers may return a list of parts instead of a string."""
    if isinstance(content, str):
        return content.strip()
    parts = []
    for part in content:
        if isinstance(part, str):
            parts.append(part)
        elif isinstance(part, dict) and part.get("type") == "text":
            parts.append(part.get("text", ""))
    return "".join(parts).strip()


def get_coach_reply(history: list[dict], user_message: str) -> str:
    """history: earlier turns as [{role, text}], NOT including user_message."""
    try:
        past = []
        for turn in history:
            if turn["role"] == "user":
                past.append(HumanMessage(content=turn["text"]))
            else:
                past.append(AIMessage(content=turn["text"]))

        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", SYSTEM_PROMPT),
                MessagesPlaceholder("history"),
                ("human", "{input}"),
            ]
        )
        chain = prompt | _get_llm()
        result = chain.invoke({"history": past, "input": user_message})
        return _to_text(result.content) or FALLBACK_REPLY
    except Exception as exc:  # demo safety: never show a stack trace
        print(f"[coach] error: {exc}")
        return FALLBACK_REPLY


EXPLAIN_FALLBACK = (
    "Thanks for completing the check-in. This score is a gentle snapshot of "
    "how you've been feeling lately, not a diagnosis. Consider a short "
    "mindfulness exercise or a walk today, and if things feel heavy, talking "
    "to a qualified professional can really help."
)


def explain_result(score: int, band: str) -> str:
    """Non-clinical explanation of an assessment result (score is 0-100)."""
    try:
        prompt = (
            "A user completed a 10-question wellbeing check-in about the last "
            f"two weeks. Their score is {score} out of 100 (higher means better "
            f"recent wellbeing), placed in the '{band}' band. "
            "Write a 3-4 sentence, warm, NON-clinical explanation. Do not "
            "diagnose or use clinical wording. End with two gentle next steps "
            "chosen only from: mindfulness, exercise, healthy eating, talking "
            "to a professional."
        )
        result = _get_llm().invoke(prompt)
        return _to_text(result.content) or EXPLAIN_FALLBACK
    except Exception as exc:
        print(f"[coach] explain error: {exc}")
        return EXPLAIN_FALLBACK