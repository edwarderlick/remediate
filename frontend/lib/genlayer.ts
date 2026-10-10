import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const deployedAddress = "0xeD0Ad73489c16C113c2613e68557cAab29eb72AB";
const previousAddress = "0x3a31f2f54389a36B321c8ec66B64E092d2Da40bF";
const configuredAddress = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "").trim();
// Ignore the previous deployment's environment value during this address migration.
export const CONTRACT_ADDRESS = (
  !configuredAddress || configuredAddress.toLowerCase() === previousAddress.toLowerCase()
    ? deployedAddress
    : configuredAddress
) as `0x${string}`;
export const STUDIO_NEXT_CHAIN_ID = studioDevnet.id;

export function getGenLayerClient(account?: `0x${string}`) {
  return createClient({
    chain: studioDevnet,
    account: account,
  });
}
