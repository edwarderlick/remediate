import { createAccount, createClient, isSuccessful } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import dotenv from "dotenv";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

dotenv.config({ path: resolve("frontend/.env.local"), quiet: true });

const production = process.argv.includes("--production-resolve");
const address = (production
  ? "0x3a31f2f54389a36B321c8ec66B64E092d2Da40bF"
  : "0x9e440127500A4e65e4BF41494b7cf3D4bBF49BC3") as `0x${string}`;
const premium = 10n ** 15n;
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
      throw new Error(`${hash}: ${status}`);
    }
    if (status === "FINALIZED") {
      if (!isSuccessful(tx)) {
        throw new Error(`${hash}: ${String(tx.txExecutionResultName ?? tx.txExecutionResult)}`);
      }
      console.log(`${hash}: FINALIZED / FINISHED_WITH_RETURN`);
      return;
    }
  }
  throw new Error(`${hash}: receipt timeout; inspect before retrying`);
}

async function write(functionName: string, args: string[] = [], value = 0n) {
  const quote = await client.estimateTransactionFees();
  const balance = await client.getBalance({ address: account.address });
  if (balance < quote.feeValue + value) throw new Error(`Insufficient balance for ${functionName}`);
  const hash = await client.writeContract({
    address,
    functionName,
    args,
    value,
    fees: { distribution: quote.distribution, feeValue: quote.feeValue },
  });
  console.log(`${functionName}: ${hash}`);
  await waitForResult(hash);
  return hash;
}

async function readClaim(id: string) {
  const raw = await client.readContract({ address, functionName: "get_claim", args: [id] });
  return (typeof raw === "string" ? JSON.parse(raw) : raw) as {
    state: string;
    appeal_state: string;
    appeal_deadline: string;
    funder: string;
  };
}

async function main() {
  if (client.chain.id !== 61997) throw new Error("Wrong chain");
  const source = readFileSync(resolve("contract/remediate.py"), "utf8");
  const setting = "APPEAL_WINDOW_SECONDS = 86400  # 24 hours";
  if (source.split(setting).length !== 2) throw new Error("Production source changed");
  const canarySource = source.replace(setting, "APPEAL_WINDOW_SECONDS = 90  # Canary only");
  const expectedHash = createHash("sha256").update(production ? source : canarySource).digest("hex");
  const deployedHash = createHash("sha256").update(await client.getContractCode(address)).digest("hex");
  if (deployedHash !== expectedHash) throw new Error("Deployed source mismatch");
  const beforeCredit = BigInt(String(await client.readContract({ address, functionName: "get_credit", args: [account.address] })));
  if (beforeCredit !== 0n) throw new Error("Existing credit would make withdrawal proof ambiguous");
  const beforeRaw = await client.readContract({ address, functionName: "get_all_claims", args: [] });
  const before = JSON.parse(String(beforeRaw)) as Record<string, unknown>;
  const quote = await client.estimateTransactionFees();
  const balance = await client.getBalance({ address: account.address });
  if (balance < premium + (production ? 2n : 4n) * quote.feeValue) throw new Error("Need premium plus fee budgets");
  console.log(`Chain: ${client.chain.id}; signer: ${account.address}`);
  console.log(`${production ? "Production" : "Canary"}: ${address}; source SHA-256: ${deployedHash}`);
  console.log(`Balance: ${balance}; fee quote: ${quote.feeValue}; deposit: ${premium}`);
  if (!process.argv.includes("--run")) {
    console.log(`Preflight complete. Pass --run for ${production ? "two" : "four"} paid transactions.`);
    return;
  }

  await write("create_claim", ["OSV-2017-1", "edwarderlick/remediate", "544bfdebea2a9e8be1c01fc7954cd49638fe2803", account.address], premium);
  const afterRaw = await client.readContract({ address, functionName: "get_all_claims", args: [] });
  const after = JSON.parse(String(afterRaw)) as Record<string, unknown>;
  const ids = Object.keys(after).filter((id) => !(id in before));
  if (ids.length !== 1) throw new Error(`Expected one new claim, found ${ids.length}`);
  const claimId = ids[0];
  console.log(`Claim ID: ${claimId}`);

  await write("resolve", [claimId]);
  const resolved = await readClaim(claimId);
  if (resolved.state !== "PENDING_APPEAL" || resolved.appeal_state !== "INSUFFICIENT") {
    throw new Error(`Unexpected applicability verdict: ${JSON.stringify(resolved)}`);
  }
  console.log(`Verdict: ${resolved.appeal_state}; appeal deadline: ${resolved.appeal_deadline}`);
  if (production) {
    console.log(`Production applicability proof complete: ${claimId}. Finalization remains locked for 24 hours.`);
    return;
  }
  const delay = Math.max(0, Number(resolved.appeal_deadline) * 1000 - Date.now() + 3000);
  if (delay > 180000) throw new Error("Canary appeal deadline unexpectedly long");
  if (delay > 0) await new Promise((r) => setTimeout(r, delay));

  await write("finalize", [claimId]);
  const finalized = await readClaim(claimId);
  const credit = BigInt(String(await client.readContract({ address, functionName: "get_credit", args: [account.address] })));
  if (finalized.state !== "INSUFFICIENT" || credit !== premium) {
    throw new Error(`Finalization mismatch: ${JSON.stringify(finalized)}, credit ${credit}`);
  }
  console.log(`Funder credit before withdrawal: ${credit}`);

  await write("withdraw");
  const remaining = BigInt(String(await client.readContract({ address, functionName: "get_credit", args: [account.address] })));
  if (remaining !== 0n) throw new Error(`Credit remains after withdrawal: ${remaining}`);
  console.log(`Complete: ${claimId} rejected unrelated repository, refunded funder, and withdrew. Credit: ${remaining}`);
}

main().catch((error) => {
  console.error(String(error));
  process.exitCode = 1;
});
