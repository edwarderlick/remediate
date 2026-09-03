# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
import urllib.request
from dataclasses import dataclass
from genlayer import *

STATE_OPEN = "OPEN"
STATE_FIXED_EXACT = "FIXED_EXACT"
STATE_FIXED_EQUIVALENT = "FIXED_EQUIVALENT"
STATE_NOT_FIXED = "NOT_FIXED"
STATE_INSUFFICIENT = "INSUFFICIENT"
STATE_CANCELED = "CANCELED"

@allow_storage
@dataclass
class Claim:
    advisory_id: str
    owner_repo: str
    commit_sha: str
    recipient: Address
    funder: Address
    amount: u256
    state: str
    rationale: str

class RemediateContract(gl.Contract):
    next_claim_id: u256
    claims: TreeMap[str, Claim]
    pending_withdrawals: TreeMap[Address, u256]

    def __init__(self):
        self.next_claim_id = u256(1)

    def _emit_transfer(self, to: Address, amount: u256) -> bool:
        if amount <= u256(0):
            return True
        try:
            success = gl.transfer(to, amount)
            if not success:
                self.pending_withdrawals[to] = self.pending_withdrawals.get(to, u256(0)) + amount
            return bool(success)
        except Exception:
            self.pending_withdrawals[to] = self.pending_withdrawals.get(to, u256(0)) + amount
            return False

    def _refund(self, to: Address, amount: u256):
        self._emit_transfer(to, amount)

    def _mark_insufficient(self, claim_id: str, funder: Address, amount: u256, rationale: str = ""):
        claim = self.claims[claim_id]
        claim.state = STATE_INSUFFICIENT
        claim.rationale = rationale
        self.claims[claim_id] = claim
        self._refund(funder, amount)

    @gl.public.view
    def get_all_claims(self) -> str:
        all_claims = {}
        try:
            for claim_id, v in self.claims.items():
                if v:
                    all_claims[claim_id] = {
                        "advisory_id": v.advisory_id,
                        "owner_repo": v.owner_repo,
                        "commit_sha": v.commit_sha,
                        "recipient": str(v.recipient),
                        "funder": str(v.funder),
                        "amount": int(v.amount),
                        "state": v.state,
                        "rationale": getattr(v, "rationale", "")
                    }
        except Exception:
            pass
        return json.dumps(all_claims)

    @gl.public.view
    def get_claim(self, claim_id: str) -> str:
        v = self.claims.get(claim_id)
        if not v:
            return "{}"
        return json.dumps({
            "advisory_id": v.advisory_id,
            "owner_repo": v.owner_repo,
            "commit_sha": v.commit_sha,
            "recipient": str(v.recipient),
            "funder": str(v.funder),
            "amount": int(v.amount),
            "state": v.state,
            "rationale": getattr(v, "rationale", "")
        })

    @gl.public.write.payable
    def create_claim(self, advisory_id: str, owner_repo: str, commit_sha: str, recipient: str) -> str:
        try:
            value = gl.message.value
            sender = gl.message.sender_address
            recipient_addr = Address(recipient)

            if len(commit_sha) != 40 or not all(c in "0123456789abcdefABCDEF" for c in commit_sha):
                self._refund(sender, u256(value))
                return json.dumps({"ok": False, "reason": "Invalid commit SHA format"})

            claim_id = f"claim-{self.next_claim_id}"
            self.next_claim_id += u256(1)

            self.claims[claim_id] = Claim(
                advisory_id=advisory_id,
                owner_repo=owner_repo,
                commit_sha=commit_sha,
                recipient=recipient_addr,
                funder=sender,
                amount=u256(value),
                state=STATE_OPEN,
                rationale=""
            )
            return json.dumps({"ok": True, "claim_id": claim_id})
        except Exception as e:
            return json.dumps({"ok": False, "reason": str(e), "type": str(type(e))})

    @gl.public.write
    def resolve(self, claim_id: str) -> str:
        if claim_id not in self.claims:
            return json.dumps({"ok": False, "reason": "Claim not found"})
            
        claim = self.claims[claim_id]
        if claim.state != STATE_OPEN:
            return json.dumps({"ok": False, "reason": f"Claim not in OPEN state"})
            
        advisory_id = claim.advisory_id
        funder = claim.funder
        amount = claim.amount
        recipient = claim.recipient
        commit_sha = claim.commit_sha
        owner_repo = claim.owner_repo.replace("https://", "").replace("http://", "").replace("github.com/", "").strip()

        def fetch_advisory() -> str:
            url = f"https://api.osv.dev/v1/vulns/{advisory_id}"
            try:
                res = gl.nondet.web.render(url, mode="text")
                return res
            except Exception:
                return "FAIL"
                
        def val_advisory(leaders_res: gl.vm.Result) -> bool:
            return True
            
        try:
            advisory_text = gl.vm.run_nondet_unsafe(fetch_advisory, val_advisory)
            if advisory_text == "FAIL":
                self._mark_insufficient(claim_id, funder, amount, "Failed to fetch advisory via HTTP")
                return json.dumps({"ok": False, "reason": "Failed to fetch advisory"})

            advisory = json.loads(advisory_text)
        except Exception as e:
            err_msg = f"Failed to fetch or parse advisory: {str(e)}"
            self._mark_insufficient(claim_id, funder, amount, err_msg)
            return json.dumps({"ok": False, "reason": err_msg})

        if advisory.get("withdrawn"):
            self._mark_insufficient(claim_id, funder, amount, "Advisory is withdrawn")
            return json.dumps({"ok": False, "reason": "Advisory is withdrawn"})

        fixed_match = False
        affected_list = advisory.get("affected", [])
        for aff in affected_list:
            repo_url = aff.get("repo", "")
            clean_repo_url = repo_url.replace("https://", "").replace("http://", "").replace("github.com/", "").strip()
            if owner_repo.lower() == clean_repo_url.lower() or owner_repo.lower() in clean_repo_url.lower():
                ranges = aff.get("ranges", [])
                for r in ranges:
                    if r.get("type") == "GIT":
                        for event in r.get("events", []):
                            if event.get("fixed") == commit_sha:
                                fixed_match = True
                                break
                    if fixed_match: break
            if fixed_match: break

        if fixed_match:
            claim.state = STATE_FIXED_EXACT
            self.claims[claim_id] = claim
            self._emit_transfer(recipient, amount)
            return json.dumps({"ok": True, "state": "FIXED_EXACT"})

        def model_fallback() -> str:
            patch_url = f"https://github.com/{owner_repo}/commit/{commit_sha}.patch"
            try:
                patch_text = gl.nondet.web.render(patch_url, mode="text")
                if not patch_text.strip():
                    raise ValueError("Empty patch")
            except Exception:
                return "FAIL_PATCH"
                
            advisory_text = json.dumps(advisory, indent=2)
            prompt = f"Does this patch logically remediate this vulnerability advisory?\nReply strictly with YES or NO.\nAdvisory:\n{advisory_text}\nPatch:\n{patch_text}"
            try:
                llm_text = gl.nondet.exec_prompt(prompt)
                return llm_text.strip().upper()
            except Exception:
                return "FAIL_LLM"

        def val_fallback(leaders_res: gl.vm.Result) -> bool:
            return True

        try:
            llm_text = gl.vm.run_nondet_unsafe(model_fallback, val_fallback)
        except Exception as e:
            err_msg = f"Execution failed on LLM/patch fetch: {str(e)}"
            self._mark_insufficient(claim_id, funder, amount, err_msg)
            return json.dumps({"ok": False, "reason": err_msg})
        
        if "FAIL_PATCH" in llm_text or "FAIL_LLM" in llm_text:
            err_msg = f"LLM or patch fetch failed: {llm_text}"
            self._mark_insufficient(claim_id, funder, amount, err_msg)
            return json.dumps({"ok": False, "reason": err_msg})

        if "YES" in llm_text:
            claim.state = STATE_FIXED_EQUIVALENT
            self.claims[claim_id] = claim
            self._emit_transfer(recipient, amount)
            return json.dumps({"ok": True, "state": "FIXED_EQUIVALENT"})
        else:
            claim.state = STATE_NOT_FIXED
            self.claims[claim_id] = claim
            self._refund(funder, amount)
            return json.dumps({"ok": True, "state": "NOT_FIXED"})

    @gl.public.write
    def cancel(self, claim_id: str) -> str:
        if claim_id not in self.claims:
            return json.dumps({"ok": False, "reason": "Claim not found"})
        claim = self.claims[claim_id]
        sender = gl.message.sender_address
        if claim.funder != sender:
            return json.dumps({"ok": False, "reason": "Only funder can cancel"})
        if claim.state != STATE_OPEN:
            return json.dumps({"ok": False, "reason": "Claim not in OPEN state"})
            
        claim.state = STATE_CANCELED
        self.claims[claim_id] = claim
        self._refund(claim.funder, claim.amount)
        return json.dumps({"ok": True, "state": "CANCELED"})

    @gl.public.write
    def withdraw(self) -> str:
        sender = gl.message.sender_address
        amount = self.pending_withdrawals.get(sender, u256(0))
        if amount <= u256(0):
            return json.dumps({"ok": False, "reason": "No pending withdrawals"})
            
        self.pending_withdrawals[sender] = u256(0)
        try:
            success = gl.transfer(sender, amount)
            if not success:
                self.pending_withdrawals[sender] = amount
                return json.dumps({"ok": False, "reason": "Transfer failed"})
            return json.dumps({"ok": True, "amount": int(amount)})
        except Exception:
            self.pending_withdrawals[sender] = amount
            return json.dumps({"ok": False, "reason": "Transfer failed due to exception"})
