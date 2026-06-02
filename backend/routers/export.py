import json
import aiofiles
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse, Response
from models.schemas import ExportVideoRequest
from config import JOBS_DIR, VIDEOS_DIR
from services.export_service import generate_srt, burn_subtitles

router = APIRouter()


async def _load_job(job_id: str) -> dict:
    job_path = JOBS_DIR / f"{job_id}.json"
    if not job_path.exists():
        raise HTTPException(404, "Job not found")
    async with aiofiles.open(job_path, "r", encoding="utf-8") as f:
        return json.loads(await f.read())


@router.get("/export/srt/{job_id}")
async def export_srt(job_id: str):
    job = await _load_job(job_id)
    if not job.get("result"):
        raise HTTPException(400, "No transcription result")

    segments = job["result"]["segments"]
    srt_content = generate_srt(segments)
    filename = Path(job["filename"]).stem + ".srt"

    return Response(
        content=srt_content.encode("utf-8"),
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/export/video/{job_id}")
async def export_video(job_id: str, req: ExportVideoRequest):
    job = await _load_job(job_id)
    if not job.get("result"):
        raise HTTPException(400, "No transcription result")

    video_path = job["video_path"]
    stem = Path(job["filename"]).stem
    output_path = str(VIDEOS_DIR / job_id / f"{stem}_subtitled.mp4")

    segments = [s.model_dump() for s in req.segments]
    await burn_subtitles(video_path, segments, output_path)

    return {"download_url": f"/api/video/{job_id}/{stem}_subtitled.mp4"}


@router.get("/video/{job_id}/{filename}")
async def stream_video(job_id: str, filename: str):
    video_path = VIDEOS_DIR / job_id / filename
    if not video_path.exists():
        raise HTTPException(404, "Video not found")

    return FileResponse(
        path=str(video_path),
        media_type="video/mp4",
        headers={"Accept-Ranges": "bytes"},
    )
