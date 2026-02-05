
import sys

def audit_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
    
    braces = 0
    parens = 0
    brackets = 0
    
    for i, line in enumerate(lines):
        for j, char in enumerate(line):
            if char == '{': braces += 1
            elif char == '}': braces -= 1
            elif char == '(': parens += 1
            elif char == ')': parens -= 1
            elif char == '[': brackets += 1
            elif char == ']': brackets -= 1
            
            if braces < 0:
                print(f"Braces went negative at L{i+1} C{j+1}: Snippet: {line.strip()}")
                return
            if parens < 0:
                print(f"Parens went negative at L{i+1} C{j+1}: Snippet: {line.strip()}")
                return
            if brackets < 0:
                print(f"Brackets went negative at L{i+1} C{j+1}: Snippet: {line.strip()}")
                return

    print("Audit finished. No negative counts found.")
    print(f"Final Count: B:{braces} P:{parens} K:{brackets}")

if __name__ == "__main__":
    audit_file(r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx')
