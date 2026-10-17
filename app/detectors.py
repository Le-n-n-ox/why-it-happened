"""Rule-based pattern detection. Deterministic, testable, explainable.

To add a detector: write a function list[MatchEvent] -> list[Insight] and
add it to DETECTORS at the bottom.
"""
from dataclasses import asdict, dataclass, field

from app.events import EventType, MatchEvent


@dataclass
class Insight:
    kind: str                                   # e.g. "counter_attack", "turnover_shot", "high_press_turnover", "goal_buildup", "shot_pressure"
    team: str
    minute: float
    evidence: list[str]                         # ids of the events that prove it
    facts: dict = field(default_factory=dict)
    narration: dict = field(default_factory=dict)   # language code -> text

    @property
    def id(self) -> str:
        return f"{self.kind}-{self.evidence[0]}"

    def to_dict(self) -> dict:
        d = asdict(self)
        d["id"] = self.id
        return d


def detect_counter_attacks(events: list[MatchEvent], window_min: float = 0.25) -> list[Insight]:
    """Won the ball in own half, then a shot/goal by the same team within ~15 seconds."""
    found = []
    for i, start in enumerate(events):
        won_ball = start.type in (EventType.INTERCEPTION, EventType.TACKLE)
        if not won_ball or start.x >= 50:
            continue
        chain = [start]
        for nxt in events[i + 1:]:
            if nxt.minute - start.minute > window_min or nxt.team != start.team:
                break                       # too slow, or possession was lost
            chain.append(nxt)
            if nxt.type in (EventType.SHOT, EventType.GOAL):
                found.append(Insight(
                    kind="counter_attack",
                    team=start.team,
                    minute=start.minute,
                    evidence=[e.id for e in chain],
                    facts={
                        "duration_s": round((nxt.minute - start.minute) * 60),
                        "start_x": start.x,
                        "end_x": nxt.x,
                        "passes": sum(e.type == EventType.PASS for e in chain),
                        "ended_in": nxt.type.value,
                    },
                ))
                break
    return found


def detect_turnover_shots(events: list[MatchEvent], window_min: float = 0.60) -> list[Insight]:
    """Defensive recovery leading to a shot within ~35 seconds (for slower build-up transitions)."""
    found = []
    for i, start in enumerate(events):
        won_ball = start.type in (EventType.INTERCEPTION, EventType.TACKLE)
        if not won_ball:
            continue
        chain = [start]
        for nxt in events[i + 1:]:
            if nxt.minute - start.minute > window_min or nxt.team != start.team:
                break
            chain.append(nxt)
            if nxt.type in (EventType.SHOT, EventType.GOAL):
                duration_s = round((nxt.minute - start.minute) * 60)
                high_press_owns_it = start.x >= 60 and duration_s <= 21
                if duration_s > 15 and not high_press_owns_it:
                    found.append(Insight(
                        kind="turnover_shot",
                        team=start.team,
                        minute=start.minute,
                        evidence=[e.id for e in chain],
                        facts={
                            "duration_s": duration_s,
                            "start_x": start.x,
                            "end_x": nxt.x,
                            "ended_in": nxt.type.value,
                        },
                    ))
                break
    return found


def detect_high_press(events: list[MatchEvent], window_min: float = 0.35) -> list[Insight]:
    """Won possession high up the pitch (x >= 60) leading to an attacking threat within ~20s."""
    found = []
    for i, start in enumerate(events):
        won_ball = start.type in (EventType.INTERCEPTION, EventType.TACKLE)
        if not won_ball or start.x < 60:
            continue
        chain = [start]
        for nxt in events[i + 1:]:
            if nxt.minute - start.minute > window_min or nxt.team != start.team:
                break
            chain.append(nxt)
            if nxt.type in (EventType.SHOT, EventType.GOAL):
                found.append(Insight(
                    kind="high_press_turnover",
                    team=start.team,
                    minute=start.minute,
                    evidence=[e.id for e in chain],
                    facts={
                        "duration_s": round((nxt.minute - start.minute) * 60),
                        "recovery_x": start.x,
                        "end_x": nxt.x,
                        "passes": sum(e.type == EventType.PASS for e in chain),
                        "ended_in": nxt.type.value,
                    },
                ))
                break
    return found


