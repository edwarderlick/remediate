import { createAccount, createClient, isSuccessful } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import dotenv from "dotenv";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

dotenv.config({ path: resolve("frontend/.env.local"), quiet: true });

const source = readFileSync(resolve("contract/remediate.py"), "utf8");
const windowSetting = "APPEAL_WINDOW_SECONDS = 86400  # 24 hours";
if (source.split(windowSetting).length !== 2) {
  throw new Error("Expected exactly one production appeal-window setting");
}

const canarySource = source.replace(windowSetting, "APPEAL_WINDOW_SECONDS = 90  # Canary only");
const canaryHash = createHash("sha256").update(canarySource).digest("hex");
const account = createAccount(process.env.PRIVATE_KEY as `0x${string}`);
const client = createClient({ chain: studioDevnet, account });

async function waitForResult(hash: `0x${string}`) {
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    let tx;
    try {
      tx = await client.getTransaction({ hash });
    } catch (error) {
      if (String(error).toLowerCase().includes("not found")) continue;
      throw error;
    }
    const status = String(tx.statusName ?? tx.status);
    if (["CANCELED", "VALIDATORS_TIMEOUT", "LEADER_TIMEOUT"].includes(status)) {
      throw new Error(`${hash} failed: ${status}`);
    }
    if (status === "FINALIZED") {
      if (!isSuccessful(tx)) {
        throw new Error(`${hash} failed: ${String(tx.txExecutionResultName ?? tx.txExecutionResult)}`);
      }
      return tx;
    }
  }
  throw new Error(`Timed out waiting for ${hash}; inspect it before any retry`);
}

async function write(address: `0x${string}`, functionName: string, args: string[] = [], value = 0n) {
  const quote = await client.estimateTransactionFees();
  const balance = await client.getBalance({ address: account.address });
  if (balance < quote.feeValue + value) {
    throw new Error(`Insufficient signer balance for ${functionName}`);
  }
  const hash = await client.writeContract({
    address,
    functionName,
    args,
    value,
    fees: { distribution: quote.distribution, feeValue: quote.feeValue },
  });
  console.log(`${functionName} tx: ${hash}`);
  await waitForResult(hash);
}

async function main() {
  console.log(`Chain: ${client.chain.id}; signer: ${account.address}`);
  console.log(`Production source SHA-256: ${createHash("sha256").update(source).digest("hex")}`);
  console.log(`Canary source SHA-256: ${canaryHash}`);
  console.log(`Canary appeal window: 90 seconds; production remains 24 hours`);

  if (!process.argv.includes("--run")) {
    console.log("Dry run only. Pass --run to deploy and spend Studio Next test GEN.");
    return;
  }

  if (client.chain.id !== 61997) throw new Error("Wrong chain");
  const schema = await client.getContractSchemaForCode(canarySource);
  if (Object.keys(schema.methods).length !== 13) throw new Error("Canary schema mismatch");
  const quote = await client.estimateTransactionFees();
  const balance = await client.getBalance({ address: account.address });
  if (balance < quote.feeValue + 10n ** 15n) throw new Error("Insufficient signer balance for canary deployment and escrow");

  const existing = process.argv.find((arg) => arg.startsWith("--contract="))?.split("=")[1] as `0x${string}` | undefined;
  let address: `0x${string}` | undefined = existing;
  if (!address) {
    const deployHash = await client.deployContract({
      code: canarySource,
      args: [],
      fees: { distribution: quote.distribution, feeValue: quote.feeValue },
    });
    console.log(`Canary deploy tx: ${deployHash}`);
    const deployment = await waitForResult(deployHash);
    address = (deployment.txDataDecoded?.contractAddress ?? deployment.data?.contract_address ?? deployment.data?.contractAddress) as `0x${string}`;
  }
  if (!address || /^0x0+$/.test(address)) throw new Error("Canary address missing; inspect deployment receipt");
  const deployedSource = await client.getContractCode(address);
  if (createHash("sha256").update(deployedSource).digest("hex") !== canaryHash) {
    throw new Error("Canary source hash mismatch; refusing to send writes");
  }
  console.log(`Canary contract: ${address}`);

  const fixedSha = "544bfdebea2a9e8be1c01fc7954cd49638fe2803";
  await write(address, "create_claim", ["OSV-2017-1", "curl/curl", fixedSha, account.address], 10n ** 15n);
  const claimsRaw = await client.readContract({ address, functionName: "get_all_claims", args: [] });
  const claims = JSON.parse(String(claimsRaw)) as Record<string, { created_at: string; cancel_deadline: string }>;
  const ids = Object.keys(claims);
  if (ids.length !== 1) throw new Error(`Expected one canary claim, found ${ids.length}`);
  const claimId = ids[0];
  const createdAt = Number(claims[claimId].created_at);
  if (createdAt < 1600000000 || Number(claims[claimId].cancel_deadline) !== createdAt + 604800) {
    throw new Error(`Invalid on-chain creation clock: ${JSON.stringify(claims[claimId])}`);
  }
  console.log(`Canary claim: ${claimId}; created_at: ${createdAt}`);

  await write(address, "resolve", [claimId]);
  const claimRaw = await client.readContract({ address, functionName: "get_claim", args: [claimId] });
  const claim = typeof claimRaw === "string" ? JSON.parse(claimRaw) : claimRaw;
  if (claim.state !== "PENDING_APPEAL" || claim.appeal_state !== "FIXED_EXACT") {
    throw new Error(`Unexpected canary verdict: ${JSON.stringify(claim)}`);
  }
  const deadline = Number(claim.appeal_deadline);
  if (deadline < createdAt + 90 || deadline < 1600000000) throw new Error(`Invalid canary appeal deadline: ${deadline}`);
  console.log(`Canary appeal deadline: ${deadline} (${new Date(deadline * 1000).toISOString()})`);

  const delay = Math.max(0, deadline * 1000 - Date.now() + 3000);
  if (delay > 0) await new Promise((r) => setTimeout(r, delay));
  await write(address, "finalize", [claimId]);
  const credit = BigInt(String(await client.readContract({ address, functionName: "get_credit", args: [account.address] })));
  if (credit !== 10n ** 15n) throw new Error(`Expected 0.001 GEN credit, got ${credit}`);
  console.log(`Recipient credit before withdraw: ${credit}`);

  await write(address, "withdraw");
  const remaining = BigInt(String(await client.readContract({ address, functionName: "get_credit", args: [account.address] })));
  if (remaining !== 0n) throw new Error(`Credit remains after withdraw: ${remaining}`);
  console.log("Canary complete: exact fix, real timestamp, 90-second appeal, finalization, and native withdrawal verified");
}

main().catch((error) => {
  console.error(String(error));
  process.exitCode = 1;
});
