"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useGenLayer } from "@/hooks/useGenLayer";
import { CONTRACT_ADDRESS } from "@/lib/genlayer";
import { StatusBadge } from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { formatEther } from "viem";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Link2, Terminal } from "lucide-react";
import { useAccount } from "wagmi";

export default function EscrowDocket() {
  const { id } = useParams();
  const { address } = useAccount();
  const { isReady, client, isChecking } = useGenLayer();
  const [claim, setClaim] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchClaim = async () => {
    if (!client) return;
    setIsLoading(true);
    try {
      const result = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_claim",
        args: [id as string]
      });
      setClaim(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isReady && client) fetchClaim();
  }, [isReady, client, id]);

  const handleResolve = async () => {
    if (!client) return;
    setActionLoading(true);
    setMessage("Resolving claim... This may take up to 20 seconds for consensus.");
    try {
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "resolve",
        args: [id as string]
      });
      setMessage(`Resolve TX Submitted: ${hash}`);
      setTimeout(fetchClaim, 5000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!client) return;
    setActionLoading(true);
    setMessage("Canceling claim...");
    try {
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "cancel",
        args: [id as string]
      });
      setMessage(`Cancel TX Submitted: ${hash}`);
      setTimeout(fetchClaim, 5000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!client) return;
    setActionLoading(true);
    setMessage("Withdrawing credits...");
    try {
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "withdraw",
        args: []
      });
      setMessage(`Withdraw TX Submitted: ${hash}`);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (isChecking || isLoading) return <div className="p-12 text-center text-gray-400 font-mono">Loading Escrow Docket...</div>;
  if (!isReady) return <EmptyState title="Wallet Disconnected" description="Please connect to view docket." />;
  if (!claim) return <EmptyState title="Escrow Not Found" description="This claim ID does not exist." type="error" />;

  const stateMap: Record<number, string> = {
    1: "OPEN", 2: "FIXED_EXACT", 3: "FIXED_EQUIVALENT", 4: "NOT_FIXED", 5: "INSUFFICIENT", 6: "CANCELED"
  };
  const stateName = typeof claim.state === "number" ? stateMap[claim.state] : claim.state;
  const isOpen = stateName === "OPEN";
  const isFunder = address && address.toLowerCase() === claim.funder.toLowerCase();
  
  const osvUrl = `https://api.osv.dev/v1/vulns/${claim.advisory_id}`;
  const patchUrl = `https://github.com/${claim.owner_repo}/commit/${claim.commit_sha}.patch`;

  let resolutionResult = "";
  if (!isOpen) {
    if (stateName === "CANCELED") resolutionResult = "Refunded to funder via cancellation.";
    else if (stateName === "FIXED_EXACT") resolutionResult = "Paid to recipient. Exact byte-match found in OSV events.";
    else if (stateName === "FIXED_EQUIVALENT") resolutionResult = "Paid to recipient. LLM consensus approved equivalence.";
    else if (stateName === "NOT_FIXED") resolutionResult = "Refunded to funder. Patch did not fix vulnerability.";
    else if (stateName === "INSUFFICIENT") resolutionResult = "Refunded to funder. Evidence missing or unavailable.";
  }

  return (
    <div className="max-w-4xl mx-auto py-12">
      <Link href="/claims" className="inline-flex items-center gap-2 text-sm font-mono text-gray-400 hover:text-white mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> BACK TO CLAIMS
      </Link>

      <div className="border border-lines bg-surface p-8">
        <div className="flex justify-between items-start mb-8 border-b border-lines pb-6">
          <div>
            <h1 className="text-3xl font-bold font-mono tracking-tight mb-2 text-white">Docket #{String(id).slice(0, 8)}</h1>
            <StatusBadge state={stateName as any} />
          </div>
          <div className="text-right">
            <p className="text-sm font-mono text-gray-400 uppercase tracking-widest mb-1">Premium Lock</p>
            <p className="text-2xl font-bold font-mono text-white">{formatEther(BigInt(claim.amount))} GEN</p>
          </div>
        </div>

        {/* DETAILS */}
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
            <Terminal className="w-4 h-4" /> Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-sm">
            <div className="border border-lines p-4 bg-background">
              <p className="text-gray-500 mb-1">Advisory ID</p>
              <p className="text-white">{claim.advisory_id}</p>
            </div>
            <div className="border border-lines p-4 bg-background">
              <p className="text-gray-500 mb-1">Repository</p>
              <p className="text-white">{claim.owner_repo}</p>
            </div>
            <div className="border border-lines p-4 bg-background col-span-1 md:col-span-2">
              <p className="text-gray-500 mb-1">Commit SHA</p>
              <p className="text-white break-all">{claim.commit_sha}</p>
            </div>
            <div className="border border-lines p-4 bg-background">
              <p className="text-gray-500 mb-1">Funder</p>
              <p className="text-white truncate">{claim.funder}</p>
            </div>
            <div className="border border-lines p-4 bg-background">
              <p className="text-gray-500 mb-1">Recipient</p>
              <p className="text-white truncate">{claim.recipient}</p>
            </div>
          </div>
        </section>

        {/* EVIDENCE */}
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
            <Link2 className="w-4 h-4" /> Evidence
          </h2>
          <div className="space-y-2">
            <a href={osvUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 border border-lines bg-background hover:border-gray-500 transition-colors group">
              <div>
                <p className="text-white font-mono text-sm mb-1">{claim.advisory_id} Data</p>
                <p className="text-xs text-state-exact font-mono uppercase tracking-widest">Pinned public JSON</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white" />
            </a>
            <a href={patchUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 border border-lines bg-background hover:border-gray-500 transition-colors group">
              <div>
                <p className="text-white font-mono text-sm mb-1">Commit Patch File</p>
                <p className="text-xs text-state-exact font-mono uppercase tracking-widest">Pinned public TEXT</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white" />
            </a>
          </div>
        </section>

        {/* RESULT */}
        {!isOpen && (
          <section className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Terminal Result
            </h2>
            <div className="border border-lines bg-background p-4 font-mono text-sm space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">STATUS:</span> <span className="text-white">{stateName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">ADVISORY:</span> <span className="text-white">{claim.advisory_id}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">COMMIT:</span> <span className="text-white break-all">{claim.commit_sha}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">AMOUNT:</span> <span className="text-white">{formatEther(BigInt(claim.amount))} GEN</span></div>
              <div className="border-t border-lines pt-2 mt-2 text-state-exact">{resolutionResult}</div>
            </div>
          </section>
        )}

        {/* ACTIONS */}
        <section className="pt-6 border-t border-lines">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
            <Terminal className="w-4 h-4" /> Actions
          </h2>
          
          {message && (
            <div className="mb-4 p-3 bg-lines/20 border border-lines text-xs font-mono text-white break-all">
              {message}
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            {isOpen && (
              <button 
                onClick={handleResolve}
                disabled={actionLoading}
                className="bg-white text-black font-bold uppercase tracking-wider px-6 py-3 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Resolve Claim
              </button>
            )}
            
            {isOpen && isFunder && (
              <button 
                onClick={handleCancel}
                disabled={actionLoading}
                className="border border-state-fail text-state-fail font-bold uppercase tracking-wider px-6 py-3 hover:bg-state-fail/10 transition-colors disabled:opacity-50"
              >
                Cancel Escrow
              </button>
            )}

            <button 
              onClick={handleWithdraw}
              disabled={actionLoading}
              className="border border-lines text-gray-300 font-bold uppercase tracking-wider px-6 py-3 hover:bg-lines transition-colors disabled:opacity-50 ml-auto"
            >
              Withdraw Credit
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
