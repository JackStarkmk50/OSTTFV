from indic_transliteration import sanscript
from indic_transliteration.sanscript import SchemeMap, SCHEMES, transliterate
import json
# Your Tamil text
tamil_text = "வணக்கம்"

# Transliterate Tamil to ITRANS (Romanized/Tanglish script)
tanglish_text = transliterate(tamil_text, sanscript.TAMIL, sanscript.ITRANS)

print(tanglish_text) 
# Output will be something close to: vaNakkam

with open("output_indic.json", "w", encoding="utf-8") as f:
    json.dump(tanglish_text, f, ensure_ascii=False, indent=4)