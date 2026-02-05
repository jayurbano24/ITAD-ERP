import re

source = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx.bak'
target = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx'

with open(source, 'r', encoding='utf-8') as f:
    full_content = f.read()

# 1. Extract sections (crude but effective for this corrupted file)
def extract_block(text, start_pattern, end_marker):
    start_match = re.search(start_pattern, text)
    if not start_match: return None
    start_idx = start_match.start()
    # Find the matching closing marker
    # For simplicity, we look for the next marker if it's unique enough
    end_idx = text.find(end_marker, start_idx)
    if end_idx == -1: return None
    return text[start_idx:end_idx + len(end_marker)]

# Normalize shadows FIRST in full_content to avoid match failures
shadow_pattern = r'shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.03\),_0_24px_70px_rgba\(0,0,0,0\.45\)\]'
full_content = re.sub(shadow_pattern, 'shadow-2xl', full_content)

header = full_content[:full_content.find('const LogisticaModule')]
component_start = extract_block(full_content, r'const LogisticaModule.*?{', 'run()')

# We'll reconstruct the file specifically
# Let's just do a clean replace of the problematic structural points

clean_content = full_content

# Fix renderManifestView
clean_content = clean_content.replace('const renderManifestView = () => (', 'const renderManifestView = () => {\n    return (')
clean_content = clean_content.replace('      </div>\n    )\n\nconst renderBoxesView', '      </div>\n    );\n  };')

# Fix renderBoxesView
clean_content = clean_content.replace('const renderBoxesView = () => (', 'const renderBoxesView = () => {\n    return (')
clean_content = clean_content.replace('        </div>\n        );\n\nconst ExitPDFView', '        </div>\n    );\n  };')

# Fix ExitPDFView
clean_content = clean_content.replace('const ExitPDFView = () => (', 'const ExitPDFView = () => {\n    return (')
clean_content = clean_content.replace('        )\n\nconst dataWipeView', '    );\n  };')

# Fix dataWipeView
clean_content = clean_content.replace('const dataWipeView = () => (', 'const dataWipeView = () => {\n    return (')
clean_content = clean_content.replace('          </div>\n        )\n\nconst renderDataWipeBoxesView', '          </div>\n    );\n  };')

# Fix renderDataWipeBoxesView
clean_content = clean_content.replace('const renderDataWipeBoxesView = () => (', 'const renderDataWipeBoxesView = () => {\n    return (')
clean_content = clean_content.replace('        </div>\n      )\n\n      return (', '        </div>\n    );\n  };')

# Fix final return closure
# The final export default LogisticaModule usually follows the component close
# Let's ensure there's a proper closing brace for the component

with open(target, 'w', encoding='utf-8') as f:
    f.write(clean_content)

print("Final reconstruction script completed.")
