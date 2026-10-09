import { handleDeploymentReceipt } from "./receipt.js";

function assert(condition: boolean, msg: string) {
    if (!condition) {
        throw new Error("Assertion failed: " + msg);
    }
}

export function runOfflineTests() {
    console.log("Running offline receipt validation tests...");
    
    // 1. Success fixture
    const successTx = {
        status: "ACCEPTED",
        txDataDecoded: {
            contractAddress: "0x1234567890123456789012345678901234567890"
        },
        txExecutionResultName: "FINISHED_WITH_RETURN"
    };
    
    const successResult = handleDeploymentReceipt(successTx);
    assert(successResult.isFinalized === true, "Success should be finalized");
    assert(successResult.contractAddress === "0x1234567890123456789012345678901234567890", "Address should match");
    assert(successResult.error === null, "Error should be null");
    
    // 2. VM Error fixture
    const errorTx = {
        status: "ACCEPTED",
        txExecutionResultName: "REVERTED",
        error: "Execution exception in contract"
    };
    
    const errorResult = handleDeploymentReceipt(errorTx);
    assert(errorResult.isFinalized === true, "Error tx should be finalized");
    assert(errorResult.contractAddress === null, "Error tx should have no address");
    assert(errorResult.error!.includes("REVERTED"), "Error message should contain REVERTED");
    
    // 3. Zero Address fixture
    const zeroAddrTx = {
        status: "FINALIZED",
        txDataDecoded: {
            contractAddress: "0x0000000000000000000000000000000000000000"
        },
        txExecutionResultName: "FINISHED_WITH_RETURN"
    };
    const zeroResult = handleDeploymentReceipt(zeroAddrTx);
    assert(zeroResult.isFinalized === true, "Zero addr should be finalized");
    assert(zeroResult.contractAddress === null, "Zero addr should return null address");
    assert(zeroResult.error !== null && zeroResult.error.includes("empty or zero"), "Should have empty/zero error");

    // 4. Missing Address fixture
    const missingAddrTx = {
        status: "FINALIZED",
        txExecutionResultName: "FINISHED_WITH_RETURN"
    };
    const missingResult = handleDeploymentReceipt(missingAddrTx);
    assert(missingResult.contractAddress === null, "Missing addr should return null address");
    assert(missingResult.error !== null && missingResult.error.includes("empty or zero"), "Should have empty/zero error");

    // 5. Timeout fixture
    const timeoutTx = {
        status: "VALIDATORS_TIMEOUT",
        txExecutionResultName: "ERROR"
    };
    const timeoutResult = handleDeploymentReceipt(timeoutTx);
    assert(timeoutResult.isFinalized === true, "Timeout tx should be finalized (as error)");
    assert(timeoutResult.error !== null && timeoutResult.error.includes("VALIDATORS_TIMEOUT"), "Error should mention timeout status");

    // 6. Pending fixture
    const pendingTx = {
        status: "PROPOSING" // Testing non-terminal
    };
    
    const pendingResult = handleDeploymentReceipt(pendingTx);
    assert(pendingResult.isFinalized === false, "Pending should not be finalized");
    
    // 4. Timeout is generally handled by loop expiration, but let's test a tx that's just stuck
    const stuckTx = {
        status: "UNPROCESSED"
    };
    const stuckResult = handleDeploymentReceipt(stuckTx);
    assert(stuckResult.isFinalized === false, "Unprocessed should not be finalized");

    console.log("Receipt handling tests passed.");
}

if (require.main === module) {
    runOfflineTests();
}
