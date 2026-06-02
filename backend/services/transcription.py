import asyncio
import logging
from typing import Callable, Optional
from config import WHISPER_MODEL, WHISPER_DEVICE, WHISPER_COMPUTE_TYPE

logger = logging.getLogger(__name__)
_model = None


def _resolve_device() -> tuple[str, str]:
    """Auto-detect best device. Falls back to CPU if CUDA DLLs missing."""
    if WHISPER_DEVICE != "cuda":
        return WHISPER_DEVICE, WHISPER_COMPUTE_TYPE
    try:
        import torch
        if not torch.cuda.is_available():
            logger.warning("CUDA not available — falling back to CPU (int8)")
            return "cpu", "int8"
        # Quick DLL check: try importing cublas via ctranslate2
        import ctranslate2
        _ = ctranslate2.get_cuda_device_count()
        return "cuda", WHISPER_COMPUTE_TYPE
    except (OSError, RuntimeError) as e:
        logger.warning(f"CUDA unavailable ({e}) — falling back to CPU (int8). "
                       "Install CUDA 12 toolkit for GPU: https://developer.nvidia.com/cuda-downloads")
        return "cpu", "int8"


def get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        device, compute_type = _resolve_device()
        logger.info(f"Loading Whisper {WHISPER_MODEL} on {device} ({compute_type})")
        _model = WhisperModel(
            WHISPER_MODEL,
            device=device,
            compute_type=compute_type,
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
