import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import * as fs from "fs";
import * as crypto from "crypto";

async function verify() {
  const client = createClient({ chain: studioDevnet });
  
  const txHash = "0x42d5c27f3d32b1dc80e6d5fa452d4b3e6e266cd041e6824619959a21f68e2ce7";
  console.log("Querying tx:", txHash);
  const tx = await client.getTransaction({ hash: txHash as any });
  console.log("Status:", tx.status);
  
  if (tx.status === "FINALIZED") {
      const leader = (tx.consensusData as any)?.leaderReceipt;
      if (leader) {
          console.log("Execution Result:", leader.executionResult);
      }
  }
  
  if (tx.txDataDecoded && (tx.txDataDecoded as any).contractAddress) {
      const contractAddress = (tx.txDataDecoded as any).contractAddress;
      console.log("Contract Address:", contractAddress);
  }
  
  const codeArgs = (tx.txDataDecoded as any)?.codeArgs;
  if (!codeArgs) {
      console.log("Could not find codeArgs in tx");
      return;
  }
  
  const deployedSourceHash = crypto.createHash("sha256").update(codeArgs).digest("hex");
  const localCode = fs.readFileSync("contract/remediate.py", "utf-8");
  const localSourceHash = crypto.createHash("sha256").update(localCode).digest("hex");
  
  console.log("Deployed Source Hash:", deployedSourceHash);
  console.log("Local Source Hash:", localSourceHash);
  console.log("Match?", deployedSourceHash === localSourceHash);
  
  console.log("Fetching contract schema to verify...");
  try {
      const contractAddress = (tx.txDataDecoded as any).contractAddress;
      if (contractAddress) {
          const contractCode = await client.getContractCode(contractAddress);
          const schema = await client.getContractSchemaForCode(contractCode);
          console.log("Schema length:", Object.keys(schema.methods).length);
          const expectedMethods = [
              "appeal", "cancel", "create_claim", "finalize", "finalize_escalation",
              "get_all_claims", "get_claim", "get_claims_paginated", "get_credit",
              "get_pending_withdrawal", "list_claim_ids", "resolve", "withdraw"
          ];
          const actualMethods = Object.keys(schema.methods).sort();
          let missing = expectedMethods.filter(m => !actualMethods.includes(m));
          let extra = actualMethods.filter(m => !expectedMethods.includes(m));
          if (missing.length === 0 && extra.length === 0) {
              console.log("Verified all 13 methods are present in deployed contract code.");
          } else {
              console.log("Schema mismatch", { missing, extra });
          }
      }
  } catch(e) {
      console.log("Could not fetch schema", e);
  }
}
verify();
