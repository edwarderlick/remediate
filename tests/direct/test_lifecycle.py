import json

def test_full_lifecycle_success(direct_vm, direct_deploy, direct_alice, direct_bob):
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
    
    claim = contract.claims[cid]
    claim.appeal_deadline = "0"
    contract.claims[cid] = claim
    
    contract.finalize(cid)
    assert contract.get_credit("0x" + direct_bob.hex()) == str(10**16)
    
    contract.withdraw()
    assert contract.get_credit("0x" + direct_bob.hex()) == "0"

def test_full_appeal_timeout_funder_withdraw(direct_vm, direct_deploy, direct_alice, direct_bob):
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
    
    direct_vm.sender = direct_alice
    contract.appeal(cid)
    
    claim = contract.claims[cid]
    claim.escalation_deadline = "0"
    contract.claims[cid] = claim
    
    contract.finalize_escalation(cid)
    assert contract.get_credit("0x" + direct_alice.hex()) == str(10**16)
    
    contract.withdraw()
    assert contract.get_credit("0x" + direct_alice.hex()) == "0"

def test_withdraw_failed_transfer_preserves_credit(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    cid = contract.create_claim("GHSA-cancel", "alice/repo", "3333333333333333333333333333333333333333", "0x" + direct_bob.hex())
    
    claim = contract.claims[cid]
    claim.cancel_deadline = "0"
    contract.claims[cid] = claim
    
    contract.cancel(cid)
    assert contract.get_credit("0x" + direct_alice.hex()) == str(10**16)
    
    import sys
    # The module is loaded as _contract_remediate by genlayer-test.
    # We can find it in sys.modules
    remediate_mod = sys.modules.get("_contract_remediate")
    original_gl = remediate_mod.gl
    
    class FakeContractProxy:
        def emit_transfer(self, value):
            raise Exception("Transfer failed mock")
            
    class FakeContractNS:
        def get_at(self, address):
            return FakeContractProxy()
            
    class FakeGL:
        def __init__(self):
            self.contract = FakeContractNS()
            self.message = original_gl.message
            self.vm = original_gl.vm
            self.public = original_gl.public
            
    remediate_mod.gl = FakeGL()
    
    import pytest
    with pytest.raises(Exception, match="Transfer failed mock"):
        contract.withdraw()
        
    remediate_mod.gl = original_gl
    assert contract.get_credit("0x" + direct_alice.hex()) == str(10**16)

