"""Tiny SQLite store for events and insights. Swap for Cosmos DB later."""
import json
import sqlite3
import threading

class OmniPitchStore:
    def __init__(self, path: str = ":memory:"):
        self._db = sqlite3.connect(path, check_same_thread=False)
        # Using WAL mode drastically improves concurrent read/write speeds in SQLite
        self._db.execute("PRAGMA journal_mode=WAL;")
        # FULL fsyncs on every commit; a replay commits once per event, which cost about a second
        # per match. NORMAL keeps the write-ahead log and only risks the last commits on a power
        # cut, which is the right trade for a demo feed.
        self._db.execute("PRAGMA synchronous=NORMAL;")
        self._lock = threading.Lock()
        
        with self._lock:
            # Table for the final AI narratives
            self._db.execute(
                "CREATE TABLE IF NOT EXISTS insights (id TEXT PRIMARY KEY, minute REAL, body TEXT)"
            )
            # Table for the raw match events (indexed by minute for fast time-window queries)
            self._db.execute(
                "CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, minute REAL, team TEXT, type TEXT, x REAL, y REAL, body TEXT)"
            )
            self._db.execute("CREATE INDEX IF NOT EXISTS idx_events_minute ON events(minute)")

    # --- INSIGHTS ---
    def add_insight(self, insight: dict) -> None:
        with self._lock:
            self._db.execute(
                "INSERT OR REPLACE INTO insights (id, minute, body) VALUES (?, ?, ?)",
                (insight["id"], insight["minute"], json.dumps(insight)),
            )
            self._db.commit()

    def list_insights(self) -> list[dict]:
        with self._lock:
            rows = self._db.execute("SELECT body FROM insights ORDER BY minute").fetchall()
        return [json.loads(r[0]) for r in rows]

    # --- EVENTS ---
    def add_event(self, event: dict) -> None:
        """Expects a dictionary representation of events.MatchEvent"""
        with self._lock:
            self._db.execute(
                "INSERT OR REPLACE INTO events (id, minute, team, type, x, y, body) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (event["id"], event["minute"], event["team"], event["type"], event.get("x", 0), event.get("y", 0), json.dumps(event)),
            )
            self._db.commit()

    def get_recent_events(self, current_minute: float, window_minutes: float = 5.0) -> list[dict]:
        """Fetch events within a specific time window for tactical analysis."""
        with self._lock:
            rows = self._db.execute(
                "SELECT body FROM events WHERE minute <= ? AND minute >= ? ORDER BY minute",
                (current_minute, current_minute - window_minutes)
            ).fetchall()
        return [json.loads(r[0]) for r in rows]

    def clear(self) -> None:
        with self._lock:
            self._db.execute("DELETE FROM insights")
            self._db.execute("DELETE FROM events")
            self._db.commit()