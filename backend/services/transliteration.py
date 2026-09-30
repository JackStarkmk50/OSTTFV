import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

SUPPORTED_LANGS = {"ta", "te", "ml", "hi", "kn", "bn", "gu", "pa", "mr", "or"}

# ─── Primary: ai4bharat XlitEngine (neural, natural romanization) ─────────────
_xlit_engines: dict = {}
_xlit_available: Optional[bool] = None


def _check_xlit() -> bool:
    global _xlit_available
    if _xlit_available is None:
        try:
            from ai4bharat.transliteration import XlitEngine  # noqa: F401
            _xlit_available = True
            logger.info("ai4bharat XlitEngine available")
        except ImportError:
            _xlit_available = False
            logger.info("ai4bharat.transliteration not installed — using custom mapper")
    return bool(_xlit_available)


def _get_xlit_engine(lang: str):
    if lang not in _xlit_engines:
        try:
            from ai4bharat.transliteration import XlitEngine
            _xlit_engines[lang] = XlitEngine(lang, beam_width=10, rescore=True)
            logger.info(f"XlitEngine loaded: lang={lang}")
        except Exception as e:
            logger.warning(f"XlitEngine init failed ({lang}): {e}")
            _xlit_engines[lang] = None
    return _xlit_engines[lang]


def _xlit_romanize(text: str, lang: str) -> Optional[str]:
    if not _check_xlit():
        return None
    engine = _get_xlit_engine(lang)
    if not engine:
        return None
    try:
        raw = engine.translit_sentence(text)
        # Handle dict, list, or plain string return depending on library version
        if isinstance(raw, dict):
            out = raw.get(lang) or next(iter(raw.values()), None)
        elif isinstance(raw, (list, tuple)):
            out = raw[0] if raw else None
        else:
            out = raw
        if out:
            out = str(out).strip()
            # Reject if output still contains source-script characters (failed translit)
            return out if out and not _has_native_script(out) else None
        return None
    except Exception as e:
        logger.debug(f"XlitEngine translit error: {e}")
        return None


def _has_native_script(text: str) -> bool:
    """Return True if text contains Indic script (transliteration failed)."""
    for ch in text:
        cp = ord(ch)
        if 0x0900 <= cp <= 0x0DFF:  # Devanagari through Malayalam
            return True
    return False


# ─── Custom Tamil phonetic mapper (no external deps, gives natural Tanglish) ──
#
# Produces:  நான் → naan   சொல்வதை → solvathai   வணக்கம் → vanakkam
# vs ITRANS: நான் → nAn    சொல்வதை → jhOlvadhai  வணக்கம் → vaNaghghaM

_TA_VOWELS = {
    'அ': 'a',  'ஆ': 'aa', 'இ': 'i',  'ஈ': 'ee',
    'உ': 'u',  'ஊ': 'oo', 'எ': 'e',  'ஏ': 'ae',
    'ஐ': 'ai', 'ஒ': 'o',  'ஓ': 'oo', 'ஔ': 'au',
}

_TA_CONSONANTS = {
    'க': 'k',  'ங': 'ng', 'ச': 's',  'ஞ': 'nj',
    'ட': 'd',  'ண': 'n',  'த': 'th', 'ந': 'n',
    'ப': 'p',  'ம': 'm',  'ய': 'y',  'ர': 'r',
    'ல': 'l',  'வ': 'v',  'ழ': 'zh', 'ள': 'l',
    'ற': 'r',  'ன': 'n',
    # Grantha (Sanskrit loan sounds)
    'ஜ': 'j', 'ஶ': 'sh', 'ஷ': 'sh', 'ஸ': 's', 'ஹ': 'h',
}

_TA_VSIGNS = {
    'ா': 'aa', 'ி': 'i',  'ீ': 'ee', 'ு': 'u',  'ூ': 'oo',
    'ெ': 'e',  'ே': 'ae', 'ை': 'ai', 'ொ': 'o',  'ோ': 'oo',
    'ௌ': 'au',
    '்': '',   # virama / pulli — consonant with no following vowel
}

_TA_AYTHAM = 'ஃ'  # U+0B83 — sounds like 'k' between vowels


