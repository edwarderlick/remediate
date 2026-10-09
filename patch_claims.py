import re
import os

def patch_claims_page():
    path = "frontend/app/claims/[id]/page.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Import TransactionModal
    if "import TransactionModal" not in content:
        content = content.replace('import EmptyState from "@/components/EmptyState";', 
            'import EmptyState from "@/components/EmptyState";\nimport TransactionModal from "@/components/TransactionModal";\nimport { SubmitInput } from "@genlayer/transaction-kit";')

    # Add txInput state
    if "const [txInput, setTxInput]" not in content:
        content = content.replace('const [actionType, setActionType] = useState<string | null>(null);',
            'const [actionType, setActionType] = useState<string | null>(null);\n  const [txInput, setTxInput] = useState<SubmitInput | null>(null);')

    handlers_to_replace = [
        ("handleResolve", "resolve", "[id as string]"),
        ("handleCancel", "cancel", "[id as string]"),
        ("handleFinalize", "finalize", "[id as string]"),
        ("handleAppeal", "appeal", "[id as string]"),
        ("handleFinalizeEscalation", "finalize_escalation", "[id as string]"),
        ("handleWithdraw", "withdraw", "[]")
    ]

    for handler, method, args in handlers_to_replace:
        new_handler = f"""  const {handler} = () => {{
    if (!client || actionType) return;
    setTxInput({{
      kind: 'write',
      address: CONTRACT_ADDRESS,
      method: '{method}',
      args: {args}
    }});
    setActionType('{method}');
  }};"""
        pattern = f"  const {handler} = async \(\) => {{.*?\n  }};"
        content = re.sub(pattern, new_handler, content, flags=re.DOTALL)

    # Add the TransactionModal to the bottom of the page
    modal_code = """
      {txInput && (
        <TransactionModal
          tx={txInput}
          onClose={() => { setTxInput(null); setActionType(null); }}
          onDone={async (status) => {
            if (status.statusName === 'ACCEPTED' || status.statusName === 'FINALIZED') {
              if (status.executionResultName === 'FINISHED_WITH_RETURN') {
                setMessage(`${actionType} successful!`);
                await new Promise(r => setTimeout(r, 2000));
                router.refresh();
                if (actionType === 'withdraw') {
                  try {
                    const wResult = await client?.readContract({
                      address: CONTRACT_ADDRESS,
                      functionName: "get_pending_withdrawal",
                      args: [address]
                    });
                    if (typeof wResult === "number" || typeof wResult === "bigint") {
                      setPendingBalance(BigInt(wResult));
                    } else if (typeof wResult === "string") {
                      try {
                        const wParsed = JSON.parse(wResult);
                        setPendingBalance(BigInt(wParsed.amount ?? wParsed));
                      } catch {
                        setPendingBalance(BigInt(wResult));
                      }
                    }
                  } catch (e) {
                    setPendingBalance(BigInt(0));
                  }
                  if (typeof refetchBalance !== 'undefined' && refetchBalance) await refetchBalance();
                } else {
                  const updatedClaim = await client?.readContract({
                    address: CONTRACT_ADDRESS,
                    functionName: "get_claim",
                    args: [id as string]
                  });
                  let parsed = updatedClaim;
                  if (typeof updatedClaim === "string") {
                    try { parsed = JSON.parse(updatedClaim); } catch (e) {}
                  }
                  setClaim(parsed);
                }
              } else {
                setError(`Transaction failed: ${status.executionResultName}`);
              }
            } else {
              setError(`Transaction failed: ${status.statusName}`);
            }
            setTxInput(null);
            setActionType(null);
          }}
        />
      )}
    </div>
  );
}
"""
    content = content.replace("    </div>\n  );\n}", modal_code)
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

patch_claims_page()
print("Done claims page")
