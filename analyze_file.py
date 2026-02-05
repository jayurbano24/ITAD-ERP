import os

file_path = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx'

with open(file_path, 'rb') as f:
    content = f.read()

# Check for null bytes
null_count = content.count(b'\x00')
print(f"Found {null_count} null bytes.")

# Check for mixed line endings
cr_count = content.count(b'\r')
lf_count = content.count(b'\n')
crlf_count = content.count(b'\r\n')
print(f"Stats: CR={cr_count}, LF={lf_count}, CRLF={crlf_count}")

# Clean content
clean_content = content.replace(b'\x00', b'')

# Save clean version
with open(file_path, 'wb') as f:
    f.write(clean_content)

print("Cleaned null bytes and saved file.")

# Look for massive duplication (longest common substring would be too slow, but we can check line by line)
lines = clean_content.decode('utf-8', errors='ignore').splitlines()
unique_lines = set()
duplicates = 0
for line in lines:
    trimmed = line.strip()
    if len(trimmed) > 50: # Only check long characteristic lines
        if trimmed in unique_lines:
            duplicates += 1
        else:
            unique_lines.add(trimmed)

print(f"Detected {duplicates} duplicated long lines.")
