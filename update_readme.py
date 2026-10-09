import re
with open('README.md', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('**Studio Next Contract Address:** ``', '**Studio Next Contract Address:** `0xd6aa7b8979EdE51B72f4DCAebb1A20B55Ab6EA4b`')

lines = c.split('\n')
out = []
for line in lines:
    if 'evidence/' in line or 'studio-next.json' in line:
        continue
    out.append(line)

with open('README.md', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
