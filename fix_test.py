import json

path = "tests/direct/test_remediate.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace mock_llm_response usages with direct_vm.mock_llm
content = content.replace(
    'from gltest.direct.wasi_mock import mock_llm_response\n    ',
    ''
)
content = content.replace(
    'with mock_llm_response(json.dumps({"match_state": "FIXED_EXACT", "rationale": "Exact patch matches"})):',
    'direct_vm.mock_llm("(?s).*", \'{"remediated": true}\')'
)
content = content.replace(
    'with mock_llm_response(json.dumps({"match_state": "NOT_FIXED", "rationale": "Does not fix"})):',
    'direct_vm.mock_llm("(?s).*", \'{"remediated": false}\')'
)

# Replace the block
content = content.replace(
    '    direct_vm.mock_llm("(?s).*", \'{"remediated": true}\')\n        contract.resolve(cid)',
    '    direct_vm.mock_llm("(?s).*", \'{"remediated": true}\')\n    direct_vm.mock_web("https://api.osv.dev/v1/vulns/GHSA-1234", {"body": json.dumps({"id": "GHSA-1234", "affected": [{"repo": "owner/repo", "ranges": [{"type": "GIT", "events": [{"fixed": "1111111111111111111111111111111111111111"}]}]}]}), "status": 200, "method": "GET"})\n    direct_vm.mock_web("https://github.com/owner/repo/commit/2222222222222222222222222222222222222222.patch", {"body": "diff", "status": 200, "method": "GET"})\n    contract.resolve(cid)'
)

content = content.replace(
    '    direct_vm.mock_llm("(?s).*", \'{"remediated": false}\')\n        contract.resolve(cid)',
    '    direct_vm.mock_llm("(?s).*", \'{"remediated": false}\')\n    direct_vm.mock_web("https://api.osv.dev/v1/vulns/GHSA-1234", {"body": json.dumps({"id": "GHSA-1234", "affected": [{"repo": "owner/repo", "ranges": [{"type": "GIT", "events": [{"fixed": "1111111111111111111111111111111111111111"}]}]}]}), "status": 200, "method": "GET"})\n    direct_vm.mock_web("https://github.com/owner/repo/commit/2222222222222222222222222222222222222222.patch", {"body": "diff", "status": 200, "method": "GET"})\n    contract.resolve(cid)'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
