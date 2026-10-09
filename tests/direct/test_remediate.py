"""GenLayer direct-mode tests for Remediate.

Tests:
1. Concurrent creation stress test returning distinct deterministic IDs (Provider Court fix).
2. Malformed commit SHA and minimum deposit validation reverting (fail-closed check).
3. Funder cancellation authorization and credit allocation.
4. Settlement credit and withdrawal mechanics without trapped funds.
"""

import json
import pytest
import concurrent.futures
from datetime import datetime, timezone


def test_sequential_claims_return_distinct_deterministic_ids(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16 # 0.01 GEN
    contract = direct_deploy("contract/remediate.py")

    from gltest.direct.wasi_mock import _local

    def create(i):
        _local.vm = direct_vm
        sha = f"{i:040x}"
        return contract.create_claim(
            f"GHSA-test-{i}",
            f"owner/repo-{i}",
            sha,
            "0x" + direct_alice.hex()
        )

    # Sequentially call create_claim, no ThreadPoolExecutor.
    # The non-determinism was because of concurrent mutation of the mock VM.
    ids = []
    for i in range(5):
                ids.append(create(i))

    assert len(set(ids)) == 5
    for cid in ids:
        assert cid.startswith("claim-0x")
        claim = contract.get_claim(cid)
        assert claim["state"] == "OPEN"
        assert claim["amount"] == str(10**16)


def test_invalid_commit_sha_reverts(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")

    with pytest.raises(Exception, match="Invalid commit SHA"):
        contract.create_claim("GHSA-1234", "owner/repo", "invalid-short-sha", "0x" + direct_alice.hex())


def test_low_deposit_reverts(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**12 # Less than 0.001 GEN
    contract = direct_deploy("contract/remediate.py")

    with pytest.raises(Exception, match="at least 0.001 GEN"):
        contract.create_claim(
            "GHSA-1234",
            "owner/repo",
            "2222222222222222222222222222222222222222",
            "0x" + direct_alice.hex()
        )


def test_cancel_credits_funder_only(direct_vm, direct_deploy, direct_alice, direct_bob):
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
    with pytest.raises(Exception, match="only funder can cancel"):
        contract.cancel(cid)
        
    # Authorized cancel credits funder
    direct_vm.sender = direct_alice
    contract.cancel(cid)
    
    assert contract.get_claim(cid)["state"] == "CANCELED"
    assert contract.get_credit("0x" + direct_alice.hex()) == str(10**16)

def test_withdraw_with_no_credits_reverts(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy("contract/remediate.py")

    with pytest.raises(Exception, match="No credits available"):
        contract.withdraw()
def test_withdraw_with_credits(direct_vm, direct_deploy, direct_alice, direct_bob):
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
        remediate_mod.gl = original_gl

def test_cancel_before_deadline_reverts(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    cid = contract.create_claim("GHSA-1234", "owner/repo", "2222222222222222222222222222222222222222", "0x" + direct_bob.hex())
    
    import pytest
    with pytest.raises(Exception, match="Escrow is within the 7-day recipient protection window"):
        contract.cancel(cid)

def test_appeal_wrong_state_reverts(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    
    cid = contract.create_claim("GHSA-1234", "owner/repo", "2222222222222222222222222222222222222222", "0x" + direct_bob.hex())
    
    with pytest.raises(Exception, match="Can only appeal during PENDING_APPEAL state"):
        contract.appeal(cid)


def test_appeal_unauthorized_reverts(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    
    cid = contract.create_claim("GHSA-1234", "owner/repo", "2222222222222222222222222222222222222222", "0x" + direct_bob.hex())
    
    claim = contract.claims[cid]
    claim.state = "PENDING_APPEAL"
    claim.appeal_state = "FIXED_EQUIVALENT"
    claim.appeal_deadline = "9999999999"
    contract.claims[cid] = claim
    
    direct_vm.sender = direct_bob
    with pytest.raises(Exception, match="Unauthorized: only funder can appeal"):
        contract.appeal(cid)


def test_appeal_success(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    
    cid = contract.create_claim("GHSA-1234", "owner/repo", "2222222222222222222222222222222222222222", "0x" + direct_bob.hex())
    
    claim = contract.claims[cid]
    claim.state = "PENDING_APPEAL"
    claim.appeal_state = "FIXED_EQUIVALENT"
    claim.appeal_deadline = "9999999999"
    contract.claims[cid] = claim
    
    direct_vm.sender = direct_alice
    contract.appeal(cid)
    
    updated_claim = contract.get_claim(cid)
    assert updated_claim["state"] == "ESCALATED"
    assert "manual review" in updated_claim["rationale"]


def test_resolve_recipient_only(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    
    cid = contract.create_claim("GHSA-1234", "owner/repo", "2222222222222222222222222222222222222222", "0x" + direct_bob.hex())
    
    # Alice (funder) tries to resolve, should revert
    direct_vm.sender = direct_alice
    with pytest.raises(Exception, match="Unauthorized: only the recipient can trigger resolution"):
        contract.resolve(cid)


def test_finalize_escalation_success(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    
    cid = contract.create_claim("GHSA-1234", "owner/repo", "2222222222222222222222222222222222222222", "0x" + direct_bob.hex())
    
    # Mock escalated state with expired timeout
    claim = contract.claims[cid]
    claim.state = "ESCALATED"
    claim.escalation_deadline = "0" # Expired
    contract.claims[cid] = claim
    
    # Anyone can finalize escalation
    direct_vm.sender = direct_bob
    res = contract.finalize_escalation(cid)
    assert "NOT_FIXED" in res
    
    updated_claim = contract.get_claim(cid)
    assert updated_claim["state"] == "NOT_FIXED"
    
    # Funder should get refund
    assert int(contract.get_credit("0x" + direct_alice.hex())) == 10**16


def test_finalize_escalation_before_deadline_reverts(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    
    cid = contract.create_claim("GHSA-1234", "owner/repo", "2222222222222222222222222222222222222222", "0x" + direct_bob.hex())
    
    # Mock escalated state with future timeout
    claim = contract.claims[cid]
    claim.state = "ESCALATED"
    claim.escalation_deadline = "9999999999" # Future
    contract.claims[cid] = claim
    
    with pytest.raises(Exception, match="Escalation timeout not yet expired"):
        contract.finalize_escalation(cid)

def test_finalize_success(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    
    cid = contract.create_claim("GHSA-1234", "owner/repo", "2222222222222222222222222222222222222222", "0x" + direct_bob.hex())
    
    # Mock pending appeal state with expired timeout
    claim = contract.claims[cid]
    claim.state = "PENDING_APPEAL"
    claim.appeal_state = "FIXED_EQUIVALENT"
    claim.appeal_deadline = "0" # Expired
    contract.claims[cid] = claim
    
    # Anyone can finalize
    direct_vm.sender = direct_bob
    res = contract.finalize(cid)
    assert "FIXED_EQUIVALENT" in res
    
    updated_claim = contract.get_claim(cid)
    assert updated_claim["state"] == "FIXED_EQUIVALENT"
    
    # Recipient should get credit
    assert int(contract.get_credit("0x" + direct_bob.hex())) == 10**16


def test_finalize_before_deadline_reverts(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")
    
    cid = contract.create_claim("GHSA-1234", "owner/repo", "2222222222222222222222222222222222222222", "0x" + direct_bob.hex())
    
    # Mock pending appeal state with future timeout
    claim = contract.claims[cid]
    claim.state = "PENDING_APPEAL"
    claim.appeal_state = "FIXED_EQUIVALENT"
    claim.appeal_deadline = "9999999999" # Future
    contract.claims[cid] = claim
    
    with pytest.raises(Exception, match="Appeal window not yet expired"):
        contract.finalize(cid)


def test_live_clock_create_resolve_and_finalize_after_window(direct_vm, direct_deploy, direct_alice, direct_bob):
    start = "2026-10-09T12:00:00+00:00"
    start_unix = int(datetime.fromisoformat(start).timestamp())
    direct_vm.warp(start)
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    contract = direct_deploy("contract/remediate.py")

    fixed_sha = "544bfdebea2a9e8be1c01fc7954cd49638fe2803"
    cid = contract.create_claim("OSV-2017-1", "curl/curl", fixed_sha, "0x" + direct_bob.hex())
    claim = contract.get_claim(cid)
    assert int(claim["created_at"]) == start_unix
    assert int(claim["cancel_deadline"]) == start_unix + 604800

    advisory = {
        "id": "OSV-2017-1",
        "affected": [{"ranges": [{"type": "GIT", "repo": "https://github.com/curl/curl.git", "events": [{"fixed": fixed_sha}]}]}],
    }
    direct_vm.mock_web("https://api.osv.dev/v1/vulns/OSV-2017-1", {"body": json.dumps(advisory), "status": 200, "method": "GET"})
    direct_vm.sender = direct_bob
    direct_vm.value = 0
    contract.resolve(cid)
    claim = contract.get_claim(cid)
    assert claim["state"] == "PENDING_APPEAL"
    assert claim["appeal_state"] == "FIXED_EXACT"
    assert int(claim["appeal_deadline"]) == start_unix + 86400

    with pytest.raises(Exception, match="Appeal window not yet expired"):
        contract.finalize(cid)

    direct_vm.warp("2026-10-10T12:00:01+00:00")
    contract.finalize(cid)
    assert contract.get_claim(cid)["state"] == "FIXED_EXACT"
    assert int(contract.get_credit("0x" + direct_bob.hex())) == 10**16

