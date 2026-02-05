import os

file_path = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip_until = -1

for i, line in enumerate(lines):
    if i <= skip_until:
        continue
    
    # Detect the messy area around handleSaveCollectorMetadata end
    if 'setSavingCollector(false)' in line and i < 1520:
        new_lines.append(line)
        # Find the next genuine function or return
        j = i + 1
        found_next = False
        while j < len(lines) and j < i + 50:
            if 'const DetailsView' in lines[j] or 'const renderBoxesView' in lines[j]:
                new_lines.append('    }\n  }\n\n') # Close handling function and component logic block
                skip_until = j - 1
                found_next = True
                break
            j += 1
        continue

    # Fix the messy closures between views
    if i >= 1745 and i <= 1755:
        if ');' in line or '};' in line:
            if 'const renderBoxesView' in lines[i+1] or 'const renderBoxesView' in line:
                pass # We will handle view start
            else:
                continue # Skip orphan closures
    
    # Ensure view functions are clean
    if 'const DetailsView = () => {' in line:
        new_lines.append(line)
        continue
    
    new_lines.append(line)

# Final pass to ensure only one component export closure
text = "".join(new_lines)
# Remove the corruption:
# 1748:   );
# 1749:   };
# 1750: 
# 1751: 
# 1752:     );
# 1753:   };
text = text.replace('  );\n  };\n\n\n    );\n  };', '  );\n};')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Structural balance patch applied.")
