import pytest
import sys
import importlib.util
from pathlib import Path
from gltest.direct.vm import VMContext
from gltest.direct.loader import deploy_contract
import json

def test_resolve():
    direct_alice = b'+\xd8\x06\xc9\x7f\x0e\x00\xaf\x1a\x1f\xc32\x8f\xa7c\xa9&\x97#\xc8'
    direct_bob = b'\x81\xb67\xd8\xfc\xd2\xc6\xdacY\xe6\x961\x13\xa1\x17\r\xe7\x95\xe4'
    
    vm = VMContext()
    vm.sender = direct_alice
    vm.value = 10**16
    
    contract = deploy_contract(Path("contract/remediate.py"), vm)
    
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
    
    vm.mock_web("https://api.osv.dev/v1/vulns/GHSA-1234", {"body": osv_res, "status": 200, "method": "GET"})
    vm.mock_web(f"https://github.com/{target_repo}/commit/{fixed_sha}.patch", {"body": "diff", "status": 200, "method": "GET"})
    vm.mock_llm("(?s).*", '{"remediated": true}')
    
    vm.sender = direct_bob
    try:
        contract.resolve(cid)
    except Exception as e:
        print("EXCEPTION IN RESOLVE:", e)

if __name__ == "__main__":
    test_resolve()
