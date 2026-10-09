"use client";

import React, { useMemo } from "react";
import { useWalletClient, useAccount } from "wagmi";
import { createTransactionKit, SubmitInput, TrackedStatus } from "@genlayer/transaction-kit";
import { GenLayerTransactionPanel } from "@genlayer/transaction-kit-react";
import { studioDevnet } from "genlayer-js/chains";

type Props = {
  tx: SubmitInput;
  userValue?: bigint;
  onDone: (status: TrackedStatus) => void;
  onClose: () => void;
};

export default function TransactionModal({ tx, userValue, onDone, onClose }: Props) {
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  const kit = useMemo(() => {
    if (!walletClient || !address) return null;
    return createTransactionKit({
      chain: studioDevnet,
      provider: walletClient as any,
      account: address,
    });
  }, [walletClient, address]);

  if (!kit) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-[#111] border border-[#333] p-8 max-w-md w-full">
          <p className="text-white text-center">Connecting to wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="max-w-md w-full max-h-[calc(100vh-6rem)] overflow-y-auto relative">
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 font-mono text-sm"
        >
          [Close]
        </button>
        <GenLayerTransactionPanel
          kit={kit}
          tx={tx}
          userValue={userValue}
          network="Studio Next"
          trackUntil="finalized"
          theme="dark"
          onDone={onDone}
        />
      </div>
    </div>
  );
}
