import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import * as fs from "fs";
import * as crypto from "crypto";

async function verify() {
  const client = createClient({ chain: studioDevnet });
  
  const txHash = "0x42d5c27f3d32b1dc80e6d5fa452d4b3e6e266cd041e6824619959a21f68e2ce7";
  const tx = await client.getTransaction({ hash: txHash as any });
  
  console.log("Tx status:", tx.status);
  const leader = (tx.consensusData as any)?.leaderReceipt;
  if (leader) {
      console.log("Execution Result:", leader.executionResult);
  } else {
      console.log("Leader receipt not found on consensusData, could be 7 implies FINISHED_WITH_RETURN");
  }

  const contractAddress = "0x1dDfF0AC420Ac06902DB9773204D3eBFa2C15f27";
  const contractCode = await client.getContractCode(contractAddress);
  
  const deployedSourceHash = crypto.createHash("sha256").update(contractCode).digest("hex");
  const localCode = fs.readFileSync("contract/remediate.py", "utf-8");
  const localSourceHash = crypto.createHash("sha256").update(localCode).digest("hex");
  
  console.log("Deployed Source Hash:", deployedSourceHash);
  console.log("Local Source Hash:", localSourceHash);
  console.log("Match?", deployedSourceHash === localSourceHash);
  
  console.log("Fetching contract schema to verify...");
  const schema = await client.getContractSchemaForCode(contractCode);
  console.log("Schema length:", Object.keys(schema.methods).length);
}
verify();
