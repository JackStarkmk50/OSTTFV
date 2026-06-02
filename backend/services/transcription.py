import asyncio
from typing import Callable, Optional
from config import WHISPER_MODEL, WHISPER_DEVICE, WHISPER_COMPUTE_TYPE

_model = None


def get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        _model = WhisperModel(
            WHISPER_MODEL,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE_TYPE,
        )
    return _model


async def transcribe_video(
    video_path: str,
    language: Optional[str] = None,
    progress_callback: Optional[Callable] = None,
):
    loop = asyncio.get_event_loop()

    def _run():
        model = get_model()
        segments_iter, info = model.transcribe(
            video_path,
            word_timestamps=True,
            language=language if language else None,
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
        )
        segments = []
        for seg in segments_iter:
            words = []
            for w in seg.words or []:
                words.append({
                    "word": w.word.strip(),
                    "start": round(w.start, 3),
                    "end": round(w.end, 3),
                    "confidence": round(w.probability, 3),
                })
            segments.append({
                "id": len(segments),
                "start": round(seg.start, 3),
                "end": round(seg.end, 3),
                "text": seg.text.strip(),
                "words": words,
            })
            if progress_callback and info.duration > 0:
                pct = min(95.0, (seg.end / info.duration) * 100)
                progress_callback(pct, f"Transcribed {seg.end:.1f}s / {info.duration:.1f}s")
        return segments, info.language, round(info.duration, 3)

    return await loop.run_in_executor(None, _run)
