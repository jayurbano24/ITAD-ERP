file_path = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx'
with open(file_path, 'rb') as f:
    lines = f.readlines()

for i in range(1742, 1748):
    if i < len(lines):
        print(f"Line {i+1}: {lines[i]}")
        print(f"Hex: {lines[i].hex()}")
        print("-" * 20)
