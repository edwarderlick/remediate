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
          <p>Remediate is a narrow, fail-closed escrow primitive built on GenLayer StudioNet. A funder locks a premium (test GEN) against a specific vulnerability advisory (OSV ID) and a proposed fix (Commit SHA).</p>
          <p>This is not a bug bounty marketplace. There are no challenges, appeals, or subjective judges. The contract execution is completely deterministic based on the current state of public APIs (OSV and GitHub).</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white border-b border-lines pb-2">2. Resolution Paths</h2>
          <div className="grid grid-cols-1 gap-4">
            <div className="border-l-2 border-state-exact pl-4">
              <h3 className="font-bold text-state-exact">FIXED_EXACT</h3>
              <p className="text-sm mt-1">The Intelligent Contract fetches the OSV JSON. If the provided Commit SHA is explicitly listed in the <code>events.fixed</code> array for the repository, the payout is released to the recipient.</p>
            </div>
            <div className="border-l-2 border-state-equiv pl-4">
              <h3 className="font-bold text-state-equiv">FIXED_EQUIVALENT</h3>
              <p className="text-sm mt-1">If no exact byte-match exists, the contract fetches the `.patch` from GitHub and uses GenLayer's built-in LLM consensus to evaluate logical equivalence. If validators agree it fixes the advisory, the recipient is paid.</p>
            </div>
            <div className="border-l-2 border-state-fail pl-4">
              <h3 className="font-bold text-state-fail">NOT_FIXED</h3>
              <p className="text-sm mt-1">If the LLM consensus determines the patch does not fix the vulnerability, the contract refunds the original funder.</p>
            </div>
            <div className="border-l-2 border-state-fail pl-4">
              <h3 className="font-bold text-state-fail">INSUFFICIENT</h3>
              <p className="text-sm mt-1">If the OSV API returns 404, rate limits, or the GitHub patch is empty, the contract fails closed safely and refunds the funder immediately.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