def detect_goal_buildups(
    events: list[MatchEvent], max_span_min: float = 1.0, min_passes: int = 3
) -> list[Insight]:
    """A goal scored after a patient passing move by one team (not a quick transition).

    Walks back from each goal through the same team's events, up to a minute earlier.
    """
    found = []
    for g, goal in enumerate(events):
        if goal.type != EventType.GOAL:
            continue
        start = g
        while start > 0:
            prev = events[start - 1]
            if prev.team != goal.team or goal.minute - prev.minute > max_span_min:
                break                       # possession was lost, or the move began too long ago
            start -= 1
        chain = events[start:g + 1]
        passes = sum(e.type == EventType.PASS for e in chain)
        if len(chain) >= 4 and passes >= min_passes:
            found.append(Insight(
                kind="goal_buildup",
                team=goal.team,
                minute=chain[0].minute,
                evidence=[e.id for e in chain],
                facts={
                    "duration_s": round((goal.minute - chain[0].minute) * 60),
                    "passes": passes,
                    "touches": len(chain),
                    "start_x": chain[0].x,
                    "end_x": goal.x,
                    "ended_in": "goal",
                },
            ))
    return found


def detect_shot_pressure(
    events: list[MatchEvent], window_min: float = 5.0, min_shots: int = 3
) -> list[Insight]:
    """Three or more shots (goals count) by one team within five minutes: sustained pressure.

    A spell is reported once, as the longest run that fits inside the window.
    """
    found = []
    for team in dict.fromkeys(e.team for e in events):
        shots = [e for e in events if e.team == team and e.type in (EventType.SHOT, EventType.GOAL)]
        i = 0
        while i < len(shots):
            j = i
            while j + 1 < len(shots) and shots[j + 1].minute - shots[i].minute <= window_min:
                j += 1
            if j - i + 1 >= min_shots:
                spell = shots[i:j + 1]
                found.append(Insight(
                    kind="shot_pressure",
                    team=team,
                    minute=spell[0].minute,
                    evidence=[e.id for e in spell],
                    facts={
                        "shots": len(spell),
                        "goals": sum(e.type == EventType.GOAL for e in spell),
                        "span_min": max(1, round(spell[-1].minute - spell[0].minute)),
                    },
                ))
                i = j + 1                   # the next spell starts after this one
            else:
                i += 1
    return found


<<<<<<< HEAD
def detect_foul_turning_point(events: list[MatchEvent], window_min: float = 2.0) -> list[Insight]:
    """A foul committed by the opposition, punished by a goal within 2 minutes."""
    found = []
    teams = list(dict.fromkeys(e.team for e in events))
    if len(teams) < 2:
        return found

    for i, start in enumerate(events):
        if start.type != EventType.FOUL:
            continue

        fouled_team = teams[1] if start.team == teams[0] else teams[0]
        chain = [start]

        for nxt in events[i + 1:]:
            if nxt.minute - start.minute > window_min:
                break
            chain.append(nxt)
            if nxt.type == EventType.GOAL and nxt.team == fouled_team:
                found.append(Insight(
                    kind="foul_turning_point",
                    team=fouled_team,
                    minute=start.minute,
                    evidence=[e.id for e in chain],
                    facts={"duration_s": round((nxt.minute - start.minute) * 60)},
                ))
                break
    return found


