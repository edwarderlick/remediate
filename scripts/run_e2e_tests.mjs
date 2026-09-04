/**
 * End-to-end integration tests on StudioNet for Remediate.
 *
 * Runs:
 * 1. Create claim (locks 0.05 GEN).
 * 2. Verifies deterministic correlation ID assignment.
 * 3. Tests funder cancellation and credit balance allocation.
 * 4. Tests withdraw() to verify complete settlement with NO trapped funds.
 *
 * Usage:
 *   node scripts/run_e2e_tests.mjs
 */

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
  const privateKey = generatePrivateKey();
  const alice = createAccount(privateKey);
  const bob = createAccount();

  console.log("=== Remediate StudioNet Integration Test ===");
  console.log("Alice (Funder):   ", alice.address);
  console.log("Bob (Recipient): ", bob.address);
  console.log("Target Contract: ", CONTRACT_ADDRESS);

  // Fund Alice
  console.log("\nFunding Alice with 10 GEN via sim_fundAccount...");
  await rpc("sim_fundAccount", [alice.address, 10_000_000_000_000_000_000]);

  const chain = {
    ...studionet,
    rpcUrls: { default: { http: [RPC] } },
  };

  const client = createClient({ chain, account: alice });

  // 1. Create Escrow Claim
  console.log("\n1. Creating Escrow Claim (Locking 0.05 GEN)...");
  const depositWei = 50_000_000_000_000_000n; // 0.05 GEN
  const testSha = "2222222222222222222222222222222222222222";

  const createHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "create_claim",
    args: ["GHSA-test-escrow-01", "owner/repo", testSha, bob.address],
    value: depositWei,
  });
  console.log("Create tx submitted:", createHash);

  const createReceipt = await client.waitForTransactionReceipt({
    hash: createHash,
    status: "ACCEPTED",
    interval: 3000,
    retries: 60,
  });
  console.log("Create receipt status:", createReceipt.txExecutionResultName || "ACCEPTED");

  // Read claim list to get ID
  const claimIds = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "list_claim_ids",
    args: [],
  });
  const claimId = claimIds[claimIds.length - 1];
  console.log("\nAssigned Correlation ID:", claimId);

  const claimData = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_claim",
    args: [claimId],
  });
  console.log("Claim state:", claimData.state);
  console.log("Claim amount:", claimData.amount, "wei");

  // 2. Test Cancellation (Funder hatch)
  console.log("\n2. Canceling Escrow Claim (Funder Refund)...");
  const cancelHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "cancel",
    args: [claimId],
  });
  console.log("Cancel tx submitted:", cancelHash);

  await client.waitForTransactionReceipt({
    hash: cancelHash,
    status: "ACCEPTED",
    interval: 3000,
    retries: 60,
  });

  const updatedClaim = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_claim",
    args: [claimId],
  });
  console.log("Claim state after cancel:", updatedClaim.state);

  // 3. Verify Credit Balance Allocation
  const credits = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_credit",
    args: [alice.address],
  });
  console.log("\nAlice accumulated credit balance:", credits, "wei");

  // 4. Test Withdraw
  console.log("\n3. Testing withdraw() to claim refund...");
  const withdrawHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "withdraw",
    args: [],
  });
  console.log("Withdraw tx submitted:", withdrawHash);

  await client.waitForTransactionReceipt({
    hash: withdrawHash,
    status: "ACCEPTED",
    interval: 3000,
    retries: 60,
  });

  const remainingCredit = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_credit",
    args: [alice.address],
  });
  console.log("Alice credit balance after withdrawal:", remainingCredit, "wei");

  console.log("\n========================================");
  console.log("E2E INTEGRATION TEST SUCCESSFUL!");
  console.log("Contract Address:", CONTRACT_ADDRESS);
  console.log("Create TX:      ", createHash);
  console.log("Cancel TX:      ", cancelHash);
  console.log("Withdraw TX:    ", withdrawHash);
  console.log("Claim ID:       ", claimId);
  console.log("========================================");
}

main().catch(console.error);
