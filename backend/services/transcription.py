import asyncio
import logging
from typing import Callable, Optional
from config import WHISPER_MODEL, WHISPER_DEVICE, WHISPER_COMPUTE_TYPE

logger = logging.getLogger(__name__)
_model = None

# Initial prompts prime Whisper to output correct script — significantly improves WER for Indic
_LANG_PROMPTS: dict[str, str] = {
    "ta": "வணக்கம். இது தமிழ் பேச்சு ஆகும்.",
    "te": "నమస్కారం. ఇది తెలుగు మాట.",
    "ml": "നമസ്കാരം. ഇത് മലയാളം സംഭാഷണം ആണ്.",
    "hi": "नमस्ते। यह हिंदी भाषण है।",
    "kn": "ನಮಸ್ಕಾರ. ಇದು ಕನ್ನಡ ಮಾತು.",
    "bn": "নমস্কার। এটি বাংলা বক্তৃতা।",
}


def _resolve_device() -> tuple[str, str]:
    if WHISPER_DEVICE != "cuda":
        return WHISPER_DEVICE, WHISPER_COMPUTE_TYPE
    try:
        import torch
        if not torch.cuda.is_available():
            logger.warning("CUDA not available — falling back to CPU int8")
            return "cpu", "int8"
        import ctranslate2
        _ = ctranslate2.get_cuda_device_count()
        return "cuda", WHISPER_COMPUTE_TYPE
    except (OSError, RuntimeError) as e:
        logger.warning(f"CUDA unavailable ({e}) — CPU fallback. "
                       "Install CUDA 12 toolkit for GPU.")
        return "cpu", "int8"


def get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        device, compute_type = _resolve_device()
        logger.info(f"Loading Whisper {WHISPER_MODEL} on {device} ({compute_type})")
        _model = WhisperModel(WHISPER_MODEL, device=device, compute_type=compute_type)
    return _model


async def transcribe_video(
    video_path: str,
    language: Optional[str] = None,
    progress_callback: Optional[Callable] = None,
) -> tuple[list, str, float]:
    loop = asyncio.get_event_loop()

    def _run():
        model = get_model()

        # User hint primes the initial prompt for correct script, but language is always
        # auto-detected — forcing language can mis-transcribe mixed-language or wrong-guess clips
        initial_prompt = _LANG_PROMPTS.get(language or "", None) if language else None

        segments_iter, info = model.transcribe(
            video_path,
            word_timestamps=True,
            language=None,  # always auto-detect
            initial_prompt=initial_prompt,
            beam_size=5,
            best_of=5,
            patience=1.0,
            vad_filter=True,
            vad_parameters=dict(
                min_silence_duration_ms=300,
                speech_pad_ms=200,
            ),
            condition_on_previous_text=True,
            no_speech_threshold=0.6,
            log_prob_threshold=-1.0,
            compression_ratio_threshold=2.4,
        )

        segments = []
        for seg in segments_iter:
            words = [
                {
                    "word": w.word.strip(),
                    "start": round(w.start, 3),
                    "end": round(w.end, 3),
                    "confidence": round(w.probability, 3),
                }
                for w in (seg.words or [])
                if w.word.strip()
            ]
            if not seg.text.strip():
                continue
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
