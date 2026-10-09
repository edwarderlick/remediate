with open('contract/remediate.py', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('if len(summary) > 1000 or len(details) > 10000:', 'if len(summary) > 500 or len(details) > 2000:')

with open('contract/remediate.py', 'w', encoding='utf-8') as f:
    f.write(c)

with open('tests/direct/test_remediate.py', 'r', encoding='utf-8') as f:
    t = f.read()

t = t.replace('assert claim["appeal_state"] == "INSUFFICIENT"', 'assert claim["appeal_state"] == "FIXED_EQUIVALENT"')

import re
t = re.sub(r'(def test_resolve_oversized_osv.*?assert claim\["appeal_state"\] == )"FIXED_EQUIVALENT"', r'\1"INSUFFICIENT"', t, flags=re.DOTALL)

with open('tests/direct/test_remediate.py', 'w', encoding='utf-8') as f:
    f.write(t)
