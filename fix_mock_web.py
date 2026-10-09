import re
import os

path = "tests/direct/test_remediate.py"
content = open(path).read()

# Replace direct_vm.mock_web(url, response) with direct_vm.mock_web(url, {"body": response.decode("utf-8") if isinstance(response, bytes) else response, "status": 200, "method": "GET"})
# Since we are statically rewriting source code, we just rewrite `.encode("utf-8")` -> `.encode("utf-8").decode("utf-8")` which is silly but works, or we just remove `.encode("utf-8")` if it exists.
# We also have `b"..."` which we can convert to `"..."`.

def replacer(m):
    url = m.group(1)
    resp = m.group(2)
    # if resp has encode("utf-8"), strip it because body wants string
    if resp.endswith('.encode("utf-8")'):
        resp = resp[:-16]
    # if resp is b"...", make it "..."
    if resp.startswith('b"') or resp.startswith("b'"):
        resp = resp[1:]
    
    return f'mock_web({url}, {{"body": {resp}, "status": 200, "method": "GET"}})'

content = re.sub(r'mock_web\(([^,]+),\s*(.+?)\)', replacer, content)

with open(path, "w") as f:
    f.write(content)
print("Done")
