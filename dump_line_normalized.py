file_path = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx'
with open(file_path, 'rb') as f:
    lines = f.readlines()

line = lines[1745]
print(f"Line 1746: {line}")
print(f"Hex: {line.hex()}")
