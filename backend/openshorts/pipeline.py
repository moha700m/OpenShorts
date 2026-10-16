"""End-to-end pipeline: input -> transcript -> best moments -> vertical clips with subtitles."""
import json
import os
import shutil
import tempfile
import time

from . import media
from .config import PRESETS, Settings
from .crop import crop_filter, face_center_x
from .scoring import metadata, select_moments
from .subtitles import write_ass, write_srt


def _ffmpeg_escape(path: str) -> str:
    return path.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'").replace(",", "\\,")


def process(source: str, out_dir: str, *, num_clips: int = 3, min_len: float = 15, max_len: float = 60,
            platform: str = "youtube_shorts", language: str | None = None, subtitles: bool = True,
            face_crop: bool = True, settings: Settings | None = None, log=print) -> dict:
    s = settings or Settings()
    preset = PRESETS[platform]
    max_len = min(max_len, preset["max_seconds"])
    os.makedirs(out_dir, exist_ok=True)
    work = tempfile.mkdtemp(prefix="openshorts_")
    t0 = time.time()
    try:
        if media.is_url(source):
            log(f"Downloading {source} ...")
            video = media.download(source, work)
        else:
            if not os.path.exists(source):
                raise FileNotFoundError(source)
            video = source
        info = media.probe(video)
        log(f"Video: {info['width']}x{info['height']}, {info['duration']:.1f}s")

        segments, lang, energy = [], language, []
        if info["has_audio"]:
            wav = media.extract_audio(video, os.path.join(work, "audio.wav"))
            energy = media.audio_energy(wav)
            log("Transcribing ...")
            try:
                segments, lang = media_transcribe(wav, s, language)
            except Exception as e:  # noqa: BLE001
                log(f"Transcription failed ({e}); continuing without subtitles text")
            log(f"Transcript: {len(segments)} segments, language={lang}")

        clips, mode = select_moments(segments, energy, info["duration"], num_clips, min_len, max_len, s, log)
        log(f"Selected {len(clips)} clip(s) using {mode} scoring")

        results = []
        for i, c in enumerate(clips, 1):
            a, b = c["start"], c["end"]
            name = f"clip_{i:02d}_{platform}"
            cx = face_center_x(video, a, b) if face_crop else None
            vf = crop_filter(info["width"], info["height"], cx, preset["width"], preset["height"])
            n_subs = 0
            if subtitles and segments:
                ass = os.path.join(out_dir, name + ".ass")
                n_subs = write_ass(segments, a, b, ass, preset["width"], preset["height"])
                write_srt(segments, a, b, os.path.join(out_dir, name + ".srt"))
                if n_subs:
                    vf += f",subtitles='{_ffmpeg_escape(os.path.abspath(ass))}'"
            out = os.path.join(out_dir, name + ".mp4")
            cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{a:.2f}", "-to", f"{b:.2f}", "-i", video,
                   "-vf", vf, "-r", str(preset["fps"]), "-c:v", "libx264", "-preset", "veryfast",
                   "-b:v", preset["video_bitrate"], "-pix_fmt", "yuv420p", "-movflags", "+faststart"]
            cmd += ["-c:a", "aac", "-b:a", "160k"] if info["has_audio"] else ["-an"]
            media.run(cmd + [out])
            meta = {k: c[k] for k in ("title", "description", "hashtags") if c.get(k)}
            if len(meta) < 3:
                meta = {**metadata(c.get("text", ""), lang, platform), **meta}
            results.append({"file": os.path.basename(out), "start": a, "end": b, "duration": round(b - a, 2),
                            "score": c.get("score"), "reason": c.get("reason"), "text": c.get("text", ""),
                            "face_centered": cx is not None, "subtitle_lines": n_subs, **meta})
            log(f"  [{i}] {a:.1f}-{b:.1f}s score={c.get('score')} -> {out}")

        report = {"source": source, "platform": platform, "preset": preset, "language": lang,
                  "scoring": mode, "clips": results, "elapsed_sec": round(time.time() - t0, 1)}
        with open(os.path.join(out_dir, "clips.json"), "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        return report
    finally:
        shutil.rmtree(work, ignore_errors=True)


def media_transcribe(wav, s, language):
    from .transcribe import transcribe
    return transcribe(wav, s, language)
