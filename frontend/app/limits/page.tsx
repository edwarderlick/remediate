export default function LimitsPage() {
  return (
    <div className="max-w-3xl mx-auto py-12">
      <h1 className="text-4xl font-bold mb-8">System Limits & Constraints</h1>
      
      <div className="space-y-6">
        <div className="border border-lines bg-surface p-6">
          <h2 className="text-xl font-bold font-mono text-state-fail mb-2">Test Network Only</h2>
          <p className="text-gray-400">
            Remediate currently operates exclusively on GenLayer StudioNet. 
            All GEN tokens used in the application are test tokens with no real-world value.
          </p>
        </div>

        <div className="border border-lines bg-surface p-6">
          <h2 className="text-xl font-bold font-mono text-white mb-2">Consensus Finality</h2>
          <p className="text-gray-400">
            GenLayer Intelligent Contracts require consensus from multiple LLM validators. 
            Resolving a claim will typically take 10-20 seconds to finalize on-chain. 
            The UI handles this asynchronously, but you must remain on the network until the transaction clears.
          </p>
        </div>

        <div className="border border-lines bg-surface p-6">
          <h2 className="text-xl font-bold font-mono text-white mb-2">Data Source Pinned URLs</h2>
          <p className="text-gray-400">
            The intelligent contract exclusively reads from:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400 font-mono text-sm">
            <li>api.osv.dev/v1/vulns/&#123;advisory_id&#125;</li>
            <li>github.com/&#123;owner&#125;/&#123;repo&#125;/commit/&#123;sha&#125;.patch</li>
          </ul>
          <p className="text-gray-400 mt-4 text-sm">
            If these endpoints rate-limit or fail, the contract defaults to INSUFFICIENT and fails closed safely.
          </p>
        </div>
      </div>
    </div>
  );
}
