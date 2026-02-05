from pathlib import Path

path = Path('src/app/dashboard/taller/components/TallerStageDashboard.tsx')
code = path.read_text()
line = 1
col = 0
stack = []
state = 'normal'
i = 0
while i < len(code):
    ch = code[i]
    if ch == '\n':
        line += 1
        col = 0
        if state == 'line_comment':
            state = 'normal'
        i += 1
        continue
    if state == 'normal':
        if ch == '/':
            nxt = code[i+1] if i+1 < len(code) else ''
            if nxt == '/':
                state = 'line_comment'
                i += 2
                continue
            if nxt == '*':
                state = 'block_comment'
                i += 2
                continue
        elif ch in ('"', "'", '`'):
            string_delim = ch
            i += 1
            escape = False
            while i < len(code):
                cc = code[i]
                if cc == '\\' and not escape:
                    escape = True
                elif cc == string_delim and not escape:
                    i += 1
                    break
                else:
                    escape = False
                i += 1
            continue
        elif ch == '(':
            stack.append((line, col + 1))
        elif ch == ')':
            if stack:
                stack.pop()
            else:
                print('Unmatched ) at line', line)
        i += 1
        col += 1
    elif state in ('line_comment', 'block_comment'):
        i += 1
        col += 1
if stack:
    print('Unmatched ( remains at lines:', stack)
else:
    print('Parentheses balanced')
