"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGenLayer } from "@/hooks/useGenLayer";
import EmptyState from "@/components/EmptyState";
import { parseEther } from "viem";
import { CONTRACT_ADDRESS } from "@/lib/genlayer";
import { useAccount, useSwitchChain } from "wagmi";

export default function CreateEscrow() {
  const router = useRouter();
  const { isReady, client, isChecking, isContractDeployed } = useGenLayer();
  const { chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const isWrongChain = chainId !== 61999;
  
  const [advisoryId, setAdvisoryId] = useState("");
  const [repo, setRepo] = useState("");
  const [commitSha, setCommitSha] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isShaValid = commitSha.length === 40 && /^[0-9a-fA-F]+$/.test(commitSha);
  const isFormValid = advisoryId && repo && isShaValid && recipient && amount && !isNaN(Number(amount));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !isFormValid || !client) return;

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const cleanRepo = repo.replace("https://", "").replace("http://", "").replace("github.com/", "").trim();
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "create_claim",
        args: [advisoryId, cleanRepo, commitSha, recipient],
        value: parseEther(amount)
      });
      
      setSuccess(`Escrow created! TX Hash: ${hash}. Waiting for consensus...`);
      
      let finalized = false;
      for (let i = 0; i < 60; i++) {
        const tx = await client.getTransaction({ hash });
        if (tx.status === 2 || tx.status === "2" || tx.status === 3 || tx.status === "3" || tx.status === "ACCEPTED" || tx.status === "FINALIZED") {
          finalized = true;
          break;
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      if (!finalized) {
        throw new Error("Consensus is taking longer than expected. Please refresh the page in a few moments to check your escrow status.");
      }
      
      setAdvisoryId("");
      setRepo("");
      setCommitSha("");
      setRecipient("");
      setAmount("");

      setIsLoading(false);
      router.refresh();
      await new Promise(r => setTimeout(r, 1000));
      router.push("/claims");
    } catch (err: any) {
      console.error(err);
      if (err?.message?.includes("User rejected") || err?.name === "UserRejectedRequestError") {
        setError(""); // Dismiss error if user manually rejected
      } else {
        setError(err.message || "Transaction failed");
      }
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return <div className="p-12 text-center text-gray-400 font-mono">Connecting to GenLayer...</div>;
  }

  if (!isReady) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <EmptyState 
          type={isContractDeployed === false ? "error" : "wrong-network"}
          title={isContractDeployed === false ? "Contract Not Deployed" : "Wallet Disconnected"}
          description={isContractDeployed === false 
            ? "The Remediate contract could not be found on this network." 
            : "Please connect your wallet to GenLayer StudioNet to create an escrow."}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-2">Create Escrow</h1>
      <p className="text-gray-400 mb-8">Lock test GEN against a vulnerability patch.</p>

      <form onSubmit={handleSubmit} className="border border-white/10 bg-surface/50 backdrop-blur-md p-6 space-y-6 shadow-2xl">
        {error && <div className="bg-state-fail/10 border border-state-fail text-state-fail p-3 text-sm font-mono">{error}</div>}
        {success && <div className="bg-state-exact/10 border border-state-exact text-state-exact p-3 text-sm font-mono">{success}</div>}

        <div className="space-y-2">
          <label className="text-sm font-bold uppercase tracking-wider text-gray-400">Advisory ID</label>
          <input 
            type="text" 
            value={advisoryId}
            onChange={e => setAdvisoryId(e.target.value)}
            placeholder="e.g. GHSA-xxxx-xxxx-xxxx"
            className="w-full bg-background border border-lines p-3 font-mono text-white focus:outline-none focus:border-white transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold uppercase tracking-wider text-gray-400">Repository</label>
          <input 
            type="text" 
            value={repo}
            onChange={e => setRepo(e.target.value)}
            placeholder="github.com/owner/repo"
            maxLength={200}
            className="w-full bg-background border border-lines p-3 font-mono text-white focus:outline-none focus:border-white transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold uppercase tracking-wider text-gray-400">Commit SHA</label>
          <input 
            type="text" 
            value={commitSha}
            onChange={e => setCommitSha(e.target.value)}
            placeholder="40-character hex string"
            maxLength={40}
            className="w-full bg-background border border-lines p-3 font-mono text-white focus:outline-none focus:border-white transition-colors"
          />
          {commitSha && !isShaValid && <p className="text-state-fail text-xs mt-1">Must be exactly 40 hex characters.</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold uppercase tracking-wider text-gray-400">Recipient Address</label>
          <input 
            type="text" 
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            placeholder="0x..."
            className="w-full bg-background border border-lines p-3 font-mono text-white focus:outline-none focus:border-white transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold uppercase tracking-wider text-gray-400">Premium (GEN)</label>
          <input 
            type="number" 
            step="0.000000000000000001"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Amount to lock"
            className="w-full bg-background border border-lines p-3 font-mono text-white focus:outline-none focus:border-white transition-colors"
          />
        </div>

        {isWrongChain ? (
          <button 
            type="button"
            onClick={() => switchChain({ chainId: 61999 })}
            className="w-full bg-white text-black font-bold uppercase tracking-wider p-4 hover:bg-gray-200 transition-colors"
          >
            Switch to GenLayer StudioNet
          </button>
        ) : (
          <button 
            type="submit"
            disabled={!isFormValid || isLoading}
            className="w-full bg-white text-black font-bold uppercase tracking-wider p-4 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Pending..." : "Lock Escrow"}
          </button>
        )}
      </form>
    </div>
  );
}
