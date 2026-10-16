"""Pick the most 'viral' moments: LLM scoring with a heuristic fallback."""
import json
import re

from .config import Settings
from .transcribe import Segment

HOOK_WORDS = {
    # English
    "secret", "never", "always", "why", "how", "mistake", "truth", "best", "worst", "amazing",
    "crazy", "important", "problem", "money", "story", "imagine", "actually", "nobody", "everyone",
    # Arabic
    "سر", "أبدا", "دائما", "لماذا", "كيف", "خطأ", "الحقيقة", "أفضل", "أسوأ", "مذهل", "مهم",
    "مشكلة", "المال", "قصة", "تخيل", "فعلا", "لا أحد", "الجميع", "صدق",
}


def build_windows(segments: list[Segment], duration: float, min_len: float, max_len: float):
    """Candidate windows aligned to sentence boundaries (or fixed slices without a transcript)."""
    out = []
    if not segments:
        t = 0.0
        step = max(min_len, min(max_len, 30.0))
        while t < duration - 1:
            out.append((t, min(duration, t + step)))
            t += step / 2
        return out or [(0.0, min(duration, max_len))]
    for i, s in enumerate(segments):
        end = s.end
        j = i
        while j + 1 < len(segments) and segments[j + 1].end - s.start <= max_len:
            j += 1
            end = segments[j].end
            if end - s.start >= min_len and segments[j].text.rstrip().endswith((".", "!", "?", "؟", "…")):
                break
        if end - s.start >= min(min_len, duration):
            out.append((s.start, end))
    return out or [(segments[0].start, min(segments[-1].end, segments[0].start + max_len))]


def _text_in(segments, a, b):
    return " ".join(s.text for s in segments if s.start >= a - 0.01 and s.end <= b + 0.01)


def heuristic(segments, energy, duration, n, min_len, max_len, step=0.5):
    wins = build_windows(segments, duration, min_len, max_len)
    emean = (sum(energy) / len(energy)) if energy else 0.0
    scored = []
    for a, b in wins:
        text = _text_in(segments, a, b)
        words = re.findall(r"\w+", text.lower())
        e = energy[int(a / step): max(int(a / step) + 1, int(b / step))] or [0.0]
        loud = (sum(e) / len(e)) / (emean + 1e-9)
        density = len(words) / max(1.0, b - a)
        hooks = sum(1 for w in HOOK_WORDS if w in text.lower())
        punct = text.count("?") + text.count("؟") + text.count("!")
        score = 40 * min(loud, 2) / 2 + 25 * min(density / 3, 1) + 8 * min(hooks, 3) + 3 * min(punct, 3)
        scored.append({"start": round(a, 2), "end": round(b, 2), "score": round(min(score, 100), 1),
                       "text": text, "reason": "heuristic: loudness, speech density, hook words"})
    return _pick(scored, n)


def _pick(cands, n):
    cands = sorted(cands, key=lambda c: -c["score"])
    chosen = []
    for c in cands:
        if all(c["end"] <= o["start"] or c["start"] >= o["end"] for o in chosen):
            chosen.append(c)
        if len(chosen) >= n:
            break
    return sorted(chosen, key=lambda c: c["start"])


def llm_score(segments, duration, n, min_len, max_len, s: Settings):
    import httpx

    lines = "\n".join(f"[{x.start:.1f}-{x.end:.1f}] {x.text}" for x in segments)[:60000]
    prompt = (
        f"You are a viral short-form video editor. From this timestamped transcript pick the {n} best, "
        f"self-contained moments for YouTube Shorts/TikTok/Reels, each between {min_len:.0f} and {max_len:.0f} "
        "seconds, with a strong hook in the first seconds. Non-overlapping. Reply ONLY with JSON: "
        '{"clips":[{"start":float,"end":float,"score":0-100,"reason":str,"title":str,'
        '"description":str,"hashtags":[str]}]}. Write title/description/hashtags in the transcript language.\n\n'
        + lines
    )
    r = httpx.post(f"{s.llm_base_url.rstrip('/')}/chat/completions",
                   headers={"Authorization": f"Bearer {s.llm_api_key}"},
                   json={"model": s.llm_model, "temperature": 0.3,
                         "response_format": {"type": "json_object"},
                         "messages": [{"role": "user", "content": prompt}]}, timeout=180)
    r.raise_for_status()
    content = r.json()["choices"][0]["message"]["content"]
    m = re.search(r"\{.*\}", content, re.S)
    clips = json.loads(m.group(0) if m else content)["clips"]
    out = []
    for c in clips:
        a, b = max(0.0, float(c["start"])), min(duration, float(c["end"]))
        if b - a < 3:
            continue
        if b - a > max_len:
            b = a + max_len
        c.update(start=round(a, 2), end=round(b, 2), text=_text_in(segments, a, b))
        out.append(c)
    return _pick(out, n)


def select_moments(segments, energy, duration, n, min_len, max_len, s: Settings, log=print):
    if s.llm_api_key and segments:
        try:
            clips = llm_score(segments, duration, n, min_len, max_len, s)
            if clips:
                return clips, "llm"
        except Exception as e:  # noqa: BLE001
            log(f"LLM scoring failed ({type(e).__name__}); falling back to heuristic")
    return heuristic(segments, energy, duration, n, min_len, max_len), "heuristic"


def metadata(text: str, lang: str | None, platform: str) -> dict:
    """Heuristic title/description/hashtags when no LLM is available."""
    arabic = lang == "ar" or bool(re.search(r"[\u0600-\u06FF]", text))
    words = text.split()
    title = " ".join(words[:8]).strip(" .,!?؟") or ("مقطع مميز" if arabic else "Highlight")
    if len(words) > 8:
        title += "…"
    tags_common = {"youtube_shorts": ["#shorts"], "tiktok": ["#fyp", "#tiktok"], "reels": ["#reels"]}[platform]
    stop = {"the", "and", "that", "this", "with", "you", "for", "are", "was", "they", "them", "what", "have", "will", "your", "from", "makes", "does", "في", "من", "على", "إلى", "عن", "هذا", "التي", "الذي"}
    kws = [w.strip(".,!?؟:;\"'").lower() for w in words if len(w) > 3]
    kws = [w for w in dict.fromkeys(kws) if w not in stop][:4]
    tags = tags_common + ["#" + re.sub(r"\W", "", w) for w in kws if re.sub(r"\W", "", w)]
    if arabic:
        desc = f"{text[:180]}…\nشاهد المقطع كاملاً وتابعنا للمزيد!"
    else:
        desc = f"{text[:180]}…\nFollow for more!"
    return {"title": title, "description": desc, "hashtags": tags}
