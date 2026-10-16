"""Generate styled ASS subtitles (Arabic RTL + English) for burning in with libass."""
import re

from .transcribe import Segment


def _ts(t: float) -> str:
    t = max(0.0, t)
    h, m = int(t // 3600), int(t % 3600 // 60)
    return f"{h}:{m:02d}:{t % 60:05.2f}"


def _chunks(seg: Segment, max_words: int):
    """Split long segments into short, readable caption chunks with proportional timing."""
    words = seg.text.split()
    if not words:
        return []
    groups = [words[i:i + max_words] for i in range(0, len(words), max_words)]
    dur = (seg.end - seg.start) / len(words)
    out, t = [], seg.start
    for g in groups:
        out.append((t, t + dur * len(g), " ".join(g)))
        t += dur * len(g)
    return out


def write_ass(segments: list[Segment], start: float, end: float, path: str, width=1080, height=1920,
              font="Noto Sans Arabic", max_words=4):
    arabic = any(re.search(r"[\u0600-\u06FF]", s.text) for s in segments)
    size = int(height * 0.045)
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font},{size},&H00FFFFFF,&H0000D7FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,{max(3, size // 12)},2,2,80,80,{int(height * 0.22)},{178 if arabic else 1}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    for s in segments:
        if s.end <= start or s.start >= end:
            continue
        for a, b, text in _chunks(s, max_words):
            a, b = max(a, start) - start, min(b, end) - start
            if b - a < 0.05:
                continue
            text = text.replace("{", "(").replace("}", ")").replace("\n", " ")
            lines.append(f"Dialogue: 0,{_ts(a)},{_ts(b)},Default,,0,0,0,,{{\\fad(60,60)}}{text}")
    with open(path, "w", encoding="utf-8") as f:
        f.write(header + "\n".join(lines) + "\n")
    return len(lines)


def write_srt(segments: list[Segment], start: float, end: float, path: str):
    def ts(t):
        ms = int(round(t * 1000))
        return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
    n = 0
    with open(path, "w", encoding="utf-8") as f:
        for s in segments:
            if s.end <= start or s.start >= end:
                continue
            n += 1
            f.write(f"{n}\n{ts(max(s.start, start) - start)} --> {ts(min(s.end, end) - start)}\n{s.text}\n\n")
