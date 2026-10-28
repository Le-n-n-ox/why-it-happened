"""Replays a finished match one event at a time, so the app behaves like a live feed."""
import asyncio
from collections.abc import AsyncIterator

from app.events import MatchEvent


async def replay(
    events: list[MatchEvent], delay: float = 0.5,
    seconds_per_minute: float | None = None, max_gap: float = 2.0,
) -> AsyncIterator[MatchEvent]:
    previous: MatchEvent | None = None
    for event in events:
        if seconds_per_minute is not None and previous is not None:
            wait = min(max((event.minute - previous.minute) * seconds_per_minute, 0.0), max_gap)
            if wait > 0:
                await asyncio.sleep(wait)
        yield event
        previous = event
        if seconds_per_minute is None and delay > 0:
            await asyncio.sleep(delay)
