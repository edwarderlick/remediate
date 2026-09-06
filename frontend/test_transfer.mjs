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
    { type: 'function', name: 'fund', stateMutability: 'payable', inputs: [], outputs: [] },
    { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [], outputs: [] }
];

async function main() {
    console.log("Account:", account.address);
    const balBefore = await client.getBalance({address: account.address});
    console.log("Balance before:", Number(balBefore) / 1e18, "GEN");

    const contract = "0x9c9718e22B0E7F15C04bDD336Daa25753561BaB2"; 
    
    console.log("Funding 0.1 GEN...");
    const tx1 = await client.writeContract({
        address: contract,
        abi,
        functionName: 'fund',
        value: parseEther("0.1")
    });
    console.log("TX1:", tx1);
    await client.waitForTransactionReceipt({hash: tx1});

    const balMid = await client.getBalance({address: account.address});
    console.log("Balance after funding:", Number(balMid) / 1e18, "GEN");

    console.log("Withdrawing...");
    const tx2 = await client.writeContract({
        address: contract,
        abi,
        functionName: 'withdraw',
    });
    console.log("TX2:", tx2);
    await client.waitForTransactionReceipt({hash: tx2});

    const balAfter = await client.getBalance({address: account.address});
    console.log("Balance after withdraw:", Number(balAfter) / 1e18, "GEN");
}
main().catch(console.error);
