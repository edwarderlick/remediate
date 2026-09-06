import { createWalletClient, http, publicActions, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';

export const genlayer = defineChain({
  id: 43114, 
  name: 'Genlayer Studio',
  network: 'genlayer-studio',
  nativeCurrency: { decimals: 18, name: 'GEN', symbol: 'GEN' },
  rpcUrls: {
    default: { http: ['https://studio.genlayer.com/api'] },
    public: { http: ['https://studio.genlayer.com/api'] },
  },
});

const account = privateKeyToAccount('0xc34cc5118c4644a88bc3f677fb5dff8d6f5195de1e54942d4a6dc688536f9da2');
const client = createWalletClient({ account, chain: genlayer, transport: http() }).extend(publicActions);

const abi = [
    { type: 'function', name: 'create_claim', stateMutability: 'payable', inputs: [{type: 'string'},{type: 'string'},{type: 'string'},{type: 'string'}], outputs: [{type: 'string'}] },
    { type: 'function', name: 'resolve', stateMutability: 'nonpayable', inputs: [{type: 'string'}], outputs: [{type: 'string'}] },
    { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [], outputs: [] }
];

async function main() {
    const balBefore = await client.getBalance({address: account.address});
    console.log("Balance before:", Number(balBefore) / 1e18, "GEN");

    const contract = "0xF58d3e8FFf7E01362232c2832375D3C5ED3345Fc"; 
    console.log("Creating claim (NOT_FIXED)...");
    const tx1 = await client.writeContract({
        address: contract,
        abi,
        functionName: 'create_claim',
        args: ['GHSA-p6mc-m468-83gw', 'lodash/lodash', 'ddfd9b11a0126db2302cb70ec9973b66baec0975', account.address],
        value: parseEther("0.1")
    });
    console.log("TX1:", tx1);
    await client.waitForTransactionReceipt({hash: tx1});

    // We don't have the claim ID easily, but we know it's a sha256 hash.
    // Let's just run genlayer call to get claims.
}
main().catch(console.error);
