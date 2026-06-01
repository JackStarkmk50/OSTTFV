import json
from ai4bharat.transliteration import XlitEngine
e = XlitEngine("en", beam_width=10, rescore=True)
# out = e.translit_word("vanakkam", topk=2)
out = e.translit_sentence("வணக்கம் மக்களே, எல்லரும் எப்படி இருக்கிங்க, ")
print(out)
# output: {'hi': ['नमस्ते', 'नमस्थे', 'नामस्थे', 'नमास्थे', 'नमस्थें']}
# with open("tamil_output.txt", "w", encoding="utf-8") as f:
#     for word in out['ta']:
#         f.write(word + "\n")

with open("output.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=4)