def _romanize_tamil_custom(text: str) -> str:
    """
    Char-by-char Tamil Unicode → natural colloquial Tanglish.

    Rules (Tamil abugida):
    - Consonant + vowel_sign  → cons + vowel
    - Consonant + virama (்) → cons only  (no inherent vowel)
    - Consonant + next_consonant → cons + 'a'  (inherent vowel)
    - Consonant at end of string → cons + 'a'
    - Independent vowel → vowel
    """
    result = []
    i = 0
    n = len(text)

    while i < n:
        c = text[i]

        if c in _TA_VOWELS:
            result.append(_TA_VOWELS[c])
            i += 1

        elif c in _TA_CONSONANTS:
            cons = _TA_CONSONANTS[c]
            i += 1
            if i < n and text[i] in _TA_VSIGNS:
                result.append(cons + _TA_VSIGNS[text[i]])
                i += 1
            else:
                # No explicit vowel sign → inherent 'a'
                result.append(cons + 'a')

        elif c == _TA_AYTHAM:
            result.append('k')
            i += 1

        else:
            # ASCII, punctuation, space, unknown
            result.append(c)
            i += 1

    return ''.join(result)


# ─── Fallback: indic_transliteration (for non-Tamil Indic langs) ─────────────
try:
    from indic_transliteration import sanscript
    from indic_transliteration.sanscript import transliterate as _itrans_translit

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

    def _normalize_itrans(text: str) -> str:
        """Convert ITRANS/OPTITRANS camelCase output to natural readable lowercase."""
        # Long vowels: capital letter → doubled lowercase
        t = text
        t = t.replace('aa', 'aa')          # already good
        t = t.replace('A', 'aa')           # nAn → naan
        t = t.replace('I', 'ii')
        t = t.replace('U', 'uu')
        t = t.replace('E', 'e')
        t = t.replace('O', 'o')
        # Tamil-specific wrong consonant mappings in OPTITRANS
        t = t.replace('jh', 's')           # jhOlvadhai → solvathai
        t = t.replace('Gh', 'g').replace('gh', 'g')
        t = t.replace('kh', 'k')
        t = t.replace('Lgh', 'l').replace('lgh', 'l')
        t = t.replace('ph', 'p').replace('bh', 'b')
        # Remove noise chars
        t = re.sub(r'[{}|\\~^]', '', t)
        return t.lower().strip()

    def _fallback_romanize(text: str, lang: str) -> Optional[str]:
        if lang not in _SCRIPT_MAP:
            return None
        try:
            try:
                raw = _itrans_translit(text, _SCRIPT_MAP[lang], sanscript.OPTITRANS)
            except (AttributeError, KeyError):
                raw = _itrans_translit(text, _SCRIPT_MAP[lang], sanscript.ITRANS)
            normalized = _normalize_itrans(raw)
            return normalized if normalized and not _has_native_script(normalized) else None
        except Exception:
            return None

    _INDIC_AVAIL = True

except ImportError:
    _SCRIPT_MAP = {}
    _INDIC_AVAIL = False

    def _fallback_romanize(text: str, lang: str) -> Optional[str]:  # type: ignore[misc]
        return None


# ─── Public API ───────────────────────────────────────────────────────────────

def romanize_text(text: str, src_lang: str) -> str:
    """
    Romanize native-script Indic text to natural colloquial Latin.

    Priority:
      1. XlitEngine (ai4bharat — neural, most natural: 'vanakkam')
      2. Custom Tamil mapper for ta (phonetic: 'naan solvathai')
      3. indic_transliteration with ITRANS normalizer (other langs)
    """
    if src_lang == "en" or src_lang not in SUPPORTED_LANGS:
        return text
    if not text.strip():
        return text

    # 1. Neural (best quality)
    result = _xlit_romanize(text, src_lang)
    if result:
        return result

    # 2. Custom Tamil mapper (natural output, no library needed)
    if src_lang == "ta":
        result = _romanize_tamil_custom(text)
        if result and result != text:
            return result

    # 3. indic_transliteration normalized fallback
    result = _fallback_romanize(text, src_lang)
    return result if result else text


def romanize_segments(segments: list, src_lang: str) -> list:
    return [
        {**seg, "transliterated": romanize_text(seg.get("text", ""), src_lang)}
        for seg in segments
    ]
