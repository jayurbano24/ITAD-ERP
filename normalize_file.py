file_path = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx'
with open(file_path, 'rb') as f:
    content = f.read()

# Normalize line endings: replace both \r\n and \r with \n, then convert \n to \r\n
clean = content.replace(b'\r\n', b'\n').replace(b'\r', b'\n').replace(b'\x00', b'')
final = clean.replace(b'\n', b'\r\n')

with open(file_path, 'wb') as f:
    f.write(final)

print("Line endings normalized and nulls removed.")
