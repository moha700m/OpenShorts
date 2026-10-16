"""Key-free fallback for the moment picker (moha700m/OpenShorts addition).

When neither GEMINI_API_KEY nor an OpenAI-compatible LLM_BASE_URL is configured, ``llm_backend``
routes the two text stages of ``main.get_viral_clips`` (score -> detail) here. It answers the
SAME prompts with the SAME JSON shapes using simple signals: hook words (Arabic + English),
questions/exclamations, numbers, speech density, and position. Quality is far below a real LLM,
but the whole pipeline (reframe, subtitles, hooks, metadata) runs end to end without any key.

Enable explicitly with LLM_PROVIDER=heuristic; it is also the automatic choice when no LLM is
configured at all.
"""
from __future__ import annotations

import json
import re
from typing import Optional, Tuple

HOOK_WORDS = [
    "secret", "never", "always", "why", "how", "mistake", "truth", "best", "worst", "amazing", "crazy",
    "important", "problem", "money", "story", "imagine", "actually", "nobody", "everyone", "stop", "free",
    "سر", "أبدا", "ابدا", "دائما", "لماذا", "ليش", "كيف", "خطأ", "غلط", "الحقيقة", "أفضل", "افضل", "أسوأ",
    "مذهل", "مهم", "مشكلة", "فلوس", "المال", "قصة", "تخيل", "فعلا", "لا أحد", "الجميع", "صدق", "مجاني",
    "معلومات", "اكتشاف", "تجربة", "نصيحة", "انتبه", "لازم", "أول مرة",
]
STOP = set("""the and that this with you for are was they them what have will your from does just like
في من على إلى الى عن هذا هذه التي الذي اللي يعني صديقي والله طبعا كذا إنك انك عشان راح كان لكن ولكن هو هي
انا أنا احنا إحنا اذا إذا ما لا مع كل بس شي شيء يا هذي""".split())


def _windows(prompt: str):
    m = re.search(r"WINDOWS_JSON:\s*(.*?)\n\s*Return only", prompt, re.S)
    if not m:
        return []
    try:
        data = json.loads(m.group(1))
    except json.JSONDecodeError:
        return []
    return data if isinstance(data, list) else data.get("windows", [])


def _lang(prompt: str) -> str:
    m = re.search(r"TRANSCRIPT_LANGUAGE:\s*(\S+)", prompt)
    return (m.group(1) if m else "en").lower()


def _score_text(text: str, dur: float) -> Tuple[int, str]:
    low = text.lower()
    words = re.findall(r"\w+", low)
    hooks = sum(1 for w in HOOK_WORDS if w in low)
    q = text.count("?") + text.count("؟") + text.count("!")
    nums = len(re.findall(r"\d+", text))
    density = len(words) / max(dur, 1.0)
    score = 25 + 9 * min(hooks, 4) + 5 * min(q, 3) + 3 * min(nums, 3) + 12 * min(density / 3.0, 1.0)
    outro = any(k in low for k in ("subscribe", "اشترك", "السلام عليكم", "thanks for watching", "see you"))
    if outro:
        score -= 10
    reason = f"heuristic: {hooks} hook words, {q} questions/exclaims, {density:.1f} words/s"
    return int(max(0, min(95, score))), reason


def _sentences(text: str):
    parts = re.split(r"(?<=[.!?؟…])\s+", text.strip())
    return [p.strip() for p in parts if p.strip()]


def _title(text: str, arabic: bool) -> str:
    sents = _sentences(text) or [text]
    best = max(sents[:6], key=lambda s: _score_text(s, max(len(s.split()) / 2.5, 1))[0])
    words = best.split()
    t = " ".join(words[:9]).strip(" ,.،")
    return (t + "…") if len(words) > 9 else t or ("مقطع مميز" if arabic else "Must-watch moment")


def _hook(text: str, arabic: bool) -> str:
    for s in _sentences(text)[:5]:
        if s.endswith(("?", "؟")) and len(s.split()) <= 12:
            return s
    words = text.split()
    return " ".join(words[:7]).strip(" ,.،") + ("…" if len(words) > 7 else "")


def _tags(text: str, n=4):
    seen = []
    for w in re.findall(r"\w+", text.lower()):
        if len(w) > 3 and w not in STOP and not w.isdigit() and w not in seen:
            seen.append(w)
    return ["#" + w for w in seen[:n]]


def generate_json(prompt: str, schema, model: Optional[str] = None):
    wins = _windows(prompt)
    name = getattr(schema, "__name__", "")
    lang = _lang(prompt)
    if name == "ScoreResponse" or '"windows"' in prompt.split("Return only")[-1]:
        out = []
        for w in wins:
            s, r = _score_text(str(w.get("text", "")), float(w["end"]) - float(w["start"]))
            out.append({"id": w["id"], "start": float(w["start"]), "end": float(w["end"]), "score": s, "reason": r})
        return {"windows": out}, None

    # detail pass
    m = re.search(r"must be ([\d.]+) to ([\d.]+) seconds long", prompt)
    min_s, max_s = (float(m.group(1)), float(m.group(2))) if m else (15.0, 60.0)
    m = re.search(r"return (\d+) to (\d+) clips", prompt)
    max_clips = int(m.group(2)) if m else 3
    target = min(max_s, max(min_s, (min_s + max_s) / 2))
    ranked = sorted(wins, key=lambda w: -_score_text(str(w.get("text", "")), float(w["end"]) - float(w["start"]))[0])
    shorts = []
    for w in ranked[:max_clips]:
        a, b = float(w["start"]), float(w["end"])
        end = min(b, a + target)
        if end - a < min_s:
            end = min(b, a + min_s)
        text = str(w.get("text", ""))
        arabic = lang.startswith("ar") or bool(re.search(r"[\u0600-\u06FF]", text))
        score, why = _score_text(text, end - a)
        title, hook = _title(text, arabic), _hook(text, arabic)
        tags = " ".join(_tags(text))
        follow = "تابعنا للمزيد!" if arabic else "Follow for more!"
        shorts.append({
            "start": a, "end": end, "source_window_id": w.get("id", ""), "predicted_score": score,
            "video_description_for_tiktok": f"{hook} {tags} #fyp",
            "video_description_for_instagram": f"{title}\n\n{follow}\n{tags} #reels",
            "video_title_for_youtube_short": f"{title} #shorts",
            "viral_hook_text": hook, "why": why,
        })
    return {"shorts": shorts}, None
