import sys

def audit_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    
    print(f"Auditing: {file_path}")
    print("-" * 40)
    
    for i, line in enumerate(lines):
        line_num = i + 1
        for char_pos, char in enumerate(line):
            if char in '({[':
                stack.append((char, line_num, char_pos))
            elif char in ')}]':
                if not stack:
                    print(f"ERROR: Orphan '{char}' at line {line_num}:{char_pos}")
                else:
                    last_char, last_line, last_pos = stack.pop()
                    if pairs[char] != last_char:
                        print(f"ERROR: Mismatched pair. Expected '{pairs[char]}' but found '{last_char}' (opened at line {last_line}:{last_pos}) closed by '{char}' at line {line_num}:{char_pos}")
    
    if stack:
        print("-" * 40)
        print(f"DEBUG: Remaining open items in stack: {len(stack)}")
        for item in stack:
            print(f"UNCLOSED: '{item[0]}' opened at line {item[1]}:{item[2]}")
    else:
        print("-" * 40)
        print("SUCCESS: All brackets, braces, and parentheses are balanced.")

if __name__ == "__main__":
    audit_file(r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx')
