import re
path = "tests/direct/test_remediate.py"
with open(path, "r") as f:
    content = f.read()

# Fix assertions for unrelated repo and misleading references
content = content.replace('assert claim["appeal_state"] == "NOT_FIXED"', 'assert claim["appeal_state"] == "INSUFFICIENT"')

# Insert warp for cancel tests
cancel_test_code = """    # Bob cannot cancel
    direct_vm.sender = direct_bob
    with pytest.raises(Exception, match="Unauthorized"):
        contract.cancel(cid)

    # Alice (funder) can cancel
    direct_vm.sender = direct_alice
    contract.cancel(cid)"""

new_cancel_test_code = """    # Bob cannot cancel
    direct_vm.sender = direct_bob
    with pytest.raises(Exception, match="Unauthorized"):
        contract.cancel(cid)

    # Alice (funder) can cancel
    direct_vm.sender = direct_alice
    direct_vm.warp("2030-01-01T00:00:00Z")
    contract.cancel(cid)"""

content = content.replace(cancel_test_code, new_cancel_test_code)

withdraw_test_code = """    cid = contract.create_claim("GHSA-cancel-test", "owner/repo", "2222222222222222222222222222222222222222", "0x" + direct_bob.hex())
    contract.cancel(cid)"""

new_withdraw_test_code = """    cid = contract.create_claim("GHSA-cancel-test", "owner/repo", "2222222222222222222222222222222222222222", "0x" + direct_bob.hex())
    direct_vm.warp("2030-01-01T00:00:00Z")
    contract.cancel(cid)"""

content = content.replace(withdraw_test_code, new_withdraw_test_code)

with open(path, "w") as f:
    f.write(content)
print("Done")
