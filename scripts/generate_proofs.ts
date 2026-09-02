import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { privateKeyToAccount } from "viem/accounts";
import fs from "fs";
import path from "path";

// Extract env vars
const envPath = path.join(__dirname, "../frontend/.env.local");
let envContent = "";
try {
  envContent = fs.readFileSync(envPath, "utf-8");
} catch (e) {
  console.error("Could not read frontend/.env.local");
  process.exit(1);
}

const getEnv = (key: string) => {
  const match = envContent.match(new RegExp(`${key}=(.*)`));
  return match ? match[1].trim() : "";
};

const CONTRACT_ADDRESS = getEnv("NEXT_PUBLIC_CONTRACT_ADDRESS") || "0x655a4608BfE289eFcAde02722d246b9eEf6e801E";
const pk = getEnv("PRIVATE_KEY");

if (!pk) {
  console.error("PRIVATE_KEY not found in frontend/.env.local");
  process.exit(1);
}

const account = privateKeyToAccount(pk as `0x${string}`);

const VALID_GHSA = "GHSA-3h5v-q93c-6h6q"; 
const VALID_REPO = "github.com/websockets/ws"; 
const EXACT_COMMIT = "e55e5106f10fcbaac37cfa89759e4cc0d073a52c"; 
const UNRELATED_COMMIT = "abcdef1234567890abcdef1234567890abcdef12"; 
const FAKE_GHSA = "GHSA-fake-0000-0000";
const INVALID_SHA = "12345";
const RECIPIENT = account.address;

async function waitForTx(client: any, hash: string) {
  console.log(`Waiting for TX ${hash} to finalize...`);
  while (true) {
    const receipt = await client.getTransaction({ hash });
    console.log(`Current status: ${receipt.statusName}`);
    if (receipt.status === 7 || receipt.statusName === "FINALIZED") return receipt;
    if (receipt.status === 8 || receipt.statusName === "CANCELED") throw new Error("TX Canceled");
    await new Promise(r => setTimeout(r, 2000));
  }
}

async function findClaimIdSecure(client: any, sha: string, ghsa: string) {
  const claims = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_all_claims",
    args: []
  });
  let parsedClaims = claims;
  if (typeof claims === "string") {
    try { parsedClaims = JSON.parse(claims); } catch (e) {}
  }
  
  for (const [id, data] of Object.entries(parsedClaims as any)) {
    if ((data as any).commit_sha === sha && (data as any).advisory_id === ghsa) {
      return id;
    }
  }
  throw new Error(`Claim with sha ${sha} and ghsa ${ghsa} not found`);
}

async function runTests() {
  const client = createClient({
    chain: studionet
  });

  const evidence = {
    contractAddress: CONTRACT_ADDRESS,
    network: "GenLayer StudioNet",
    tests: [] as any[]
  };

  console.log(`Starting Proof Generation on StudioNet for contract ${CONTRACT_ADDRESS}...`);
  console.log(`Using account: ${account.address}`);
  
  try {
    // PATH 1: FIXED_EXACT
    console.log("\n[Path 1] FIXED_EXACT");
    const tx1 = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "create_claim",
      args: [VALID_GHSA, VALID_REPO, EXACT_COMMIT, RECIPIENT],
      value: BigInt(10),
      account
    });
    console.log(`Create Claim TX: ${tx1}`);
    await waitForTx(client, tx1);
    const id1 = await findClaimIdSecure(client, EXACT_COMMIT, VALID_GHSA);
    
    const resTx1 = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "resolve",
      args: [id1],
      account
    });
    console.log(`Resolve Claim TX: ${resTx1}`);
    await waitForTx(client, resTx1);
    evidence.tests.push({ path: "FIXED_EXACT", createTx: tx1, resolveTx: resTx1, claimId: id1 });

    // PATH 2: NOT_FIXED
    console.log("\n[Path 2] NOT_FIXED");
    const tx2 = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "create_claim",
      args: [VALID_GHSA, VALID_REPO, UNRELATED_COMMIT, RECIPIENT],
      value: BigInt(10),
      account
    });
    console.log(`Create Claim TX: ${tx2}`);
    await waitForTx(client, tx2);
    const id2 = await findClaimIdSecure(client, UNRELATED_COMMIT, VALID_GHSA);

    const resTx2 = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "resolve",
      args: [id2],
      account
    });
    console.log(`Resolve Claim TX: ${resTx2}`);
    await waitForTx(client, resTx2);
    evidence.tests.push({ path: "NOT_FIXED", createTx: tx2, resolveTx: resTx2, claimId: id2 });

    // PATH 3: INSUFFICIENT
    console.log("\n[Path 3] INSUFFICIENT");
    const tx3 = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "create_claim",
      args: [FAKE_GHSA, VALID_REPO, EXACT_COMMIT, RECIPIENT],
      value: BigInt(10),
      account
    });
    console.log(`Create Claim TX: ${tx3}`);
    await waitForTx(client, tx3);
    const id3 = await findClaimIdSecure(client, EXACT_COMMIT, FAKE_GHSA);

    const resTx3 = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "resolve",
      args: [id3],
      account
    });
    console.log(`Resolve Claim TX: ${resTx3}`);
    await waitForTx(client, resTx3);
    evidence.tests.push({ path: "INSUFFICIENT", createTx: tx3, resolveTx: resTx3, claimId: id3 });

    // PATH 4: Rejected Create
    console.log("\n[Path 4] REJECTED CREATE");
    const tx4 = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "create_claim",
      args: [VALID_GHSA, VALID_REPO, INVALID_SHA, RECIPIENT],
      value: BigInt(10),
      account
    });
    console.log(`Create Claim TX (should be rejected/refunded): ${tx4}`);
    await waitForTx(client, tx4);
    evidence.tests.push({ path: "REJECTED_CREATE", createTx: tx4 });

    // Save evidence
    if (!fs.existsSync(path.join(__dirname, "../evidence"))) {
      fs.mkdirSync(path.join(__dirname, "../evidence"));
    }
    fs.writeFileSync(path.join(__dirname, "../evidence/studionet.json"), JSON.stringify(evidence, null, 2));
    console.log("\nSaved evidence to evidence/studionet.json");

  } catch (err) {
    console.error("Test execution failed:", err);
  }
}

runTests();
