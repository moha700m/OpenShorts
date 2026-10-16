"""Transcription via faster-whisper (local) or the OpenAI Whisper API."""
from dataclasses import dataclass, asdict

from .config import Settings


@dataclass
class Segment:
    start: float
    end: float
    text: str

    def dict(self):
        return asdict(self)


def _local(wav: str, s: Settings, language: str | None):
    from faster_whisper import WhisperModel

    model = WhisperModel(s.whisper_model, device="auto", compute_type="int8")
    # Decode with ffmpeg ourselves (avoids PyAV version issues): 16 kHz mono float32
    import subprocess
    import numpy as np
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", wav, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                         capture_output=True, check=True).stdout
    audio = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    segs, info = model.transcribe(audio, language=language, vad_filter=True, word_timestamps=False)
    return [Segment(x.start, x.end, x.text.strip()) for x in segs if x.text.strip()], info.language


def _openai(wav: str, s: Settings, language: str | None):
    import httpx

    data = {"model": "whisper-1", "response_format": "verbose_json"}
    if language:
        data["language"] = language
    with open(wav, "rb") as f:
        r = httpx.post("https://api.openai.com/v1/audio/transcriptions",
                       headers={"Authorization": f"Bearer {s.openai_api_key}"},
                       data=data, files={"file": ("audio.wav", f, "audio/wav")}, timeout=600)
    r.raise_for_status()
    j = r.json()
    return [Segment(x["start"], x["end"], x["text"].strip()) for x in j.get("segments", [])], j.get("language")


def transcribe(wav: str, s: Settings, language: str | None = None):
    mode = s.transcriber
    if mode == "auto":
        try:
            import faster_whisper  # noqa: F401
            mode = "local"
        except ImportError:
            mode = "openai" if s.openai_api_key else "none"
    if mode == "local":
        return _local(wav, s, language)
    if mode == "openai":
        if not s.openai_api_key:
            raise RuntimeError("TRANSCRIBER=openai requires OPENAI_API_KEY")
        return _openai(wav, s, language)
    return [], language
