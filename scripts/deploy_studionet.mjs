/**
 * Deploy contract/remediate.py to GenLayer StudioNet.
 *
 * Usage:
 *   node scripts/deploy_studionet.mjs
 */

import { readFileSync } from "node:fs";
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const RPC = "https://studio.genlayer.com/api";
const FUND_AMOUNT_WEI = 100n * 10n ** 18n; // 100 GEN for deploy

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

async function getBalance(address) {
  const hex = await rpc("eth_getBalance", [address, "latest"]);
  return BigInt(hex);
}

async function main() {
  const privateKey = generatePrivateKey();
  const account = createAccount(privateKey);
  console.log("Deploy account:", account.address);
  console.log("Private key:  ", privateKey);

  console.log(`\nFunding ${account.address} with ${FUND_AMOUNT_WEI / 10n ** 18n} GEN...`);
  await rpc("sim_fundAccount", [account.address, Number(FUND_AMOUNT_WEI)]);

  const balance = await getBalance(account.address);
  console.log(`Balance: ${balance / 10n ** 18n} GEN`);

  const code = readFileSync("contract/remediate.py", "utf-8");
  console.log(`\nDeploying contract/remediate.py (${code.length} bytes)...`);

  const chain = {
    ...studionet,
    rpcUrls: { default: { http: [RPC] } },
  };

  const client = createClient({ chain, account });

  const deployHash = await client.deployContract({
    code,
    args: [],
    leaderOnly: true,
  });
  console.log("Deploy tx hash:", deployHash);

  console.log("Waiting for deploy receipt (ACCEPTED)...");
  const deployReceipt = await client.waitForTransactionReceipt({
    hash: deployHash,
    status: "ACCEPTED",
    interval: 3000,
    retries: 120,
  });

  const contractAddress = deployReceipt.contract_address
    || deployReceipt.contractAddress
    || deployReceipt.creates
    || deployReceipt.recipient;

  console.log("\n========================================");
  console.log("REMEDIATE CONTRACT DEPLOYED!");
  console.log("Address:", contractAddress);
  console.log("========================================\n");

  if (!contractAddress) {
    console.log("Full receipt:", JSON.stringify(deployReceipt, null, 2));
    process.exit(1);
  }

  console.log(`\nTo update your frontend environment:`);
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`);
}

main().catch(console.error);
