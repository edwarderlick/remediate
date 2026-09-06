import { createPublicClient, http } from 'viem';
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

const client = createPublicClient({ chain: genlayer, transport: http() });

async function main() {
    const blockNumber = await client.getBlockNumber();
    console.log("Current block:", Number(blockNumber));
    for (let i = Number(blockNumber) - 1000; i <= Number(blockNumber); i++) {
        if (i < 0) continue;
        const block = await client.getBlock({ blockNumber: BigInt(i), includeTransactions: true });
        for (const tx of block.transactions) {
            const from = tx.from ? tx.from.toLowerCase() : '';
            const to = tx.to ? tx.to.toLowerCase() : '';
            const target = '0x7E4E1f7DcC3DA063F9110477Ad348C90E8599253'.toLowerCase();
            if (from === target || to === target) {
                console.log(`Block ${i} - TX: ${tx.hash} - From: ${tx.from} - To: ${tx.to} - Value: ${Number(tx.value) / 1e18} GEN`);
                try {
                    const receipt = await client.getTransactionReceipt({hash: tx.hash});
                    console.log("Status:", receipt.status);
                    if (receipt.status === 'success') {
                         console.log("Logs:", receipt.logs);
                    }
                } catch(e) {}
            }
        }
    }
}
main().catch(console.error);
