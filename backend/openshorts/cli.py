import argparse
import json
import sys

from .config import PRESETS, Settings


def main(argv=None):
    p = argparse.ArgumentParser(prog="openshorts", description="Turn long videos into vertical short clips.")
    p.add_argument("source", nargs="?", help="YouTube/URL or local video file")
    p.add_argument("-o", "--output", default="./output", help="output directory")
    p.add_argument("-n", "--num-clips", type=int, default=3)
    p.add_argument("--min", dest="min_len", type=float, default=15, help="min clip seconds")
    p.add_argument("--max", dest="max_len", type=float, default=60, help="max clip seconds")
    p.add_argument("-p", "--platform", choices=list(PRESETS), default="youtube_shorts")
    p.add_argument("-l", "--language", help="force transcript language, e.g. ar, en")
    p.add_argument("--transcriber", choices=["auto", "local", "openai", "none"])
    p.add_argument("--whisper-model", help="faster-whisper model size (tiny, base, small, medium, large-v3)")
    p.add_argument("--no-llm", action="store_true", help="force heuristic scoring")
    p.add_argument("--no-subtitles", action="store_true")
    p.add_argument("--no-face", action="store_true", help="center crop instead of face tracking")
    p.add_argument("--serve", action="store_true", help="run the HTTP API instead")
    p.add_argument("--host", default="0.0.0.0")
    p.add_argument("--port", type=int, default=8000)
    a = p.parse_args(argv)

    if a.serve:
        import uvicorn
        uvicorn.run("openshorts.api:app", host=a.host, port=a.port)
        return 0
    if not a.source:
        p.error("source is required (or use --serve)")

    s = Settings()
    if a.transcriber:
        s.transcriber = a.transcriber
    if a.whisper_model:
        s.whisper_model = a.whisper_model
    if a.no_llm:
        s.llm_api_key = ""
    from .pipeline import process
    rep = process(a.source, a.output, num_clips=a.num_clips, min_len=a.min_len, max_len=a.max_len,
                  platform=a.platform, language=a.language, subtitles=not a.no_subtitles,
                  face_crop=not a.no_face, settings=s, log=lambda m: print(m, file=sys.stderr))
    print(json.dumps(rep, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
