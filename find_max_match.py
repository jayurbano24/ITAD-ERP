file_path = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = [line.strip() for line in f.readlines()]

def get_match_len(lines, i, j):
    count = 0
    while i < len(lines) and j < len(lines) and lines[i] == lines[j] and i < j:
        i += 1
        j += 1
        count += 1
    return count

best_len = 0
best_i = 0
best_j = 0

for i in range(len(lines)):
    for j in range(i + 1, len(lines)):
        if lines[i] == lines[j] and len(lines[i]) > 20: # Start from a significant line
            mlen = get_match_len(lines, i, j)
            if mlen > best_len:
                best_len = mlen
                best_i = i
                best_j = j

if best_len > 10:
    print(f"Found match of length {best_len}")
    print(f"Occurrence 1 starts at line {best_i + 1}")
    print(f"Occurrence 2 starts at line {best_j + 1}")
    print(f"Sample: {lines[best_i]}")
else:
    print("No significant duplication found.")
