import re
import os

p = r'C:\Users\samir\AppData\Local\Programs\Python\Python312\Lib\site-packages\gltest\direct\wasi_mock.py'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

c = re.sub(
    r'# Auto-parse JSON strings.*?return \{"ok": response\}',
    r'return {"ok": response}',
    c,
    flags=re.DOTALL
)

with open(p, 'w', encoding='utf-8') as f:
    f.write(c)
print('Done!')
