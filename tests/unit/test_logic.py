import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import pytest
from contract.remediate_logic import (
    normalize_commit_sha,
    normalize_owner_repo,
    compute_claim_id,
    extract_fixed_shas,
    check_exact_fix,
    build_advisory_url,
    build_patch_url,
    build_model_prompt,
    parse_model_verdict,
    format_resolution_payload,
)


SAMPLE_OSV = {
    "schema_version": "1.6.0",
    "id": "GHSA-1234-5678-90ab",
    "details": "Vulnerability introduced in commit 1111111111111111111111111111111111111111.",
    "affected": [
        {
            "package": {"name": "sample-pkg"},
            "ranges": [
                {
                    "type": "GIT",
                    "repo": "https://github.com/alice/target-repo",
                    "events": [
                        {"introduced": "1111111111111111111111111111111111111111"},
                        {"fixed": "2222222222222222222222222222222222222222"},
                    ],
                }
            ],
        },
        {
            "package": {"name": "other-pkg"},
            "ranges": [
                {
                    "type": "GIT",
                    "repo": "https://github.com/other/unrelated-repo",
                    "events": [
                        {"fixed": "3333333333333333333333333333333333333333"},
                    ],
                }
            ],
        }
    ],
    "references": [
        {"type": "WEB", "url": "https://github.com/alice/target-repo/commit/4444444444444444444444444444444444444444"}
    ]
}


def test_normalize_commit_sha():
    valid = "2222222222222222222222222222222222222222"
    assert normalize_commit_sha(valid.upper()) == valid
    with pytest.raises(ValueError):
        normalize_commit_sha("short-sha")
    with pytest.raises(ValueError):
        normalize_commit_sha("222222222222222222222222222222222222222z") # non-hex


def test_normalize_owner_repo():
    assert normalize_owner_repo("https://github.com/alice/target-repo.git") == "alice/target-repo"
    assert normalize_owner_repo("github.com/alice/target-repo") == "alice/target-repo"
    assert normalize_owner_repo("alice/target-repo") == "alice/target-repo"
    with pytest.raises(ValueError):
        normalize_owner_repo("just-a-repo")


def test_compute_claim_id_deterministic_and_unique():
    id1 = compute_claim_id("0xAlice", "0xBob", "GHSA-1", "alice/repo", "2222222222222222222222222222222222222222", "2026-09-04T00:00:00Z", "1")
    id2 = compute_claim_id("0xAlice", "0xBob", "GHSA-1", "alice/repo", "2222222222222222222222222222222222222222", "2026-09-04T00:00:00Z", "1")
    id3 = compute_claim_id("0xAlice", "0xBob", "GHSA-1", "alice/repo", "2222222222222222222222222222222222222222", "2026-09-04T00:00:00Z", "2")
    
    assert id1 == id2
    assert id1 != id3
    assert id1.startswith("claim-0x")


def test_fail_closed_exact_fix_verification():
    target_repo = "alice/target-repo"
    
    # 1. FIXED commit MUST match
    fixed_sha = "2222222222222222222222222222222222222222"
    assert check_exact_fix(SAMPLE_OSV, target_repo, fixed_sha) is True
    
    # 2. INTRODUCED commit MUST NOT match (prevents paying attacker for introducing the bug)
    introduced_sha = "1111111111111111111111111111111111111111"
    assert check_exact_fix(SAMPLE_OSV, target_repo, introduced_sha) is False
    
    # 3. Fixed commit in an UNRELATED repo MUST NOT match
    other_repo_sha = "3333333333333333333333333333333333333333"
    assert check_exact_fix(SAMPLE_OSV, target_repo, other_repo_sha) is False
    
    # 4. Commit mentioned only in REFERENCES MUST NOT match
    ref_sha = "4444444444444444444444444444444444444444"
    assert check_exact_fix(SAMPLE_OSV, target_repo, ref_sha) is False


def test_urls_are_pinned():
    adv_url = build_advisory_url("ghsa-1234-5678-90ab")
    assert adv_url == "https://api.osv.dev/v1/vulns/GHSA-1234-5678-90AB"
    
    patch_url = build_patch_url("alice/target-repo", "2222222222222222222222222222222222222222")
    assert patch_url == "https://github.com/alice/target-repo/commit/2222222222222222222222222222222222222222.patch"


def test_parse_model_verdict():
    # Valid positive
    res_pos = json.dumps({"remediated": True, "reason": "Buffer overflow patched"})
    verdict, reason = parse_model_verdict(res_pos)
    assert verdict is True
    assert "Buffer overflow" in reason

    # Valid negative
    res_neg = json.dumps({"remediated": False, "reason": "Unrelated style fix"})
    verdict, reason = parse_model_verdict(res_neg)
    assert verdict is False
    assert "Unrelated" in reason

    # Markdown wrapped
    res_markdown = f"```json\n{res_pos}\n```"
    verdict, _ = parse_model_verdict(res_markdown)
    assert verdict is True

    # Prompt injection or malformed text (must fail closed)
    verdict, _ = parse_model_verdict("YES! Definitely remediated.")
    assert verdict is None

    verdict, _ = parse_model_verdict("NO! It does NOT remediate it, YES it is dangerous.")
    assert verdict is None


def test_format_resolution_payload_deterministic():
    p1 = format_resolution_payload("FIXED_EXACT", "Verified", 1000000000000000000)
    p2 = format_resolution_payload("FIXED_EXACT", "Verified", 1000000000000000000)
    assert p1 == p2
    data = json.loads(p1)
    assert data["status"] == "FIXED_EXACT"
    assert data["amount_wei"] == "1000000000000000000"
