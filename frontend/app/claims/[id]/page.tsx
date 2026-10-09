"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGenLayer } from "@/hooks/useGenLayer";
import { DEFAULT_FEES_DISTRIBUTION } from "genlayer-js";
import { CONTRACT_ADDRESS, STUDIO_NEXT_CHAIN_ID } from "@/lib/genlayer";
import { StatusBadge } from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import TransactionModal from "@/components/TransactionModal";
import { SubmitInput } from "@genlayer/transaction-kit";
import { formatEther } from "viem";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Link2, Terminal, X } from "lucide-react";
import { useAccount, useSwitchChain, useBalance } from "wagmi";

export default function EscrowDocket() {
  const { id } = useParams();
  const router = useRouter();
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const isWrongChain = chainId !== STUDIO_NEXT_CHAIN_ID;
  const { refetch: refetchBalance } = useBalance({ address });
  const { isReady, client, isChecking } = useGenLayer();
  const [claim, setClaim] = useState<any>(null);
  const [pendingBalance, setPendingBalance] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(true);
  const [actionType, setActionType] = useState<string | null>(null);
  const [txInput, setTxInput] = useState<SubmitInput | null>(null);
  const [message, setMessage] = useState("");
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchClaim = useCallback(async () => {
    if (!client) return;
    setIsLoading(true);
    try {
      const result = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_claim",
        args: [id as string]
      });
      let parsed = result;
      if (typeof result === "string") {
        try {
          parsed = JSON.parse(result);
        } catch (err) {
          console.error("Failed to parse claim JSON", err);
        }
      }
      console.log("Raw claim data:", parsed);
      // Empty dict {} implies not found
      if (parsed && Object.keys(parsed).length === 0) {
        setClaim(null);
      } else {
        setClaim(parsed);
      }
      
      // Optimistically try to get pending withdrawals if address is connected
      if (address) {
        try {
          const wResult = await client.readContract({
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
        } catch (err) {
          console.warn("Could not read pending withdrawal", err);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [client, id, address]);

  useEffect(() => {
    if (isReady && client) {
      const t = setTimeout(fetchClaim, 0);
      return () => clearTimeout(t);
    }
  }, [isReady, client, fetchClaim]);

  const handleError = (err: any) => {
    if (err?.message?.includes("User rejected") || err?.name === "UserRejectedRequestError") {
      setMessage(""); // cleanly dismiss if user rejected in wallet
    } else {
      setMessage(`Error: ${err.message || "Transaction failed"}`);
    }
  };

  const handleResolve = () => {
    if (!client || actionType) return;
    setTxInput({
      kind: 'write',
      address: CONTRACT_ADDRESS,
      method: 'resolve',
      args: [id as string]
    });
    setActionType('resolve');
  };

  const handleCancel = () => {
    if (!client || actionType) return;
    setTxInput({
      kind: 'write',
      address: CONTRACT_ADDRESS,
      method: 'cancel',
      args: [id as string]
    });
    setActionType('cancel');
  };

  const handleFinalize = () => {
    if (!client || actionType) return;
    setTxInput({
      kind: 'write',
      address: CONTRACT_ADDRESS,
      method: 'finalize',
      args: [id as string]
    });
    setActionType('finalize');
  };

  const handleAppeal = () => {
    if (!client || actionType) return;
    setTxInput({
      kind: 'write',
      address: CONTRACT_ADDRESS,
      method: 'appeal',
      args: [id as string]
    });
    setActionType('appeal');
  };

  
  const handleFinalizeEscalation = () => {
    if (!client || actionType) return;
    setTxInput({
      kind: 'write',
      address: CONTRACT_ADDRESS,
      method: 'finalize_escalation',
      args: [id as string]
    });
    setActionType('finalize_escalation');
  };

  const handleWithdraw = () => {
    if (!client || actionType) return;
    setTxInput({
      kind: 'write',
      address: CONTRACT_ADDRESS,
      method: 'withdraw',
      args: []
    });
    setActionType('withdraw');
  };

  if (isChecking || isLoading) return <div className="p-12 text-center text-gray-400 font-mono animate-pulse">Loading Escrow Docket...</div>;
  if (!isReady) return <EmptyState title="Wallet Disconnected" description="Please connect to view docket." />;
  if (!claim) return <EmptyState title="Escrow Not Found" description="This claim ID does not exist." type="error" />;

  const stateMap: Record<number, string> = {
    1: "OPEN", 2: "FIXED_EXACT", 3: "FIXED_EQUIVALENT", 4: "NOT_FIXED", 5: "INSUFFICIENT", 6: "CANCELED", 7: "PENDING_APPEAL", 8: "ESCALATED"
  };
  const stateName = typeof claim?.state === "number" ? stateMap[claim.state] : claim?.state;
  const isOpen = stateName === "OPEN";
  const isPendingAppeal = stateName === "PENDING_APPEAL";
  const hasValidTimestamp = Number(claim?.created_at) >= 1600000000;
  const appealDeadline = Number(claim?.appeal_deadline);
  const hasValidAppealDeadline = Number.isFinite(appealDeadline) && appealDeadline > Number(claim?.created_at);
  const canFinalize = hasValidTimestamp && hasValidAppealDeadline && currentTime >= appealDeadline;
  const funderAddress = claim?.funder || claim?.funder_address || claim?.sender_address || "";
  const isFunder = Boolean(address && funderAddress && address.toLowerCase() === funderAddress.toLowerCase());
  const isRecipient = Boolean(address && claim?.recipient && address.toLowerCase() === claim.recipient.toLowerCase());
  
  const safeOwnerRepo = claim?.owner_repo?.replace("https://", "")?.replace("http://", "")?.replace("github.com/", "")?.trim() || "";
  const osvUrl = `https://api.osv.dev/v1/vulns/${claim?.advisory_id}`;
  const patchUrl = `https://github.com/${safeOwnerRepo}/commit/${claim?.commit_sha}.patch`;

  let resolutionResult = "";
  if (!isOpen) {
    if (stateName === "CANCELED") resolutionResult = "Refunded to funder via cancellation.";
    else if (stateName === "FIXED_EXACT") resolutionResult = "Paid to recipient. Exact byte-match found in OSV events.";
    else if (stateName === "FIXED_EQUIVALENT") resolutionResult = "Paid to recipient. LLM consensus approved equivalence.";
    else if (stateName === "NOT_FIXED") resolutionResult = "Refunded to funder. Patch did not fix vulnerability.";
    else if (stateName === "INSUFFICIENT") resolutionResult = claim?.rationale ? claim.rationale : "Refunded to funder. Evidence missing or unavailable.";
    else if (stateName === "ESCALATED") resolutionResult = "Resolution paused. Funder escalated the verdict. If unresolved after 7 days, it defaults to NOT_FIXED via finalize_escalation().";
  }

  const formattedAmount = claim?.amount ? formatEther(BigInt(claim.amount)) : "0";

  return (
    <div className="max-w-4xl mx-auto py-12 relative">
      {actionType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center font-mono p-8 border border-white/10 bg-[#111] shadow-2xl max-w-lg w-full mx-4">
            <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-6"></div>
            <h2 className="text-xl font-bold text-white mb-2 tracking-widest uppercase">
              {actionType === "resolve" ? "Reaching Consensus" : actionType === "cancel" ? "Canceling Escrow" : actionType === "finalize" ? "Finalizing Verdict" : actionType === "appeal" ? "Filing Appeal" : actionType === "finalize_escalation" ? "Finalizing Escalation" : "Processing Withdrawal"}
            </h2>
            <p className="text-gray-400 text-sm break-words">{message}</p>
          </div>
        </div>
      )}

      <Link href="/claims" className="inline-flex items-center gap-2 text-sm font-mono text-gray-400 hover:text-white mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> BACK TO CLAIMS
      </Link>

      <div className="border border-white/10 bg-surface/50 backdrop-blur-md p-8 shadow-2xl">
        <div className="flex justify-between items-start mb-8 border-b border-lines pb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold font-mono mb-2 text-white break-all">Docket #{String(id)}</h1>
            <StatusBadge state={stateName as any} />
            {isPendingAppeal && claim?.appeal_state && (
              <p className="mt-2 text-sm font-mono text-gray-300">Verdict: {claim.appeal_state}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-mono text-gray-400 uppercase tracking-widest mb-1">Premium Lock</p>
            <p className="text-2xl font-bold font-mono text-white">{formattedAmount} GEN</p>
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
              <p className="text-white">{claim?.advisory_id || <span className="animate-pulse bg-gray-800 text-transparent">GHSA-XXXX-XXXX</span>}</p>
            </div>
            <div className="border border-lines p-4 bg-background">
              <p className="text-gray-500 mb-1">Repository</p>
              <p className="text-white">{claim?.owner_repo || <span className="animate-pulse bg-gray-800 text-transparent">github.com/owner/repo</span>}</p>
            </div>
            <div className="border border-lines p-4 bg-background col-span-1 md:col-span-2">
              <p className="text-gray-500 mb-1">Commit SHA</p>
              <p className="text-white break-all">{claim?.commit_sha || <span className="animate-pulse bg-gray-800 text-transparent">0000000000000000000000000000000000000000</span>}</p>
            </div>
            <div className="border border-lines p-4 bg-background">
              <p className="text-gray-500 mb-1">Funder</p>
              <p className="text-white truncate">{funderAddress || <span className="animate-pulse bg-gray-800 text-transparent">0x0000000000000000000000000000</span>}</p>
            </div>
            <div className="border border-lines p-4 bg-background">
              <p className="text-gray-500 mb-1">Recipient</p>
              <p className="text-white truncate">{claim?.recipient || <span className="animate-pulse bg-gray-800 text-transparent">0x0000000000000000000000000000</span>}</p>
            </div>
          </div>
        </section>

        {/* EVIDENCE */}
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
            <Link2 className="w-4 h-4" /> Evidence
          </h2>
          <div className="space-y-2">
            <a href={osvUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 border border-white/5 bg-background/50 hover:bg-white/5 backdrop-blur-sm transition-colors group">
              <div>
                <p className="text-white font-mono text-sm mb-1">{claim?.advisory_id || "Advisory"} Data</p>
                <p className="text-xs text-state-exact font-mono uppercase tracking-widest">Pinned public JSON</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white" />
            </a>
            <a href={patchUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 border border-white/5 bg-background/50 hover:bg-white/5 backdrop-blur-sm transition-colors group">
              <div>
                <p className="text-white font-mono text-sm mb-1">Commit Patch File</p>
                <p className="text-xs text-state-exact font-mono uppercase tracking-widest">Pinned public TEXT</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white" />
            </a>
          </div>
        </section>

        {/* RESULT (ONLY SHOWS IF NOT OPEN) */}
        {!isOpen && !isPendingAppeal && (
          <section className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Terminal Result
            </h2>
            <div className="border border-white/10 bg-surface/60 backdrop-blur-sm p-4 font-mono text-sm space-y-2 animate-in slide-in-from-bottom-4 fade-in duration-500">
              <div className="flex justify-between"><span className="text-gray-500">STATUS:</span> <span className="text-white">{stateName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">ADVISORY:</span> <span className="text-white">{claim?.advisory_id}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">COMMIT:</span> <span className="text-white break-all">{claim?.commit_sha}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">AMOUNT:</span> <span className="text-white">{formattedAmount} GEN</span></div>
              <div className={`border-t border-lines pt-2 mt-2 ${stateName === "INSUFFICIENT" && claim?.rationale ? "text-red-500" : "text-state-exact"}`}>
                {resolutionResult}
              </div>
            </div>
              {stateName === "ESCALATED" && (
                <div className="border border-lines p-4 bg-background col-span-1 md:col-span-2">
                  <p className="text-gray-500 mb-1">Escalation Timeout</p>
                  {claim?.escalation_deadline ? (
                    <p className={`text-white ${currentTime >= parseInt(claim.escalation_deadline) ? "text-state-fail" : ""}`}>
                      {currentTime >= parseInt(claim.escalation_deadline)
                        ? "UNLOCKED (Anyone can finalize timeout)"
                        : `${Math.max(0, parseInt(claim.escalation_deadline) - currentTime)}s remaining`}
                    </p>
                  ) : (
                    <p className="text-gray-500">N/A</p>
                  )}
                </div>
              )}

          </section>
        )}

        {/* TIME LOCKS / COUNTDOWNS */}
        {(isOpen || isPendingAppeal || stateName === "ESCALATED") && (
          <section className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Deadlines
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-sm">
              {(!hasValidTimestamp || (isPendingAppeal && !hasValidAppealDeadline)) && (
                <p className="md:col-span-2 border border-state-fail p-4 text-state-fail">
                  This claim has an invalid on-chain timestamp. Deadline actions are disabled; do not spend fees retrying them.
                </p>
              )}
              <div className="border border-lines p-4 bg-background">
                <p className="text-gray-500 mb-1">Cancellation Time-Lock</p>
                {!isOpen ? (
                  <p className="text-gray-500">Only available while the claim is open</p>
                ) : !hasValidTimestamp ? (
                  <p className="text-state-fail">Invalid on-chain timestamp</p>
                ) : claim?.cancel_deadline ? (
                  <p className={`text-white ${currentTime >= parseInt(claim.cancel_deadline) ? "text-state-fail" : ""}`}>
                    {currentTime >= parseInt(claim.cancel_deadline)
                      ? "UNLOCKED (Funder can cancel)"
                      : `${Math.max(0, parseInt(claim.cancel_deadline) - currentTime)}s remaining`}
                  </p>
                ) : (
                  <p className="text-gray-500">N/A</p>
                )}
              </div>
              <div className="border border-lines p-4 bg-background">
                <p className="text-gray-500 mb-1">Appeal Time-Lock</p>
                {!hasValidTimestamp || (isPendingAppeal && !hasValidAppealDeadline) ? (
                  <p className="text-state-fail">Invalid on-chain timestamp</p>
                ) : claim?.appeal_deadline ? (
                  <p className={`text-white ${currentTime >= parseInt(claim.appeal_deadline) ? "text-state-exact" : ""}`}>
                    {currentTime >= parseInt(claim.appeal_deadline)
                      ? "UNLOCKED (Anyone can finalize)"
                      : `${Math.max(0, parseInt(claim.appeal_deadline) - currentTime)}s remaining`}
                  </p>
                ) : (
                  <p className="text-gray-500">Not in Pending Appeal state</p>
                )}
              </div>
            </div>
              {stateName === "ESCALATED" && (
                <div className="border border-lines p-4 bg-background col-span-1 md:col-span-2">
                  <p className="text-gray-500 mb-1">Escalation Timeout</p>
                  {claim?.escalation_deadline ? (
                    <p className={`text-white ${currentTime >= parseInt(claim.escalation_deadline) ? "text-state-fail" : ""}`}>
                      {currentTime >= parseInt(claim.escalation_deadline)
                        ? "UNLOCKED (Anyone can finalize timeout)"
                        : `${Math.max(0, parseInt(claim.escalation_deadline) - currentTime)}s remaining`}
                    </p>
                  ) : (
                    <p className="text-gray-500">N/A</p>
                  )}
                </div>
              )}

          </section>
        )}

        {/* ACTIONS */}
        <section className="pt-6 border-t border-lines">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
            <Terminal className="w-4 h-4" /> Actions
          </h2>
          
          {message && (
            <div className="mb-4 flex items-start justify-between p-3 bg-lines/20 border border-lines text-xs font-mono text-white break-all">
              <span>{message}</span>
              <button onClick={() => setMessage("")} className="text-gray-400 hover:text-white ml-4 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            {isWrongChain ? (
              <button 
                onClick={() => switchChain({ chainId: STUDIO_NEXT_CHAIN_ID })}
                className="bg-white text-black font-bold uppercase tracking-wider px-6 py-3 hover:bg-gray-200 transition-colors"
              >
                Switch to GenLayer Studio Next
              </button>
            ) : (
              <>
                {isOpen && isRecipient && (
                  <button 
                    onClick={handleResolve}
                    disabled={!!actionType}
                    className="bg-white text-black font-bold uppercase tracking-wider px-6 py-3 hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {actionType === "resolve" ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full"></span>
                        Reaching consensus (1-2 mins)...
                      </span>
                    ) : (
                      "Resolve Claim"
                    )}
                  </button>
                )}
                
                {isOpen && isFunder && (
          <button 
            onClick={handleCancel}
            disabled={!!actionType || !hasValidTimestamp || (claim?.cancel_deadline && currentTime < parseInt(claim.cancel_deadline))}
            className="border border-state-fail text-state-fail font-bold uppercase tracking-wider px-6 py-3 hover:bg-state-fail/10 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
          >
            {actionType === "cancel" ? "Pending..." : "Cancel Escrow"}
          </button>
        )}

        {isPendingAppeal && (
          <button 
            onClick={handleFinalize}
            disabled={!!actionType || !canFinalize}
            className="bg-white text-black font-bold uppercase tracking-wider px-6 py-3 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:hover:bg-white"
          >
            {actionType === "finalize" ? "Pending..." : "Finalize Verdict"}
          </button>
        )}

        {isPendingAppeal && isFunder && (
          <button 
            onClick={handleAppeal}
            disabled={!!actionType || !hasValidTimestamp || (claim?.appeal_deadline && currentTime >= parseInt(claim.appeal_deadline))}
            className="border border-state-equiv text-state-equiv font-bold uppercase tracking-wider px-6 py-3 hover:bg-state-equiv/10 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
          >
            {actionType === "appeal" ? "Pending..." : "Appeal Verdict"}
          </button>
        )}

                
        {stateName === "ESCALATED" && (
          <button 
            onClick={handleFinalizeEscalation}
            disabled={!!actionType || !hasValidTimestamp || (claim?.escalation_deadline && currentTime < parseInt(claim.escalation_deadline))}
            className="border border-state-fail text-state-fail font-bold uppercase tracking-wider px-6 py-3 hover:bg-state-fail/10 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
          >
            {actionType === "finalize_escalation" ? "Pending..." : "Timeout Escalation"}
          </button>
        )}

                {pendingBalance > BigInt(0) && (
                  <button 
                    onClick={handleWithdraw}
                    disabled={!!actionType}
                    className="border border-lines text-gray-300 font-bold uppercase tracking-wider px-6 py-3 hover:bg-lines transition-colors disabled:opacity-50 ml-auto"
                  >
                    {actionType === "withdraw" ? "Pending..." : `Withdraw ${formatEther(pendingBalance)} GEN`}
                  </button>
                )}
              </>
            )}
          </div>
        </section>

      </div>

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
                setMessage(`Transaction failed: ${status.executionResultName}`);
              }
            } else {
              setMessage(`Transaction failed: ${status.statusName}`);
            }
            setTxInput(null);
            setActionType(null);
          }}
        />
      )}
    </div>
  );
}

