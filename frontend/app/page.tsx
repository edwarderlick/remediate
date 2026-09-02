import Link from "next/link";
import { ArrowRight, ShieldCheck, RefreshCcw, AlertTriangle } from "lucide-react";
import { CONTRACT_ADDRESS } from "@/lib/genlayer";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] relative">
      <div className="absolute inset-0 z-0 opacity-5 pointer-events-none flex items-center justify-center overflow-hidden font-mono text-[10px] leading-tight text-white select-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="whitespace-pre">
            {`@@ -1,4 +1,4 @@
-    vuln_found = True
+    vuln_found = False
     return hash(commit_sha)
           `}
          </div>
        ))}
      </div>

      <div className="z-10 w-full max-w-4xl flex flex-col items-center text-center space-y-8 mt-12">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter">
          Deterministic<br/>
          Vulnerability Escrow.
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 max-w-2xl font-medium">
          Byte-match payouts. Missing data refunds. Fail-closed intelligent contract logic.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-8">
          <Link href="/create" className="bg-white text-black font-bold uppercase tracking-wider px-8 py-4 flex items-center gap-2 hover:bg-gray-200 transition-colors">
            Launch App <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/how-it-works" className="border border-lines bg-surface font-bold uppercase tracking-wider px-8 py-4 flex items-center gap-2 hover:bg-lines transition-colors">
            How Escrow Works
          </Link>
        </div>
      </div>

      <div className="z-10 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-24">
        <div className="border border-lines bg-surface p-6 flex flex-col items-start gap-4 hover:border-state-exact transition-colors">
          <ShieldCheck className="w-8 h-8 text-state-exact" />
          <h3 className="font-bold text-lg">Exact Match → Payout</h3>
          <p className="text-sm text-gray-400">If the provided commit SHA exactly matches the pinned OSV JSON evidence, the recipient is paid instantly.</p>
        </div>
        <div className="border border-lines bg-surface p-6 flex flex-col items-start gap-4 hover:border-state-fail transition-colors">
          <RefreshCcw className="w-8 h-8 text-state-fail" />
          <h3 className="font-bold text-lg">Unrelated → Refund</h3>
          <p className="text-sm text-gray-400">If the commit does not remediate the advisory (via LLM equivalence check), the test GEN is refunded to the funder.</p>
        </div>
        <div className="border border-lines bg-surface p-6 flex flex-col items-start gap-4 hover:border-state-fail transition-colors">
          <AlertTriangle className="w-8 h-8 text-state-fail" />
          <h3 className="font-bold text-lg">Data Missing → Refund</h3>
          <p className="text-sm text-gray-400">If the OSV JSON is 404, rate-limited, or the patch is empty, the escrow fails closed and refunds the funder.</p>
        </div>
      </div>

      <footer className="z-10 mt-32 border-t border-lines w-full py-8 text-center text-xs font-mono text-gray-500 flex flex-col items-center gap-2">
        <p>NOT A PROFESSIONAL AUDIT. STUDIO NET TEST GEN ONLY.</p>
        <p>CONTRACT: {CONTRACT_ADDRESS}</p>
      </footer>
    </div>
  );
}
