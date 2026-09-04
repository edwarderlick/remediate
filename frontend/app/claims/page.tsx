"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { useEffect, useState } from "react";
import { useGenLayer } from "@/hooks/useGenLayer";
import { CONTRACT_ADDRESS } from "@/lib/genlayer";
import EmptyState from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import Link from "next/link";
import { formatEther } from "viem";

export const dynamic = 'force-dynamic';

export default function BrowseClaims() {
  const { isReady, client, isChecking, isContractDeployed } = useGenLayer();
  const [claims, setClaims] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<string>("ALL");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (!isReady || !client) return;

    const fetchClaims = async () => {
      setIsLoading(true);
      try {
        const result = await client.readContract({
          address: CONTRACT_ADDRESS,
          functionName: "get_claims_paginated",
          args: [offset, limit]
        });
        let parsedResult = result;
        if (typeof result === "string") {
          try { parsedResult = JSON.parse(result); } catch (e) {}
        }
        
        // Result is likely an object (dict), convert to array
        const claimsArray = Object.entries(parsedResult).map(([id, data]: [string, any]) => ({
          id,
          ...data
        }));
        
        // Sort by ID or keep as is
        setClaims(claimsArray);
      } catch (err) {
        console.error("Failed to fetch claims:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClaims();
  }, [isReady, client, offset]);

  if (isChecking) return <div className="p-12 text-center text-gray-400 font-mono">Connecting...</div>;
  if (!isReady) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <EmptyState 
          type={isContractDeployed === false ? "error" : "wrong-network"}
          title={isContractDeployed === false ? "Contract Not Deployed" : "Wallet Disconnected"}
          description={isContractDeployed === false 
            ? "The Remediate contract could not be found on this network." 
            : "Please connect your wallet to view active escrows."}
        />
      </div>
    );
  }

  const filtered = filter === "ALL" 
    ? claims 
    : claims.filter(c => c.state === filter);

  return (
    <div className="max-w-5xl mx-auto py-12">
      <div className="flex justify-between items-center mb-8 border-b border-lines pb-4">
        <h1 className="text-3xl font-bold">Active Escrows</h1>
        <select 
          value={filter} 
          onChange={e => setFilter(e.target.value)}
          className="bg-background border border-lines text-white font-mono text-sm p-2 uppercase focus:outline-none"
        >
          <option value="ALL">All States</option>
          <option value="OPEN">Open</option>
          <option value="FIXED_EXACT">Fixed (Exact)</option>
          <option value="FIXED_EQUIVALENT">Fixed (Equivalent)</option>
          <option value="NOT_FIXED">Not Fixed</option>
          <option value="INSUFFICIENT">Insufficient</option>
          <option value="CANCELED">Canceled</option>
        </select>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-gray-400 font-mono border border-white/10 bg-surface/50 backdrop-blur-md">Fetching claims...</div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No active escrows" description="No claims match your filters." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(claim => {
            const stateName = claim.state;
            return (
              <Link 
                key={claim.id} 
                href={`/claims/${claim.id}`}
                className="border border-white/10 bg-surface/50 backdrop-blur-md p-6 hover:border-gray-400 transition-colors group flex flex-col justify-between shadow-xl"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <StatusBadge state={stateName as any} />
                    <span className="text-lg font-bold font-mono text-white">{formatEther(BigInt(claim.amount))} GEN</span>
                  </div>
                  <h3 className="font-bold text-xl mb-1">{claim.advisory_id}</h3>
                  <p className="font-mono text-sm text-gray-400 truncate">{claim.owner_repo}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-lines flex justify-between items-center text-xs font-mono text-gray-500">
                  <span className="truncate w-3/4">Commit: {claim.commit_sha}</span>
                  <span className="group-hover:text-white transition-colors uppercase font-bold">View →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!isLoading && (
        <div className="mt-8 flex justify-between items-center border-t border-lines pt-4">
          <button 
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="font-mono text-sm uppercase font-bold text-gray-400 hover:text-white disabled:opacity-50"
          >
            ← Previous
          </button>
          <span className="font-mono text-sm text-gray-500">
            Showing {offset + 1} - {offset + filtered.length}
          </span>
          <button 
            onClick={() => setOffset(offset + limit)}
            disabled={claims.length < limit}
            className="font-mono text-sm uppercase font-bold text-gray-400 hover:text-white disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
