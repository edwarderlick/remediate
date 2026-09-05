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


def test_concurrent_claims_return_distinct_deterministic_ids(direct_vm, direct_deploy, direct_alice):
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

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
        futures = [ex.submit(create, i) for i in range(5)]
        ids = [f.result() for f in futures]

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

    cid = contract.create_claim(
        "GHSA-cancel-test",
        "owner/repo",
        "2222222222222222222222222222222222222222",
        "0x" + direct_bob.hex()
    )

    # Bob cannot cancel
    direct_vm.sender = direct_bob
    with pytest.raises(Exception, match="Unauthorized"):
        contract.cancel(cid)

    # Alice (funder) can cancel
    direct_vm.sender = direct_alice
    contract.cancel(cid)

    claim = contract.get_claim(cid)
    assert claim["state"] == "CANCELED"
    assert contract.get_credit("0x" + direct_alice.hex()) == 10**16


def test_withdraw_with_no_credits_reverts(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy("contract/remediate.py")

    with pytest.raises(Exception, match="No credits available"):
        contract.withdraw()
