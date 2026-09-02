import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

export function getGenLayerClient(account?: `0x${string}`) {
  // Use window.ethereum if available, otherwise just init without account for read-only
  const provider = typeof window !== "undefined" && (window as any).ethereum;
  
  return createClient({
    chain: studionet,
    account: account,
  });
}
