"""MindPulse AI Wellbeing Coach: the real FastAPI app.

Run from the backend folder:
    uvicorn app.main:app --reload
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.assessment import router as assessment_router
from app.chat import router as chat_router
from app.db import init_db
from app.trends import router as trends_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()  # creates wellbeing.db and its tables on first run
    yield


app = FastAPI(title="MindPulse AI Wellbeing Coach", lifespan=lifespan)

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
app.include_router(assessment_router)
app.include_router(trends_router)


@app.get("/health")
def health():
    return {"status": "ok"}