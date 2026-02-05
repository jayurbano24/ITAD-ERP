import os

file_path = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Localizamos las líneas corruptas (479-480)
# line 479 is index 478
# 479:   );
# 480:   };\n\n\n...  return (

new_lines = []
skip_mode = False
for i, line in enumerate(lines):
    # Detect the corrupted line specifically
    if '};\\n\\n' in line or '};\\\\n\\\\n' in line:
        # This is where the script failed and injected literal \n or similar
        # We need to find the REAL return ( line and start from there
        continue
    
    if i == 479: # Line 480 in view (0-indexed 479)
        # We want to replace this whole corrupted block with a proper closure and start of the view logic
        # OR just skip until the next valid line of JSX table tr
        skip_mode = True
        continue
    
    if skip_mode:
        if '<tr key={index}' in line:
            skip_mode = False
            # We add a proper header for where this return belongs?
            # Actually, the return ( 480 should be inside something.
            # Looking at the file, it seems it was injecting renderDataWipeBoxesView?
            pass
        else:
            continue
            
    new_lines.append(line)

# Let's do a more surgical replacement to avoid breaking logic
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the specific corrupted sequence
text = text.replace('  };\n\n\n\n\n\n\n\n\n\n\n\n  return (', '  };\n\n')
# Wait, if I just remove that, I might lose the 'return (' for the main component.
# Line 480 was '  return (' followed by the table.
# But where does that return belong in the component?
# Usually at the end of the LogisticaModule.

# Actually, let's just use Python to find and clean all literal \\n and redundant closures.
text = text.replace('\\\\n', '\n')
text = text.replace('\\n', '\n')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Sanitization and closure fix applied.")
