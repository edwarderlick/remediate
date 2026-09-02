import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';

async function main() {
  const pk = "0x63690439e26c69b66e1971982bfcddf9405307b4410f4d285a7a76555dc2c79a";
  const account = privateKeyToAccount(pk as `0x${string}`);
  console.log("Using existing burner wallet!");
  console.log("Address:", account.address);
  
  console.log("\nConnecting to StudioNet...");
  const client = createClient({
    chain: studionet
  });

  const code = fs.readFileSync("contract/remediate.py", "utf-8");

  console.log("Deploying contract...");
  try {
    const hash = await client.deployContract({
      account,
      code,
    });
    console.log("Deployment initiated! TX Hash:", hash);
    
    console.log("Waiting for transaction receipt...");
    let resp: any;
    while (true) {
      resp = await client.getTransaction({ hash: hash as any });
      // statusName is at the root level of the response
      const statusName = resp?.statusName;
      console.log("Current status:", statusName);
      if (statusName === "FINALIZED") break;
      if (statusName === "CANCELED") throw new Error("Transaction canceled");
      await new Promise(r => setTimeout(r, 2000));
    }
    
    // contract_address lives inside resp.data
    const contractAddress: string = resp?.data?.contract_address ?? "";

    if (!contractAddress) {
      console.log("Full resp:", JSON.stringify(resp, (k, v) =>
        typeof v === 'bigint' ? v.toString() : v
      , 2));
      throw new Error("Could not find contractAddress in receipt. See above.");
    }

    console.log("\nContract deployed successfully at:", contractAddress);

    const envContent = `NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}\nPRIVATE_KEY=${pk}\n`;
    fs.writeFileSync("frontend/.env.local", envContent);
    console.log("Updated frontend/.env.local with new contract address.");

  } catch (err) {
    console.error("Deployment failed:", err);
  }
}

main();
