import os
from dataclasses import dataclass, field


@dataclass
class Settings:
    llm_api_key: str = field(default_factory=lambda: os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY", ""))
    llm_base_url: str = field(default_factory=lambda: os.getenv("LLM_BASE_URL", "https://api.openai.com/v1"))
    llm_model: str = field(default_factory=lambda: os.getenv("LLM_MODEL", "gpt-4o-mini"))
    openai_api_key: str = field(default_factory=lambda: os.getenv("OPENAI_API_KEY", ""))
    # transcription: "local" (faster-whisper), "openai", or "auto"
    transcriber: str = field(default_factory=lambda: os.getenv("TRANSCRIBER", "auto"))
    whisper_model: str = field(default_factory=lambda: os.getenv("WHISPER_MODEL", "small"))
    output_dir: str = field(default_factory=lambda: os.getenv("OUTPUT_DIR", "./output"))
    cors_origins: str = field(default_factory=lambda: os.getenv("CORS_ORIGINS", "*"))


PRESETS = {
    "youtube_shorts": {"label": "YouTube Shorts", "width": 1080, "height": 1920, "max_seconds": 60, "fps": 30, "video_bitrate": "8M"},
    "tiktok": {"label": "TikTok", "width": 1080, "height": 1920, "max_seconds": 180, "fps": 30, "video_bitrate": "6M"},
    "reels": {"label": "Instagram Reels", "width": 1080, "height": 1920, "max_seconds": 90, "fps": 30, "video_bitrate": "6M"},
}
