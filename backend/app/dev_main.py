"""Standalone runner so you can test /chat before the teammate's main.py arrives.

Run from the backend folder:
    uvicorn app.dev_main:app --reload

Once the real app/main.py exists, just add these two lines there instead:
    from app.chat import router as chat_router
    app.include_router(chat_router)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.chat import router as chat_router

app = FastAPI(title="MindPulse AI Coach (dev)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)


@app.get("/health")
def health():
    return {"status": "ok"}