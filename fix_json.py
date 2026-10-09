path = "tests/direct/test_remediate.py"
content = open(path).read()
content = content.replace('json.dumps({"remediated": True, "reason": "Equivalent fix"})', '\'{"remediated": true, "reason": "Equivalent fix"}\'')
content = content.replace('json.dumps({"remediated": False, "reason": "Unrelated repo"})', '\'{"remediated": false, "reason": "Unrelated repo"}\'')
open(path, "w").write(content)
print("Done")
