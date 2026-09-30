import httpx
import logging
from config import OLLAMA_BASE_URL, OLLAMA_MODEL

logger = logging.getLogger(__name__)

LANG_NAMES = {
    "ta": "Tamil",
    "te": "Telugu",
    "ml": "Malayalam",
    "hi": "Hindi",
    "kn": "Kannada",
    "bn": "Bengali",
    "gu": "Gujarati",
    "pa": "Punjabi",
    "mr": "Marathi",
}

# ─── Indic script detection ───────────────────────────────────────────────────

def _is_indic_text(text: str) -> bool:
    """Return True if text contains Indic script characters (translation failed)."""
    for ch in text:
        cp = ord(ch)
        if (0x0900 <= cp <= 0x097F or   # Devanagari (Hindi, Marathi)
            0x0980 <= cp <= 0x09FF or   # Bengali
            0x0A00 <= cp <= 0x0A7F or   # Gurmukhi (Punjabi)
            0x0A80 <= cp <= 0x0AFF or   # Gujarati
            0x0B00 <= cp <= 0x0B7F or   # Oriya
            0x0B80 <= cp <= 0x0BFF or   # Tamil
            0x0C00 <= cp <= 0x0C7F or   # Telugu
            0x0C80 <= cp <= 0x0CFF or   # Kannada
            0x0D00 <= cp <= 0x0D7F):    # Malayalam
            return True
    return False


# ─── IndicTrans2 (optional — best Indic→English accuracy) ────────────────────
_it2_model = None
_it2_tokenizer = None


def _get_indictrans2():
    global _it2_model, _it2_tokenizer
    if _it2_model is None:
        try:
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
            model_name = "ai4bharat/indictrans2-indic-en-dist-200M"
            logger.info(f"Loading IndicTrans2 from {model_name}...")
            _it2_tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
            _it2_model = AutoModelForSeq2SeqLM.from_pretrained(model_name, trust_remote_code=True)
            logger.info("IndicTrans2 loaded")
        except Exception as e:
            logger.warning(f"IndicTrans2 unavailable ({e}) — using Ollama for translation")
            _it2_model = None
    return _it2_model, _it2_tokenizer


def _indictrans2_translate(text: str, src_lang: str) -> str | None:
    model, tokenizer = _get_indictrans2()
    if not model or not tokenizer:
        return None
    try:
        _FLORES = {
            "ta": "tam_Taml", "te": "tel_Telu", "ml": "mal_Mlym",
            "hi": "hin_Deva", "kn": "kan_Knda", "bn": "ben_Beng",
            "gu": "guj_Gujr", "pa": "pan_Guru", "mr": "mar_Deva",
        }
        src_flores = _FLORES.get(src_lang)
        if not src_flores:
            return None

        inputs = tokenizer(
            text,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=256,
            src_lang=src_flores,
            tgt_lang="eng_Latn",
        )
        outputs = model.generate(**inputs, num_beams=4, max_new_tokens=256)
        result = tokenizer.batch_decode(outputs, skip_special_tokens=True)[0].strip()
        return result if result and not _is_indic_text(result) else None
    except Exception as e:
        logger.debug(f"IndicTrans2 translate failed: {e}")
        return None


# ─── Ollama ───────────────────────────────────────────────────────────────────

async def _ollama_call(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=45.0) as client:
        resp = await client.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
        )
        resp.raise_for_status()
        return resp.json()["response"].strip()


async def translate_to_english(text: str, src_lang: str) -> str:
    """Translate Indic text to English. IndicTrans2 first, Ollama fallback."""
    # Try IndicTrans2 (most accurate)
    it2_result = _indictrans2_translate(text, src_lang)
    if it2_result:
        return it2_result

    lang_name = LANG_NAMES.get(src_lang, src_lang)
    try:
        prompt = (
            f"You are a professional translator. Translate the following {lang_name} text to "
            f"natural, fluent English. Output ONLY the English translation — no explanation, "
            f"no original text, no notes.\n\n"
            f"{lang_name}: {text}\nEnglish:"
        )
        result = await _ollama_call(prompt)

        # Validate: if Ollama returned Indic script, the model failed — retry simpler
        if _is_indic_text(result):
            simple_prompt = f"Translate to English only: {text}\nEnglish translation:"
            result = await _ollama_call(simple_prompt)

        if result and not _is_indic_text(result):
            return result
    except Exception as e:
        logger.warning(f"Ollama translate failed: {e}")

    return text  # last resort: return original


async def make_tanglish(text: str, romanized: str, src_lang: str) -> str:
    """Convert Indic text to natural Tanglish (Roman script + English mixing)."""
    try:
        lang_name = LANG_NAMES.get(src_lang, src_lang)
        prompt = (
            f"Convert this {lang_name} sentence to natural Tanglish — the way Tamil/Indian social "
            f"media users type it in English letters. Mix {lang_name} words in Roman script with "
            f"English words naturally. Keep proper nouns and English words as English. "
            f"Write exactly how a native speaker would type in WhatsApp or Instagram.\n\n"
            f"Rules:\n"
            f"- Write {lang_name} words phonetically in Roman letters (e.g. 'vanakkam', 'epdi', 'sollu')\n"
            f"- Keep English words in English\n"
            f"- Do NOT translate everything to English — this is transliteration + code-mixing\n"
            f"- Return ONLY the Tanglish text, no explanation\n\n"
            f"{lang_name}: {text}\n"
            f"Romanized reference: {romanized}\n"
            f"Tanglish:"
        )
        result = await _ollama_call(prompt)
        # If result is still Indic script, fall back to romanized
        if result and not _is_indic_text(result):
            return result
        return romanized or text
    except Exception:
        return romanized or text


# ─── Segment-level processing ─────────────────────────────────────────────────

async def translate_segments(segments: list, src_lang: str, mode: str) -> list:
    from services.transliteration import romanize_text

    out = []
    for seg in segments:
        text = seg.get("text", "")
        romanized = seg.get("transliterated", "") or romanize_text(text, src_lang)

        if mode == "romanize":
            seg = {**seg, "transliterated": romanized}

        elif mode == "english":
            # Translate to English; set transliterated = English so it shows in viewport/timeline
            translated = await translate_to_english(text, src_lang)
            seg = {**seg, "transliterated": translated, "translated_en": translated}

        elif mode == "tanglish":
            tanglish = await make_tanglish(text, romanized, src_lang)
            translated = await translate_to_english(text, src_lang)
            seg = {**seg, "transliterated": tanglish, "translated_en": translated}

        out.append(seg)
    return out
