import re

source_bak = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx.bak'
target_file = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx'

with open(source_bak, 'r', encoding='utf-8') as f:
    bak_content = f.read()

with open(target_file, 'r', encoding='utf-8') as f:
    current_content = f.read()

# 1. Extract the main component's body up to the first view
# We'll keep what we have in current_content until '  const DetailsView' would go in
base_logic = current_content.split('  return (')[0]

# 2. Extract Views from BAK using more robust regex
def extract_view(name):
    # Match from "const Name = () => (" until enough closing parens or next view
    # This is complex, let's use a simpler marker search
    start_marker = f'  const {name} = () => ('
    start_idx = bak_content.find(start_marker)
    if start_idx == -1: return ""
    
    # Simple search for the end of the view
    # We look for the start of the next known view or the final return
    next_markers = [
        '  const renderManifestView', 
        '  const renderBoxesView', 
        '  const ExitPDFView', 
        '  const dataWipeView', 
        '  const renderDataWipeBoxesView',
        '      return ('
    ]
    
    end_idx = len(bak_content)
    for m in next_markers:
        m_idx = bak_content.find(m, start_idx + len(start_marker))
        if m_idx != -1 and m_idx < end_idx:
            end_idx = m_idx
            
    view_text = bak_content[start_idx:end_idx].strip()
    
    # Convert to explicit return
    view_text = re.sub(fr'const {name} = \(\) => \(', f'const {name} = () => {{\n    return (', view_text)
    if view_text.endswith(')'):
        view_text += ';\n  };'
    elif view_text.endswith(');'):
        view_text = view_text[:-2] + ');\n  };'
    else:
        view_text += '\n    );\n  };'
    return view_text

views_list = [
    'DetailsView', 'renderManifestView', 'renderBoxesView', 
    'ExitPDFView', 'dataWipeView', 'renderDataWipeBoxesView'
]

views_code = "\\n\\n".join([extract_view(v) for v in views_list])

# 3. Extract final return
final_return_start = bak_content.find('      return (')
if final_return_start == -1:
    final_return = "\\n  return (<div>Error en reconstruccion</div>);\\n}"
else:
    # Everything from "return (" to the end, but carefully stripping the export
    final_part = bak_content[final_return_start:].split('export default')[0].strip()
    # Ensure it ends with a closing brace for the component
    if not final_part.endswith('}'):
        final_part += '\\n}'
    final_return = f"  {final_part}"

# 4. Final Assembly
full_content = f"{base_logic}\\n{views_code}\\n\\n{final_return}\\n\\nexport default LogisticaModule"

# Normalize shadows
full_content = re.sub(r'shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.03\),_0_24px_70px_rgba\(0,0,0,0\.45\)\]', 'shadow-2xl', full_content)

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(full_content)

print("Final assembly V2 completed.")
