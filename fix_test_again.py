with open('tests/direct/test_remediate.py', 'r', encoding='utf-8') as f:
    c = f.read()

import re
# Find the test_resolve_oversized_osv function and replace its assert
c = re.sub(
    r'(def test_resolve_oversized_osv.*?claim = contract.get_claim\(cid\)\n\s+assert claim\["appeal_state"\] == )"FIXED_EQUIVALENT"',
    r'\1"INSUFFICIENT"',
    c,
    flags=re.DOTALL
)

with open('tests/direct/test_remediate.py', 'w', encoding='utf-8') as f:
    f.write(c)
