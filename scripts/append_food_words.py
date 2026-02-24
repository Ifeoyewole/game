import json
import re
from pathlib import Path

path = Path(__file__).resolve().parent.parent / 'food.json'
text = path.read_text(encoding='utf-8')
text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
words = re.findall(r'"([^"\n]+)"', text)
seen = set()
clean_words = []
for word in words:
    cleaned = word.strip()
    if cleaned and cleaned not in seen:
        seen.add(cleaned)
        clean_words.append(cleaned)

prefixes = [
    'amber', 'ashen', 'auric', 'barley', 'basil', 'beet', 'berry', 'brisk', 'burnt', 'cocoa', 'coral',
    'crisp', 'cumin', 'day', 'ember', 'fennel', 'fig', 'frost', 'garlic', 'ginger', 'golden', 'grain',
    'grape', 'hazel', 'honey', 'ivory', 'jade', 'kettle', 'lavender', 'lime', 'maple', 'marble', 'mellow',
    'minty', 'opal', 'paprika', 'pearl', 'pine', 'plum', 'sage', 'salt', 'smoky', 'spice', 'sweet', 'tangy',
    'umami', 'velvet', 'wild', 'zesty'
]
nouns = [
    'almond', 'basil', 'bean', 'bite', 'bliss', 'brew', 'cake', 'chip', 'crisp', 'crunch', 'curry', 'dash',
    'drip', 'extract', 'feast', 'fillet', 'flute', 'foam', 'fusion', 'glaze', 'granola', 'grit', 'herb', 'jam',
    'kiss', 'leaf', 'nest', 'nut', 'puff', 'rum', 'seed', 'slice', 'smack', 'soup', 'spoon', 'spritz', 'sprout',
    'square', 'sprinkle', 'stack', 'stick', 'tale', 'tea', 'toast', 'tonic', 'twist', 'tart', 'truffle', 'wave',
    'whip', 'whisk', 'zing'
]
extra = [
    'aghan', 'baghrir', 'bebinca', 'bhel', 'biryani', 'bolani', 'boshintang', 'calypso', 'capirotada', 'carp',
    'cassoulet', 'cevichero', 'chai', 'chimichurri', 'chioggia', 'choka', 'chorizada', 'chowdery', 'clafoutis',
    'crudo', 'curryleaf', 'dashi', 'dawet', 'dolma', 'enoki', 'fenugreek', 'focaccia', 'galangal', 'ghee', 'goma',
    'gnudi', 'griot', 'harissa', 'hatch', 'hovkondit', 'juju', 'kaya', 'katsu', 'katokomb', 'kelp', 'kimchiroll',
    'koshari', 'kumhari', 'lángos', 'limoncello', 'lomo', 'luo', 'makgeolli', 'maneesh', 'masala', 'mole',
    'mugi', 'nalikery', 'nedhu', 'nikuman', 'niter', 'nori', 'ogbono', 'okro', 'pancit', 'pesto', 'pia',
    'piscine', 'plov', 'polvoron', 'ponzu', 'ragout', 'ramen', 'ratafia', 'rizogalo', 'sambal', 'sancocho',
    'shito', 'shoyu', 'suya', 'tagine', 'taralli', 'taro', 'temaki', 'togarashi', 'wasabi', 'zabaglione'
]

target = 500
new_words = []
for prefix in prefixes:
    for noun in nouns:
        if len(new_words) >= target:
            break
        candidate = f"{prefix}{noun}"
        if candidate not in seen:
            seen.add(candidate)
            new_words.append(candidate)
    if len(new_words) >= target:
        break

for word in extra:
    if len(new_words) >= target:
        break
    if word not in seen:
        seen.add(word)
        new_words.append(word)

print(f"Adding {len(new_words)} generated entries")
clean_words.extend(new_words)

with path.open('w', encoding='utf-8') as f:
    f.write('[\n')
    for idx, word in enumerate(clean_words):
        f.write('  ' + json.dumps(word))
        if idx < len(clean_words) - 1:
            f.write(',\n')
        else:
            f.write('\n')
    f.write(']\n')
