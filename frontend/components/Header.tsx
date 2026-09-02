"use client";

import Link from "next/link";
import { useAccount, useConnect, useDisconnect, useChainId } from "wagmi";
import { genLayerStudioNet } from "@/lib/wagmiConfig";
import { useEffect, useState } from "react";
import { Unplug, Zap } from "lucide-react";

export default function Header() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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
              <span className="font-mono text-xs bg-background border border-lines px-3 py-1 rounded">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <button 
                onClick={() => disconnect()}
                className="text-xs font-mono text-gray-500 hover:text-white"
              >
                DISCONNECT
              </button>
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
