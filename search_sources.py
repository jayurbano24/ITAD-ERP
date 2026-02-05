import pathlib
path = pathlib.Path('.next/server/app/dashboard/taller/page.js')
text = path.read_text('utf-8')
key = 'sourcesContent'
print('contains', key in text)
if key in text:
    print(text.index(key))
# Print snippet around location
start = text.find(key)
if start != -1:
    print(text[start:start+200])
