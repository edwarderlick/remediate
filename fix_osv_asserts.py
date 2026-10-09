import re

path = "tests/direct/test_osv_validation.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'assert contract.get_claim(cid)["state"] == "INSUFFICIENT"',
    'assert contract.get_claim(cid)["appeal_state"] == "INSUFFICIENT"'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
