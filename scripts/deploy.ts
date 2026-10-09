import { createClient, createAccount } from "genlayer-js";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config"; // ensure you have dotenv installed
import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "../frontend/.env.local") });

const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error("Please set PRIVATE_KEY in your environment variables.");
  process.exit(1);
}

import { studioDevnet } from "genlayer-js/chains";

const account = createAccount(PRIVATE_KEY as `0x${string}`);

const client = createClient({
  chain: studioDevnet,
  account: account,
});

import { handleDeploymentReceipt } from "./receipt.js";
import { runOfflineTests } from "./test_receipt.js";

async function main() {
  const isDryRun = !process.argv.includes("--deploy");
  
  if (isDryRun) {
      console.log("Running in dry-run validation mode...");
      runOfflineTests();
      if (client.chain.id !== 61997) {
          console.error(`Invalid chain ID. Expected 61997, got ${client.chain.id}`);
          process.exit(1);
      }
      if (!account.address) {
          console.error("Account construction failed.");
          process.exit(1);
      }
      console.log(`Validation passed. Chain ID: ${client.chain.id}, Account Address: ${account.address}`);
  }

  const contractCode = fs.readFileSync(path.join(__dirname, "../contract/remediate.py"), "utf-8");
  const crypto = require("crypto");
  const sourceHash = crypto.createHash("sha256").update(contractCode).digest("hex");
  
  console.log(`Chain ID: ${client.chain.id}`);
  console.log(`Account Address: ${account.address}`);
  console.log(`Contract Source Hash: ${sourceHash}`);
  
  try {
    console.log("Obtaining live fee quote...");
    const quote = await client.estimateTransactionFees();
    console.log("Fee quote obtained:", quote.feeValue.toString(), "wei");
    
    const feesArg = {
        distribution: quote.distribution,
        feeValue: quote.feeValue
    };

    if (isDryRun) {
        console.log("Dry run fee argument shape validation:");
        console.log("fees:", feesArg);
        console.log("Validation complete, exiting without deploying.");
        process.exit(0);
    }

    const hash = await client.deployContract({
      code: contractCode,
      args: [],
      fees: feesArg
    });
    
    console.log("Deployment transaction submitted:", hash);

    // Wait for the transaction to be processed
    console.log("Waiting for confirmation...");
    let contractAddress = null;
    let finalized = false;
    
    for (let i = 0; i < 30; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        let tx;
        try {
            tx = await client.getTransaction({ hash: hash as any });
        } catch (e: any) {
            // Tolerate transient transaction-not-found responses
            if (e.message && e.message.includes("not found")) {
                console.log("Transaction not found yet, retrying...");
                continue;
            }
            throw e;
        }
        
        if (!tx) continue;

        const res = handleDeploymentReceipt(tx);
        if (res.isFinalized) {
            if (res.error) {
                console.error(res.error);
                process.exit(1);
            }
            contractAddress = res.contractAddress;
            finalized = true;
            console.log("Transaction finalized!");
            break;
        }
    }
    
    if (!finalized) {
        console.error("Deployment timeout: transaction was not finalized.");
        process.exit(1);
    }
    
    if (contractAddress) {
        console.log(`Contract successfully deployed at address: ${contractAddress}`);
    } else {
        console.error("Could not determine contract address from receipt.");
        process.exit(1);
    }
    
  } catch (err) {
    console.error("Failed to deploy contract:", err);
    process.exit(1);
  }
}

main();
