with open('tests/direct/test_lifecycle.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the test_withdraw_failed_transfer_preserves_credit
new_test = """def test_withdraw_failed_transfer_preserves_credit(direct_vm, direct_deploy, direct_alice, direct_bob):
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
"""

import re
content = re.sub(r'def test_withdraw_failed_transfer_preserves_credit.*?$', new_test, content, flags=re.DOTALL)

with open('tests/direct/test_lifecycle.py', 'w', encoding='utf-8') as f:
    f.write(content)
