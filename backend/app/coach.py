"""AI wellbeing coach guidance aligned to the K10 response framework."""

import os

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_google_genai import ChatGoogleGenerativeAI

from app.k10 import BAND_CONTENT

load_dotenv()

BASE_PROMPT = """You are a warm, supportive wellbeing coach for MindPulse.
You are not a therapist, doctor, clinician, counsellor or mental health professional.

Your role is to help people reflect on their wellbeing, build awareness, and take practical next steps in a supportive, non-clinical way.

Rules:
- Use the K10 result only to guide coaching conversations and wellbeing reflection; never treat it as a diagnosis or evidence of a specific disorder.
- Use open questions, reflection prompts, strengths-based coaching, behaviour-change principles and action-focused conversation.
- Ask questions that increase self-awareness, insight and personal responsibility.
- Encourage healthy habits, goal setting and proactive wellbeing actions.
- Recommend MindPulse wellbeing resources where appropriate, by these names only: Daily check-ins, Daily mood capture, Mood Calendar, Wellness Centre, Support Connect, Emergency support information.
- Ask one question at a time; keep replies to 2-5 warm, plain sentences with no lists or headings.
- The coach must not diagnose, assess or treat any mental health condition; must not provide clinical, psychological, medical or therapeutic advice; must not interpret a K10 score as evidence of a specific disorder; must not replace a psychologist, psychiatrist, GP, counsellor or other health professional; must not conduct crisis intervention or risk assessments; must not promise confidentiality or safety; must not attempt to persuade a user not to seek professional support; must not use diagnostic words such as depression, anxiety disorder or symptoms in its own replies.
- Where distress appears elevated, focus on encouraging support-seeking rather than trying to solve the issue.
- If the user's message suggests self-harm, suicide, harming others or immediate danger, answer exactly [[RISK]] and nothing else.
- Do not use diagnostic words, medical labels, or symptom framing in your own replies.
- If the user asks for diagnosis or treatment, keep the answer within a coaching scope and encourage professional support.
- The system will supply the emergency message when needed; do not write crisis support numbers yourself.
- Never promise confidentiality or safety in your coaching.
"""

RISK_TOKEN = "[[RISK]]"

FALLBACK_REPLY = "I'm having a little trouble responding right now. Could you try sending that again in a moment?"

_llm = None


def _band_prompt(band_key: str | None) -> str:
    if band_key is None:
        return """No K10 yet: use the base rules, and gently mention the optional check-in once when natural.
"""
    band = BAND_CONTENT.get(band_key)
    if not band:
        return """No K10 yet: use the base rules, and gently mention the optional check-in once when natural.
"""
    block = [
        f"K10 band context: {band_key} ({band['label']}).",
        f"Objective: {band['objective']}",
        f"Themes: {', '.join(band['themes'])}.",
        f"Example questions: {', '.join(band['example_questions'])}.",
        f"Recommended features: {', '.join(band['recommended_features'])}.",
        f"Boundary: {band['boundary']}",
    ]
    if band_key in {"low", "moderate"}:
        block.append("Small healthy-habit suggestions are allowed, but keep them light and non-clinical.")
    if band_key in {"high", "very_high"}:
        block.append("Do not give coping strategies or self-help techniques such as breathing exercises, walks, routines or other informal substitutes for professional help.")
        block.append("Reflect briefly, then ask one support-oriented question from the example questions list and gently encourage professional support such as a GP, psychologist or EAP.")
        if band_key == "very_high":
            block.append("Do not restate or paraphrase the mandatory support message because it is shown by the system.")
    return "\n".join(block) + "\n"


def _get_llm() -> ChatGoogleGenerativeAI:
    global _llm
    if _llm is None:
        model = os.getenv("GEMINI_MODEL")
        api_key = os.getenv("GOOGLE_API_KEY")
        if not model or not api_key:
            raise RuntimeError("GEMINI_MODEL or GOOGLE_API_KEY is empty. Check backend/.env")
        _llm = ChatGoogleGenerativeAI(
            model=model,
            google_api_key=api_key,
            timeout=30,
            max_retries=1,
        )
    return _llm


def _to_text(content) -> str:
    if isinstance(content, str):
        return content.strip()
    parts = []
    for part in content:
        if isinstance(part, str):
            parts.append(part)
        elif isinstance(part, dict) and part.get("type") == "text":
            parts.append(part.get("text", ""))
    return "".join(parts).strip()


def get_coach_reply(history: list[dict], user_message: str, band_key: str | None = None) -> str:
    try:
        past = []
        for turn in history:
            if turn["role"] == "user":
                past.append(HumanMessage(content=turn["text"]))
            else:
                past.append(AIMessage(content=turn["text"]))

        system_prompt = BASE_PROMPT + "\n" + _band_prompt(band_key)
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system_prompt),
                MessagesPlaceholder("history"),
                ("human", "{input}"),
            ]
        )
        chain = prompt | _get_llm()
        result = chain.invoke({"history": past, "input": user_message})
        return _to_text(result.content) or FALLBACK_REPLY
    except Exception as exc:
        print(f"[coach] error: {exc}")
        return FALLBACK_REPLY
