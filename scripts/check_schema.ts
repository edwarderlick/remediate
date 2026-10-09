import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import * as fs from "fs";

async function main() {
    const client = createClient({ chain: studioDevnet });
    const code = fs.readFileSync("contract/remediate.py", "utf8");
    try {
        const schema = await client.getContractSchemaForCode(code);
        console.log(JSON.stringify(schema, null, 2));
        
        const expectedMethods = [
            "appeal",
            "cancel",
            "create_claim",
            "finalize",
            "finalize_escalation",
            "get_all_claims",
            "get_claim",
            "get_claims_paginated",
            "get_credit",
            "get_pending_withdrawal",
            "list_claim_ids",
            "resolve",
            "withdraw"
        ];
        
        const actualMethods = Object.keys(schema.methods).sort();
        expectedMethods.sort();
        
        let missing = expectedMethods.filter(m => !actualMethods.includes(m));
        let extra = actualMethods.filter(m => !expectedMethods.includes(m));
        
        if (missing.length > 0 || extra.length > 0) {
            console.error("Schema validation failed!");
            if (missing.length > 0) console.error("Missing expected methods:", missing);
            if (extra.length > 0) console.error("Unexpected extra methods:", extra);
            process.exit(1);
        }
        
        if (actualMethods.length !== 13) {
            console.error(`Expected exactly 13 methods, found ${actualMethods.length}`);
            process.exit(1);
        }
        
        console.log("Schema validation passed: 13 expected methods are exposed.");
        
    } catch (e) {
        console.error("RPC or schema failure:", e);
        process.exit(1);
    }
}
main();
