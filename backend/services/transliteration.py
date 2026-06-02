from indic_transliteration import sanscript
from indic_transliteration.sanscript import transliterate

# Map faster-whisper language codes → indic_transliteration script constants
_SCRIPT_MAP: dict[str, str] = {
    "ta": sanscript.TAMIL,
    "te": sanscript.TELUGU,
    "ml": sanscript.MALAYALAM,
    "hi": sanscript.DEVANAGARI,
    "kn": sanscript.KANNADA,
    "bn": sanscript.BENGALI,
    "gu": sanscript.GUJARATI,
    "pa": sanscript.GURMUKHI,
    "mr": sanscript.DEVANAGARI,
    "or": sanscript.ORIYA,
}

SUPPORTED_LANGS = set(_SCRIPT_MAP.keys())


def romanize_text(text: str, src_lang: str) -> str:
    if src_lang not in SUPPORTED_LANGS or src_lang == "en":
        return text
    if not text.strip():
        return text
    try:
        return transliterate(text, _SCRIPT_MAP[src_lang], sanscript.ITRANS)
    except Exception:
        return text


def romanize_segments(segments: list, src_lang: str) -> list:
    return [{**seg, "transliterated": romanize_text(seg.get("text", ""), src_lang)} for seg in segments]
