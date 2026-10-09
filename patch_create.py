import re
import os

def patch_create_page():
    path = "frontend/app/create/page.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Import TransactionModal
    if "import TransactionModal" not in content:
        content = content.replace('import EmptyState from "@/components/EmptyState";', 
            'import EmptyState from "@/components/EmptyState";\nimport TransactionModal from "@/components/TransactionModal";\nimport { SubmitInput } from "@genlayer/transaction-kit";')

    # Add txInput state
    if "const [txInput, setTxInput]" not in content:
        content = content.replace('const [success, setSuccess] = useState("");',
            'const [success, setSuccess] = useState("");\n  const [txInput, setTxInput] = useState<SubmitInput | null>(null);')

    # Change handleSubmit to just set txInput
    handle_submit_new = """  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !isFormValid || !client) return;

    setError("");
    setSuccess("");

    const cleanRepo = repo.replace("https://", "").replace("http://", "").replace("github.com/", "").trim();
    setTxInput({
      kind: 'write',
      address: CONTRACT_ADDRESS,
      method: 'create_claim',
      args: [advisoryId, cleanRepo, commitSha, recipient]
    });
  };"""

    # Replace the old handleSubmit
    content = re.sub(r'  const handleSubmit = async \(e: React\.FormEvent\) => \{.*?\n  \};' , handle_submit_new, content, flags=re.DOTALL)

    # Add the TransactionModal to the bottom of the page
    modal_code = """
      {txInput && (
        <TransactionModal
          tx={txInput}
          userValue={parseEther(amount)}
          onClose={() => setTxInput(null)}
          onDone={(status) => {
            if (status.statusName === 'ACCEPTED' || status.statusName === 'FINALIZED') {
              if (status.executionResultName === 'FINISHED_WITH_RETURN') {
                setSuccess(`Escrow created successfully!`);
                setAdvisoryId("");
                setRepo("");
                setCommitSha("");
                setRecipient("");
                setAmount("");
                setTimeout(() => {
                  router.push("/claims");
                }, 2000);
              } else {
                setError(`Transaction failed: ${status.executionResultName}`);
              }
            } else {
              setError(`Transaction failed: ${status.statusName}`);
            }
            setTxInput(null);
          }}
        />
      )}
    </div>
  );
}
"""
    content = content.replace("    </div>\n  );\n}", modal_code)
    
    # Remove unused DEFAULT_FEES_DISTRIBUTION
    content = content.replace('import { DEFAULT_FEES_DISTRIBUTION } from "genlayer-js";\n', "")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

patch_create_page()
print("Done create page")
