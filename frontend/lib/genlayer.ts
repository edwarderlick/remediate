import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const CONTRACT_ADDRESS = (
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x055f47d2755281D881eb4ffd52067b52Cf1049f2").trim()
) as `0x${string}`;

export const STUDIONET_CHAIN_ID = 61999;
export const RPC_URL = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";

export function getGenLayerClient(account?: `0x${string}`) {
  return createClient({
    chain: {
      ...studionet,
      rpcUrls: { default: { http: [RPC_URL] } },
    },
    account: account,
  });
}
