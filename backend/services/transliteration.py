from typing import Optional

_engines: dict = {}

LANG_MAP = {
    "ta": "ta",
    "te": "te",
    "ml": "ml",
    "hi": "hi",
    "kn": "kn",
    "bn": "bn",
}

SUPPORTED_LANGS = set(LANG_MAP.keys())


def _get_engine():
    if "xlit" not in _engines:
        from ai4bharat.transliteration import XlitEngine
        _engines["xlit"] = XlitEngine("en", beam_width=10, rescore=True)
    return _engines["xlit"]


def romanize_text(text: str, src_lang: str) -> str:
    if src_lang not in SUPPORTED_LANGS:
        return text
    if src_lang == "en":
        return text
    try:
        engine = _get_engine()
        result = engine.translit_sentence(text, lang_code=src_lang)
        if isinstance(result, dict):
            return result.get(src_lang, text)
        return str(result)
    except Exception:
        return text


def romanize_segments(segments: list, src_lang: str) -> list:
    out = []
    for seg in segments:
        text = seg.get("text", "")
        romanized = romanize_text(text, src_lang)
        out.append({**seg, "transliterated": romanized})
    return out
