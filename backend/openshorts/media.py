import json
import os
import re
import subprocess


def run(cmd: list[str]) -> str:
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"command failed: {' '.join(cmd[:3])}...\n{p.stderr[-2000:]}")
    return p.stdout


def probe(path: str) -> dict:
    data = json.loads(run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", path]))
    v = next((s for s in data["streams"] if s["codec_type"] == "video"), None)
    return {
        "duration": float(data["format"]["duration"]),
        "width": int(v["width"]) if v else 0,
        "height": int(v["height"]) if v else 0,
        "has_audio": any(s["codec_type"] == "audio" for s in data["streams"]),
    }


def is_url(s: str) -> bool:
    return bool(re.match(r"^https?://", s))


def download(url: str, workdir: str) -> str:
    import yt_dlp

    opts = {
        "outtmpl": os.path.join(workdir, "source.%(ext)s"),
        "format": "bv*[height<=1080]+ba/b[height<=1080]/b",
        "merge_output_format": "mp4",
        "quiet": True,
        "noplaylist": True,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        path = ydl.prepare_filename(info)
    base = os.path.splitext(path)[0]
    for ext in (".mp4", ".mkv", ".webm"):
        if os.path.exists(base + ext):
            return base + ext
    return path


def extract_audio(src: str, dst: str) -> str:
    run(["ffmpeg", "-y", "-v", "error", "-i", src, "-vn", "-ac", "1", "-ar", "16000", dst])
    return dst


def audio_energy(wav: str, step: float = 0.5) -> list[float]:
    """RMS energy per `step` seconds window (used by the heuristic scorer)."""
    import numpy as np

    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", wav, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                         capture_output=True).stdout
    a = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    n = int(16000 * step)
    if len(a) < n:
        return [float(np.sqrt((a ** 2).mean()))] if len(a) else [0.0]
    a = a[: len(a) // n * n].reshape(-1, n)
    return [float(x) for x in np.sqrt((a ** 2).mean(axis=1))]
