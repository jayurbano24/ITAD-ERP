import re

source_bak = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx.bak'
target_file = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx'

with open(source_bak, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Clean duplicated code and fix common issues
# Normalize known bad shadows
content = re.sub(r'shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.03\),_0_24px_70px_rgba\(0,0,0,0\.45\)\]', 'shadow-2xl', content)

# 2. Extract views and convert to standalone components
def extract_and_convert(name, next_marker):
    start_marker = f'const {name} = () => ('
    start = content.find(start_marker)
    if start == -1: return ""
    end = content.find(next_marker, start)
    if end == -1: return ""
    
    body = content[start:end].strip()
    # Convert to "const Name = ({ props }) => { return ( ... ) }"
    # For simplicity in this script, we'll just wrap the existing arrow logic if it's correct
    # But stand-alone components need props.
    # Actually, it's easier to keep them as nested functions but ENSURE they are CLOSED.
    return body

# 3. Use an even simpler approach: The Golden Version.
# I will recreate the file structure from scratch using the first 800 lines of the BAK (logic) 
# and then append the UI views, carefully closing the main component.

logic_end_marker = 'const DetailsView = () => ('
logic_part = content.split(logic_end_marker)[0]

# Sub-views code (we take them one by one to ensure no overlap)
views_to_extract = [
    ('DetailsView', 'const renderManifestView'),
    ('renderManifestView', 'const renderBoxesView'),
    ('renderBoxesView', 'const ExitPDFView'),
    ('ExitPDFView', 'const dataWipeView'),
    ('dataWipeView', 'const renderDataWipeBoxesView'),
    ('renderDataWipeBoxesView', 'return (')
]

views_code = ""
for name, next_m in views_to_extract:
    v_code = extract_and_convert(name, next_m)
    # Ensure explicit return and closure
    v_code = v_code.replace(f'const {name} = () => (', f'const {name} = () => {{\n    return (')
    if v_code.endswith(')'): v_code += ';\n  };'
    elif v_code.endswith(');'): v_code = v_code[:-2] + ');\n  };'
    else: v_code += '\n    );\n  };'
    views_code += "\\n\\n" + v_code

# The main return of LogisticaModule
main_return = content.split('return (')[ -1].split('export default')[0].strip()
if not main_return.endswith('}'): main_return += '\\n}'

final_file = f"{logic_part}\\n{views_code}\\n\\n  return (\\n{main_return}\\n\\nexport default LogisticaModule"

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(final_file)

print("Architectural reconstruction completed.")
