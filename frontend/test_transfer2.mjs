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
  },
});

const account = privateKeyToAccount('0xc34cc5118c4644a88bc3f677fb5dff8d6f5195de1e54942d4a6dc688536f9da2');
const client = createWalletClient({ account, chain: genlayer, transport: http() }).extend(publicActions);

const abi = [
    { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [], outputs: [] }
];

async function main() {
    const contract = "0x2d2c8bDe5fE2e8881dc1ADD80b9abBa51FC244C3"; 
    // First send funds to it via raw transaction
    console.log("Funding 0.1 GEN directly...");
    const tx1 = await client.sendTransaction({
        to: contract,
        value: parseEther("0.1")
    });
    console.log("TX1:", tx1);
    await client.waitForTransactionReceipt({hash: tx1});

    console.log("Withdrawing...");
    const tx2 = await client.writeContract({
        address: contract,
        abi,
        functionName: 'withdraw',
    });
    console.log("TX2:", tx2);
    await client.waitForTransactionReceipt({hash: tx2});
}
main().catch(console.error);
