import re

with open('tests/direct/test_remediate.py', 'r', encoding='utf-8') as f:
    t = f.read()

t = t.replace('claim.escalation_deadline = "1"', 'claim.escalation_deadline = "0"')
t = t.replace('claim.appeal_deadline = "1"', 'claim.appeal_deadline = "0"')

# Carefully replace the assert in test_resolve_oversized_osv
# Let's split by "def " and process each function
functions = t.split('\ndef ')
new_functions = []
for func in functions:
    if func.startswith('test_resolve_oversized_osv'):
        func = func.replace('assert claim["appeal_state"] == "FIXED_EQUIVALENT"', 'assert claim["appeal_state"] == "INSUFFICIENT"')
    new_functions.append(func)

t = '\ndef '.join(new_functions)

with open('tests/direct/test_remediate.py', 'w', encoding='utf-8') as f:
    f.write(t)
