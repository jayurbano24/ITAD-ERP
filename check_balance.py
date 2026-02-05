file_path = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx'
start = 1514
end = 1743

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

content = "".join(lines[start-1:end])

braces = 0
parens = 0
for char in content:
    if char == '{': braces += 1
    if char == '}': braces -= 1
    if char == '(': parens += 1
    if char == ')': parens -= 1

print(f"Braces balance: {braces}")
print(f"Parens balance: {parens}")
