from app.events import MatchEvent, EventType
from app.detectors import detect_high_press

def test_detect_high_press_success():
    """Valid high press: recovery at x >= 60, followed by a shot within 0.35 mins."""
    events = [
        MatchEvent(id="e1", minute=10.0, team="Arsenal", type=EventType.INTERCEPTION, x=65, y=50),
        MatchEvent(id="e2", minute=10.1, team="Arsenal", type=EventType.PASS, x=75, y=40),
        MatchEvent(id="e3", minute=10.2, team="Arsenal", type=EventType.SHOT, x=90, y=45),
    ]
    
    insights = detect_high_press(events)
    
    assert len(insights) == 1
    assert insights[0].kind == "high_press_turnover"
    assert insights[0].team == "Arsenal"
    assert insights[0].evidence == ["e1", "e2", "e3"]
    assert insights[0].facts["recovery_x"] == 65
    assert insights[0].facts["ended_in"] == EventType.SHOT.value

def test_detect_high_press_too_deep():
    """Invalid high press: recovery happens below the x=60 threshold."""
    events = [
        MatchEvent(id="e1", minute=15.0, team="Chelsea", type=EventType.TACKLE, x=59, y=50),
        MatchEvent(id="e2", minute=15.1, team="Chelsea", type=EventType.SHOT, x=85, y=50),
    ]
    
    insights = detect_high_press(events)
    
    assert len(insights) == 0  # Should be empty because x < 60

def test_detect_high_press_too_slow():
    """Invalid high press: the sequence takes longer than the 0.35-minute window."""
    events = [
        MatchEvent(id="e1", minute=20.0, team="Liverpool", type=EventType.INTERCEPTION, x=70, y=50),
        MatchEvent(id="e2", minute=20.4, team="Liverpool", type=EventType.SHOT, x=85, y=50),
    ]
    
    insights = detect_high_press(events)
    
    assert len(insights) == 0  # Should be empty because 0.4 > 0.35 window