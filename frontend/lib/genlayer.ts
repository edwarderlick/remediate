import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "").trim() as `0x${string}`;
export const STUDIO_NEXT_CHAIN_ID = studioDevnet.id;

export function getGenLayerClient(account?: `0x${string}`) {
  return createClient({
    chain: studioDevnet,
    account: account,
  });
}
