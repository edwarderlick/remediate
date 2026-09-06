import { createWalletClient, http, publicActions, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import { execSync } from 'child_process';

export const genlayer = defineChain({
  id: 43114, network: 'genlayer-studio',
  nativeCurrency: { decimals: 18, name: 'GEN', symbol: 'GEN' },
  rpcUrls: { default: { http: ['https://studio.genlayer.com/api'] } },
});
const account = privateKeyToAccount('0xc34cc5118c4644a88bc3f677fb5dff8d6f5195de1e54942d4a6dc688536f9da2');
const client = createWalletClient({ account, chain: genlayer, transport: http() }).extend(publicActions);

const abi = [
    { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [], outputs: [] }
];

async function main() {
    const contract = "0x2d2c8bDe5fE2e8881dc1ADD80b9abBa51FC244C3"; // test_transfer2
    
    let bal = await client.getBalance({address: account.address});
    console.log("Bal before:", bal);
    
    // We already withdrew 1 atto GEN from it!
    // But let's check its balance.
    let cbal = await client.getBalance({address: contract});
    console.log("Contract bal:", cbal);
}
main().catch(console.error);
