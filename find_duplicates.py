import os

file_path = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

seen = {}
duplicates = []

for i, line in enumerate(lines):
    trimmed = line.strip()
    if len(trimmed) > 40: # Ignore short lines
        if trimmed in seen:
            duplicates.append((seen[trimmed], i + 1, trimmed))
        else:
            seen[trimmed] = i + 1

# Sort and print
duplicates.sort(key=lambda x: x[0])
for first, second, content in duplicates[:20]: # Print first 20
    print(f"L{first} matches L{second}: {content[:50]}...")
