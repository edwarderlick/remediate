/* eslint-disable react/no-unescaped-entities */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function HowItWorks() {
  return (
    <div className="max-w-3xl mx-auto py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-mono text-gray-400 hover:text-white mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> BACK TO HOME
      </Link>
      
      <h1 className="text-4xl font-bold mb-8">How Escrow Works</h1>
      
      <div className="space-y-8 text-gray-300">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white border-b border-lines pb-2">1. The Escrow Primitive</h2>
          <p>Remediate is a narrow, fail-closed escrow primitive built on GenLayer Studio Next. A funder locks a premium (test GEN) against a specific vulnerability advisory (OSV ID) and a proposed fix (Commit SHA).</p>
          <p>This is not a bug bounty marketplace. Exact fixes are checked against OSV; other patches can undergo GenLayer consensus review using bounded advisory details. The funder can appeal a verdict during the 24-hour window.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white border-b border-lines pb-2">2. Resolution Paths</h2>
          <div className="grid grid-cols-1 gap-4">
            <div className="border-l-2 border-state-exact pl-4">
              <h3 className="font-bold text-state-exact">FIXED_EXACT</h3>
              <p className="text-sm mt-1">The contract checks OSV fixed events for the selected repository. An exact match enters the 24-hour appeal window; after finalization, the recipient can withdraw the credited payout.</p>
            </div>
            <div className="border-l-2 border-state-equiv pl-4">
              <h3 className="font-bold text-state-equiv">FIXED_EQUIVALENT</h3>
              <p className="text-sm mt-1">If no exact match exists, the contract fetches the GitHub patch and uses GenLayer consensus to evaluate an equivalent fix. A favorable verdict can be finalized after the appeal window, then withdrawn by the recipient.</p>
            </div>
            <div className="border-l-2 border-state-fail pl-4">
              <h3 className="font-bold text-state-fail">NOT_FIXED</h3>
              <p className="text-sm mt-1">If consensus determines the patch does not fix the vulnerability, the verdict enters the appeal window. After finalization, the funder can withdraw the credited refund.</p>
            </div>
            <div className="border-l-2 border-state-fail pl-4">
              <h3 className="font-bold text-state-fail">INSUFFICIENT</h3>
              <p className="text-sm mt-1">Definitive missing or oversized evidence can yield an INSUFFICIENT verdict and a refund after finalization. Rate limits and empty responses revert the resolution for retry.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
