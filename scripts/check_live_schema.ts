import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

async function main() {
    const client = createClient({ chain: studioDevnet });
    try {
        const contractAddress = "0x1dDfF0AC420Ac06902DB9773204D3eBFa2C15f27";
        const code = await client.getContractCode(contractAddress);
        const schema = await client.getContractSchemaForCode(code);
        
        const expectedMethods = [
            "appeal", "cancel", "create_claim", "finalize", "finalize_escalation",
            "get_all_claims", "get_claim", "get_claims_paginated", "get_credit",
            "get_pending_withdrawal", "list_claim_ids", "resolve", "withdraw"
        ];
        
        const actualMethods = Object.keys(schema.methods).sort();
        expectedMethods.sort();
        
        let missing = expectedMethods.filter(m => !actualMethods.includes(m));
        let extra = actualMethods.filter(m => !expectedMethods.includes(m));
        
        if (missing.length > 0 || extra.length > 0) {
            console.error("Live schema validation failed!");
            if (missing.length > 0) console.error("Missing expected methods:", missing);
            if (extra.length > 0) console.error("Unexpected extra methods:", extra);
            process.exit(1);
        }
        
        if (actualMethods.length !== 13) {
            console.error(`Expected exactly 13 methods, found ${actualMethods.length}`);
            process.exit(1);
        }
        
        console.log("Live schema validation passed: 13 expected methods are exposed at " + contractAddress);
        
    } catch (e) {
        console.error("RPC or schema failure:", e);
        process.exit(1);
    }
}
main();
