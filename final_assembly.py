import re

source_bak = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx.bak'
target_file = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx'

with open(source_bak, 'r', encoding='utf-8') as f:
    bak_content = f.read()

with open(target_file, 'r', encoding='utf-8') as f:
    current_content = f.read()

# 1. Extract Views from BAK (Carefully identifying boundaries)
def extract_section(content, start_marker, end_marker):
    start = content.find(start_marker)
    if start == -1: return None
    end = content.find(end_marker, start)
    if end == -1: return None
    return content[start:end]

# DetailsView
details_view = extract_section(bak_content, '  const DetailsView = () => (', '  const renderManifestView = () => (')
# renderManifestView
manifest_view = extract_section(bak_content, '  const renderManifestView = () => (', '  const renderBoxesView = () => (')
# renderBoxesView
boxes_view = extract_section(bak_content, '  const renderBoxesView = () => (', '  const ExitPDFView = () => (')
# ExitPDFView
exit_pdf_view = extract_section(bak_content, '  const ExitPDFView = () => (', '  const dataWipeView = () => (')
# dataWipeView
data_wipe_view = extract_section(bak_content, '  const dataWipeView = () => (', '  const renderDataWipeBoxesView = () => (')
# renderDataWipeBoxesView
dw_boxes_view = extract_section(bak_content, '  const renderDataWipeBoxesView = () => (', '      return (')

# 2. Convert implicit returns to explicit to avoid parser issues
def explicitly_return(view_code):
    if not view_code: return ""
    # Replace "const Name = () => (" with "const Name = () => { return ("
    view_code = re.sub(r'const (\w+) = \(\) => \(', r'const \1 = () => {\n    return (', view_code)
    # Add closing brace
    # Find last ");" or ")" and add "};"
    last_brace = view_code.rfind('    )')
    if last_brace != -1:
        view_code = view_code[:last_brace] + '    );\n  };'
    return view_code

# Reconstruct the views block
all_views = "\\n".join([
    explicitly_return(details_view),
    explicitly_return(manifest_view),
    explicitly_return(boxes_view),
    explicitly_return(exit_pdf_view),
    explicitly_return(data_wipe_view),
    explicitly_return(dw_boxes_view)
])

# Normalize shadows
all_views = re.sub(r'shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.03\),_0_24px_70px_rgba\(0,0,0,0\.45\)\]', 'shadow-2xl', all_views)

# 3. Assemble Final File
# Split current at the return marker
parts = current_content.split('  return (')

final_file_content = parts[0] + all_views + "\\n\\n  return (\\n" + bak_content.split('      return (')[-1].split('export default LogisticaModule')[0] + "export default LogisticaModule"

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(final_file_content)

print("Final assembly completed successfully.")
