"""Replays a finished match one event at a time, so the app behaves like a live feed."""
import asyncio
from collections.abc import AsyncIterator

from app.events import MatchEvent


async def replay(events: list[MatchEvent], delay: float = 0.5) -> AsyncIterator[MatchEvent]:
    for event in events:
        yield event
        if delay > 0:
            await asyncio.sleep(delay)
