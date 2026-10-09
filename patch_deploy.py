import re
with open('scripts/deploy.ts', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('const isDryRun = process.argv.includes("--dry-run");', 'const isDryRun = !process.argv.includes("--deploy");')

with open('scripts/deploy.ts', 'w', encoding='utf-8') as f:
    f.write(c)
