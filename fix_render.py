file_path = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line 2145 is index 2144
if '</div>' in lines[2144] and ')' in lines[2145]:
    lines[2145] = '      );\n'
    lines.insert(2146, '    };\n')
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Fixed closing of renderManifestView.")
else:
    print(f"Content mismatch at 2144-2145: '{lines[2144].strip()}' and '{lines[2145].strip()}'")
