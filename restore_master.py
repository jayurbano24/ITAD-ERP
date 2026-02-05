import re

source = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx.bak'
target = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx'

with open(source, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Deduplication (basic)
unique_blocks = []
seen_lines = set()
output_lines = []

i = 0
while i < len(lines):
    line = lines[i]
    trimmed = line.strip()
    
    # Simple check: if a block of 30 lines repeats, skip it.
    is_duplicate = False
    if len(trimmed) > 50 and i + 30 < len(lines):
        block = "".join(lines[i:i+30]).strip()
        if block in seen_lines:
            print(f"Skipping duplicate block starting at line {i+1}")
            i += 30
            continue
        else:
            seen_lines.add(block)
    
    output_lines.append(line)
    i += 1

content = "".join(output_lines)

# 2. Simplify CSS (Shadows with commas that break SWC)
# Pattern looks for shadow-[...] containing rgba(
shadow_pattern = r'shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.03\),_0_24px_70px_rgba\(0,0,0,0\.45\)\]'
content = re.sub(shadow_pattern, 'shadow-2xl', content)

# 3. Fix View Functions Syntax (Implicit -> Explicit return)
# renderManifestView
content = content.replace('const renderManifestView = () => (', 'const renderManifestView = () => {\n    return (')
# Need to replace the closing ) with );\n  }; 
# This is tricky without a real parser, but we know it's followed by renderBoxesView
content = content.replace('      </div>\n    )\n\nconst renderBoxesView', '      </div>\n    );\n  };\n\nconst renderBoxesView')

# renderBoxesView
content = content.replace('const renderBoxesView = () => (', 'const renderBoxesView = () => {\n    return (')
content = content.replace('        </div>\n      )\n\n      export default LogisticaModule', '        </div>\n      );\n    };\n\n      export default LogisticaModule')

with open(target, 'w', encoding='utf-8') as f:
    f.write(content)

print("Restoration script completed.")
