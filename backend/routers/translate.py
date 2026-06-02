import json
import aiofiles
from fastapi import APIRouter, HTTPException
from models.schemas import TranslateRequest, SaveSegmentsRequest
from config import JOBS_DIR
from services.translation import translate_segments

router = APIRouter()


async def _load_job(job_id: str) -> dict:
    job_path = JOBS_DIR / f"{job_id}.json"
    if not job_path.exists():
        raise HTTPException(404, "Job not found")
    async with aiofiles.open(job_path, "r", encoding="utf-8") as f:
        return json.loads(await f.read())


async def _save_job(job: dict):
    job_path = JOBS_DIR / f"{job['job_id']}.json"
    async with aiofiles.open(job_path, "w", encoding="utf-8") as f:
        await f.write(json.dumps(job, ensure_ascii=False, indent=2))


@router.post("/translate/{job_id}")
async def translate(job_id: str, req: TranslateRequest):
    job = await _load_job(job_id)
    if job["status"] != "done" or not job.get("result"):
        raise HTTPException(400, "Transcription not complete")

    result = job["result"]
    src_lang = result["language"]
    raw_segs = result["segments"]

    updated = await translate_segments(raw_segs, src_lang, req.mode)

    result["segments"] = updated
    job["result"] = result
    await _save_job(job)

    return {"segments": updated}


@router.put("/segments/{job_id}")
async def save_segments(job_id: str, req: SaveSegmentsRequest):
    job = await _load_job(job_id)
    if not job.get("result"):
        raise HTTPException(400, "No transcription result")

    job["result"]["segments"] = [s.model_dump() for s in req.segments]
    await _save_job(job)
    return {"ok": True}
