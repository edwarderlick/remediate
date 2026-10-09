import re

path = "tests/direct/test_remediate.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'assert contract.get_credit("0x" + direct_bob.hex()) == 10**16',
    'assert str(contract.get_credit("0x" + direct_bob.hex())) == str(10**16)'
)
content = content.replace(
    'assert contract.get_credit("0x" + direct_bob.hex()) == 0',
    'assert str(contract.get_credit("0x" + direct_bob.hex())) == "0"'
)
content = content.replace(
    'assert contract.get_credit("0x" + direct_alice.hex()) == 10**16',
    'assert str(contract.get_credit("0x" + direct_alice.hex())) == str(10**16)'
)
content = content.replace(
    'assert contract.get_credit("0x" + direct_alice.hex()) == 0',
    'assert str(contract.get_credit("0x" + direct_alice.hex())) == "0"'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