def detect_player_standout(
    events: list[MatchEvent], window_min: float = 5.0, min_events: int = 4
) -> list[Insight]:
    """One player heavily involved (4+ events) in a 5-minute window."""
    found = []
    for team in dict.fromkeys(e.team for e in events):
        team_events = [e for e in events if e.team == team and e.player]
        players = dict.fromkeys(e.player for e in team_events)
        for player in players:
            p_events = [e for e in team_events if e.player == player]
            i = 0
            while i < len(p_events):
                j = i
                while j + 1 < len(p_events) and p_events[j + 1].minute - p_events[i].minute <= window_min:
                    j += 1
                if j - i + 1 >= min_events:
                    spell = p_events[i:j + 1]
                    found.append(Insight(
                        kind="player_standout",
                        team=team,
                        minute=spell[0].minute,
                        evidence=[e.id for e in spell],
                        facts={
                            "name": player,
                            "touches": len(spell),
                            "span_min": max(1, round(spell[-1].minute - spell[0].minute)),
                        },
                    ))
                    i = j + 1
                else:
                    i += 1
    return found


def detect_momentum_swing(events: list[MatchEvent], window_min: float = 5.0) -> list[Insight]:
    """Possession flips from <40% to >60% between two 5-minute windows."""
    found = []
    poss_types = {EventType.PASS, EventType.CARRY, EventType.SHOT, EventType.GOAL}
    poss_events = [e for e in events if e.type in poss_types]
    teams = list(dict.fromkeys(e.team for e in poss_events))
    if len(teams) < 2:
        return found

    last_reported = {team: -99.0 for team in teams}
    for event in poss_events:
        if event.minute < window_min * 2:
            continue
        team = event.team
        if event.minute - last_reported[team] < window_min:
            continue

        curr_window = [e for e in poss_events if event.minute - window_min <= e.minute <= event.minute]
        prev_window = [e for e in poss_events if event.minute - window_min * 2 <= e.minute < event.minute - window_min]
        if not prev_window or not curr_window:
            continue

        prev_share = sum(e.team == team for e in prev_window) / len(prev_window)
        curr_share = sum(e.team == team for e in curr_window) / len(curr_window)
        if prev_share < 0.40 and curr_share > 0.60:
            evidence = [e.id for e in curr_window if e.team == team][-4:]
            if not evidence:
                continue
            found.append(Insight(
                kind="momentum_swing",
                team=team,
                minute=event.minute,
                evidence=evidence,
                facts={
                    "prev_share_pct": round(prev_share * 100),
                    "curr_share_pct": round(curr_share * 100),
                    "span_min": round(window_min),
                },
            ))
            last_reported[team] = event.minute
    return found


DETECTORS = [
    detect_counter_attacks, detect_turnover_shots, detect_high_press,
    detect_goal_buildups, detect_shot_pressure, detect_foul_turning_point,
    detect_player_standout, detect_momentum_swing,
=======
DETECTORS = [
    detect_counter_attacks, detect_turnover_shots, detect_high_press, detect_goal_buildups, detect_shot_pressure,
>>>>>>> feature/steve
]


def add_players(insights: list[Insight], events: list[MatchEvent]) -> None:
    """Attach named participants from each insight's evidence chain, when available."""
    by_id = {e.id: e for e in events}
    for insight in insights:
        chain = [by_id[event_id] for event_id in insight.evidence if event_id in by_id]
        names = list(dict.fromkeys(event.player for event in chain if event.player))
        if not names:
            continue
        insight.facts["players"] = names
        if insight.kind != "shot_pressure":
            if chain and chain[0].player:
                insight.facts["starter"] = chain[0].player
            if chain and chain[-1].player:
                insight.facts["finisher"] = chain[-1].player


def detect_all(events: list[MatchEvent]) -> list[Insight]:
    insights: list[Insight] = []
    for detector in DETECTORS:
        insights.extend(detector(events))
    # A goal another detector already explains (counter-attack, press...) is not shown twice.
    explained = {i.evidence[-1] for i in insights if i.kind != "goal_buildup"}
    insights = [i for i in insights if i.kind != "goal_buildup" or i.evidence[-1] not in explained]
    add_players(insights, events)
    return sorted(insights, key=lambda i: i.minute)
