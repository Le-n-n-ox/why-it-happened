"""Tiny SQLite store for insights. Swap for Cosmos DB later if there is time."""
import json
import sqlite3
import threading


class InsightStore:
    def __init__(self, path: str = ":memory:"):
        self._db = sqlite3.connect(path, check_same_thread=False)
        self._lock = threading.Lock()
        with self._lock:
            self._db.execute(
                "CREATE TABLE IF NOT EXISTS insights (id TEXT PRIMARY KEY, minute REAL, body TEXT)"
            )

    def add(self, insight: dict) -> None:
        with self._lock:
            self._db.execute(
                "INSERT OR REPLACE INTO insights (id, minute, body) VALUES (?, ?, ?)",
                (insight["id"], insight["minute"], json.dumps(insight)),
            )
            self._db.commit()

    def list(self) -> list[dict]:
        with self._lock:
            rows = self._db.execute("SELECT body FROM insights ORDER BY minute").fetchall()
        return [json.loads(r[0]) for r in rows]

    def clear(self) -> None:
        with self._lock:
            self._db.execute("DELETE FROM insights")
            self._db.commit()
