p = r'tests/direct/test_remediate.py'
with open(p, 'r') as f:
    c = f.read()

c = c.replace('appeal_deadline = "1"', 'appeal_deadline = "0"')
c = c.replace('cancel_deadline = "1"', 'cancel_deadline = "0"')
c = c.replace('escalation_deadline = "1"', 'escalation_deadline = "0"')

with open(p, 'w') as f:
    f.write(c)
print('Done!')
