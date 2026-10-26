"""SQLite storage: sessions, chat messages and check-ins.

Plain sqlite3, one short-lived connection per call (safe with FastAPI's
threadpool). The database file is created automatically on startup.
"""

import os
import sqlite3
from contextlib import closing
from datetime import datetime
from pathlib import Path

# backend/wellbeing.db by default; override with the MINDPULSE_DB env var.
DB_PATH = Path(
    os.getenv("MINDPULSE_DB", Path(__file__).resolve().parent.parent / "wellbeing.db")
)


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


_ready = False


def _connect() -> sqlite3.Connection:
    """Open a connection, creating the tables first if this process has not
    done so yet. This makes the database safe to use whichever runner starts
    the app (app.main or app.dev_main)."""
    global _ready
    if not _ready:
        _ready = True  # set first: init_db() calls _connect() again
        try:
            init_db()
        except Exception:
            _ready = False
            raise
    return sqlite3.connect(DB_PATH)


def init_db() -> None:
    with closing(_connect()) as conn, conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                session_id  TEXT PRIMARY KEY,
                affiliation TEXT,
                created_at  TEXT
            );
            CREATE TABLE IF NOT EXISTS messages (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                role       TEXT,
                text       TEXT,
                created_at TEXT
            );
            CREATE TABLE IF NOT EXISTS checkins (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                score      INTEGER,
                band       TEXT,
                created_at TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_messages_session
                ON messages (session_id, id);
            CREATE INDEX IF NOT EXISTS idx_checkins_session
                ON checkins (session_id, id);
            """
        )


def _ensure_session(conn: sqlite3.Connection, session_id: str) -> None:
    conn.execute(
        "INSERT OR IGNORE INTO sessions (session_id, affiliation, created_at) "
        "VALUES (?, ?, ?)",
        (session_id, "", _now()),
    )


def create_session(session_id: str, affiliation: str = "") -> None:
    with closing(_connect()) as conn, conn:
        conn.execute(
            "INSERT OR IGNORE INTO sessions (session_id, affiliation, created_at) "
            "VALUES (?, ?, ?)",
            (session_id, affiliation or "", _now()),
        )


def save_message(session_id: str, role: str, text: str) -> None:
    with closing(_connect()) as conn, conn:
        _ensure_session(conn, session_id)
        conn.execute(
            "INSERT INTO messages (session_id, role, text, created_at) "
            "VALUES (?, ?, ?, ?)",
            (session_id, role, text, _now()),
        )


def get_history(session_id: str) -> list[dict]:
    """Oldest first, as [{"role": "user" | "assistant", "text": "..."}]."""
    with closing(_connect()) as conn:
        rows = conn.execute(
            "SELECT role, text FROM messages WHERE session_id = ? ORDER BY id",
            (session_id,),
        ).fetchall()
    return [{"role": role, "text": text} for role, text in rows]


def save_checkin(session_id: str, score: int, band: str) -> None:
    with closing(_connect()) as conn, conn:
        _ensure_session(conn, session_id)
        conn.execute(
            "INSERT INTO checkins (session_id, score, band, created_at) "
            "VALUES (?, ?, ?, ?)",
            (session_id, score, band, _now()),
        )


def get_checkins(session_id: str) -> list[dict]:
    """Oldest first, as [{"date": "YYYY-MM-DD", "score": 0-100}]."""
    with closing(_connect()) as conn:
        rows = conn.execute(
            "SELECT created_at, score FROM checkins WHERE session_id = ? ORDER BY id",
            (session_id,),
        ).fetchall()
    return [{"date": created_at[:10], "score": score} for created_at, score in rows]