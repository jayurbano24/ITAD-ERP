import os

file_path = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Remove literal \n and fix final export
text = text.replace('\\n', '\n')
# Fix the corrupted export at the end
if '}\n\nexport default LogisticaModule' in text:
    pass
else:
    # Look for the last return and ensure component closure
    parts = text.split('export default')
    if len(parts) > 1:
        base = parts[0].strip()
        if not base.endswith('}'):
            base += '\n}'
        text = base + '\n\nexport default LogisticaModule'

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Final export cleaning completed.")
