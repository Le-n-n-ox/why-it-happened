"""Tell the tracker where the pitch is: click known points in one video frame.

    python -m cv.calibrate match.mp4 --preset penalty_box --out calib.json

A window opens on a video frame. Click each point in the order printed in the terminal. Press Enter
when done, or Esc to cancel. Works best on a fixed camera: clicking four points on the pitch markings
is enough for the tracker to turn pixels into pitch metres.

Pitch coordinates are metres on a 105 x 68 pitch, x along the pitch from the left goal line.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

PRESETS = {
    # corners of the right-hand penalty area: 16.5 m deep, 40.32 m wide, centred on the goal
    "penalty_box": [("penalty area, corner on the goal line, top", (88.5, 13.84)),
                    ("penalty area, corner on the goal line, bottom", (105.0, 13.84)),
                    ("penalty area, far top corner", (88.5, 54.16)),
                    ("penalty area, far bottom corner", (105.0, 54.16))],
    # the four corners of the whole pitch
    "full": [("left goal line, top corner", (0.0, 0.0)), ("right goal line, top corner", (105.0, 0.0)),
             ("right goal line, bottom corner", (105.0, 68.0)), ("left goal line, bottom corner", (0.0, 68.0))],
    # the halfway line, its ends and the centre circle's top and bottom
    "halfway": [("halfway line, top", (52.5, 0.0)), ("halfway line, bottom", (52.5, 68.0)),
                ("centre circle, top", (52.5, 24.85)), ("centre circle, bottom", (52.5, 43.15))],
}


def main() -> None:
    import cv2

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("video")
    parser.add_argument("--preset", choices=sorted(PRESETS), default="full")
    parser.add_argument("--frame", type=int, default=0, help="which frame to click on")
    parser.add_argument("--out", default="calib.json")
    args = parser.parse_args()

    cap = cv2.VideoCapture(args.video)
    cap.set(cv2.CAP_PROP_POS_FRAMES, args.frame)
    ok, image = cap.read()
    cap.release()
    if not ok:
        raise SystemExit(f"Could not read frame {args.frame} from {args.video}")

    targets = PRESETS[args.preset]
    clicks: list[tuple[int, int]] = []

    def on_mouse(event, x, y, *_):
        if event == cv2.EVENT_LBUTTONDOWN and len(clicks) < len(targets):
            clicks.append((x, y))
            print(f"  point {len(clicks)} set at pixel ({x}, {y})")
            if len(clicks) < len(targets):
                print(f"Next: {targets[len(clicks)][0]}")

    print(f"Click these {len(targets)} points in order:")
    print(f"First: {targets[0][0]}")
    cv2.namedWindow("calibrate")
    cv2.setMouseCallback("calibrate", on_mouse)
    while True:
        shown = image.copy()
        for n, (x, y) in enumerate(clicks, 1):
            cv2.circle(shown, (x, y), 6, (0, 255, 255), -1)
            cv2.putText(shown, str(n), (x + 8, y - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        cv2.imshow("calibrate", shown)
        key = cv2.waitKey(30) & 0xFF
        if key == 27:
            raise SystemExit("Cancelled")
        if key in (13, 10) and len(clicks) == len(targets):
            break
    cv2.destroyAllWindows()
    Path(args.out).write_text(json.dumps({
        "pixels": [list(c) for c in clicks], "pitch": [list(t[1]) for t in targets],
        "pitch_size": {"length": 105.0, "width": 68.0}}, indent=2))
    print(f"Saved {args.out}")


if __name__ == "__main__":
    main()