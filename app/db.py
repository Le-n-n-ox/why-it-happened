import os
import sqlite3
import json
import threading

from .detectors import Insight

_connection = None
_connection_lock = threading.RLock()

def get_connection():
    """Return the shared SQLite connection, including for an in-memory DB."""
    global _connection
    if _connection is not None:
        return _connection

    db_path = os.getenv("DB_PATH", "insights.db")
    with _connection_lock:
        if _connection is None:
            # Reuse this connection so :memory: keeps its schema between calls.
            _connection = sqlite3.connect(db_path, check_same_thread=False)
            _connection.row_factory = sqlite3.Row
    return _connection

def init_db():
    """Creates the insights table if it doesn't already exist."""
    conn = get_connection()
    with _connection_lock:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS saved_insights (
                id TEXT PRIMARY KEY,
                kind TEXT,
                team TEXT,
                minute REAL,
                evidence TEXT,
                facts TEXT,
                narration TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS narration_cache (
                insight_id TEXT NOT NULL,
                language TEXT NOT NULL,
                narration TEXT NOT NULL,
                PRIMARY KEY (insight_id, language)
            )
        """)
        conn.commit()

def save_insight(insight: Insight, narration: str, language: str = "en", cache_result: bool = True):
    """Save narration history and optionally cache generated text by language."""
    conn = get_connection()
    with _connection_lock:
        conn.execute("""
            INSERT OR REPLACE INTO saved_insights (id, kind, team, minute, evidence, facts, narration)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            insight.id,
            insight.kind,
            insight.team,
            insight.minute,
            json.dumps(insight.evidence),
            json.dumps(insight.facts),
            narration
        ))
        if cache_result:
            conn.execute("""
                INSERT OR REPLACE INTO narration_cache (insight_id, language, narration)
                VALUES (?, ?, ?)
            """, (insight.id, language, narration))
        conn.commit()

def get_existing_narration(insight_id: str, language: str = "en") -> str | None:
    conn = get_connection()
    with _connection_lock:
        row = conn.execute(
            "SELECT narration FROM narration_cache WHERE insight_id = ? AND language = ?",
            (insight_id, language),
        ).fetchone()
    return row["narration"] if row else None

def get_insights(team: str = None, limit: int = 10) -> list[dict]:
    """Retrieves historical insights, optionally filtered by team."""
    conn = get_connection()
    with _connection_lock:
        query = "SELECT * FROM saved_insights"
        params = []

        if team:
            query += " WHERE team = ?"
            params.append(team)

        query += " ORDER BY minute DESC LIMIT ?"
        params.append(limit)
        rows = conn.execute(query, params).fetchall()


# Parse the JSON strings back into Python lists/dicts before returning
    results = []
    for row in rows:
        d = dict(row)
        d["evidence"] = json.loads(d["evidence"])
        d["facts"] = json.loads(d["facts"])
        results.append(d)

    return results
