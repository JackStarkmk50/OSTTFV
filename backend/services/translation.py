import httpx
from config import OLLAMA_BASE_URL, OLLAMA_MODEL

LANG_NAMES = {
    "ta": "Tamil",
    "te": "Telugu",
    "ml": "Malayalam",
    "hi": "Hindi",
    "kn": "Kannada",
    "bn": "Bengali",
}

_indictrans_model = None
_indictrans_tokenizer = None


def _get_indictrans():
    global _indictrans_model, _indictrans_tokenizer
    if _indictrans_model is None:
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
        model_name = "ai4bharat/indictrans2-indic-en-dist-200M"
        _indictrans_tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
        _indictrans_model = AutoModelForSeq2SeqLM.from_pretrained(model_name, trust_remote_code=True)
    return _indictrans_model, _indictrans_tokenizer


async def translate_to_english(text: str, src_lang: str) -> str:
    try:
        return await _ollama_translate(text, src_lang, mode="english")
    except Exception:
        return text


async def make_tanglish(text: str, romanized: str, src_lang: str) -> str:
    try:
        return await _ollama_translate(text, src_lang, mode="tanglish", romanized=romanized)
    except Exception:
        return romanized or text


async def _ollama_translate(
    text: str,
    src_lang: str,
    mode: str = "english",
    romanized: str = "",
) -> str:
    lang_name = LANG_NAMES.get(src_lang, src_lang)

    if mode == "english":
        prompt = (
            f"Translate this {lang_name} text to natural English. "
            f"Return ONLY the translation, no explanation.\n\nText: {text}"
        )
    else:
        prompt = (
            f"Convert this {lang_name} text to Tanglish — mix the {lang_name} words "
            f"(written in Roman/English letters, as a native speaker would write them) "
            f"with any English words naturally. Keep English words as-is. "
            f"Return ONLY the Tanglish text, no explanation.\n\n"
            f"Original ({lang_name} script): {text}\n"
            f"Romanized: {romanized}\n"
            f"Tanglish:"
        )

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
        )
        resp.raise_for_status()
        return resp.json()["response"].strip()


async def translate_segments(segments: list, src_lang: str, mode: str) -> list:
    from services.transliteration import romanize_text

    out = []
    for seg in segments:
        text = seg.get("text", "")
        romanized = seg.get("transliterated", "") or romanize_text(text, src_lang)

        if mode == "romanize":
            seg = {**seg, "transliterated": romanized}
        elif mode == "english":
            translated = await translate_to_english(text, src_lang)
            seg = {**seg, "transliterated": romanized, "translated_en": translated}
        elif mode == "tanglish":
            tanglish = await make_tanglish(text, romanized, src_lang)
            translated = await translate_to_english(text, src_lang)
            seg = {**seg, "transliterated": tanglish, "translated_en": translated}

        out.append(seg)
    return out
