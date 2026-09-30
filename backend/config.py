import os
from pathlib import Path

# Suppress HuggingFace symlinks warning on Windows — must be set before any HF import
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

BASE_DIR = Path(__file__).parent
STORAGE_DIR = BASE_DIR / "storage"
VIDEOS_DIR = STORAGE_DIR / "videos"
JOBS_DIR = STORAGE_DIR / "jobs"

WHISPER_MODEL = "large-v3"  # more accurate than turbo for Indic low-resource languages
WHISPER_DEVICE = "cuda"
WHISPER_COMPUTE_TYPE = "float16"

OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "gemma3:4b"   # 140+ langs incl. Tamil/Telugu/Malayalam/Hindi; fits RTX 4060 8GB

VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
JOBS_DIR.mkdir(parents=True, exist_ok=True)
