import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

async function main() {
  const client = createClient({
    chain: studionet,
  });

  const contractAddress = "0xa13107dd4Eb9eEeCc18651adEA4038dCa12846fB";

  console.log(`Connecting to contract at ${contractAddress}...`);
  try {
    const res = await client.readContract({
      address: contractAddress,
      functionName: "get_claim",
      args: ["1"], // String ID test
    });
    console.log("Successfully simulated a read using a string ID!");
    console.log("Response:", res);
  } catch (err) {
    console.error("Read failed:", err);
    process.exit(1);
  }
}

main();
