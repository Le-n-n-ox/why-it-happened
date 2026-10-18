"""Runs cv/track_video.py on a rendered video with a stand-in for YOLO that returns the true boxes.

This proves the plumbing (box parsing, team colours, referee exclusion, pixel -> pitch mapping,
preview video, conversion to events). It does NOT prove YOLO finds players and a ball in real footage.
"""
import json
import sys
import types

try:
    import cv2
    import numpy as np
except ImportError:                      # the prototype's dependencies are optional: the test skips itself
    cv2 = np = None

from tests.test_cv_events import scene, still

PX, PY, X0, Y0 = 600 / 105.0, 320 / 68.0, 20, 20            # metres -> pixels for the rendered video
RED, BLUE, YELLOW = (48, 48, 217), (217, 87, 43), (0, 215, 255)


def pix(x, y):
    return X0 + x * PX, Y0 + y * PY


class Tensor:
    def __init__(self, a):
        self.a = np.array(a, dtype=float)

    def cpu(self):
        return self

    def numpy(self):
        return self.a

    def __len__(self):
        return len(self.a)


def build(tmp_path):
    players = {"1": still("Reds", 30, 34), "2": still("Reds", 50, 34), "8": still("Blues", 70, 10)}
    ball = [(0, 30, 34), (1.0, 30, 34), (2.0, 50, 34), (3.2, 50, 34)]
    data = scene(players, ball, 3.5)
    colours = {"Reds": RED, "Blues": BLUE}
    path = str(tmp_path / "match.avi")
    writer = cv2.VideoWriter(path, cv2.VideoWriter_fourcc(*"MJPG"), 25, (640, 360))
    truth = []
    for f in data["frames"]:
        img = np.full((360, 640, 3), (60, 140, 60), dtype=np.uint8)
        boxes, classes, ids = [], [], []
        people = [(p["id"], colours[p["team"]], p["x"], p["y"]) for p in f["players"]] + [("9", YELLOW, 80.0, 50.0)]   # a referee
        for pid, colour, x, y in people:
            px, py = pix(x, y)
            box = (px - 8, py - 28, px + 8, py)
            cv2.rectangle(img, (int(box[0]), int(box[1])), (int(box[2]), int(box[3])), colour, -1)
            boxes.append(box); classes.append(0); ids.append(int(pid))
        bx, by = pix(f["ball"]["x"], f["ball"]["y"])
        cv2.circle(img, (int(bx), int(by)), 4, (255, 255, 255), -1)
        boxes.append((bx - 4, by - 4, bx + 4, by + 4)); classes.append(32); ids.append(None)
        writer.write(img)
        truth.append((boxes, classes, ids))
    writer.release()
    return path, truth


def fake_ultralytics(truth):
    """Mimics the two Ultralytics calls the tracker makes, per frame: track() for players, predict() for the ball."""
    class Boxes:
        def __init__(self, boxes, conf, ids=None):
            self.xyxy, self.conf = Tensor(boxes), Tensor(conf)
            self.id = Tensor(ids) if ids is not None else None

        def __len__(self):
            return len(self.xyxy.a)

    class Result:
        def __init__(self, img, boxes):
            self.orig_img, self.boxes = img, boxes

    class YOLO:
        def __init__(self, weights):
            self.k_track = 0
            self.k_predict = 0

        def track(self, frame, persist, tracker, classes, conf, imgsz, verbose):
            assert persist and tracker == "bytetrack.yaml" and classes == [0] and not verbose
            boxes, cls, ids = truth[self.k_track]
            self.k_track += 1
            keep = [n for n, c in enumerate(cls) if c == 0]
            return [Result(frame, Boxes([boxes[n] for n in keep], [0.9] * len(keep), [ids[n] for n in keep]))]

        def predict(self, frame, classes, conf, imgsz, verbose):
            assert classes == [32] and conf <= 0.2
            boxes, cls, ids = truth[self.k_predict]
            self.k_predict += 1
            keep = [n for n, c in enumerate(cls) if c == 32]
            return [Result(frame, Boxes([boxes[n] for n in keep], [0.4] * len(keep)))]

    return types.SimpleNamespace(YOLO=YOLO)


def test_a_rendered_video_becomes_the_right_events(tmp_path):
    if cv2 is None:
        return
    video, truth = build(tmp_path)
    calib = tmp_path / "calib.json"
    calib.write_text(json.dumps({"pixels": [[20, 20], [620, 20], [620, 340], [20, 340]],
                                 "pitch": [[0, 0], [105, 0], [105, 68], [0, 68]],
                                 "pitch_size": {"length": 105.0, "width": 68.0}}))
    sys.modules["ultralytics"] = fake_ultralytics(truth)
    from cv import track_video
    argv = ["track_video", video, "--calib", str(calib), "--attack", "Reds=right,Blues=left",
            "--team-colors", "Reds=#d93030,Blues=#2b57d9", "--preview", str(tmp_path / "preview.avi"),
            "--tracks-out", str(tmp_path / "tracks.json"), "--out", str(tmp_path / "events.json")]
    old = sys.argv
    sys.argv = argv
    try:
        track_video.main()
    finally:
        sys.argv = old
        sys.modules.pop("ultralytics", None)
    tracks = json.loads((tmp_path / "tracks.json").read_text())
    ids = {p["id"] for f in tracks["frames"] for p in f["players"]}
    assert ids == {1, 2, 8}                                              # the referee (9) was ignored
    assert {p["team"] for f in tracks["frames"] for p in f["players"] if p["id"] == 1} == {"Reds"}
    one = next(p for p in tracks["frames"][10]["players"] if p["id"] == 1)
    assert abs(one["x"] - 30) < 1 and abs(one["y"] - 34) < 1             # pixels were mapped to metres
    events = json.loads((tmp_path / "events.json").read_text())
    assert [(e["type"], e["team"]) for e in events] == [("pass", "Reds")]
    assert (tmp_path / "preview.avi").stat().st_size > 1000