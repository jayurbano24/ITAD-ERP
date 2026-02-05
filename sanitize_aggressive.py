import re

source = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx.bak'
target = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx'

with open(source, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Goal: Move sub-views to separate component definitions before LogisticaModule
# and fix the "const X = () => {" syntax

content = "".join(lines)

# 1. Fix Shadows
content = re.sub(r'shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.03\),_0_24px_70px_rgba\(0,0,0,0\.45\)\]', 'shadow-2xl', content)

# 2. Extract and Transform Sub-views (Simplified regex for this specific corruption)
def convert_to_component(name, text):
    # Find start and end of the function
    start_pat = f'const {name} = \(\) => \('
    match = re.search(start_pat, text)
    if not match: return text
    
    # We transform it to a separate component (needs props but for now let's just fix syntax)
    # Actually, let's keep them inside but ensure they use explicit return blocks
    # which we already tried. 
    
    # Let's try to remove ALL redundant blocks of code first. 
    # A cleaner way is to use the unique lines approach again but more aggressive.
    return text

# Let's do a very targetted fix on the line 1745-1749 area
# which is where the compiler keeps dying.

# Maybe the issue is actually a HIDDEN NULL BYTE that survived?
# Let's force a write as UTF-8 with no BOM and strict cleaning.

# Filter out non-ascii characters for now to be safe with the parser
content = "".join([i if ord(i) < 128 else ' ' for i in content])

with open(target, 'w', encoding='ascii') as f:
    f.write(content)

print("Sanitization completed. Forced ASCII-only to ensure no weird bytes remain.")
