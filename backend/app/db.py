"""SQLite storage for users, sessions, messages, risk events and K10 assessments."""

import os
import sqlite3
import uuid
from contextlib import closing
from datetime import datetime
from pathlib import Path

DB_PATH = Path(os.getenv("MINDPULSE_DB", Path(__file__).resolve().parent.parent / "wellbeing.db"))


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _resolve_db_path() -> Path:
    return Path(os.getenv("MINDPULSE_DB", Path(__file__).resolve().parent.parent / "wellbeing.db"))


def _database_has_tables(path: Path) -> bool:
    if not path.exists():
        return False
    try:
        with sqlite3.connect(path) as conn:
            conn.execute("PRAGMA foreign_keys=ON")
            tables = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('sessions','messages','checkins','users')"
            ).fetchall()
            return bool(tables)
    except sqlite3.DatabaseError:
        return False


def _backup_legacy_db(path: Path) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    backup = path.with_name(f"{path.stem}.old.{timestamp}{path.suffix}")
    suffix = 1
    while backup.exists():
        backup = path.with_name(f"{path.stem}.old.{timestamp}_{suffix}{path.suffix}")
        suffix += 1
    os.replace(path, backup)
    return backup


def _connect() -> sqlite3.Connection:
    global DB_PATH
    DB_PATH = _resolve_db_path()
    init_db()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if DB_PATH.exists():
        try:
            with sqlite3.connect(DB_PATH) as conn:
                conn.execute("PRAGMA foreign_keys=ON")
                version = conn.execute("PRAGMA user_version").fetchone()[0]
                if version < 2 and _database_has_tables(DB_PATH):
                    _backup_legacy_db(DB_PATH)
        except sqlite3.DatabaseError:
            pass

    with closing(sqlite3.connect(DB_PATH)) as conn:
        conn.execute("PRAGMA foreign_keys=ON")
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                last_seen_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(user_id),
                affiliation TEXT CHECK (affiliation IN ('organisation', 'independent', '')) NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'emergency_locked')),
                latest_k10_score INTEGER NULL,
                latest_k10_band TEXT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL REFERENCES sessions(session_id),
                role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
                text TEXT NOT NULL,
                risk_flag INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS assessments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL REFERENCES sessions(session_id),
                instrument TEXT NOT NULL DEFAULT 'K10',
                total_score INTEGER NOT NULL,
                band TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS assessment_answers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
                question_id INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                value INTEGER NOT NULL CHECK (value BETWEEN 1 AND 5),
                UNIQUE (assessment_id, question_id)
            );

            CREATE TABLE IF NOT EXISTS risk_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL REFERENCES sessions(session_id),
                message_id INTEGER NULL REFERENCES messages(id),
                level TEXT NOT NULL,
                source TEXT NOT NULL CHECK (source IN ('pattern', 'model')),
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, id);
            CREATE INDEX IF NOT EXISTS idx_assessments_session ON assessments(session_id, id);
            CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_risk_events_session ON risk_events(session_id);
            """
        )
        conn.execute("PRAGMA user_version = 2")
        conn.commit()


def _touch_session(conn: sqlite3.Connection, session_id: str) -> None:
    conn.execute(
        "UPDATE sessions SET updated_at = ? WHERE session_id = ?",
        (_now(), session_id),
    )


def create_user() -> str:
    user_id = uuid.uuid4().hex
    now = _now()
    with closing(_connect()) as conn:
        conn.execute(
            "INSERT INTO users (user_id, created_at, last_seen_at) VALUES (?, ?, ?)",
            (user_id, now, now),
        )
        conn.commit()
    return user_id


def touch_user(user_id: str) -> None:
    with closing(_connect()) as conn:
        conn.execute(
            "UPDATE users SET last_seen_at = ? WHERE user_id = ?",
            (_now(), user_id),
        )
        conn.commit()


def get_user(user_id: str):
    with closing(_connect()) as conn:
        row = conn.execute(
            "SELECT user_id, created_at, last_seen_at FROM users WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    return dict(row) if row else None


def create_session(user_id: str, affiliation: str = "") -> str:
    now = _now()
    session_id = uuid.uuid4().hex
    with closing(_connect()) as conn:
        conn.execute(
            "INSERT INTO sessions (session_id, user_id, affiliation, status, latest_k10_score, latest_k10_band, created_at, updated_at) VALUES (?, ?, ?, 'active', NULL, NULL, ?, ?)",
            (session_id, user_id, affiliation or "", now, now),
        )
        conn.commit()
    return session_id


def get_session(session_id: str):
    with closing(_connect()) as conn:
        row = conn.execute(
            "SELECT * FROM sessions WHERE session_id = ?",
            (session_id,),
        ).fetchone()
    return dict(row) if row else None


def session_exists(session_id: str) -> bool:
    return get_session(session_id) is not None


def set_session_status(session_id: str, status: str) -> None:
    with closing(_connect()) as conn:
        conn.execute(
            "UPDATE sessions SET status = ?, updated_at = ? WHERE session_id = ?",
            (status, _now(), session_id),
        )
        conn.commit()


def save_message(session_id: str, role: str, text: str, risk_flag: bool = False) -> int:
    with closing(_connect()) as conn:
        _touch_session(conn, session_id)
        cursor = conn.execute(
            "INSERT INTO messages (session_id, role, text, risk_flag, created_at) VALUES (?, ?, ?, ?, ?)",
            (session_id, role, text, int(bool(risk_flag)), _now()),
        )
        conn.commit()
        return int(cursor.lastrowid)


def get_history(session_id: str) -> list[dict]:
    with closing(_connect()) as conn:
        rows = conn.execute(
            "SELECT role, text FROM messages WHERE session_id = ? ORDER BY id",
            (session_id,),
        ).fetchall()
    return [{"role": row["role"], "text": row["text"]} for row in rows]


def save_assessment(session_id: str, answers, total_score: int, band: str) -> int:
    with closing(_connect()) as conn:
        conn.execute("BEGIN")
        try:
            created_at = _now()
            cursor = conn.execute(
                "INSERT INTO assessments (session_id, instrument, total_score, band, created_at) VALUES (?, 'K10', ?, ?, ?)",
                (session_id, total_score, band, created_at),
            )
            assessment_id = int(cursor.lastrowid)
            for answer in answers:
                if "question_id" in answer:
                    question_id = int(answer["question_id"])
                    question_text = answer["question_text"]
                    value = int(answer["value"])
                else:
                    question_id = int(answer["id"])
                    question_text = next(
                        q["text"] for q in answer.get("question_lookup", []) if q["id"] == question_id
                    ) if isinstance(answer.get("question_lookup"), list) else next(
                        q["text"] for q in __import__("app.k10", fromlist=["QUESTIONS"]).QUESTIONS if q["id"] == question_id
                    )
                    value = int(answer["value"])

                conn.execute(
                    "INSERT INTO assessment_answers (assessment_id, question_id, question_text, value) VALUES (?, ?, ?, ?)",
                    (assessment_id, question_id, question_text, value),
                )
            conn.execute(
                "UPDATE sessions SET latest_k10_score = ?, latest_k10_band = ?, updated_at = ? WHERE session_id = ?",
                (total_score, band, _now(), session_id),
            )
            conn.commit()
            return assessment_id
        except Exception:
            conn.rollback()
            raise


def get_assessments(session_id: str):
    with closing(_connect()) as conn:
        rows = conn.execute(
            "SELECT id, created_at, total_score, band FROM assessments WHERE session_id = ? ORDER BY id",
            (session_id,),
        ).fetchall()
        assessments = []
        for row in rows:
            answer_rows = conn.execute(
                "SELECT question_id, question_text, value FROM assessment_answers WHERE assessment_id = ? ORDER BY question_id",
                (row["id"],),
            ).fetchall()
            assessments.append(
                {
                    "id": row["id"],
                    "created_at": row["created_at"],
                    "total_score": row["total_score"],
                    "band": row["band"],
                    "answers": [
                        {
                            "question_id": answer_row["question_id"],
                            "question_text": answer_row["question_text"],
                            "value": answer_row["value"],
                        }
                        for answer_row in answer_rows
                    ],
                }
            )
    return assessments


def save_risk_event(session_id: str, message_id: int | None, level: str, source: str) -> int:
    with closing(_connect()) as conn:
        _touch_session(conn, session_id)
        cursor = conn.execute(
            "INSERT INTO risk_events (session_id, message_id, level, source, created_at) VALUES (?, ?, ?, ?, ?)",
            (session_id, message_id, level, source, _now()),
        )
        conn.commit()
        return int(cursor.lastrowid)


def get_trend(session_id: str):
    with closing(_connect()) as conn:
        rows = conn.execute(
            "SELECT created_at, total_score, band FROM assessments WHERE session_id = ? ORDER BY id",
            (session_id,),
        ).fetchall()
    return [
        {
            "date": row["created_at"][:10],
            "created_at": row["created_at"],
            "score": row["total_score"],
            "band": row["band"],
        }
        for row in rows
    ]


def get_session_detail(session_id: str):
    session = get_session(session_id)
    if session is None:
        return None
    with closing(_connect()) as conn:
        messages = [
            {
                "id": row["id"],
                "role": row["role"],
                "text": row["text"],
                "risk_flag": row["risk_flag"],
                "created_at": row["created_at"],
            }
            for row in conn.execute(
                "SELECT id, role, text, risk_flag, created_at FROM messages WHERE session_id = ? ORDER BY id",
                (session_id,),
            ).fetchall()
        ]
    assessments = get_assessments(session_id)
    return {"session": session, "messages": messages, "assessments": assessments}


# Backward compatibility names used by older code.
def save_checkin(session_id: str, score: int, band: str) -> None:
    save_assessment(
        session_id,
        [
            {"question_id": index, "question_text": f"Legacy check-in question {index}", "value": 1}
            for index in range(1, 11)
        ],
        score,
        band,
    )


def get_checkins(session_id: str):
    return get_trend(session_id)