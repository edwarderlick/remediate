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
    { type: 'function', name: 'fund', stateMutability: 'payable', inputs: [], outputs: [] },
    { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [], outputs: [] }
];

async function main() {
    console.log("Deploying...");
    const out = execSync("genlayer deploy --contract ../contract/test_transfer5.py --rpc https://studio.genlayer.com/api").toString();
    const contract = out.match(/Contract Address': '([^']+)'/)[1];
    console.log("Contract:", contract);
    await new Promise(r => setTimeout(r, 5000));
    
    // Check if account has GEN. If not, wait.
    let bal = Number(await client.getBalance({address: account.address}))/1e18;
    console.log("Bal before:", bal);
    if (bal < 0.1) {
        console.log("Need GEN to test! Reusing another account...");
        return;
    }
    
    const tx1 = await client.writeContract({ address: contract, abi, functionName: 'fund', value: parseEther("0.1") });
    await client.waitForTransactionReceipt({hash: tx1});
    console.log("Bal after fund:", Number(await client.getBalance({address: account.address}))/1e18);
    
    const tx2 = await client.writeContract({ address: contract, abi, functionName: 'withdraw' });
    await client.waitForTransactionReceipt({hash: tx2});
    
    await new Promise(r => setTimeout(r, 5000)); 
    console.log("Bal after withdraw:", Number(await client.getBalance({address: account.address}))/1e18);
}
main().catch(console.error);
