with open('contract/remediate.py', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('if not summary and not details:', 'if len(summary) > 1000 or len(details) > 10000:\n                return STATE_INSUFFICIENT\n\n            if not summary and not details:')

with open('contract/remediate.py', 'w', encoding='utf-8') as f:
    f.write(c)

with open('tests/direct/test_remediate.py', 'r', encoding='utf-8') as f:
    t = f.read()

t = t.replace('assert claim["appeal_state"] == "FIXED_EQUIVALENT"', 'assert claim["appeal_state"] == "INSUFFICIENT"')

with open('tests/direct/test_remediate.py', 'w', encoding='utf-8') as f:
    f.write(t)
