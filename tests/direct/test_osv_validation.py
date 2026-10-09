import json

def test_osv_oversized_fields_fail_closed(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    
    cid = contract.create_claim("GHSA-1234", "owner/repo", "2222222222222222222222222222222222222222", "0x" + direct_bob.hex())
    
    large_summary = "A" * 1000
    large_details = "B" * 3000
    
    osv_json = {
        "id": "GHSA-1234",
        "summary": large_summary,
        "details": large_details,
        "affected": [
            {
                "repo": "owner/repo",
                "ranges": [{"type": "GIT", "events": [{"fixed": "1111111111111111111111111111111111111111"}]}]
            }
        ]
    }
    
    direct_vm.sender = direct_bob
    direct_vm.mock_web("https://api.osv.dev/v1/vulns/GHSA-1234", {"body": json.dumps(osv_json), "status": 200, "method": "GET"})
    direct_vm.mock_web("https://github.com/owner/repo/commit/2222222222222222222222222222222222222222.patch", {"body": "diff content", "status": 200, "method": "GET"})
    
    contract.resolve(cid)
    
    assert contract.get_claim(cid)["appeal_state"] == "INSUFFICIENT"
