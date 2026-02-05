from pathlib import Path
import base64
import json

path = Path('.next/server/app/dashboard/taller/page.js')
text = path.read_text(encoding='utf-8', errors='ignore')
needle = 'sourceURL=webpack-internal:///(ssr)/./src/app/dashboard/taller/components/TallerStageDashboard.tsx'
idx = text.find(needle)
print('needle index', idx)
if idx == -1:
    raise SystemExit('needle not found')

map_marker = '//# sourceMappingURL='
map_idx = text.rfind(map_marker, 0, idx)
if map_idx == -1:
    raise SystemExit('sourceMappingURL not found before needle')

map_start = map_idx + len(map_marker)
map_end = text.find('\n', map_start)
base64_text = text[map_start:map_end].strip()
if not base64_text.startswith('data:application/json'):
    raise SystemExit('unexpected mapping prefix')

comma_split = base64_text.split(',')
if len(comma_split) != 2:
    raise SystemExit('unexpected mapping format')
_, payload = comma_split
payload = payload.replace('\n', '').replace('\r', '')
payload += '=' * (-len(payload) % 4)
data = base64.b64decode(payload)
map_json = json.loads(data.decode('utf-8'))

for src, content in zip(map_json.get('sources', []), map_json.get('sourcesContent', [])):
    if 'TallerStageDashboard.tsx' in src and content:
        print('found source for', src)
        print(content)
        break
else:
    raise SystemExit('source content not found for TallerStageDashboard')
