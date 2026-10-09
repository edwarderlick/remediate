with open('tests/direct/test_remediate.py', 'r', encoding='utf-8') as f:
    t = f.read()
t = t.replace('claim.escalation_deadline = "1"', 'claim.escalation_deadline = "0"')
t = t.replace('claim.appeal_deadline = "1"', 'claim.appeal_deadline = "0"')
with open('tests/direct/test_remediate.py', 'w', encoding='utf-8') as f:
    f.write(t)
