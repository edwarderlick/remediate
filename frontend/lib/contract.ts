export type ContractState =
  | "OPEN"
  | "FIXED_EXACT"
  | "FIXED_EQUIVALENT"
  | "NOT_FIXED"
  | "INSUFFICIENT"
  | "CANCELED";

export interface Claim {
  id: string;
  advisory_id: string;
  owner_repo: string;
  commit_sha: string;
  recipient: string;
  funder: string;
  amount: number | string | bigint;
  state: ContractState;
  rationale: string;
  created_at?: string;
}

export const WRITE_METHODS = [
  "create_claim",
  "resolve",
  "cancel",
  "withdraw",
] as const;

export const VIEW_METHODS = [
  "get_claim",
  "get_all_claims",
  "get_claims_paginated",
  "list_claim_ids",
  "get_credit",
  "get_pending_withdrawal",
] as const;
