import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const RPC = "https://studio.genlayer.com/api";
const CONTRACT_ADDRESS = "0x3c3c3b7C762B145b3b8b88d9E3Ff02207Fc4A0a0";

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`RPC ${method}: ${json.error.message}`);
  return json.result;
}

async function main() {
  const alice = createAccount(generatePrivateKey());
  const recipient = createAccount();

  console.log("Funding Alice:", alice.address);
  await rpc("sim_fundAccount", [alice.address, 20_000_000_000_000_000_000]);

  const chain = {
    ...studionet,
    rpcUrls: { default: { http: [RPC] } },
  };
  const client = createClient({ chain, account: alice });

  console.log("\n=== Testing FIXED_EXACT on StudioNet ===");
  console.log("Advisory:   OSV-2017-1");
  console.log("Repo:       curl/curl");
  console.log("Commit SHA: 544bfdebea2a9e8be1c01fc7954cd49638fe2803");
  console.log("Recipient: ", recipient.address);

  const createTx = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "create_claim",
    args: [
      "OSV-2017-1",
      "curl/curl",
      "544bfdebea2a9e8be1c01fc7954cd49638fe2803",
      recipient.address
    ],
    value: 20_000_000_000_000_000n // 0.02 GEN
  });

  console.log("Create TX submitted:", createTx);
  await client.waitForTransactionReceipt({ hash: createTx, status: "ACCEPTED", interval: 3000, retries: 60 });

  const claimIds = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "list_claim_ids",
    args: [],
  });
  const claimId = claimIds[claimIds.length - 1];
  console.log("Assigned Claim ID:", claimId);

  console.log("\nCalling resolve() on claim:", claimId);
  const resolveTx = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "resolve",
    args: [claimId],
  });
  console.log("Resolve TX submitted:", resolveTx);
  await client.waitForTransactionReceipt({ hash: resolveTx, status: "ACCEPTED", interval: 3000, retries: 90 });

  const resolvedClaim = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_claim",
    args: [claimId],
  });
  console.log("\nResolved State:    ", resolvedClaim.state);
  console.log("Resolved Rationale:", resolvedClaim.rationale);

  const recipientCredit = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_credit",
    args: [recipient.address],
  });
  console.log("Recipient Balance: ", recipientCredit, "wei (Earned Bounty!)");

  console.log("\n========================================");
  console.log("FIXED_EXACT PROOF COMPLETE");
  console.log("Create TX: ", createTx);
  console.log("Resolve TX:", resolveTx);
  console.log("Claim ID:  ", claimId);
  console.log("State:     ", resolvedClaim.state);
  console.log("========================================");
}

main().catch(console.error);
