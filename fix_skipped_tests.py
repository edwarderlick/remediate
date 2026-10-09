import re

with open('tests/direct/test_remediate.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the pytest skips
content = re.sub(r'@pytest\.mark\.skip\([^\)]+\)\n', '', content)

# 1. test_cancel_credits_funder_only
def replace_func(func_name, new_impl, text):
    # Regex to find the function and replace it. Assumes functions end at the next "def " or EOF
    pattern = r'def ' + func_name + r'\(.*?\):(?:(?!def ).)*'
    return re.sub(pattern, new_impl + '\n\n', text, flags=re.DOTALL)

test_cancel = """def test_cancel_credits_funder_only(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    cid = contract.create_claim("GHSA-1234", "owner/repo", "2222222222222222222222222222222222222222", "0x" + direct_bob.hex())
    
    # Fast forward deadline
    claim = contract.claims[cid]
    claim.cancel_deadline = "0"
    contract.claims[cid] = claim
    
    # Unauthorized cancel should fail
    direct_vm.sender = direct_bob
    import pytest
    with pytest.raises(Exception, match="Only funder can cancel"):
        contract.cancel(cid)
        
    # Authorized cancel credits funder
    direct_vm.sender = direct_alice
    contract.cancel(cid)
    
    assert contract.get_claim(cid)["state"] == "CANCELED"
    assert contract.get_credit("0x" + direct_alice.hex()) == str(10**16)"""

test_withdraw = """def test_withdraw_with_credits(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    cid = contract.create_claim("GHSA-1234", "owner/repo", "2222222222222222222222222222222222222222", "0x" + direct_bob.hex())
    
    # Give alice credits by cancelling
    claim = contract.claims[cid]
    claim.cancel_deadline = "0"
    contract.claims[cid] = claim
    
    contract.cancel(cid)
    assert contract.get_credit("0x" + direct_alice.hex()) == str(10**16)
    
    # Let's patch get_at for the test
    import sys
    remediate_mod = sys.modules.get("_contract_remediate")
    if not remediate_mod:
        import _contract_remediate as remediate_mod
    original_gl = remediate_mod.gl
    
    class FakeContractProxy:
        def __init__(self):
            self.transferred = 0
        def emit_transfer(self, value):
            self.transferred = value
            
    proxy = FakeContractProxy()
    
    class FakeContractNS:
        def get_at(self, address):
            return proxy
            
    class FakeGL:
        def __init__(self):
            self.contract = FakeContractNS()
            self.message = original_gl.message
            self.vm = original_gl.vm
            self.public = original_gl.public
            
    remediate_mod.gl = FakeGL()
    
    try:
        contract.withdraw()
        assert contract.get_credit("0x" + direct_alice.hex()) == "0"
        assert proxy.transferred == 10**16
    finally:
        remediate_mod.gl = original_gl"""

test_cancel_early = """def test_cancel_before_deadline_reverts(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    cid = contract.create_claim("GHSA-1234", "owner/repo", "2222222222222222222222222222222222222222", "0x" + direct_bob.hex())
    
    import pytest
    with pytest.raises(Exception, match="Cancellation lock period has not expired"):
        contract.cancel(cid)"""

content = replace_func("test_cancel_credits_funder_only", test_cancel, content)
content = replace_func("test_withdraw_with_credits", test_withdraw, content)
content = replace_func("test_cancel_before_deadline_reverts", test_cancel_early, content)

with open('tests/direct/test_remediate.py', 'w', encoding='utf-8') as f:
    f.write(content)
