"""Turn tracked players and a tracked ball into our football events.

Input is what a video tracker produces: for every frame, where each player and the ball are on the
pitch in metres. Output is MatchEvent objects in our own format (x, y from 0 to 100, x measured from
the team's own goal line), ready for POST /events.

Rules only, no model. An event is emitted only when the positions clearly support it, and every event
carries a confidence; anything below `min_confidence` is dropped, because a wrong event would make
every explanation built on it wrong. Fouls cannot be seen from positions, so they are not detected:
add them by hand through `extra_events`.

tracks.json:
    {"fps": 25,
     "pitch": {"length": 105, "width": 68},
     "attack_right": {"Reds": true, "Blues": false},
     "names": {"7": "Elias Thorne"},                                    (optional, track id -> name)
     "frames": [{"t": 12.04,
                 "players": [{"id": 7, "team": "Reds", "x": 40.2, "y": 30.1}],
                 "ball": {"x": 41.0, "y": 30.4}}]}                      (ball may be null)

    python -m cv.events_from_tracks tracks.json --out events.json
"""
from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass
from pathlib import Path

from app.events import EventType, MatchEvent


@dataclass
class Config:
    hold_radius: float = 2.0         # metres: a player within this of the ball has it
    min_hold_s: float = 0.4          # a possession shorter than this is noise
    merge_gap_s: float = 0.5         # same player, brief break: one possession
    ball_fill_s: float = 0.6         # fill ball dropouts shorter than this
    max_pass_gap_s: float = 3.0      # longer than this and play has stopped
    tackle_radius: float = 2.5       # winner this close to the loser at the moment of the change
    tackle_gap_s: float = 0.5
    carry_min_m: float = 10.0
    shot_speed: float = 16.0         # metres per second off the foot
    shot_cone_deg: float = 30.0      # heading within this angle of the goal centre
    shot_range_m: float = 35.0
    goal_width_m: float = 7.32
    goal_window_s: float = 3.0
    min_confidence: float = 0.5


@dataclass
class _Seg:
    pid: str
    team: str
    t0: float
    t1: float
    ball0: tuple[float, float]
    ball1: tuple[float, float]
    p0: tuple[float, float]          # the player's own position at the start
    p1: tuple[float, float]


