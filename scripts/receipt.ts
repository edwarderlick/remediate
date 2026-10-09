import { isSuccessful } from "genlayer-js";

export function handleDeploymentReceipt(tx: any): {
  isFinalized: boolean;
  contractAddress: string | null;
  error: string | null;
} {
  const statusStr = typeof tx.status === "string" ? tx.status : (tx.statusName || tx.status);
  
  // Non-terminal states: UNINITIALIZED, PENDING, PROPOSING, COMMITTING, REVEALING, 
  // UNDETERMINED, APPEAL_REVEALING, APPEAL_COMMITTING, LEADER_REVEALING.
  // Terminal states (success): ACCEPTED, FINALIZED.
  // Terminal states (failures): CANCELED, VALIDATORS_TIMEOUT, LEADER_TIMEOUT.
  
  if (
    statusStr === "FINALIZED" ||
    statusStr === "ACCEPTED" ||
    statusStr === "CANCELED" ||
    statusStr === "VALIDATORS_TIMEOUT" ||
    statusStr === "LEADER_TIMEOUT"
  ) {
    if (isSuccessful(tx)) {
      let addr = tx.txDataDecoded?.contractAddress || tx.data?.contractAddress || tx.data?.contract_address || tx.contract_address;
      if (!addr && tx.result) {
          addr = typeof tx.result === "string" ? JSON.parse(tx.result).contract_address : tx.result.contract_address;
      }
      if (addr && addr !== "0x0000000000000000000000000000000000000000") {
        return { isFinalized: true, contractAddress: addr, error: null };
      }
      return { isFinalized: true, contractAddress: null, error: "Contract address is empty or zero" };
    } else {
      const execResult = tx.txExecutionResultName || tx.txExecutionResult || tx.execution_result || tx.data?.execution_result;
      const revertReason =
        tx.execution_error ||
        tx.error ||
        tx.data?.error ||
        "Execution failed or did not finish with return";
      return {
        isFinalized: true,
        contractAddress: null,
        error: `Deployment Reverted by VM [Status: ${statusStr}, Result: ${execResult}]: ${revertReason}`,
      };
    }
  }
  
  return { isFinalized: false, contractAddress: null, error: null };
}
