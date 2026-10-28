"""Runs before any test module is imported: keeps tests offline and in memory."""
import os

os.environ["NVIDIA_API_KEY"] = ""
os.environ["NVIDIA_MODEL"] = ""
os.environ["NARRATION_LANGS"] = "en"
os.environ["DB_PATH"] = ":memory:"
os.environ["EVENTS_FILE"] = "data/sample_match.json"
