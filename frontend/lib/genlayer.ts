import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const CONTRACT_ADDRESS = (
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x3c3c3b7C762B145b3b8b88d9E3Ff02207Fc4A0a0").trim()
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
