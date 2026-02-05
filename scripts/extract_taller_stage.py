from pathlib import Path
import base64
import json
import re

path = Path('.next/server/app/dashboard/taller/page.js')
text = path.read_text(encoding='utf-8', errors='ignore')
needle = 'sourceURL=webpack-internal:///(ssr)/./src/app/dashboard/taller/components/TallerStageDashboard.tsx'
pattern = rf'sourceMappingURL=data:application/json;charset=utf-8;base64,([\s\S]*?)//# sourceURL={re.escape(needle)}'
match = re.search(pattern, text, re.DOTALL)
if not match:
    idx = text.find('sourceURL=webpack-internal:///(ssr)/./src/app/dashboard/taller/components/TallerStageDashboard.tsx')
    if idx != -1:
        context = text[max(idx-200,0):idx+200]
        print('context around needle:', context)
        map_idx = text.rfind('sourceMappingURL', 0, idx)
        if map_idx != -1:
            map_context = text[max(map_idx-200,0):idx]
            print('map context:', map_context)
    raise SystemExit('source map pattern not found')
base64_str = ''.join(match.group(1).split())
map_json = json.loads(base64.b64decode(base64_str).decode('utf-8'))
sources = map_json.get('sources') or []
sources_content = map_json.get('sourcesContent') or []
print('sources count:', len(sources))
print('sourcesContent count:', len(sources_content))
for src, content in zip(sources, sources_content):
    if 'TallerStageDashboard.tsx' in src and content:
        out_path = Path('scripts/TallerStageDashboard.extracted.tsx')
        out_path.write_text(content, encoding='utf-8')
        print('wrote', out_path)
        break
else:
    raise SystemExit('source content not found')
