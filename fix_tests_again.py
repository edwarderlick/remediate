import json
import re

path = "tests/direct/test_remediate.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace empty cancellation test
replacement = """def test_cancel_before_deadline_reverts(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    cid = contract.create_claim("GHSA-1234", "owner/repo", "2222222222222222222222222222222222222222", "0x" + direct_bob.hex())
    direct_vm.sender = direct_alice
    # By default, claim.cancel_deadline is 7 days in the future
    import pytest
    with pytest.raises(Exception, match="Cancellation lock period has not expired"):
        contract.cancel(cid)
"""
content = content.replace("def test_cancel_before_deadline_reverts(direct_vm, direct_deploy, direct_alice, direct_bob):\n    pass", replacement)

# Now check if test_full_lifecycle_success exists. If it does, we'll replace it to match EXACTLY what they asked for.
new_tests = """
def test_full_lifecycle_success(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    
    target_repo = "alice/target-repo"
    fixed_sha = "3333333333333333333333333333333333333333"
    cid = contract.create_claim("GHSA-1234", target_repo, fixed_sha, "0x" + direct_bob.hex())
    
    # Mock OSV response for equivalent fix
    osv_res = json.dumps({
        "id": "GHSA-1234",
        "schema_version": "1.6.0",
        "summary": "Fix buffer overflow",
        "details": "Details about buffer overflow",
        "affected": [{
            "ranges": [{
                "type": "GIT",
                "repo": f"https://github.com/{target_repo}",
                "events": [{"fixed": "2222222222222222222222222222222222222222"}]
            }]
        }]
    })
    direct_vm.mock_web("https://api.osv.dev/v1/vulns/GHSA-1234", {"body": osv_res, "status": 200, "method": "GET"})
    direct_vm.mock_web(f"https://github.com/{target_repo}/commit/{fixed_sha}.patch", {"body": "diff", "status": 200, "method": "GET"})
    direct_vm.mock_llm("(?s).*", '{"remediated": true}')
    
    direct_vm.sender = direct_bob
    contract.resolve(cid)
    assert contract.get_claim(cid)["state"] == "PENDING_APPEAL"
    
    # Fast forward time to expire appeal window (without setting state)
    claim = contract.claims[cid]
    claim.appeal_deadline = "1"
    contract.claims[cid] = claim
    
    contract.finalize(cid)
    
    assert contract.get_claim(cid)["state"] == "FIXED_EQUIVALENT"
    assert contract.get_credit("0x" + direct_bob.hex()) == 10**16
    
    contract.withdraw()
    assert contract.get_credit("0x" + direct_bob.hex()) == 0

def test_full_appeal_timeout_funder_withdraw(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    
    target_repo = "alice/target-repo"
    fixed_sha = "3333333333333333333333333333333333333333"
    cid = contract.create_claim("GHSA-1234", target_repo, fixed_sha, "0x" + direct_bob.hex())
    
    osv_res = json.dumps({
        "id": "GHSA-1234",
        "schema_version": "1.6.0",
        "summary": "Fix buffer overflow",
        "details": "Details about buffer overflow",
        "affected": [{
            "ranges": [{
                "type": "GIT",
                "repo": f"https://github.com/{target_repo}",
                "events": [{"fixed": "2222222222222222222222222222222222222222"}]
            }]
        }]
    })
    direct_vm.mock_web("https://api.osv.dev/v1/vulns/GHSA-1234", {"body": osv_res, "status": 200, "method": "GET"})
    direct_vm.mock_web(f"https://github.com/{target_repo}/commit/{fixed_sha}.patch", {"body": "diff", "status": 200, "method": "GET"})
    direct_vm.mock_llm("(?s).*", '{"remediated": true}')
    
    direct_vm.sender = direct_bob
    contract.resolve(cid)
    
    direct_vm.sender = direct_alice
    contract.appeal(cid)
    assert contract.get_claim(cid)["state"] == "ESCALATED"
    
    # Advance clock for escalation timeout
    claim = contract.claims[cid]
    claim.escalation_deadline = "1"
    contract.claims[cid] = claim
    
    contract.finalize_escalation(cid)
    assert contract.get_claim(cid)["state"] == "NOT_FIXED"
    assert contract.get_credit("0x" + direct_alice.hex()) == 10**16
    
    contract.withdraw()
    assert contract.get_credit("0x" + direct_alice.hex()) == 0

def test_withdraw_failed_transfer_preserves_credit(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    
    cid = contract.create_claim("GHSA-cancel-test", "owner/repo", "2222222222222222222222222222222222222222", "0x" + direct_bob.hex())
    
    # Fast forward to cancel
    claim = contract.claims[cid]
    claim.cancel_deadline = "1"
    contract.claims[cid] = claim
    contract.cancel(cid)
    
    assert contract.get_credit("0x" + direct_alice.hex()) == 10**16
    
    # Mock emit_transfer to fail
    original_emit = contract.emit_transfer
    def mock_emit(*args):
        raise Exception("Transfer failed mock")
    contract.emit_transfer = mock_emit
    
    import pytest
    with pytest.raises(Exception, match="Transfer failed mock"):
        contract.withdraw()
        
    contract.emit_transfer = original_emit
    assert contract.get_credit("0x" + direct_alice.hex()) == 10**16
"""

# check if we already have test_full_lifecycle_success
if "def test_full_lifecycle_success" in content:
    # remove everything from test_full_lifecycle_success to end of file, assuming they are at the end
    idx = content.find("def test_full_lifecycle_success")
    content = content[:idx]
    
content += "\n" + new_tests

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
