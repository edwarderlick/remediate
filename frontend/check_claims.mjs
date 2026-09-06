import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';
export const genlayer = defineChain({
  id: 43114, network: 'genlayer-studio',
  nativeCurrency: { decimals: 18, name: 'GEN', symbol: 'GEN' },
  rpcUrls: { default: { http: ['https://studio.genlayer.com/api'] } },
});
const client = createPublicClient({ chain: genlayer, transport: http() });
const abi = [{ type: 'function', name: 'get_all_claims', stateMutability: 'view', inputs: [], outputs: [{type: 'string'}] }];
async function main() {
    const claims = await client.readContract({
        address: "0x32ABb63a326123DacD806eecb65364FAE648F670",
        abi, functionName: 'get_all_claims'
    });
    console.log("Claims:", claims);
}
main().catch(console.error);
