"""Compute a 9:16 crop window, centered on detected faces when possible (OpenCV Haar cascade)."""


def face_center_x(video: str, start: float, end: float, samples: int = 12) -> float | None:
    """Return the median horizontal face center (0..1) within [start, end], or None."""
    try:
        import cv2
        cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    except (ImportError, AttributeError):
        return None
    cap = cv2.VideoCapture(video)
    if not cap.isOpened():
        return None
    xs = []
    for i in range(samples):
        t = start + (end - start) * (i + 0.5) / samples
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ok, frame = cap.read()
        if not ok:
            continue
        h, w = frame.shape[:2]
        scale = 480 / max(w, 1)
        small = cv2.resize(frame, (480, int(h * scale))) if scale < 1 else frame
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        faces = cascade.detectMultiScale(gray, 1.1, 5, minSize=(24, 24))
        if len(faces):
            x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])  # largest face = likely speaker
            xs.append((x + fw / 2) / small.shape[1])
    cap.release()
    if not xs:
        return None
    xs.sort()
    return xs[len(xs) // 2]


def crop_filter(src_w: int, src_h: int, center_x: float | None, out_w: int, out_h: int) -> str:
    """ffmpeg filter for a 9:16 crop + scale. Falls back to center crop."""
    target = out_w / out_h
    if src_w / src_h > target:  # wider than 9:16 -> crop width
        cw = int(src_h * target) // 2 * 2
        cx = (center_x if center_x is not None else 0.5) * src_w
        x = int(min(max(cx - cw / 2, 0), src_w - cw))
        return f"crop={cw}:{src_h}:{x}:0,scale={out_w}:{out_h}:flags=lanczos,setsar=1"
    ch = int(src_w / target) // 2 * 2
    y = (src_h - ch) // 2
    return f"crop={src_w}:{ch}:0:{y},scale={out_w}:{out_h}:flags=lanczos,setsar=1"
