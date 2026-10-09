import re

path = "tests/direct/test_remediate.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(
    r'"id": "GHSA-1234",\s*"schema_version": "1.6.0",',
    '"id": "GHSA-1234",\n            "schema_version": "1.6.0",\n            "summary": "Fix buffer overflow",\n            "details": "Details about buffer overflow",',
    content
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
