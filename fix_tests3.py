import re
path = "tests/direct/test_remediate.py"
with open(path, "r") as f:
    content = f.read()

content = content.replace('direct_vm.warp("2030-01-01T00:00:00Z")', 'contract.claims[cid].cancel_deadline = "0"')

with open(path, "w") as f:
    f.write(content)
print("Done")
