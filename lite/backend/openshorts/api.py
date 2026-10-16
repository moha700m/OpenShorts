"""FastAPI server. Jobs run in a background thread; results are served from OUTPUT_DIR."""
import hmac
import os
import shutil
import threading
import uuid

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from . import __version__
from .config import PRESETS, Settings
from .pipeline import process

settings = Settings()
app = FastAPI(title="OpenShorts API", version=__version__)


@app.middleware("http")
async def require_token(request: Request, call_next):
    """If OPENSHORTS_ACCESS_TOKEN is set, require it on every /api route except health.
    Accepted as `Authorization: Bearer <t>`, `X-Access-Token: <t>` or `?token=<t>` (for <video>/download links)."""
    tok = settings.access_token
    if tok and request.method != "OPTIONS" and request.url.path.startswith("/api/") and request.url.path != "/api/health":
        auth = request.headers.get("authorization", "")
        given = (auth[7:] if auth.lower().startswith("bearer ") else "") or request.headers.get("x-access-token", "") \
            or request.query_params.get("token", "")
        if not hmac.compare_digest(given.encode(), tok.encode()):
            return JSONResponse({"detail": "invalid or missing access token"}, status_code=401)
    return await call_next(request)


# CORS must be added last so it wraps the auth middleware (401s still carry CORS headers)
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
                   allow_origin_regex=settings.cors_origin_regex or None,
                   allow_methods=["*"], allow_headers=["*"])
JOBS: dict[str, dict] = {}
os.makedirs(settings.output_dir, exist_ok=True)


@app.get("/api/health")
def health():
    return {"ok": True, "version": __version__, "llm": bool(settings.llm_api_key),
            "transcriber": settings.transcriber, "auth": bool(settings.access_token), "presets": PRESETS}


def _run(job_id, source, opts):
    job = JOBS[job_id]
    job["status"] = "running"
    try:
        out = os.path.join(settings.output_dir, job_id)
        job["result"] = process(source, out, settings=settings, log=lambda m: job["log"].append(m), **opts)
        job["status"] = "done"
    except Exception as e:  # noqa: BLE001
        job["status"], job["error"] = "error", str(e)[-1000:]


@app.post("/api/jobs")
async def create_job(url: str | None = Form(None), file: UploadFile | None = File(None),
                     num_clips: int = Form(3), min_len: float = Form(15), max_len: float = Form(60),
                     platform: str = Form("youtube_shorts"), language: str | None = Form(None),
                     subtitles: bool = Form(True), face_crop: bool = Form(True)):
    if platform not in PRESETS:
        raise HTTPException(400, "unknown platform")
    job_id = uuid.uuid4().hex[:12]
    if file is not None and file.filename:
        up_dir = os.path.join(settings.output_dir, job_id)
        os.makedirs(up_dir, exist_ok=True)
        source = os.path.join(up_dir, "upload_" + os.path.basename(file.filename))
        with open(source, "wb") as f:
            shutil.copyfileobj(file.file, f)
    elif url:
        source = url
    else:
        raise HTTPException(400, "provide url or file")
    JOBS[job_id] = {"id": job_id, "status": "queued", "log": [], "result": None, "error": None}
    opts = dict(num_clips=max(1, min(num_clips, 10)), min_len=min_len, max_len=max_len, platform=platform,
                language=language or None, subtitles=subtitles, face_crop=face_crop)
    threading.Thread(target=_run, args=(job_id, source, opts), daemon=True).start()
    return {"id": job_id}


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    if job_id not in JOBS:
        raise HTTPException(404, "job not found")
    return JOBS[job_id]


@app.get("/api/jobs/{job_id}/files/{name}")
def get_file(job_id: str, name: str):
    path = os.path.join(settings.output_dir, job_id, os.path.basename(name))
    if job_id not in JOBS or not os.path.isfile(path):
        raise HTTPException(404, "file not found")
    return FileResponse(path)
