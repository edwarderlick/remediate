# Remediate

GenLayer application with a smart contract and a Next.js frontend.

## GenVM Smart Contract State Machine

The 5-state fail-closed state machine:

1. **Pending**: Initial state
2. **Review**: Evaluating remediation steps
3. **Approved**: Approved for execution
4. **Executed**: Successfully executed
5. **Closed**: Fail-closed state, halted on error
