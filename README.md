# OpenShorts

**[العربية](#العربية) | [English](#english)**

Open-source tool that turns long videos (podcasts, interviews, YouTube links or uploaded files) into short vertical clips ready for **YouTube Shorts, TikTok and Instagram Reels**.

Live UI: https://openshorts.pages.dev (connect it to your own backend from Settings)

---

## English

### Features
- **Viral-moment detection** — transcribe with Whisper (local `faster-whisper` or OpenAI API), then score segments with any OpenAI-compatible LLM. Works **without any API key** using a heuristic scorer (loudness, speech density, hook words, questions).
- **Vertical 9:16 crop** — face-centered via OpenCV face detection, falls back to center crop.
- **Burned-in subtitles** — styled ASS captions with proper Arabic (RTL, shaped) and English rendering; `.srt` exported too.
- **Platform presets** — YouTube Shorts (≤60s), TikTok (≤180s), Reels (≤90s), 1080×1920 H.264/AAC.
- **Suggested title, description & hashtags** per clip (LLM or heuristic).
- **YouTube / URL input** via `yt-dlp`, or local file upload.
- **CLI + REST API + web UI** (Arabic RTL).

### Architecture
```
frontend/  static Vite app (Cloudflare Pages)  ──HTTP──▶  backend/  FastAPI + ffmpeg + yt-dlp + faster-whisper
```
Video processing needs ffmpeg and CPU/GPU time, so it can't run on Cloudflare. Run the backend on your machine or a server and set its URL in the UI **Settings** (stored in your browser).

### Quick start (Docker)
```bash
git clone https://github.com/moha700m/OpenShorts && cd OpenShorts
cp .env.example .env          # optionally add LLM_API_KEY / OPENAI_API_KEY
docker compose up --build     # API on :8000, UI on :5173
```

### CLI
```bash
cd backend && pip install -e ".[whisper]"     # needs ffmpeg installed
openshorts "https://www.youtube.com/watch?v=..." -n 3 -p youtube_shorts
openshorts podcast.mp4 -o out --min 20 --max 45 -l ar --whisper-model small
openshorts --serve --port 8000                # start the API
```
Options: `--no-llm` (force heuristic), `--transcriber auto|local|openai|none`, `--no-face`, `--no-subtitles`, `-p youtube_shorts|tiktok|reels`.
Output: `clip_XX_<platform>.mp4`, `.srt`, `.ass`, and `clips.json` (timings, score, title, description, hashtags).

### API
| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | status, presets |
| POST | `/api/jobs` | multipart: `url` or `file`, `num_clips`, `min_len`, `max_len`, `platform`, `language`, `subtitles`, `face_crop` |
| GET | `/api/jobs/{id}` | status, log, result |
| GET | `/api/jobs/{id}/files/{name}` | download a clip |

### Configuration (`.env`)
| Var | Default | |
|---|---|---|
| `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` | – / OpenAI / `gpt-4o-mini` | any OpenAI-compatible endpoint (OpenAI, Groq, OpenRouter, Ollama…) |
| `TRANSCRIBER` | `auto` | `local`, `openai`, `none` |
| `WHISPER_MODEL` | `small` | `tiny`…`large-v3` |
| `OPENAI_API_KEY` | – | for OpenAI Whisper API |
| `CORS_ORIGINS` | `*` | e.g. `https://openshorts.pages.dev` |

### Frontend
```bash
cd frontend && npm install && npm run dev        # VITE_BACKEND_URL sets the default backend
npm run build && npx wrangler@3 pages deploy dist --project-name openshorts
```

### Limitations
- Jobs are kept in memory (single process); no auth — don't expose the API publicly without a reverse proxy/auth.
- Face crop uses one static window per clip (median face position), not per-frame tracking.
- Heuristic mode is a rough approximation; an LLM key gives much better picks and metadata.

License: MIT

---

## العربية

<div dir="rtl">

### ما هو OpenShorts؟
أداة مفتوحة المصدر تحوّل الفيديوهات الطويلة (بودكاست، مقابلات، روابط يوتيوب أو ملفات مرفوعة) إلى مقاطع قصيرة عمودية جاهزة للنشر على **YouTube Shorts وTikTok وReels**.

### المزايا
- **اكتشاف أقوى اللحظات**: تفريغ صوتي بـ Whisper (محليًا عبر faster-whisper أو عبر OpenAI)، ثم تقييم المقاطع بنموذج لغوي متوافق مع OpenAI. يعمل أيضًا **بدون أي مفتاح API** عبر تقييم تلقائي (قوة الصوت، كثافة الكلام، كلمات الجذب، الأسئلة).
- **قص عمودي 9:16** مع توسيط الوجه تلقائيًا (OpenCV)، أو قص من المنتصف.
- **ترجمة مدمجة** بالعربية (مع تشكيل الحروف واتجاه RTL صحيح) والإنجليزية، مع ملف `.srt`.
- **إعدادات لكل منصة** وعنوان ووصف وهاشتاقات مقترحة لكل مقطع.
- **دعم روابط يوتيوب** عبر yt-dlp أو رفع ملف.
- **سطر أوامر + واجهة برمجية + واجهة ويب عربية**.

### التشغيل السريع
```bash
git clone https://github.com/moha700m/OpenShorts && cd OpenShorts
cp .env.example .env
docker compose up --build
```
ثم افتح الواجهة (محليًا `http://localhost:5173` أو https://openshorts.pages.dev) وضع عنوان الخادم `http://localhost:8000` من **الإعدادات**.

### سطر الأوامر
```bash
cd backend && pip install -e ".[whisper]"
openshorts "https://www.youtube.com/watch?v=..." -n 3 -l ar
```

### لماذا خادم منفصل؟
المعالجة تحتاج ffmpeg وقدرة حسابية، لذلك الواجهة مستضافة على Cloudflare Pages بينما المعالجة تتم على خادمك أنت — وفيديوهاتك لا تمر بأي طرف ثالث.

### القيود الحالية
- المهام محفوظة في الذاكرة ولا يوجد تسجيل دخول؛ لا تعرض الخادم للعامة بدون حماية.
- توسيط الوجه ثابت لكل مقطع وليس تتبعًا لكل إطار.
- الوضع التلقائي تقريبي؛ مفتاح نموذج لغوي يعطي نتائج أفضل بكثير.

الرخصة: MIT

</div>
