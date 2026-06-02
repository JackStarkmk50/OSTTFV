import json
import asyncio
import aiofiles
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, BackgroundTasks, HTTPException
from models.schemas import TranscribeRequest, JobResponse, TranscriptionResult, Segment, Word, TextStyle
from config import JOBS_DIR
from services.transcription import transcribe_video
from services.transliteration import romanize_text

router = APIRouter()

_ws_connections: dict[str, list[WebSocket]] = {}


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


async def _broadcast(job_id: str, message: dict):
    sockets = _ws_connections.get(job_id, [])
    dead = []
    for ws in sockets:
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        sockets.remove(ws)


def _regroup_segments(raw_segs: list, mode: str, word_count: int) -> list:
    if mode == "sentence":
        return raw_segs

    # Collect all words from all segments
    all_words = []
    for seg in raw_segs:
        all_words.extend(seg.get("words", []))

    if not all_words:
        return raw_segs

    if mode == "word":
        return [
            {
                "id": i,
                "start": w["start"],
                "end": w["end"],
                "text": w["word"].strip(),
                "words": [w],
            }
            for i, w in enumerate(all_words)
            if w["word"].strip()
        ]

    # mode == "group"
    n = max(1, word_count)
    groups = []
    for i in range(0, len(all_words), n):
        chunk = [w for w in all_words[i:i + n] if w["word"].strip()]
        if not chunk:
            continue
        groups.append({
            "id": len(groups),
            "start": chunk[0]["start"],
            "end": chunk[-1]["end"],
            "text": " ".join(w["word"].strip() for w in chunk),
            "words": chunk,
        })
    return groups


async def _run_transcription(job_id: str, language: str | None,
                              subtitle_mode: str = "sentence", word_count: int = 3):
    job = await _load_job(job_id)
    job["status"] = "processing"
    job["progress"] = 0.0
    job["message"] = "Starting transcription..."
    await _save_job(job)
    await _broadcast(job_id, {"type": "progress", "progress": 0, "message": "Starting transcription..."})

    try:
        async def on_progress(pct: float, msg: str):
            job["progress"] = pct
            job["message"] = msg
            await _save_job(job)
            await _broadcast(job_id, {"type": "progress", "progress": pct, "message": msg})

        raw_segs, detected_lang, duration = await transcribe_video(
            job["video_path"], language=language, progress_callback=on_progress
        )

        raw_segs = _regroup_segments(raw_segs, subtitle_mode, word_count)

        segments = []
        for seg in raw_segs:
            style = TextStyle()
            romanized = romanize_text(seg["text"], detected_lang)
            words = [Word(**w) for w in seg["words"]]
            segments.append(Segment(
                id=seg["id"],
                start=seg["start"],
                end=seg["end"],
                text=seg["text"],
                transliterated=romanized,
                words=words,
                style=style,
            ))

        result = TranscriptionResult(
            job_id=job_id,
            filename=job["filename"],
            duration=duration,
            language=detected_lang,
            segments=segments,
        )

        job["status"] = "done"
        job["progress"] = 100.0
        job["message"] = "Transcription complete"
        job["result"] = result.model_dump()
        await _save_job(job)

        await _broadcast(job_id, {
            "type": "done",
            "data": result.model_dump(),
        })

    except Exception as e:
        job["status"] = "error"
        job["error"] = str(e)
        await _save_job(job)
        await _broadcast(job_id, {"type": "error", "message": str(e)})


@router.post("/transcribe/{job_id}")
async def start_transcription(
    job_id: str,
    req: TranscribeRequest,
    background_tasks: BackgroundTasks,
):
    job = await _load_job(job_id)
    if job["status"] == "processing":
        raise HTTPException(400, "Already processing")
    background_tasks.add_task(_run_transcription, job_id, req.language,
                              req.subtitle_mode, req.word_count)
    return {"status": "processing", "job_id": job_id}


@router.get("/job/{job_id}")
async def get_job(job_id: str):
    return await _load_job(job_id)


@router.websocket("/ws/{job_id}")
async def websocket_progress(ws: WebSocket, job_id: str):
    await ws.accept()
    _ws_connections.setdefault(job_id, []).append(ws)

    # Send current state immediately
    try:
        job = await _load_job(job_id)
        if job["status"] == "done":
            await ws.send_json({"type": "done", "data": job["result"]})
        elif job["status"] == "error":
            await ws.send_json({"type": "error", "message": job.get("error", "Unknown error")})
        else:
            await ws.send_json({
                "type": "progress",
                "progress": job.get("progress", 0),
                "message": job.get("message", ""),
            })
    except Exception:
        pass

    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        sockets = _ws_connections.get(job_id, [])
        if ws in sockets:
            sockets.remove(ws)
