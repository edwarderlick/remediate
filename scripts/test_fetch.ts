import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from "fs";

const pk = "0x63690439e26c69b66e1971982bfcddf9405307b4410f4d285a7a76555dc2c79a";
const account = privateKeyToAccount(pk as `0x${string}`);

const client = createClient({
  chain: studionet,
  account: account,
});

async function main() {
  const code = fs.readFileSync("contract/test_fetch.py", "utf8");
  console.log("Deploying test_fetch...");
  
  const deployHash = await client.deployContract({
    code,
  });
  console.log("Deploy hash:", deployHash);
  
  console.log("Waiting for transaction receipt...");
  let resp: any;
  while (true) {
    resp = await client.getTransaction({ hash: deployHash as any });
    const statusName = resp?.statusName;
    console.log("Current status:", statusName);
    if (statusName === "FINALIZED") break;
    if (statusName === "CANCELED") throw new Error("Transaction canceled");
    await new Promise(r => setTimeout(r, 2000));
  }
  const contractAddress: string = resp?.data?.contract_address ?? "";
  console.log("Deployed to:", contractAddress);
  console.log("Deploy receipt:", JSON.stringify(resp, null, 2));

  if (!contractAddress) throw new Error("Failed to get contract address");

  console.log("Waiting 10s for contract propagation...");
  await new Promise(r => setTimeout(r, 10000));

  async function wait(hash: string) {
    let r: any;
    while (true) {
      r = await client.getTransaction({ hash: hash as any });
      if (r?.statusName === "FINALIZED" || r?.statusName === "CANCELED") break;
      await new Promise(res => setTimeout(res, 2000));
    }
    return r;
  }

  const testOsv = await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName: "test_osv",
    args: ["GHSA-39hc-v87j-747x"],
  });
  console.log("test_osv receipt:", JSON.stringify(await wait(testOsv), null, 2));

  const testUrllib = await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName: "test_urllib",
    args: ["GHSA-39hc-v87j-747x"],
  });
  console.log("test_urllib receipt:", JSON.stringify(await wait(testUrllib), null, 2));

  const testStorage = await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName: "test_storage",
    args: ["GHSA-39hc-v87j-747x"],
  });
  console.log("test_storage receipt:", JSON.stringify(await wait(testStorage), null, 2));
}

main().catch(console.error);
