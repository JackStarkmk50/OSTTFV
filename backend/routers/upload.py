import uuid
import json
import aiofiles
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from config import VIDEOS_DIR, JOBS_DIR

router = APIRouter()

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v"}


async def save_job(job: dict):
    job_path = JOBS_DIR / f"{job['job_id']}.json"
    async with aiofiles.open(job_path, "w", encoding="utf-8") as f:
        await f.write(json.dumps(job, ensure_ascii=False, indent=2))


async def load_job(job_id: str) -> dict:
    job_path = JOBS_DIR / f"{job_id}.json"
    if not job_path.exists():
        raise HTTPException(status_code=404, detail="Job not found")
    async with aiofiles.open(job_path, "r", encoding="utf-8") as f:
        return json.loads(await f.read())


@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    job_id = str(uuid.uuid4())
    video_dir = VIDEOS_DIR / job_id
    video_dir.mkdir(parents=True, exist_ok=True)
    video_path = video_dir / file.filename

    async with aiofiles.open(video_path, "wb") as out:
        while chunk := await file.read(1024 * 1024):
            await out.write(chunk)

    job = {
        "job_id": job_id,
        "filename": file.filename,
        "video_path": str(video_path),
        "status": "pending",
        "progress": 0.0,
        "message": "Uploaded",
        "result": None,
        "error": None,
    }
    await save_job(job)

    return {"job_id": job_id, "filename": file.filename, "status": "pending"}
