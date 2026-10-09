import json
import re

path = "tests/direct/test_osv_validation.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

new_test = """
def test_missing_summary_details_fails_closed(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    
    cid = contract.create_claim("GHSA-1234", "owner/repo", "2222222222222222222222222222222222222222", "0x" + direct_bob.hex())
    
    osv_json = {
        "id": "GHSA-1234",
        "affected": [
            {
                "repo": "owner/repo",
                "ranges": [{"type": "GIT", "events": [{"fixed": "1111111111111111111111111111111111111111"}]}]
            }
        ]
    }
    
    direct_vm.sender = direct_bob
    direct_vm.mock_web("https://api.osv.dev/v1/vulns/GHSA-1234", {"body": json.dumps(osv_json), "status": 200, "method": "GET"})
    direct_vm.mock_web("https://github.com/owner/repo/commit/2222222222222222222222222222222222222222.patch", {"body": "diff", "status": 200, "method": "GET"})
    
    res = contract.resolve(cid)
    assert "INSUFFICIENT" in res
    assert contract.get_claim(cid)["appeal_state"] == "INSUFFICIENT"

"""

if "test_missing_summary_details_fails_closed" not in content:
    with open(path, "a", encoding="utf-8") as f:
        f.write(new_test)
