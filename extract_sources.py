import json
import pathlib
path = pathlib.Path('.next/server/app/dashboard/taller/page.js')
text = path.read_text(encoding='utf-8')
key = '"sourcesContent"'
pos = text.find(key)
if pos == -1:
    raise SystemExit('sourcesContent not found')
start = text.find('[', pos)
if start == -1:
    raise SystemExit('array start not found')
br = 0
end = None
for idx in range(start, len(text)):
    ch = text[idx]
    if ch == '[':
        br += 1
    elif ch == ']':
        br -= 1
        if br == 0:
            end = idx + 1
            break
if end is None:
    raise SystemExit('array end not found')
array_text = text[start:end]
sources = json.loads(array_text)
with open('recovered_TallerStageDashboard.txt', 'w', encoding='utf-8') as f:
    f.write(sources[0])
print('Recovered length:', len(sources[0]))
