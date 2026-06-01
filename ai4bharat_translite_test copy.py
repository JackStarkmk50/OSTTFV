# import torch
# import argparse
# # Safe global guardrail for PyTorch 2.6+
# torch.serialization.add_safe_globals([argparse.Namespace])
import json

from ai4bharat.transliteration import XlitEngine

# 1. Initialize the engine strictly in INDIC mode
e = XlitEngine(src_script_type="indic", beam_width=10, rescore=False)

# 2. Your Tamil text
tamil_word = "வணக்கம்"

# 3. Transliterate (Make sure to pass lang_code="ta")
# output = e.translit_word(tamil_word, lang_code="ta", topk=1)
output = e.translit_sentence("தமிழ் புத்தகங்களை (Tamil books) வாங்கவும், படிக்கவும் பல இணையதளங்கள் மற்றும் மின் நூலகங்கள் உள்ளன. உங்கள் தேவைகளுக்கேற்ப கீழ்க்கண்ட தளங்களை நீங்கள் பயன்படுத்தலாம்:",lang_code="ta")

with open("output_tamil.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=4)