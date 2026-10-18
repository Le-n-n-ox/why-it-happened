"""Watch a video and turn it into football events: detect and track players and the ball, work out
which team each player is on, map pixels to pitch metres, then convert the tracks to events.

    python -m cv.calibrate match.mp4 --preset penalty_box --out calib.json
    python -m cv.track_video match.mp4 --calib calib.json --attack Reds=right,Blues=left \\
        --team-colors Reds=#d93030,Blues=#2b57d9 --preview preview.mp4 --out events.json
    python scripts/simulate_video_feed.py --file events.json --reset --end      # watch the dashboard react

Add --post http://localhost:8000 to send events to the backend as they are found instead.

Honest limits: this is a prototype for a fixed camera. It does not see fouls, and the ball is hard to
detect, so expect gaps. Always watch the preview video: if the boxes are wrong the events will be wrong.
"""
from __future__ import annotations

import argparse
import json
import time
from collections import Counter, defaultdict
from pathlib import Path

PERSON, BALL = 0, 32          # COCO class ids


def parse_pairs(text: str) -> dict[str, str]:
    return dict(item.split("=", 1) for item in text.split(",") if "=" in item)


def hex_to_bgr(value: str):
    value = value.lstrip("#")
    r, g, b = (int(value[i:i + 2], 16) for i in (0, 2, 4))
    return (b, g, r)


def torso_colour(frame, box):
    """Average colour of the shirt area: the upper-middle of the player's box."""
    import numpy as np
    x1, y1, x2, y2 = (int(v) for v in box)
    h, w = y2 - y1, x2 - x1
    crop = frame[max(0, y1 + int(0.2 * h)):max(1, y1 + int(0.5 * h)), max(0, x1 + int(0.2 * w)):max(1, x2 - int(0.2 * w))]
    if crop.size == 0:
        return None
    return crop.reshape(-1, 3).mean(axis=0)


