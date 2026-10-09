import json

def test_resolve_exact_fix_success(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    cid = contract.create_claim("GHSA-1234", "alice/repo", "1111111111111111111111111111111111111111", "0x" + direct_bob.hex())
    
    osv_res = json.dumps({"id": "GHSA-1234", "affected": [{"ranges": [{"type": "GIT", "repo": "https://github.com/alice/repo", "events": [{"fixed": "1111111111111111111111111111111111111111"}]}]}]})
    direct_vm.mock_web("https://api.osv.dev/v1/vulns/GHSA-1234", {"body": osv_res, "status": 200, "method": "GET"})
    
    direct_vm.sender = direct_bob
    contract.resolve(cid)
    assert contract.get_claim(cid)["appeal_state"] == "FIXED_EXACT"

def test_resolve_equivalent_fix_success(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    cid = contract.create_claim("GHSA-1234", "alice/repo", "3333333333333333333333333333333333333333", "0x" + direct_bob.hex())
    
    osv_res = json.dumps({"id": "GHSA-1234", "summary": "Fix buffer overflow", "details": "Buffer overflow", "affected": [{"ranges": [{"type": "GIT", "repo": "https://github.com/alice/repo", "events": [{"fixed": "2222222222222222222222222222222222222222"}]}]}]})
    direct_vm.mock_web("https://api.osv.dev/v1/vulns/GHSA-1234", {"body": osv_res, "status": 200, "method": "GET"})
    direct_vm.mock_web("https://github.com/alice/repo/commit/3333333333333333333333333333333333333333.patch", {"body": "diff", "status": 200, "method": "GET"})
    direct_vm.mock_llm("(?s).*", json.dumps('{"remediated": true}'))
    
    direct_vm.sender = direct_bob
    contract.resolve(cid)
    assert contract.get_claim(cid)["appeal_state"] == "FIXED_EQUIVALENT"

def test_resolve_unrelated_repo(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    cid = contract.create_claim("GHSA-1234", "alice/repo", "3333333333333333333333333333333333333333", "0x" + direct_bob.hex())
    
    osv_res = json.dumps({"id": "GHSA-1234", "affected": [{"ranges": [{"type": "GIT", "repo": "https://github.com/other/repo", "events": [{"fixed": "2222222222222222222222222222222222222222"}]}]}]})
    direct_vm.mock_web("https://api.osv.dev/v1/vulns/GHSA-1234", {"body": osv_res, "status": 200, "method": "GET"})
    
    direct_vm.sender = direct_bob
    contract.resolve(cid)
    assert contract.get_claim(cid)["appeal_state"] == "INSUFFICIENT"

def test_resolve_oversized_patch(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    cid = contract.create_claim("GHSA-1234", "alice/repo", "3333333333333333333333333333333333333333", "0x" + direct_bob.hex())
    
    osv_res = json.dumps({"id": "GHSA-1234", "summary": "Fix buffer overflow", "details": "Buffer overflow", "affected": [{"ranges": [{"type": "GIT", "repo": "https://github.com/alice/repo", "events": [{"fixed": "2222222222222222222222222222222222222222"}]}]}]})
    direct_vm.mock_web("https://api.osv.dev/v1/vulns/GHSA-1234", {"body": osv_res, "status": 200, "method": "GET"})
    direct_vm.mock_web("https://github.com/alice/repo/commit/3333333333333333333333333333333333333333.patch", {"body": "A" * 15000, "status": 200, "method": "GET"})
    
    direct_vm.sender = direct_bob
    contract.resolve(cid)
    assert contract.get_claim(cid)["appeal_state"] == "INSUFFICIENT"

def test_resolve_later_affected_entry(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    cid = contract.create_claim("GHSA-1234", "alice/repo", "1111111111111111111111111111111111111111", "0x" + direct_bob.hex())
    
    osv_res = json.dumps({"id": "GHSA-1234", "affected": [
        {"ranges": [{"type": "GIT", "repo": "https://github.com/other/repo", "events": [{"fixed": "2222222222222222222222222222222222222222"}]}]},
        {"ranges": [{"type": "GIT", "repo": "https://github.com/alice/repo", "events": [{"fixed": "1111111111111111111111111111111111111111"}]}]}
    ]})
    direct_vm.mock_web("https://api.osv.dev/v1/vulns/GHSA-1234", {"body": osv_res, "status": 200, "method": "GET"})
    
    direct_vm.sender = direct_bob
    contract.resolve(cid)
    assert contract.get_claim(cid)["appeal_state"] == "FIXED_EXACT"


def test_resolve_first_affected_entry(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    fixed_sha = "1111111111111111111111111111111111111111"
    cid = contract.create_claim("GHSA-1234", "alice/repo", fixed_sha, "0x" + direct_bob.hex())

    osv_res = json.dumps({"id": "GHSA-1234", "affected": [
        {"ranges": [{"type": "GIT", "repo": "https://github.com/alice/repo", "events": [{"fixed": fixed_sha}]}]},
        {"ranges": [{"type": "GIT", "repo": "https://github.com/other/repo", "events": [{"fixed": "2222222222222222222222222222222222222222"}]}]}
    ]})
    direct_vm.mock_web("https://api.osv.dev/v1/vulns/GHSA-1234", {"body": osv_res, "status": 200, "method": "GET"})

    direct_vm.sender = direct_bob
    contract.resolve(cid)
    assert contract.get_claim(cid)["appeal_state"] == "FIXED_EXACT"

def test_resolve_misleading_references(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    cid = contract.create_claim("GHSA-1234", "alice/repo", "3333333333333333333333333333333333333333", "0x" + direct_bob.hex())
    
    osv_res = json.dumps({"id": "GHSA-1234", "summary": "Fix buffer overflow", "details": "Buffer overflow", "affected": [{"ranges": [{"type": "GIT", "repo": "https://github.com/other/repo", "events": [{"fixed": "2222222222222222222222222222222222222222"}]}]}], "references": [{"type": "FIX", "url": "https://github.com/alice/repo/commit/3333333333333333333333333333333333333333"}]})
    direct_vm.mock_web("https://api.osv.dev/v1/vulns/GHSA-1234", {"body": osv_res, "status": 200, "method": "GET"})
    
    direct_vm.sender = direct_bob
    contract.resolve(cid)
    assert contract.get_claim(cid)["appeal_state"] == "INSUFFICIENT"

def test_resolve_oversized_osv(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    cid = contract.create_claim("GHSA-1234", "alice/repo", "3333333333333333333333333333333333333333", "0x" + direct_bob.hex())
    
    osv_res = json.dumps({"id": "GHSA-1234", "summary": "A"*2000, "details": "B"*15000, "affected": [{"ranges": [{"type": "GIT", "repo": "https://github.com/alice/repo", "events": [{"fixed": "2222222222222222222222222222222222222222"}]}]}]})
    direct_vm.mock_web("https://api.osv.dev/v1/vulns/GHSA-1234", {"body": osv_res, "status": 200, "method": "GET"})
    
    direct_vm.sender = direct_bob
    contract.resolve(cid)
    assert contract.get_claim(cid)["appeal_state"] == "INSUFFICIENT"
