file_path = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'useState(' in line:
            print(f"L{i+1}: {line.strip()}")
