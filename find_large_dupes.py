file_path = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = [line.strip() for line in f.readlines()]

# Simple sliding window to find repeated sequences
def find_repeated_block(lines, min_len=20):
    n = len(lines)
    for length in range(n // 2, min_len, -1):
        for i in range(n - 2 * length + 1):
            block = lines[i : i + length]
            # Search for this block later in the file
            for j in range(i + length, n - length + 1):
                if lines[j : j + length] == block:
                    return i, j, length
    return None

result = find_repeated_block(lines)
if result:
    i, j, length = result
    print(f"Found repeated block of {length} lines!")
    print(f"First occurrence: lines {i+1} to {i+length}")
    print(f"Second occurrence: lines {j+1} to {j+length}")
    print(f"Sample line: {lines[i]}")
else:
    print("No large repeated blocks found.")
