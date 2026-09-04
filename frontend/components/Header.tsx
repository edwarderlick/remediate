"use client";

import Link from "next/link";
import { useAccount, useConnect, useDisconnect, useChainId, useBalance } from "wagmi";
import { formatEther } from "viem";
import { genLayerStudioNet } from "@/lib/wagmiConfig";
import { useEffect, useState } from "react";
import { Unplug, Zap } from "lucide-react";

export default function Header() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balanceData } = useBalance({ address });
  const chainId = useChainId();
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const isWrongNetwork = isConnected && chainId !== genLayerStudioNet.id;

  return (
    <header className="border-b border-lines bg-surface/50 sticky top-0 z-50 backdrop-blur-sm">
      {mounted && isWrongNetwork && (
        <div className="bg-state-fail text-white text-sm py-1 text-center font-mono font-bold flex items-center justify-center gap-2">
          <Unplug className="w-4 h-4" /> WRONG NETWORK: Please connect to GenLayer StudioNet
        </div>
      )}
      <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-mono font-bold text-xl tracking-tighter flex items-center gap-2">
            <Zap className="w-5 h-5 text-state-exact" />
            REMEDIATE
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-400">
            <Link href="/create" className="hover:text-white transition-colors">Create Escrow</Link>
            <Link href="/claims" className="hover:text-white transition-colors">Active Claims</Link>
            <Link href="/limits" className="hover:text-white transition-colors">Limits</Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {mounted && isConnected ? (
            <div className="flex items-center gap-3">
              {balanceData && (
                <span className="font-mono text-xs text-white px-3 py-1 bg-surface border border-lines backdrop-blur-md">
                  {parseFloat(formatEther(balanceData.value)).toFixed(4)} GEN
                </span>
              )}
              <div className="relative">
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="font-mono text-xs bg-white text-black px-4 py-1 hover:bg-gray-200 transition-colors uppercase font-bold flex items-center gap-2"
                >
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-background border border-white/10 backdrop-blur-md shadow-xl p-2 flex flex-col gap-1 z-50">
                    <button 
                      onClick={() => {
                        disconnect();
                        setDropdownOpen(false);
                      }}
                      className="text-xs font-mono text-state-fail hover:bg-state-fail/10 p-2 text-left uppercase w-full transition-colors"
                    >
                      Disconnect Wallet
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            mounted && (
              <button 
                onClick={() => connect({ connector: connectors[0] })}
                className="font-mono text-xs bg-white text-black px-4 py-2 hover:bg-gray-200 transition-colors uppercase font-bold"
              >
                Connect Wallet
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