def _dist(a, b) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def _ball_track(frames: list[dict], cfg: Config) -> list[tuple[float, float] | None]:
    """Ball position per frame: dropouts filled, then a 3-point median against jitter."""
    pos = [(f["ball"]["x"], f["ball"]["y"]) if f.get("ball") else None for f in frames]
    i = 0
    while i < len(pos):
        if pos[i] is None:
            j = i
            while j < len(pos) and pos[j] is None:
                j += 1
            if i > 0 and j < len(pos) and frames[j]["t"] - frames[i - 1]["t"] <= cfg.ball_fill_s:
                a, b = pos[i - 1], pos[j]
                span = frames[j]["t"] - frames[i - 1]["t"]
                for k in range(i, j):
                    w = (frames[k]["t"] - frames[i - 1]["t"]) / span
                    pos[k] = (a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w)
            i = j
        else:
            i += 1

    def med(vals):
        return sorted(vals)[len(vals) // 2]

    out = list(pos)
    for k in range(1, len(pos) - 1):
        if all(pos[m] is not None for m in (k - 1, k, k + 1)):
            out[k] = (med([pos[m][0] for m in (k - 1, k, k + 1)]), med([pos[m][1] for m in (k - 1, k, k + 1)]))
    return out


def _segments(frames: list[dict], ball: list, cfg: Config) -> list[_Seg]:
    holders = []
    for f, b in zip(frames, ball):
        best = None
        if b is not None:
            for p in f["players"]:
                d = _dist(b, (p["x"], p["y"]))
                if d <= cfg.hold_radius and (best is None or d < best[0]):
                    best = (d, p)
        holders.append(best[1] if best else None)

    runs, i = [], 0
    while i < len(frames):
        j = i
        key = (str(holders[i]["id"]) if holders[i] else None)
        while j + 1 < len(frames) and (str(holders[j + 1]["id"]) if holders[j + 1] else None) == key:
            j += 1
        if key is not None and frames[j]["t"] - frames[i]["t"] >= cfg.min_hold_s:
            hi, hj = holders[i], holders[j]
            runs.append(_Seg(key, hi["team"], frames[i]["t"], frames[j]["t"], ball[i], ball[j],
                             (hi["x"], hi["y"]), (hj["x"], hj["y"])))
        i = j + 1

    merged: list[_Seg] = []
    for seg in runs:
        if merged and merged[-1].pid == seg.pid and seg.t0 - merged[-1].t1 <= cfg.merge_gap_s:
            last = merged[-1]
            merged[-1] = _Seg(last.pid, last.team, last.t0, seg.t1, last.ball0, seg.ball1, last.p0, seg.p1)
        else:
            merged.append(seg)
    return merged


def _attack_x(x: float, team: str, data: dict) -> float:
    length = data["pitch"]["length"]
    return x if data["attack_right"][team] else length - x


def _to_internal(team: str, x: float, y: float, data: dict) -> tuple[float, float]:
    length, width = data["pitch"]["length"], data["pitch"]["width"]
    xs = _attack_x(x, team, data)
    return (round(max(0.0, min(100.0, xs / length * 100)), 1),
            round(max(0.0, min(100.0, y / width * 100)), 1))


def _release(seg: _Seg, frames: list[dict], ball: list, data: dict, cfg: Config):
    """Is the way this possession ended a shot? Returns ('shot'|'goal', confidence) or None."""
    length, width = data["pitch"]["length"], data["pitch"]["width"]
    after = [(f["t"], b) for f, b in zip(frames, ball) if b is not None and seg.t1 < f["t"] <= seg.t1 + cfg.goal_window_s]
    if not after:
        return None
    t_probe, b_probe = next(((t, b) for t, b in after if t - seg.t1 >= 0.15), after[-1])
    dt = t_probe - seg.t1
    if dt <= 0:
        return None
    vx, vy = (b_probe[0] - seg.ball1[0]) / dt, (b_probe[1] - seg.ball1[1]) / dt
    speed = math.hypot(vx, vy)
    if speed < cfg.shot_speed:
        return None
    team = seg.team
    sign = 1.0 if data["attack_right"][team] else -1.0
    goal = (length if sign > 0 else 0.0, width / 2)
    if _attack_x(seg.ball1[0], team, data) < length - cfg.shot_range_m:
        return None
    to_goal = (goal[0] - seg.ball1[0], goal[1] - seg.ball1[1])
    cos = (vx * to_goal[0] + vy * to_goal[1]) / (speed * math.hypot(*to_goal) or 1.0)
    if math.degrees(math.acos(max(-1.0, min(1.0, cos)))) > cfg.shot_cone_deg:
        return None
    conf = min(1.0, 0.5 + 0.5 * (speed - cfg.shot_speed) / cfg.shot_speed)
    for _, b in after:
        if _attack_x(b[0], team, data) >= length - 0.3 and abs(b[1] - width / 2) <= cfg.goal_width_m / 2:
            return "goal", conf
    return "shot", conf


def convert(data: dict, cfg: Config | None = None, extra_events: list[dict] | None = None,
            with_confidence: bool = False):
    cfg = cfg or Config()
    frames = sorted(data["frames"], key=lambda f: f["t"])
    names = {str(k): v for k, v in (data.get("names") or {}).items()}
    ball = _ball_track(frames, cfg)
    segs = _segments(frames, ball, cfg)

    def label(pid: str, team: str) -> str:
        return names.get(pid, f"{team} #{pid}")

    raw: list[tuple[float, int, str, str, str, tuple[float, float], float]] = []    # t, order, type, team, pid, pos, conf
    for n, seg in enumerate(segs):
        nxt = segs[n + 1] if n + 1 < len(segs) else None
        hold_conf = min(1.0, (seg.t1 - seg.t0) / 1.0)
        release = _release(seg, frames, ball, data, cfg)
        if _dist(seg.ball0, seg.ball1) >= cfg.carry_min_m and not release:
            raw.append((seg.t1, 0, "carry", seg.team, seg.pid, seg.p1, hold_conf))
        if release:
            kind, conf = release
            raw.append((seg.t1, 1, kind, seg.team, seg.pid, seg.p1, min(conf, 0.5 + hold_conf / 2)))
            continue
        if not nxt:
            continue
        gap = nxt.t0 - seg.t1
        if gap > cfg.max_pass_gap_s or gap < 0:
            continue
        gap_penalty = 1 - 0.4 * gap / cfg.max_pass_gap_s
        if nxt.team == seg.team:
            if nxt.pid != seg.pid:
                raw.append((seg.t1, 1, "pass", seg.team, seg.pid, seg.p1, hold_conf * gap_penalty))
        else:
            contact = _dist(seg.p1, nxt.p0) <= cfg.tackle_radius and gap <= cfg.tackle_gap_s
            raw.append((nxt.t0, 1, "tackle" if contact else "interception", nxt.team, nxt.pid, nxt.p0,
                        min(1.0, (nxt.t1 - nxt.t0) / 1.0) * gap_penalty))

    for extra in extra_events or []:                  # fouls and other hand-added events
        raw.append((float(extra["t"]), 1, extra["type"], extra["team"], str(extra.get("player_id", "")),
                    (extra.get("x", 0.0), extra.get("y", 0.0)), 1.0))

    raw.sort(key=lambda r: (r[0], r[1]))
    events, confidences = [], []
    for t, _, kind, team, pid, pos, conf in raw:
        if conf < cfg.min_confidence:
            continue
        x, y = _to_internal(team, pos[0], pos[1], data)
        events.append(MatchEvent(id=f"v{len(events) + 1}", minute=round(t / 60, 4), team=team,
                                 player=label(pid, team) if pid else None, type=EventType(kind),
                                 x=x, y=y, outcome="complete" if kind == "pass" else None))
        confidences.append(round(conf, 2))
    return (events, confidences) if with_confidence else events


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert tracks.json into events.json")
    parser.add_argument("tracks")
    parser.add_argument("--out", default="events.json")
    parser.add_argument("--extra", help="JSON list of hand-added events: {t, type, team, player_id, x, y} in metres")
    parser.add_argument("--min-confidence", type=float, default=0.5)
    args = parser.parse_args()
    data = json.loads(Path(args.tracks).read_text())
    extra = json.loads(Path(args.extra).read_text()) if args.extra else None
    events, conf = convert(data, Config(min_confidence=args.min_confidence), extra, with_confidence=True)
    Path(args.out).write_text(json.dumps([e.model_dump(mode="json") for e in events], indent=2))
    print(f"{len(events)} events written to {args.out} (confidence {min(conf, default=0)}-{max(conf, default=0)})")


if __name__ == "__main__":
    main()