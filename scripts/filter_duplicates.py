import json
import re

with open('app/ramen-data.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Both unquoted name: and quoted "name":
existing_names = set(re.findall(r'(?:"name"|name):\s*"([^"]+)"', text))
clean_existing = {re.sub(r'\s+', '', n).split('(')[0] for n in existing_names}

with open('crawled_final.json', 'r', encoding='utf-8') as f:
    crawled = json.load(f)

new_shops = []
for s in crawled:
    clean_name = re.sub(r'\s+', '', s['name']).split('(')[0]
    if clean_name not in clean_existing:
        new_shops.append(s)
        clean_existing.add(clean_name)

print(f'Total existing names extracted: {len(existing_names)}')
print(f'Total new shops to add: {len(new_shops)}')

with open('crawled_filtered.json', 'w', encoding='utf-8') as f:
    json.dump(new_shops, f, ensure_ascii=False, indent=2)
