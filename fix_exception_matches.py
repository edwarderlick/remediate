import re

with open('tests/direct/test_remediate.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('match="Only funder can cancel"', 'match="only funder can cancel"')
content = content.replace('match="Cancellation lock period has not expired"', 'match="Escrow is within the 7-day recipient protection window"')

with open('tests/direct/test_remediate.py', 'w', encoding='utf-8') as f:
    f.write(content)