def nearest_team(colour, team_bgr: dict, max_distance: float):
    import numpy as np
    best, best_d = None, 1e9
    for team, bgr in team_bgr.items():
        d = float(np.linalg.norm(colour - np.array(bgr, dtype=float)))
        if d < best_d:
            best, best_d = team, d
    return best if best_d <= max_distance else None       # too far from both: referee or goalkeeper


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("video")
    parser.add_argument("--calib", required=True, help="from python -m cv.calibrate")
    parser.add_argument("--attack", required=True, help="which way each team attacks, e.g. Reds=right,Blues=left")
    parser.add_argument("--team-colors", required=True, help="shirt colours, e.g. Reds=#d93030,Blues=#2b57d9")
    parser.add_argument("--weights", default="yolov8m.pt", help="a YOLO weights file (yolov8n.pt is faster, less accurate)")
    parser.add_argument("--conf", type=float, default=0.25, help="player detection confidence")
    parser.add_argument("--ball-conf", type=float, default=0.10, help="ball detection confidence (lower: it is small)")
    parser.add_argument("--imgsz", type=int, default=1280, help="detector input size; larger finds the ball better")
    parser.add_argument("--colour-tolerance", type=float, default=90.0, help="max colour distance to a team")
    parser.add_argument("--stride", type=int, default=1, help="use every Nth frame (2 halves the work)")
    parser.add_argument("--preview", help="write an annotated video here, to check the tracking by eye")
    parser.add_argument("--tracks-out", default="tracks.json")
    parser.add_argument("--out", default="events.json")
    parser.add_argument("--min-confidence", type=float, default=0.5)
    parser.add_argument("--post", help="backend URL: send the events to POST /events instead of only saving")
    parser.add_argument("--token", help="X-Ingest-Token for the backend")
    parser.add_argument("--speed", type=float, default=0.2, help="seconds per match minute when posting")
    args = parser.parse_args()

    import cv2
    import numpy as np
    from ultralytics import YOLO

    from cv.events_from_tracks import Config, convert

    calib = json.loads(Path(args.calib).read_text())
    homography, _ = cv2.findHomography(np.array(calib["pixels"], dtype=np.float32),
                                       np.array(calib["pitch"], dtype=np.float32))
    size = calib.get("pitch_size", {"length": 105.0, "width": 68.0})
    attack_right = {team: side.strip().lower() == "right" for team, side in parse_pairs(args.attack).items()}
    team_bgr = {team: hex_to_bgr(value) for team, value in parse_pairs(args.team_colors).items()}

    def to_pitch(px: float, py: float):
        x, y = cv2.perspectiveTransform(np.array([[[px, py]]], dtype=np.float32), homography)[0][0]
        return float(x), float(y)

    cap = cv2.VideoCapture(args.video)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    model = YOLO(args.weights)

    writer = None
    votes: dict[int, Counter] = defaultdict(Counter)
    frames = []
    read = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        read += 1
        if (read - 1) % args.stride:
            continue
        t = (read - 1) / fps
        # Players are tracked. The ball is detected on its own with a lower threshold, because a small,
        # flickering ball rarely survives as a confirmed track.
        person_result = model.track(frame, persist=True, tracker="bytetrack.yaml", classes=[PERSON],
                                    conf=args.conf, imgsz=args.imgsz, verbose=False)[0]
        ball_result = model.predict(frame, classes=[BALL], conf=args.ball_conf, imgsz=args.imgsz, verbose=False)[0]

        players, ball, ball_box = [], None, None
        pboxes = person_result.boxes
        if pboxes is not None and len(pboxes) and pboxes.id is not None:
            for box, tid in zip(pboxes.xyxy.cpu().numpy(), pboxes.id.cpu().numpy()):
                colour = torso_colour(frame, box)
                team = nearest_team(colour, team_bgr, args.colour_tolerance) if colour is not None else None
                if not team:
                    continue                                    # a referee, a goalkeeper, or a bad crop
                votes[int(tid)][team] += 1
                x, y = to_pitch((box[0] + box[2]) / 2, float(box[3]))             # feet, not the box centre
                if -5 <= x <= size["length"] + 5 and -5 <= y <= size["width"] + 5:
                    players.append({"id": int(tid), "x": round(x, 2), "y": round(y, 2), "box": box.tolist()})
        bboxes = ball_result.boxes
        if bboxes is not None and len(bboxes):
            best = int(bboxes.conf.cpu().numpy().argmax())
            ball_box = bboxes.xyxy.cpu().numpy()[best]
            ball = to_pitch((ball_box[0] + ball_box[2]) / 2, (ball_box[1] + ball_box[3]) / 2)
        frames.append({"t": round(t, 3), "players": players,
                       "ball": {"x": round(ball[0], 2), "y": round(ball[1], 2)} if ball else None})
        if args.preview:
            if writer is None:
                h, w = frame.shape[:2]
                writer = cv2.VideoWriter(args.preview, cv2.VideoWriter_fourcc(*"mp4v"), fps / args.stride, (w, h))
            for p in players:
                team = votes[p["id"]].most_common(1)[0][0]
                x1, y1, x2, y2 = (int(v) for v in p["box"])
                cv2.rectangle(frame, (x1, y1), (x2, y2), team_bgr[team], 2)
                cv2.putText(frame, f"{team[:1]}{p['id']}", (x1, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.5, team_bgr[team], 2)
            if ball_box is not None:
                cv2.circle(frame, (int((ball_box[0] + ball_box[2]) / 2), int((ball_box[1] + ball_box[3]) / 2)),
                           8, (0, 255, 255), 2)
            writer.write(frame)
    cap.release()
    if writer:
        writer.release()

    # A player's team is the colour most often seen for that track, so one odd frame cannot flip it.
    for frame in frames:
        frame["players"] = [{"id": p["id"], "team": votes[p["id"]].most_common(1)[0][0], "x": p["x"], "y": p["y"]}
                            for p in frame["players"] if votes[p["id"]]]
    data = {"fps": fps / args.stride, "pitch": size, "attack_right": attack_right, "frames": frames}
    Path(args.tracks_out).write_text(json.dumps(data))
    events, conf = convert(data, Config(min_confidence=args.min_confidence), with_confidence=True)
    Path(args.out).write_text(json.dumps([e.model_dump(mode="json") for e in events], indent=2))
    with_ball = sum(1 for f in frames if f["ball"])
    avg_players = sum(len(f["players"]) for f in frames) / max(1, len(frames))
    print(f"tracking health: ball found in {100 * with_ball / max(1, len(frames)):.0f}% of frames, "
          f"{avg_players:.1f} players per frame on average, {len(votes)} player tracks")
    print("  (a usable run finds the ball in at least half the frames and about 10 to 22 players per frame;"
          " far more tracks than players means the tracker keeps losing and re-finding people)")
    counts = Counter(e.type.value for e in events)
    print(f"{len(frames)} frames, {len(events)} events {dict(counts)} -> {args.out}")
    if not events:
        print("No events found. Check the preview video: are players and the ball being boxed, and is the calibration right?")

    if args.post:
        import requests
        headers = {"X-Ingest-Token": args.token} if args.token else {}
        base = args.post.rstrip("/")
        requests.post(f"{base}/live/reset", headers=headers, timeout=10)
        previous = None
        for event in events:
            body = event.model_dump(mode="json")
            if previous is not None:
                time.sleep(min(max((body["minute"] - previous) * args.speed, 0.0), 2.0))
            previous = body["minute"]
            requests.post(f"{base}/events", json=body, headers=headers, timeout=10)
        requests.post(f"{base}/live/end", headers=headers, timeout=10)
        print(f"Posted {len(events)} events to {base}")


if __name__ == "__main__":
    main()